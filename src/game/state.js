'use strict';

exports = module.exports = State;

var NOOP = function() {};

function State ( name ) {
    this.name = name;
}

State.prototype.begin = NOOP;
State.prototype.update = NOOP;
State.prototype.render = NOOP;
State.prototype.end = NOOP;
State.prototype.onEnter = NOOP;
State.prototype.onExit = NOOP;
