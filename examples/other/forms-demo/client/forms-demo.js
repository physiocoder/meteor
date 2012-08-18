if (! Session.get("x")) {
  Session.set("x", 1);
}

Template.basicDemo.fields({
  '.color': 'color',
  '.shape': 'shape'
});

Template.basicDemo.color = function () {
  return Meteor.form.get("color");
};

Template.basicDemo.shape = function () {
  return Meteor.form.get("shape");
};

Template.basicDemo.x = function () {
  return Session.get("x");
};

Template.basicDemo.events({
  'click .red': function () { Meteor.form.set("color", "red"); },
  'click .blue': function () { Meteor.form.set("color", "blue"); },
  'click .green': function () { Meteor.form.set("color", "green"); },
  'click .inc': function () { Session.set("x", Session.get("x") + 1); }
});
