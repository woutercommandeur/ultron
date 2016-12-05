'use strict';

module.exports = State;

var NOOP = require('../utils/noop');

function State(name) {
    this.name = name;
}

State.prototype.create = NOOP;
State.prototype.begin = NOOP;
State.prototype.update = NOOP;
State.prototype.render = NOOP;
State.prototype.end = NOOP;
State.prototype.onEnter = NOOP;
State.prototype.onExit = NOOP;
