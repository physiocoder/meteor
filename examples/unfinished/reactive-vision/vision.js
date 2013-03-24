Items = new Meteor.Collection("items");

if (Meteor.isServer) {
  function seed () {
    Items.remove({});

    for (var i = 0; i < 10; i++) {
      Items.insert({title: "Item " + i});
    }
  }

  Meteor.startup(seed);

  Meteor.publish("items", function () {
    return Items.find();
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("items");

  Template.main.helpers({
    title: function () {
      return Session.get("title") || "Not Set";
    }
  });

  Template.list.helpers({
    items: function () {
      return Items.find();
    }
  });

  Template.textTemplate.helpers({
    text: function () {
      return Session.get("text") || "Text";
    }
  });

  Meteor.startup(function () {
    Meteor.ReactiveVision.onLog(function (msg) {
      $('<li>').text(msg).appendTo('#logger');
      $('.left')[0].scrollTop = $('#logger').height();
    });
  });
}

