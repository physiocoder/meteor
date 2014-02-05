// Implements the interface of IdMap and knows how to find Min or Max element
DummyStructure = function (comparator) {
  var self = this;
  self.comparator = comparator;
  self.idMap = new LocalCollection.IdMap;
};

_.each(['get', 'set', 'remove', 'has', 'empty', 'clear', 'forEach', 'size', 'setDefault'], function (method) {
  DummyStructure.prototype[method] = function (/* arguments */) {
    var self = this;
    return self.idMap[method].apply(self, arguments);
  };
});

DummyStructure.prototype.clone = function () {
  var self = this;
  var clone = new DummyStructure;
  clone.comparator = self.comparator;
  clone.idMap = self.idMap.clone();
  return clone;
};

DummyStructure.prototype.minElement = function () {
  var self = this;
  var minElement = undefined;
  self.idMap.forEach(function (value, key) {
    if (minElement === undefined)
      minElement = value;
    else if (self.comparator(value, minElement) < 0)
      minElement = value;
  });

  return minElement;
};

DummyStructure.prototype.maxElement = function () {
  var self = this;
  var comparator = self.comparator;
  self.comparator = function (a, b) { return -comparator(a, b); };
  var maxElement = self.minElement();
  self.comparator = comparator;
  return maxElement;
};

