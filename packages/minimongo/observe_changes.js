(function () {

var filterFields = function (fields, cleared, includeField) {
  var result = {};

  _.each(fields, function (value, key) {
    if (key !== '_id' && includeField(key))
      result[key] = value;
  });
  _.each(cleared, function (clearKey) {
    if (clearKey !== '_id' && includeField(clearKey))
      result[clearKey] = undefined;
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
  self._storedObservedFields = undefined;
  self._id = id;
  self._ordered = ordered;
  self._cursor = cursor;
  if (_.has(cursor.collection.docs, id)) {
    self._handleAdded(cursor.collection.docs[id]);
  }

  self._registerHandle();
  self._batchListener = cursor.collection._bus.listen({msg: 'batch'}, function (message) {
    if (message.atomic) {
      self._storedObservedFields = LocalCollection._deepcopy(self.observedFields);
    } else if (message.action === "end" && self._storedObservedFields !== undefined) {
      self._sendDifferences();
      self._storedObservedFields = undefined;
    }
  });

};


SingleIdChangeObserver.prototype._sendDifferences = function () {
  var self = this;
  if (self._storedObservedFields === null && self._observedFields === null)
    return;
  if (self._storedObservedFields === null) {
    self._handleAdded(self._observedFields);
    return;
  }
  if (self._observedFields == null) {
    self._callbacks.removed(self._id);
    return;
  }
  var changeFields = {};
  LocalCollection._diffObjects(self._storedObservedFields, self._observedFields, {
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
};

SingleIdChangeObserver.prototype._registerHandle = function () {
  var self = this;
  self._stopHandle = self._cursor.collection._listenWithCollection({id: self._id}, function (message) {
    if (self._id !== message.id)
      throw new Error("Got a message not intended for this id");
    switch (message.msg) {
    case "added":
      self._handleAdded(message.fields);
      return;
    case "changed":
      var changedFields = filterFields(message.fields, message.cleared, self._cursor._includeField);
      if (changedFields) {
        applyObserveChanges(self._observedFields, changedFields);
        self._callbacks.changed && self._callbacks.changed(self._id, changedFields);
      }
      return;
    case "removed":
      self._observedFields = null;
      self._callbacks.removed && self._callbacks.removed(self._id);
      return;
    }
  });
};

SingleIdChangeObserver.prototype._handleAdded = function (fields) {
  var self = this;
  self._observedFields = filterFields(fields, null, self._cursor._includeField);
  if (self._ordered)
    self._callbacks.addedBefore && self._callbacks.addedBefore(self._id, self._observedFields, null);
  else
    self._callbacks.added && self._callbacks.added(self._id, self._observedFields);
};

SingleIdChangeObserver.prototype.stop = function () {
  var self = this;
  self._stopHandle.stop();
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
