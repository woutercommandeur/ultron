'use strict';

exports = module.exports = StateList;

function StateList() {
    this.states = [];
}

StateList.prototype.pop = function () {
    return this.states.pop();
};

StateList.prototype.push = function (state) {
    return this.states.push(state);
};

StateList.prototype.top = function (depth) {
    depth = depth || 0;
    return this.states[this.states.length - (depth + 1)];
};
