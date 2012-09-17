Package.describe({
  summary: "Divide your app into pages, each with a unique URL",
  internal: true
});

Package.on_use(function (api) {
  api.use(['spark']);
  api.use(['jquery']); // XXX eliminate
  api.add_files('pages.js', 'client');
});
