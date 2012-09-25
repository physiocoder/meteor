Package.describe({
  summary: "Listen for and answer HTTP requests",
  internal: true
});

Package.on_use(function (api) {
  api.add_files('http-server.js', 'server');
});
