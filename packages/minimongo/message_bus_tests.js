Tinytest.add("minimongo - message bus", function (test) {
  var bus = new LocalCollection._MessageBus;

  var results = [];

  var fooHandle = bus.listen({foo: 42}, function (message) {
    results.push(message.fromFoo);
  });

  var collectionHandle = bus.listen({collection: 'x'}, function (message) {
    results.push(message.fromCollection);
  });

  var collectionAndFooHandle = bus.listen(
    {collection: 'x', foo: 42}, function (message) {
      results.push(message.fromBoth);
    });

  test.length(results, 0);

  bus.fire({xxx: 42});
  test.length(results, 0);

  bus.fire({collection: 'y'});
  test.length(results, 0);

  bus.fire({collection: 'y', foo: 42, fromFoo: 1});
  test.equal(results, [1]);
  results = [];

  bus.fire({foo: 42, fromFoo: 2});
  test.equal(results, [2]);
  results = [];

  bus.fire({collection: 'x', fromCollection: 3});
  test.equal(results, [3]);
  results = [];

  bus.fire({collection: 'x', foo: 42, fromFoo: 4, fromCollection: 5,
            fromBoth: 6});
  results.sort();
  test.equal(results, [4, 5, 6]);
  results = [];

  collectionHandle.stop();
  bus.fire({collection: 'x', foo: 42, fromFoo: 7, fromCollection: 8,
            fromBoth: 9});
  results.sort();
  test.equal(results, [7, 9]);
  results = [];

  fooHandle.stop();
  bus.fire({collection: 'x', foo: 42, fromFoo: 10, fromCollection: 11,
            fromBoth: 12});
  results.sort();
  test.equal(results, [12]);
  results = [];

  collectionAndFooHandle.stop();
  bus.fire({collection: 'x', foo: 42, fromFoo: 13, fromCollection: 14,
            fromBoth: 15});
  test.length(results, 0);
});
