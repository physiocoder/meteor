Package.describe({
  summary: "Visualize Meteor reactivity"
});

Package.on_use(function (api) {
  api.use(['jquery', 'session', 'domutils', 'deps', 'templating', 'underscore', 'spark'], 'client');
  api.add_files(['lib/reactive-vision.js'], 'client');
});
