(function () {

// XXX make server-side rendering work
// XXX if no pushstate fall back to hard page loads
//  => do we clear session? do we force-clear session even if we have pushstate?
//  => maybe we save session into pushstate storage, to restore selected tab
//     etc (on supporting browsers only??)

// XXX eliminate backbone dependency as soon as I have net again

var pageTable = Meteor._pageTable = {};
var currentPage = null;
var currentPageListeners = {};

// XXX history gets broken on 404, because we are effectively
// redirecting (because we reinvoke our callback on every page change,
// including to the 404 page). fix.

//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX


var MyRouter = Backbone.Router.extend({
  routes: {
    "*path": "page_from_path"
  },
  page_from_path: function (path) {
    path = "/" + path;
    var where = decodePath(path);
    if (! where)
      where = { page: "notFound" }; // XXX hack
    Meteor.go(where.page, where.params);
  }
});

Router = new MyRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});

//XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// map from page name to:
// - path: url pattern (eg, /event/:slug)
//   (must start with /) (params set in session, cleared after)
// - layout (defaults to 'layout')
// - template: defaults to page name
//
// or instead of an object, can just provide a string, which will be
// the url pattern
//
// 'layout' and 'template' are both template names. layouts are just
// normal templates, but they should contains {{{contents}}} somewhere
// inside them.
//
// XXX enter and exit functions?
// XXX denying access, redirecting
// XXX arbitrary processing of the URL into options, and vice versa
// XXX set title as a reactive function?
//
// XXX how do anchors work? want to make pages like docs, faq, "just
// work". also, should make team/mission page work as collateral
// damage
//  => include #:anchor in URL pattern? handle scrolling automatically?
Meteor.pages = function (pages) {
  for (var name in pages) {
    if (name in pageTable)
      throw new Error("Each page must have a unique name, but there " +
                      "seems to be two pages named '" + name + "'");

    var info = pages[name];
    if (typeof info === "string")
      info = { path: info };
    if (! ('template' in info))
      info.template = name;

    pageTable[name] = info;
  }
  // XXX implement URL patterns..
};

// returns an absolute path as a string (eg, '/pages/1'), else null
var encodePath = function (pageName, params) {
  var info = pageTable[pageName];
  if (! info)
    return null;
  return info.path; // XXX process params
};

// path is an absolute path, eg, '/pages/1'
// returns {page: String, params: Object}
var decodePath = function (path) {
  for (var pageName in pageTable) {
    var info = pageTable[pageName];
    if (path === info.path) // XXX process params
      return {page: pageName};
  }

  return null;
};

Meteor.page = function () {
  var ctx = Meteor.deps && Meteor.deps.Context.current;
  if (ctx) {
    currentPageListeners[ctx.id] = ctx;
    ctx.on_invalidate(function () {
      delete currentPageListeners[ctx.id];
    });
  }

  return currentPage;
};

Meteor.go = function (page, params) {
  // XXX temporary hack -- in future should use pushstate, etc
  if (! (page in pageTable)) {
    page = "notFound"; // XXX hack
    // XXX also need to handle the lack of even a 404 page --
    // probably, Meteor.page is null, and we render a default 404
    // page.
  }
  currentPage = page;
  _.each(_.keys(currentPageListeners), function (id) {
    currentPageListeners[id].invalidate();
  });

  // XXX XXX jquery
  // XXX think through scrolling handling (consider fragments too..)
  Meteor.defer(function() {
    $("html, body").scrollTop(0);
  });

  // XXX we both call and are called by the router?? straighten this out...
  Router.navigate(encodePath(page, params), true);
};

// options: 'absolute' (true for absolute url, default false)
Meteor.url = function (page, params, options) {
  throw new Error("Not implemented");
};

// XXX make this be overridden by <body>, if present; but allow <body>
// contents to include this (eg, Meteor.renderedPage())
Meteor.startup(function () {
  var bodyFunc = function () {
    var pageName = Meteor.page();
    if (! pageName)
      return '';
    var page = pageTable[pageName];

    var layoutFunc;
    if (page.layout) {
      layoutFunc = Template[page.layout];
      if (! layoutFunc)
        throw new Error("No template '" + page.layout + "' found " +
                        "(layout for '" + pageName + "')");
    } else {
      if (page.layout === undefined) // null means don't try the default
        layoutFunc = Template.layout;
      if (! layoutFunc)
        layoutFunc = function (data) { return data.contents(); };
    }

    return layoutFunc({
      contents: function () {
        var pageFunc = Template[page.template];
        if (! pageFunc)
          throw new Error("No template '" + page.template + "' found " +
                          "(for page '" + pageName + "')");

        return Spark.isolate(pageFunc);
      }
    });
  };

  var frag = Spark.render(function () {
    return Spark.isolate(bodyFunc);
  });

  document.body.appendChild(frag);
});

// XXX listen for anchor clicks, turn into 'go' actions iff they match
// a defined page


})();