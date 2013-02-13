var path = require('path');
var _ =  require('underscore');

Package.describe({
  summary: "Front-end framework from Twitter"
});

Package.on_use(function (api) {
  api.use('less');

  api.add_files(path.join('less', 'bootstrap.less'), 'client');
  api.add_files(path.join('less', 'responsive.less'), 'client');
  api.add_files(_.map(['bootstrap-affix.js', 	'bootstrap-alert.js', 	'bootstrap-button.js',
                       'bootstrap-carousel.js', 	'bootstrap-collapse.js', 	'bootstrap-dropdown.js',
                       'bootstrap-modal.js', 	'bootstrap-popover.js', 	'bootstrap-scrollspy.js',
                       'bootstrap-tab.js', 	'bootstrap-tooltip.js', 	'bootstrap-transition.js',
                       'bootstrap-typeahead.js'], function (filename) {
    return path.join('js', filename);
  }), 'client');

  api.add_files(path.join('img', 'glyphicons-halflings.png'), 'client');
  api.add_files(path.join('img', 'glyphicons-halflings-white.png'), 'client');

  // XXX this makes the paths to the icon sets absolute. it needs
  // to be included _after_ the standard bootstrap css so
  // that its styles take precedence.
  api.add_files(path.join('css', 'bootstrap-override.css'), 'client');
});
