Package.describe({
  summary: "Divide your app into pages, each with a unique URL",
  internal: true
});

Package.on_use(function (api) {
  api.use(['backbone']); // XXX temporary hack
  api.use(['spark']);
  api.add_files('pages.js', 'client');
});
