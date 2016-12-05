'use strict';

var NOOP = function() {};

module.exports = GOAPAction;

function GOAPAction() {
  this.cost = 1.0;
  this.inRange = false;
  this.preconditions = {};
  this.effects = {};
  this.target = null;
}

GOAPAction.prototype.doReset = function() {
  this.inRange = false;
  this.target = null;
  this.reset();
};

GOAPAction.prototype.reset = NOOP;
GOAPAction.prototype.isDone = NOOP;
GOAAPction.prototype.checkProceduralPrecondition = NOOP;
GOAPAction.prototype.perform = NOOP;
GOAPAction.prototype.requiresInRange = NOOP;


GOAPAction.prototype.isInRange = function() {
  return this.inRange;
};

GOAPAction.prototype.setInRange = function(inRange) {
  this.inRange = inRange;
};

GOAPAction.prototype.addPrecondition(key, value) {
  this.preconditions[key] = value;
}

GOAPAction.prototype.removePrecondition(key) {
  delete this.preconditions[key];
}

GOAPAction.prototype.addEffect(key, value) {
  this.effects[key] = value;
}

GOAPAction.prototype.removeEffect(key) {
  delete this.effects[key];
}
