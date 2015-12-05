'use strict';

var StateList = require('./statelist');

exports = module.exports = StateStack;

function StateStack() {
    this.states = new StateList();
}

StateStack.prototype.begin = function (timestamp, frameDelta) {
    var depth = 0;
    var state = this.states.top(depth);
    while (state) {
        if (!state.begin(timestamp, frameDelta)) {
            state = this.states.top(++depth);
        } else {
            state = false;
        }
    }
};

StateStack.prototype.update = function (simulationTimestep) {
    var depth = 0;
    var state = this.states.top(depth);
    while (state) {
        if (!state.update(simulationTimestep)) {
            state = this.states.top(++depth);
        } else {
            state = false;
        }
    }
};

StateStack.prototype.render = function (percentageTimestepRemaining) {
    var depth = 0;
    var state = this.states.top(depth);
    while (state) {
        if (!state.render(percentageTimestepRemaining)) {
            state = this.states.top(++depth);
        } else {
            state = false;
        }
    }
};

StateStack.prototype.end = function (fps, panic) {
    var depth = 0;
    var state = this.states.top(depth);
    while (state) {
        if (!state.end(fps, panic)) {
            state = this.states.top(++depth);
        } else {
            state = false;
        }
    }
};

StateStack.prototype.pop = function () {
    var state = this.states.pop();
    state.onExit();
    return state;
};

StateStack.prototype.push = function (state) {
    this.states.push(state);
    return state.onEnter();
};
