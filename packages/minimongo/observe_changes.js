(function () {

var filterFields = function (fields, includeField) {
  var result = {};

  _.each(fields, function (value, key) {
    if (key !== '_id' && includeField(key))
      result[key] = value;
  });
  if (_.isEmpty(result))
    return null;
  return result;
};

var applyObserveChanges = function (target, changes) {
  _.each(changes, function (key, value) {
    if (value === undefined)
      delete target[key];
    else
      target[key] = value;
  });
};


var SingleIdChangeObserver = function (cursor, id, ordered, callbacks) {
  var self = this;
  self._callbacks = callbacks;
  self._observedFields = null;
  self._atomicBatchState = null;
  self._id = id;
  self._ordered = ordered;
  self._cursor = cursor;
  if (_.has(cursor.collection.docs, id)) {
    self._handleAdded(cursor.collection.docs[id]);
  }

  self._listenForId();
  self._listenForBatches();
};


SingleIdChangeObserver.prototype._sendAtomicBatchDifferences = function () {
  var self = this;
  if (self._atomicBatchState.fields === null && self._observedFields === null)
    return;
  if (self._atomicBatchState.fields === null) {
    self._callAdded();
    return;
  }
  if (self._observedFields === null) {
    self._callbacks.removed && self._callbacks.removed(self._id);
    return;
  }
  if (self._callbacks.changed) {
    var changeFields = {};
    LocalCollection._diffObjects(
      self._atomicBatchState.fields, self._observedFields, {
        leftOnly: function (key, leftValue) {
          if (key !== '_id')
            changeFields[key] = undefined;
        },
        rightOnly: function (key, rightValue) {
          if (key !== '_id')
            changeFields[key] = rightValue;
        },
        both: function (key, leftValue, rightValue) {
          if (key !== '_id' && !LocalCollection._f._equal(leftValue, rightValue))
            changeFields[key] = rightValue;
        }
      });
    self._callbacks.changed(self._id, changeFields);
  }
};

SingleIdChangeObserver.prototype._listenForId = function () {
  var self = this;
  self._idListener = self._cursor.collection._listenWithCollection({id: self._id}, function (message) {
    if (self._id !== message.id)
      throw new Error("Got a message not intended for this id");
    switch (message.msg) {
    case "added":
      self._handleAdded(message.fields);
      return;
    case "changed":
      var changedFields = filterFields(message.fields, self._cursor._includeField);
      if (changedFields) {
        applyObserveChanges(self._observedFields, changedFields);
        if (self._atomicBatchState)
          self._atomicBatchState.modified = true;
        else
          self._callbacks.changed && self._callbacks.changed(self._id, changedFields);
      }
      return;
    case "removed":
      self._observedFields = null;
      if (self._atomicBatchState)
        self._atomicBatchState.modified = true;
      else
        self._callbacks.removed && self._callbacks.removed(self._id);
      return;
    }
  });
};

SingleIdChangeObserver.prototype._listenForBatches = function () {
  var self = this;
  self._enterAtomicListener = self._cursor.collection._bus.onEnterAtomic(function () {
    self._atomicBatchState = {
      fields: EJSON.clone(self.observedFields),
      modified: false
    };
  });
  self._leaveAtomicListener = self._cursor.collection._bus.onLeaveAtomic(function () {
    if (!self._atomicBatchState)
      throw new Error("Leave atomic without enter atomic!");
    if (self._atomicBatchState.modified)
      self._sendAtomicBatchDifferences();
    self._atomicBatchState = null;
  });
};

SingleIdChangeObserver.prototype._handleAdded = function (fields) {
  var self = this;
  self._observedFields = filterFields(fields, self._cursor._includeField);
  if (self._atomicBatchState) {
    self._atomicBatchState.modified = true;
  } else {
    self._callAdded();
  }
};

SingleIdChangeObserver.prototype._callAdded = function () {
  var self = this;
  if (self._ordered)
    self._callbacks.addedBefore && self._callbacks.addedBefore(self._id, self._observedFields, null);
  else
    self._callbacks.added && self._callbacks.added(self._id, self._observedFields);
};

SingleIdChangeObserver.prototype.stop = function () {
  var self = this;
  self._idListener.stop();
  self._enterAtomicListener.stop();
  self._leaveAtomicListener.stop();
};





// callbacks is an object of the form:
// { added, changed, removed }
// or { addedBefore, changed, removed, movedBefore }
LocalCollection.Cursor.prototype.observeChanges = function (callbacks) {
  var self = this;
  var ordered = !!(callbacks.addedBefore || callbacks.movedBefore);
  if (ordered && callbacks.added) {
    throw new Error("Cannot combine a set of ordered" +
                    "callbacks (including one of addedBefore or movedBefore), " +
                    "with a set of unordered callbacks (including added)");
  }
  if (self.selector_id) {
    if (self.skip) {
      // if you skip the one thing, no objects are ever in the set
      return {stop: function () {}};
    }
    return new SingleIdChangeObserver(self, self.selector_id, ordered, callbacks);
  }
  throw new Error("Unimplemented");
};



})();
