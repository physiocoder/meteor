Tinytest.add("handlebars - each with index on array", function (test) {
  var options = { fn: function () {}, inverse: function () {} };
  var data = [ {}, {}, {} ];
  Handlebars._default_helpers.each(data, options);
  _.each(data, function (item, index) {
    test.equal(item.INDEX, index);
  });
});

Tinytest.add("handlebars - each with index on object", function (test) {
  var options = { fn: function () {}, inverse: function () {} };
  var data = { a: {}, b: {}, c: {} };
  Handlebars._default_helpers.each(data, options);
  _.each(data, function (item, key) {
    test.equal(item.KEY, key);
  });
});
