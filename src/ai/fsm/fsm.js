'use strict';

var StateList = require('../../game/statelist');

module.exports = FSM;

function FSM() {
  this.states = new StateList();
}

FSM.prototype.update = function(gameobject) {
  var state = this.states.top();
  if (state) {
    state.update(this, gameobject);
  }
}

FSM.prototype.pushState = function(state) {
  this.states.push(state);
};

FSM.prototype.popState = function() {
  return this.states.pop();
}
