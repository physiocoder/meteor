Template.basicDemo.fields({
  '.color': 'color'
});

Template.basicDemo.color = function () {
  return Meteor.form.get("color");
};

Template.basicDemo.events({
  'click .red': function () { Meteor.form.set("color", "red"); },
  'click .blue': function () { Meteor.form.set("color", "blue"); },
  'click .green': function () { Meteor.form.set("color", "green"); },
});
