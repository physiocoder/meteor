Package.describe({
  summary: "Provides support for loading WebGL shaders from files",
  internal: true
});

var fs = require('fs');
var path = require('path');

Package.on_use(function (api) {
  // provides runtime support for defining shaders
  api.add_files('shaders.js', 'client');

});

Package.register_extension(
  "glsl", function (bundle, source_path, serve_path, where) {
    if (where !== "client")
      return;

    var contents = fs.readFileSync(source_path);
    var source = contents.toString('utf8');


    // XXX parse out multiple shaders, assign to Shader object.
    // <shader type="vertex" name="foo">...</shader> or something
    // quick and dirty for now?

    var jsCode = '_def_shader(' + JSON.stringify(source) + ')';

    var path_part = path.dirname(serve_path);
    if (path_part === '.')
      path_part = '';
    if (path_part.length && path_part !== '/')
      path_part = path_part + "/";
    var ext = path.extname(source_path);
    var basename = path.basename(serve_path, ext);
    serve_path = path_part + "shader." + basename + ".js";

    bundle.add_resource({
      type: "js",
      path: serve_path,
      data: new Buffer(jsCode),
      source_file: source_path,
      where: where
    });
  }
);
