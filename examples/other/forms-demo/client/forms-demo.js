Template.basicDemo.fields({
  '.color': 'color'
});

Template.basicDemo.color = function () {
  return Meteor.form.get("color");
};

Template.basicDemo.events({
  'click .red': function () { Meteor.form.set("red"); },
  'click .blue': function () { Meteor.form.set("blue"); },
  'click .green': function () { Meteor.form.set("green"); },
});
