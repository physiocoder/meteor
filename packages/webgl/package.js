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

    // A shader begins with a line like "//! FRAGMENT foo"
    // or "//! VERTEX bar" and continues until the next line
    // starting with "//!" or end of file.  It is then exposed
    // as Shader.foo or Shader.bar.

    var sections = source.match(
        /^\/\/![\s\S]*?(?:(?=^\/\/!)|(?![\s\S]))/mg);

    var jsCode = '';
    sections.forEach(function(s) {
      var lines = s.split('\n');
      var firstLine = lines.shift();
      var stuff = firstLine.match(/^\/\/!\s*(FRAGMENT|VERTEX)\s*(\S.*)$/);
      if (! stuff)
        return;

      var name = stuff[2];
      var type = stuff[1].toLowerCase();
      jsCode += '_def_shader(' + JSON.stringify(
        { name: name, type: type, code: lines.join('\n') }) + ');';
    });

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
