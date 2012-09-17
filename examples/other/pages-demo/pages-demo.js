if (Meteor.is_client) {

  if (! Session.get("bromometer"))
    Session.set("bromometer", 10000);

  Meteor.pages({
    home: "/",
    page1: "/pages/1",
    page2: "/pages/2",
    admin: {
      path: "/admin",
      layout: "adminLayout"
    },
    notFound: {
      path: "*",
      layout: null
    }
  });

  Template.layout.bromometer = function () {
    return Session.get("bromometer");
  };

  Template.layout.events = {
    'click .p1': function () {
      Meteor.go("page1");
    },

    'click .p2': function () {
      Meteor.go("page2");
    },

    'click .bump': function () {
      Session.set("bromometer", Session.get("bromometer") + 1);
    }
  };
}

