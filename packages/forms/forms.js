// Generic controller for forms

Meteor.form = null;

// XXX make deftemplate call this when a template landmark is created,
// and merge the options into the landmark
Templating.optionsForTemplateLandmark(function (options, t) {
  // * 'options' is the previous options -- we are to extend it
  // * t is, eg, Template.foo

  // Preserve all fields (merge with existing preservation map)
  var preserve = {};
  if (t) {
    _.each(_.keys(t.fields || {}), function (selector) {
      preserve[selector] = true;
    });
  }
  // XXX need to normalize options.preserve -- account for the case where it
  // is an array :(
  _.each(options.preserve || {}, function (f, selector) {
    preserve[selector] = f;
  });

  // Hook create/render/destroy
  return _.extend(_.clone(options), {
    preserve: preserve,
    create: function () {
      this.form = new Form(t);
      options.create.call(this);
    },
    render: function () {
      this.form._render(this);
      options.render.call(this);
    },
    destroy: function () {
      this.form._destroy();
      options.destroy.call(this);
    }
  });
});

// XXX make the handlebars engine call this around invocations of helpers
/*
  XXX this one's tricky. we need to have the form at helper time
  (pre-materialize..) because we want to be able to, eg, call
  Meteor.form.valid() to read the validation state and conditionalize
  a CSS class on it. BUT, at that point in time, landmark matching
  hasn't happened yet so we don't know if we have a new template or a
  rerendered one, so we don't know what form we have..

  at pre-materialize time, we DO know the branch path relative to the
  root of the rendering. and in all cases where we're patching, we
  also know where the rendered fragment will be inserted, so we can
  compute the absolute branch path. so possibly we rework spark to do
  the landmark matching before materialize?

  wait, no, we don't have the relative branch path in a convenient
  form..? after all, we build the tree from the bottom up. maybe if
  labelbranch takes a lambda? then we could call Spark.getLandmark()
  during pre-materialize, which will lazily match or create the
  landmark?
 */
Templating.hookHelperInvocation(function (next) {
  var saved = Meteor.form;

  try {
    Meteor.form = /* XXX find enclosing landmark??? */.form;
    var ret = next();
  } finally {
    Meteor.form = saved;
  }

  return ret;
});

// XXX implement event.landmark (nearest landmark enclosing the attachEvents)
// XXX ensure that attachEvents is inside the landmark in templates
Spark.hookEventDelivery(function (next, event) {
  var saved = Meteor.form;

  try {
    // this will be the form of the template that defined the event
    // (no matter how many templates up the tree that might be)
    if (event.landmark && event.landmark.form)
      Meteor.form = event.landmark.form;
    var ret = next();
  } finally {
    Meteor.form = saved;
  }

  return ret;
});

Form = function (template) {
  var self = this;
  self.template = template; // eg Template.foo

  // User's properties ("form variables") accessible with get/set
  self.store = new ReactiveDictionary;

  // Our private state. Keys:
  // - status; form submission status, status() return value
  self.privateState = new ReactiveDictionary;
  self.privateState.set("status", "ready");

  // has onComplete been called? (so that submit() and cancel() are no
  // longer allowed?)
  self.complete = false;

  // 'fields' is an array of objects with keys:
  // - selector
  // - user options: name, load, save ...
  // - node: currently matching node
  //
  // (XXX what about multiple nodes? .. we could support them, but how
  // would we set up preservation?)
  self.fields = [];
  _.each(self.template.fields, function (options, selector) {
    if (typeof options === "string")
      options = { name: options };
    else
      /* XXX verify we at least have options.name? */;
    var field = _.extend({
      load: function () {
        // XXX need to reactively get the 'options.name' key on the
        // template data.. ON THE NODE MATCHING THE
        // SELECTOR. fortunately, we know that the node is inside our
        // backing landmark, so we can just poll the data
        // (getDataContext) whenever we're rerendered. (XXX no! also
        // need to check when a child is rerendered, not just
        // us. consider the case of a template containing an isolate
        // containing a with containing our bound <input>. data can
        // change without rerendering our landmark.
        return 'XXX';
      },
      save: function () {
        // XXX save to database, if supported by data context object?
      }
    }, options);

    self.fields.push(field);
  });
};

_.extend(Form.prototype, {
  get: function (key) {
    return this.store.get(key);
  },

  set: function (key, value) {
    return this.store.set(key, value);
  },

  equals: function (key, value) {
    return this.store.equals(key, value);
  },

  submit: function () {
    if (this.privateState.equals("status", "ready")) {
      var onSubmit = this.template.onSubmit || function (submission) {
        // XXX write all of the fields back to the database!
        // XXX (does that mean that this should be called save()?)
        submission.success();
      };

      this.privateState.set("status", "submitting");
      var setResult = false;
      onSubmit({
        success: function () {
          if (!setResult) {
            setResult = true;
            this.privateState.set("status", "submitted");
            this.complete = true;
          }
        },
        error: function (error) {
          if (!setResult) {
            setResult = true;
            // XXX add error (.. whatever type it is?) to validator messages?
            this.privateState.set("status", "ready");
          }
        }
      });
    } else
      /* log error? */;
  },

  cancel: function () {
    if (! this.complete) {
      this.complete = true;
      this.privateState.set("status", "cancelled");
      this.template.onCancel && this.template.onCancel();
      this.template.onComplete && this.template.onComplete();
    } else
      /* log error? */;
  },

  status: function () {
    // "ready", "submitting", "submitted", "cancelled"
    return this.privateState.get("status");
  },

  // XXX validators
  // XXX retrieving validator state

  _render: function (landmark) {
    var self = this;

    // update the mapping of fields to nodes
    _.each(this.fields, function (field) {
      var currentNode = /* find node in landmark that matches this.selector */
      if (currentNode !== field.node) {
        self._tearDownBinding(field);
        field.node = currentNode;
        self._setUpBinding(field);
      }
    });
  },

  _destroy: function () {
    // XXX necessary?
    _.each(this.fields, _.bind(self._tearDownBinding, self));
  },

  _setUpBinding: function (field) {
    if (!field.node)
      return;
    // XXX make changes to field be copied to this.store[field.name]
    // XXX make changes to this.store[field.name] be copied to the field
    // XXX initially populate one from the other as appropriate??
  },

  _tearDownBinding: function (field) {
    if (!field.node)
      return;
    // XXX undo _setUpBinding
  }
});

