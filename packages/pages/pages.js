(function () {

var USE_PUSHSTATE = window.history && window.history.pushState;

// XXX make server-side rendering work
// XXX if no pushstate fall back to hard page loads
//  => do we clear session? do we force-clear session even if we have pushstate?
//  => maybe we save session into pushstate storage, to restore selected tab
//     etc (on supporting browsers only??)

var pageTable = Meteor._pageTable = {};
var currentPage = null;
var currentPageListeners = {};

///////////////////////////////////////////////////////////////////////////////

var transitionToPath = function (path) {
  var where = decodePath(path);
  if (! where)
    where = { page: "notFound" }; // XXX hack
  // XXX also need to handle the lack of even a 404 page -- probably,
  // Meteor.page is null, and we render a default 404 page.

  currentPage = where.page;
  _.each(_.keys(currentPageListeners), function (id) {
    currentPageListeners[id].invalidate();
  });

  // XXX set other keys in session
  // (also clear any keys left over from last time)

  // XXX XXX jquery
  // XXX think through scrolling handling (consider fragments too..)
  Meteor.defer(function() {
    $("html, body").scrollTop(0);
  });
};

Meteor.startup(function () {
  transitionToPath(document.location.pathname);
});

if (USE_PUSHSTATE) {
  window.addEventListener('popstate', function () {
    transitionToPath(document.location.pathname);
  });
}

///////////////////////////////////////////////////////////////////////////////

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

// Navigate to a new page. This is called only when the user triggers
// navigation through the app (or potentially by clicking a link), not
// in response to the user typing into the address bar or pressing
// forward or back.
Meteor.go = function (page, params) {
  var path = encodePath(page, params);
  // XXX XXX need to handle 404! maybe throw an exception?

  if (path === document.location.pathname)
    return; // XXX correct policy?

  if (! USE_PUSHSTATE) {
    window.location.assign(path);
    // not reached
    return;
  }

  transitionToPath(path);
  window.history.pushState({}, document.title, path);
};

// options: 'absolute' (true for absolute url, default false)
//
// XXX should also be available on the server! for example, to
// generate a link for email. which means that page declarations go on
// the server too?
//
// ... which parts of an app DON'T go on the server? if we just say
// that startup() doesn't run on the server (or rather it's called
// something different there), and that events only fire on the
// client, can we basically eliminate the distinction between the
// client and the server, except for server code that you want to hide
// for security reasons (or bundle size), and legacy/special purpose
// client code that wants to run at top level?
Meteor.url = function (page, params, options) {
  var ret = encodePath(page, params);
  if (options.absolute)
    // XXX prepend with absolute URL
    throw new Error("Not implemented");
  return ret;
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

// Catch clicks on links and handle through pushstate if possible
if (USE_PUSHSTATE) {
  Meteor.startup(function () {
    // XXX XXX jquery
    $('body').delegate('a', 'click', function (evt) {

      if (evt.shiftKey || evt.ctrlKey || evt.metaKey) return true;

      var href = $(this).attr('href');

      // IE renders relative URLs as absolute; make href relative if
      // it should be
      var prefix = window.location.protocol + "//" + window.location.hostname;
      if (href && href.indexOf(prefix) === 0)
        href = href.substring(prefix.length);

      // XXX XXX I suspect that we still need to 'absolutify' paths
      // .. eg '<a href="2">' => /pages/2

      // XXX when the link doesn't match a page, maybe should fall back
      // to a hard page load in case it matches a page somewhere else on
      // the server? that is, don't assume we own the whole URL space
      // for the domain where we're running?

      if (href && ! /^\w+:/.exec(href)) {
        // relative href

        if (href === document.location.pathname) {
          evt.preventDefault();
          return; // XXX correct policy?
        }

        var where = decodePath(href);
        if (where) {
          evt.preventDefault();
          Meteor.go(where.page, where.params);
        }
      };
    });
  });
}

})();