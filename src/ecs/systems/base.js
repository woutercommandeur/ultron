
module.exports = BaseSystem;

var NOOP = function(){};

function BaseSystem(em) {
  this.em = em;
}

BaseSystem.prototype.update = NOOP;
