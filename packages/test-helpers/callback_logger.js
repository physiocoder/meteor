var CallbackLogger = function (test, callbackNames) {
  var self = this;
  self._log = [];
  self._test = test;
  _.each(callbackNames, function (callbackName) {
    self[callbackName] = function () {
      var args = _.toArray(arguments);
      self._log.push({callback: callbackName, args: args});
    };
  });
};

CallbackLogger.prototype.expectResult = function (callbackName, args) {
  var self = this;
  if (_.isEmpty(self._log))
    self._test.fail("Expected callback " + callbackName + " got none");
  var result = self._log.shift();
  self._test.equal(result.callback, callbackName);
  self._test.equal(result.args, args);
};

CallbackLogger.prototype.expectNoResult = function () {
  var self = this;
  self._test.length(self._log, 0);
};
