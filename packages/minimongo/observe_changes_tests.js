

_.each (['added', 'addedBefore'], function (added) {
  Tinytest.add("observeChanges - single id - basics " + added, function (test) {
    var c = new LocalCollection();
    var logger = new CallbackLogger(test, [added, "changed", "removed"]);
    c.find("foo").observeChanges(logger);
    logger.expectNoResult();
    c.insert({_id: "bar", thing: "stuff"});
    logger.expectNoResult();
    c.insert({_id: "foo", noodles: "good", bacon: "bad", apples: "ok"});
    if (added === 'added')
      logger.expectResult(added, ["foo", {noodles: "good", bacon: "bad", apples: "ok"}]);
    else
      logger.expectResult(added, ["foo", {noodles: "good", bacon: "bad", apples: "ok"}, null]);
    logger.expectNoResult();
    c.update("foo", {noodles: "alright", potatoes: "tasty", apples: "ok"});
    logger.expectResult("changed", ["foo", {noodles: "alright", potatoes: "tasty", bacon: undefined}]);
    logger.expectNoResult();
    c.remove("foo");
    logger.expectResult("removed", ["foo"]);
    logger.expectNoResult();
    c.remove("bar");
    logger.expectNoResult();
    c.insert({_id: "foo", noodles: "good", bacon: "bad", apples: "ok"});
    if (added === 'added')
      logger.expectResult(added, ["foo", {noodles: "good", bacon: "bad", apples: "ok"}]);
    else
      logger.expectResult(added, ["foo", {noodles: "good", bacon: "bad", apples: "ok"}, null]);
    logger.expectNoResult();
  });
});

_.each (['added', 'addedBefore'], function (added) {
  Tinytest.add("observeChanges - single id - " + added + " with field filtering", function (test) {
    var c = new LocalCollection();
    var logger = new CallbackLogger(test, [added, "changed"]);
    c.find("foo", {fields: {bacon: 0}}).observeChanges(logger);
    logger.expectNoResult();
    c.insert({_id: "foo", noodles: "good", bacon: "bad", apples: "ok"});
    if (added === 'added')
      logger.expectResult(added, ["foo", {noodles: "good", apples: "ok"}]);
    else
      logger.expectResult(added, ["foo", {noodles: "good", apples: "ok"}, null]);
    logger.expectNoResult();
    c.update("foo", {noodles: "alright", potatoes: "tasty", apples: "ok"});
    logger.expectResult("changed", ["foo", {noodles: "alright", potatoes: "tasty"}]);
    logger.expectNoResult();
    c.remove("foo");
    // we don't have a removed callback here
    logger.expectNoResult();
  });
});


Tinytest.add("observeChanges - single id - initial adds", function (test) {
  var c = new LocalCollection();
  var logger = new CallbackLogger(test, ["added", "changed", "removed"]);
  c.insert({_id: "foo", noodles: "good", bacon: "bad", apples: "ok"});
  c.find("foo").observeChanges(logger);
  logger.expectResult("added", ["foo", {noodles: "good", bacon: "bad", apples: "ok"}]);
  logger.expectNoResult();
});
