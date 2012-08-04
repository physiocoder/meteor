// XXX could use some tests

ReactiveDictionary = function () {
  this.keys = {};
  this.keyDeps = {}; // key -> context id -> context
  this.keyValueDeps = {}; // key -> value -> context id -> context
};

_.extend(ReactiveDictionary.prototype, {
  // XXX remove debugging method (or improve it, but anyway, don't
  // ship it in production)
  dump_state: function () {
    var self = this;
    console.log("=== Listeners ===");
    for (var key in self.keyDeps) {
      var ids = _.keys(self.keyDeps[key]);
      if (!ids.length)
        continue;
      console.log(key + ": " + _.reject(ids, function (x) {return x === "_once"}).join(' '));
    }

    for (var key in self.keyValueDeps) {
      for (var value in self.keyValueDeps[key]) {
        var ids = _.keys(self.keyValueDeps[key][value]);
        if (!ids.length)
          continue;
        console.log(key + "(" + value + "): " + _.reject(ids, function (x) {return x === "_once";}).join(' '));
      }
    }
  },

  set: function (key, value) {
    var self = this;

    var old_value = self.keys[key];
    if (value === old_value)
      return;
    self.keys[key] = value;

    var invalidate = function (map) {
      if (map)
        for (var id in map)
          map[id].invalidate();
    };

    self._ensureKey(key);
    invalidate(self.keyDeps[key]);
    invalidate(self.keyValueDeps[key][old_value]);
    invalidate(self.keyValueDeps[key][value]);
  },

  get: function (key) {
    var self = this;
    var context = Meteor.deps.Context.current;
    self._ensureKey(key);

    if (context && !(context.id in self.keyDeps[key])) {
      self.keyDeps[key][context.id] = context;
      context.on_invalidate(function () {
        delete self.keyDeps[key][context.id];
      });
    }

    return self.keys[key];
  },

  equals: function (key, value) {
    var self = this;
    var context = Meteor.deps.Context.current;

    if (typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean' &&
        value !== null && value !== undefined)
      throw new Error("equals: value can't be an object");

    if (context) {
      self._ensureKey(key);
      if (!(value in self.keyValueDeps[key]))
        self.keyValueDeps[key][value] = {};

      if (!(context.id in self.keyValueDeps[key][value])) {
        self.keyValueDeps[key][value][context.id] = context;
        context.on_invalidate(function () {
          delete self.keyValueDeps[key][value][context.id];

          // clean up [key][value] if it's now empty, so we don't use
          // O(n) memory for n = values seen ever
          for (var x in self.keyValueDeps[key][value])
            return;
          delete self.keyValueDeps[key][value];
        });
      }
    }

    return self.keys[key] === value;
  },

  _ensureKey: function (key) {
    var self = this;
    if (!(key in self.keyDeps)) {
      self.keyDeps[key] = {};
      self.keyValueDeps[key] = {};
    }
  }
});

Session = new ReactiveDictionary;

if (Meteor._reload) {
  Meteor._reload.on_migrate('session', function () {
    // XXX sanitize and make sure it's JSONible?
    return [true, {keys: Session.keys}];
  });

  (function () {
    var migration_data = Meteor._reload.migration_data('session');
    if (migration_data && migration_data.keys) {
      Session.keys = migration_data.keys;
    }
  })();
}
