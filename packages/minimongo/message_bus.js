// XXX this is inspired by Meteor._InvalidationCrossbar but (a) isn't a
// singleton and (b) doesn't have "onComplete". It is also very slightly
// optimized around the assumption that most triggers contain a "collection"
// key.

LocalCollection._MessageBus = function () {
  var self = this;

  self._nextId = 1;
  // map from collection name to (map from listener id to listener). each
  // listener has keys 'trigger', 'callback'.
  self._collectionSpecificListeners = {};
  // map from listener id to listener.
  self._nonCollectionListeners = {};
  self._onEnterAtomicCallbacks = {};
  self._onLeaveAtomicCallbacks = {};
  self._onLeaveAllBatchesCallbacks = {};

  self._batchDepth = 0;
  self._atomicBatchDepth = 0;
};

_.extend(LocalCollection._MessageBus.prototype, {
  // Listen for notification that match 'trigger'. A notification
  // matches if it has the key-value pairs in trigger as a
  // subset. When a notification matches, call 'callback' with the
  // notification.
  //
  // Returns a listen handle, which is an object with a method
  // stop(). Call stop() to stop listening.
  listen: function (trigger, callback) {
    var self = this;
    var id = self._nextId++;
    var listener = {trigger: trigger, callback: callback};
    var stopFunction;

    if (_.has(trigger, 'collection')) {
      var collectionName = trigger.collection;

      if (!_.has(self._collectionSpecificListeners, collectionName))
        self._collectionSpecificListeners[collectionName] = {};

      self._collectionSpecificListeners[collectionName][id] = listener;
      stopFunction = function () {
        delete self._collectionSpecificListeners[collectionName][id];
        if (_.isEmpty(self._collectionSpecificListeners[collectionName]))
          delete self._collectionSpecificListeners[collectionName];
      };
    } else {
      self._nonCollectionListeners[id] = listener;
      stopFunction = function () {
        delete self._nonCollectionListeners[id];
      };
    }

    return {
      stop: stopFunction
    };
  },

  // Fire the provided 'notification' (an object whose attribute
  // values are all JSON-compatibile) by informing all matching listeners
  // (registered with listen()).
  fire: function (notification) {
    var self = this;

    if (self._batchDepth === 0)
      throw new Error("Can't send a message outside of a batch");

    var callbacks = [];

    _.each(self._nonCollectionListeners, function (l) {
      if (self._matches(notification, l.trigger))
        callbacks.push(l.callback);
    });
    if (_.has(notification, 'collection')) {
      _.each(self._collectionSpecificListeners[notification.collection],
             function (l) {
        if (self._matches(notification, l.trigger))
          callbacks.push(l.callback);
      });
    }

    _.each(callbacks, function (c) {
      c(notification);
    });
  },

  _matches: function (notification, trigger) {
    for (var key in trigger)
      if (!EJSON.equals(trigger[key], notification[key]))
        return false;
    return true;
  },

  startBatch: function (atomic) {
    var self = this;
    self._batchDepth++;
    if (atomic) {
      self._atomicBatchDepth++;
      if (self._atomicBatchDepth === 1)
        self._runCallbacks(self._onEnterAtomicCallbacks);
    }
    return { endBatch: function () {
      self._batchDepth--;
      if (atomic)
        self._atomicBatchDepth--;

      if (self._batchDepth < 0)
        throw new Error("end batch without start!");
      if (self._atomicDepth < 0)
        throw new Error("end atomic without start!");
      if (self._atomicDepth > self._batchDepth)
        throw new Error("more atomic batches than batches!");

      if (atomic && self._atomicBatchDepth === 0)
        self._runCallbacks(self._onLeaveAtomicCallbacks);
      if (self._batchDepth === 0)
        self._runCallbacks(self._onLeaveAllBatchesCallbacks);
    } };
  },

  _addCallback: function (callback, registry) {
    var self = this;
    var id = self._nextId++;
    registry[id] = callback;
    return { stop: function () { delete registry[id]; } };
  },

  _runCallbacks: function (registry) {
    var self = this;
    _.each(registry, function (callback) {
      callback();
    });
  },

  onEnterAtomic: function (callback) {
    var self = this;
    return self._addCallback(callback, self._onEnterAtomicCallbacks);
  },

  onLeaveAtomic: function (callback) {
    var self = this;
    return self._addCallback(callback, self._onLeaveAtomicCallbacks);
  },

  onLeaveAllBatches: function (callback) {
    var self = this;
    return self._addCallback(callback, self._onLeaveAllBatchesCallbacks);
  }
});
