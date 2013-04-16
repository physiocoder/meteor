// @export TestAsset
TestAsset = {};

if (Meteor.isServer) {
  TestAsset.convert = function (b) {
    return (new Buffer(b)).toString();
  };

  TestAsset.go = function (passed) {
    var expectText = "Package\n";
    if (Assets.getText("test-package.txt") !== expectText)
      throw new Error("getText test-package.txt does not match");
    if (TestAsset.convert(Assets.getBinary("test-package.txt"))
        !== expectText)
      throw new Error("getBinary test-package.txt does not match");

    Assets.getText("test-package.txt", function (err, result) {
      if (err || result !== expectText)
        throw new Error("async getText test-package.txt does not match");
      Assets.getBinary("test-package.txt", function (err, result) {
        if (err || TestAsset.convert(result) !== expectText)
          throw new Error("async getBinary test-package.txt does not match");
        process.exit(0);
      });
    });
  };
}