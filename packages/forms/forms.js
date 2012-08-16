// Generic controller for forms

/*
  XXX HERE XXX HERE


  Things that stop the demo from working:

  - Meteor.form is sometimes set correctly for helpers, and sometimes
    not. It's set correctly on first template render, and if the
    template is getting completely rerendered (an isolate that
    encloses the whole template.) It won't be set correctly for
    rerenders inside a template for in-retrospect-obvious reasons.

  - We don't have aroundEvent so we're not even trying to set
    Meteor.form inside events.


    ---

    Does Spark actually give us enough rope to do #1?

    I suppose we want the form for the nearest enclosing landmark?

    We are back in a situation where we need to know where the stuff
    we're currently rendering is going to be inserted.


    Spark.currentEnclosingLandmark() - returns the 'landmark' passed
    down the stack by the nearest enclosing call to createLandmark, or
    if none, the nearest landmark enclosing the intended insertion
    point, or null.



    How does Meteor.form actually bind in events? (A: to the template
    where the event was defined, for sure.) does our aroundEvent
    scheme give us the right thing?


    ---

    XXX how do you access the form from create/render/change on
    templates?
  */

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
// XXX in HTML5 you're supposed to use the 'input' event instead of
// 'keypress'
var inputEvents = ["keypress", "change"];

var getNodeValue = function (node) {
  // will need to special-case 'select'
  // also, not sure how radio buttons and checkboxes work
  // also, does this work for textareas?
  // see valHooks in jquery to see how jquery does it
  return node.value;
};

var setNodeValue = function (node, value) {
  // same caveats as above
  node.value = value;
};

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
    },
    // Templating extension point -- run code around HTML rendering
    // (so we can set up Meteor.form for helpers)
    aroundHtml: function (landmark, next) {
      var saved = Meteor.form;

      try {
        Meteor.form = formForLandmark[landmark.id];
        var ret = next();
      } finally {
        Meteor.form = saved;
      }

      return ret;
    }
    // XXX also need an aroundEvent
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
      }
    });
  },

  _destroy: function () {
    _.each(this.fields, _.bind(this._tearDownBinding, this));
  },

  // XXX IE support
  _setUpBinding: function (field) {
    var self = this;

    field.handle = autorun(function () {
      setNodeValue(field.node, self.get(field.name));
    });
    field.onchange = function () {
      self.set(field.name, getNodeValue(field.node));
    };
    _.each(inputEvents, function (type) {
      field.node.addEventListener(type, field.onchange, false);
    });
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