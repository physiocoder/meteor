// Generic controller for forms

// XXX how do you access the form from create/render/change on
// templates? say to set initial form field values?

// XXX template-demo is broken on this branch?

(function () {

Meteor.form = null;

// XXX uses private interface
Meteor._template_decl_methods.fields = function (fieldMap) {
  var fields =
    (this._tmpl_data.fields = (this._tmpl_data.field || {}));
  _.extend(fields, fieldMap);
};

var formForLandmark = {}; // map from landmark id to Form

// XXX others? something about 'change' not firing at the right time
// for certain kinds of checkboxes/radio buttons on old IE?
// http://www.quirksmode.org/dom/events/change.html
// XXX 'input' not supported in oldie, need onpropertychange
// http://whattheheadsaid.com/projects/input-special-event
// http://whattheheadsaid.com/2010/09/effectively-detecting-user-input-in-javascript
// 'keypress' is no good -- fires before element.value changes
var inputEvents = ["input", "change"];

var getNodeValue = function (node) {
  // will need to special-case 'select'
  // also, not sure how radio buttons and checkboxes work
  // also, does this work for textareas?
  // see valHooks in jquery to see how jquery does it
  return node.value;

  // XXX under what circumstances is a string coerced to a number
};

var setNodeValue = function (node, value) {
  if (typeof value !== "string")
    value = ''; // XXX lots to think about here

  // same caveats as above
  node.value = value;
};

var formStack = [];

Templating.optionsForTemplateLandmark(function (tmpl) {
  var tmplData = (tmpl._tmpl_data || {});
  var fields = tmplData.fields || {};

  // Preserve all fields
  var preserve = {};
  _.each(fields, function (options, selector) {
    preserve[selector] = true;
  });

  // Hook create/render/destroy
  return {
    preserve: preserve,
    create: function () {
      formForLandmark[this.id] = new Form(tmpl, fields);
    },
    render: function () {
      formForLandmark[this.id]._render(this);
    },
    destroy: function () {
      formForLandmark[this.id]._destroy(this);
      delete formForLandmark[this.id];
    },
    enter: function () {
      console.log("enter");
      formStack.push(Meteor.form);
      Meteor.form = formForLandmark[this.id];
    },
    exit: function () {
      console.log("exit");
      Meteor.form = formStack.pop();
    },
    deliverEvent: function (next, data, event, template) {
      try {
        console.log("begin deliver");
        var saved = Meteor.form;
        Meteor.form = formForLandmark[this.id]
        next.call(this, data, event, template);
      } finally {
        console.log("leave deliver");
        Meteor.form = saved;
      }
    }
  };
});

Form = function (template, fieldMap) {
  var self = this;
  self.template = template; // eg Template.foo

  // 'fields' is an array of objects with keys:
  // - selector
  // - user options: name, load, save ...
  // - node: currently matching node
  // - onchange: current event callback
  // - handle: autorun handle for observing self.state key
  //
  // (XXX what about multiple nodes? .. we could support them, but how
  // would we set up preservation?)
  self.fields = [];
  _.each(fieldMap, function (options, selector) {
    if (typeof options === "string")
      options = { name: options };
    if (! ('name' in options))
      throw new Error("Must provide a name for form field " + selector);
    var field = _.extend({
      load: function () {
        // XXX need to reactively get the 'options.name' key on the
        // template data.. ON THE NODE MATCHING THE
        // SELECTOR. fortunately, we know that it can only change when
        // we receive a 'rendered' callback.
      },
      save: function () {
        // XXX save to database, if supported by data context object?
      },
      selector: selector,
      node: null
    }, options);

    self.fields.push(field);
  });

  // User's properties ("form variables") accessible with get/set
  self.store = new ReactiveDictionary;
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

  _render: function (landmark) {
    var self = this;

    // update the mapping of fields to nodes
    _.each(self.fields, function (field) {
      var currentNode = landmark.find(field.selector);
      if (currentNode !== field.node) {
        self._tearDownBinding(field);
        field.node = currentNode;
        self._setUpBinding(field);
      } else
        // Patcher will have reverted the node value -- we must
        // restore it.
        // XXX does this break stuff? (input manager, selection?)
        // XXX do we need special behavior on blur?
        self._populate(field);
    });
  },

  _destroy: function () {
    _.each(this.fields, _.bind(this._tearDownBinding, this));
  },

  // XXX IE support
  _setUpBinding: function (field) {
    var self = this;

    field.handle = autorun(function () {
      self._populate(field);
    });
    field.onchange = function (event) {
      var v = getNodeValue(field.node);
      console.log(event.type + ": set to " + JSON.stringify(v));
      self.set(field.name, v);
      console.log(event.type + ": done setting");
    };
    _.each(inputEvents, function (type) {
      field.node.addEventListener(type, field.onchange, false);
    });
  },

  _populate: function (field) {
    var self = this;
    setNodeValue(field.node, self.get(field.name));
  },

  // XXX IE support
  // XXX jquery
  _tearDownBinding: function (field) {
    if (! field.node)
      return;
    _.each(inputEvents, function (type) {
      field.node.removeEventListener(type, field.onchange, false);
    });
    field.onchange = null;
    field.handle.stop();
    field.handle = null;
  }
});

///////////////////////////////////////////////////////////////////////////////

// XXX copied from template-demo

// Run f(). Record its dependencies. Rerun it whenever the
// dependencies change.
//
// Returns an object with a stop() method. Call stop() to stop the
// rerunning.
//
// XXX this should go into Meteor core as Meteor.autorun
var autorun = function (f) {
  var ctx;
  var slain = false;
  var rerun = function () {
    if (slain)
      return;
    ctx = new Meteor.deps.Context;
    ctx.run(f);
    ctx.on_invalidate(rerun);
  };
  rerun();
  return {
    stop: function () {
      slain = true;
      ctx.invalidate();
    }
  };
};


})();