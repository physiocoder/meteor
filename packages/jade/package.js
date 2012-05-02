Package.describe({
  summary: "Jade template engine"
});

var jade = require('jade');
var fs = require('fs');

Package.register_extension(
  "jade", function(bundle, source_path, serve_path, where) {
    serve_path = serve_path + '.js';

    var source = fs.readFileSync(source_path, 'utf8');

    var parser = new jade.Parser(source, source_path);
    var parsed = JSON.stringify(parser.parse());

    bundle.add_resource({
      type: 'js',
      path: serve_path,
      data: new Buffer('J='+parsed+';'),
      where: where
    });
  }
);
