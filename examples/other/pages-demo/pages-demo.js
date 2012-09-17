if (Meteor.is_client) {

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

  Template.layout.events = {
    'click .p1': function () {
      Meteor.go("page1");
    },

    'click .p2': function () {
      Meteor.go("page2");
    }
  };
}

