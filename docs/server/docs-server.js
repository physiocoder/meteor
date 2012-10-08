
Meteor.methods({
  // XXX It would be cool to run Template.page() on the server here!
  // This requires big changes to the bundler, but they are probably
  // the same changes needed for server-side rendering.
  reportPageHtml: function (html) {
    var fs = __meteor_bootstrap__.require('fs');
    try {
      fs.writeFileSync('.meteor/docs-dump.html', String(html));
    } catch (e) {
      // Meteor doesn't make any guarantees about the CWD, so if we
      // are unlucky (or deployed?) we end up here.
    }
  }
});
