Package.describe({
  summary: "Easily bind HTML forms to a database or backend services"
});

Package.on_use(function (api) {
  api.use(['underscore', 'session', 'spark'], 'client');

  api.add_files(['forms.js'], 'client');
});

Package.on_test(function (api) {
  api.use('tinytest');
  api.use(['forms', 'test-helpers'], 'client');

  api.add_files([
//    'forms_tests.js'
  ], 'client');
});
