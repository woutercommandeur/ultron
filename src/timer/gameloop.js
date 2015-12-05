'use strict';

var requestFrame = require('request-frame');
var request = requestFrame('request');
var cancel = requestFrame('cancel');

var NOOP = function () {
};

module.exports = GameLoop;

function GameLoop() {
    this.simulationTimestep = 1000 / 60;
    this.frameDelta = 0;
    this.lastFrameTimeMs = 0;
    this.fps = 60;
    this.lastFpsUpdate = 0;
    this.framesThisSecond = 0;
    this.numUpdateSteps = 0;
    this.minFrameDelay = 0;
    this.running = false;
    this.started = false;
    this.panic = false;
    this.rafHandle = false;
    this.boundAnimate = this.animate.bind(this);
}

GameLoop.prototype.begin = NOOP;
GameLoop.prototype.update = NOOP;
GameLoop.prototype.render = NOOP;
GameLoop.prototype.end = NOOP;

GameLoop.prototype.getSimulationTimestep = function () {
    return this.simulationTimestep;
};

GameLoop.prototype.setSimulationTimestep = function (timestep) {
    this.simulationTimestep = timestep;
    return this;
};

GameLoop.prototype.getFPS = function () {
    return this.fps;
};

GameLoop.prototype.getMaxAllowedFPS = function () {
    return 1000 / this.minFrameDelay;
};

GameLoop.prototype.setMaxAllowedFPS = function (fps) {
    if (typeof fps === 'undefined') {
        fps = Infinity;
    }
    if (fps === 0) {
        this.stop();
    }
    else {
        // Dividing by Infinity returns zero.
        this.minFrameDelay = 1000 / fps;
    }
    return this;
};

GameLoop.prototype.resetFrameDelta = function () {
    var oldFrameDelta = this.frameDelta;
    this.frameDelta = 0;
    return oldFrameDelta;
};

GameLoop.prototype.setBegin = function (fun) {
    this.begin = fun || this.begin;
    return this;
};

GameLoop.prototype.setUpdate = function (fun) {
    this.update = fun || this.update;
    return this;
};

GameLoop.prototype.setRender = function (fun) {
    this.render = fun || this.render;
    return this;
};

GameLoop.prototype.setEnd = function (fun) {
    this.end = fun || this.end;
    return this;
};

GameLoop.prototype.start = function () {
    if (!this.started) {
        this.started = true;
        var self = this;
        this.rafHandle = request(function (timestamp) {
            self.render(1);
            self.running = true;
            self.lastFrameTimeMs = timestamp;
            self.lastFpsUpdate = timestamp;
            self.framesThisSecond = 0;
            self.rafHandle = request(self.boundAnimate);
        });
    }
    return this;
};

GameLoop.prototype.stop = function () {
    this.running = false;
    this.started = false;
    cancel(this.rafHandle);
    return this;
};

GameLoop.prototype.isRunning = function () {
    return this.running;
};

GameLoop.prototype.animate = function animate(timestamp) {

    if (timestamp < this.lastFrameTimeMs + this.minFrameDelay) {
        this.rafHandle = request(this.boundAnimate);
        return;
    }

    this.frameDelta += timestamp - this.lastFrameTimeMs;
    this.lastFrameTimeMs = timestamp;

    this.begin(timestamp, this.frameDelta);

    if (timestamp > this.lastFpsUpdate + 1000) {
        this.fps = 0.25 * this.framesThisSecond + 0.75 * this.fps;
        this.lastFpsUpdate = timestamp;
        this.framesThisSecond = 0;
    }
    this.framesThisSecond++;

    /* - http://gameprogrammingpatterns.com/game-loop.html
     * - http://gafferongames.com/game-physics/fix-your-timestep/
     * - https://gamealchemist.wordpress.com/2013/03/16/thoughts-on-the-javascript-game-loop/
     * - https://developer.mozilla.org/en-US/docs/Games/Anatomy
     */
    this.numUpdateSteps = 0;
    while (this.frameDelta >= this.simulationTimestep) {
        this.update(this.simulationTimestep);
        this.frameDelta -= this.simulationTimestep;

        if (++this.numUpdateSteps >= 240) {
            this.panic = true;
            break;
        }
    }

    this.render(this.frameDelta / this.simulationTimestep);

    this.end(this.fps, this.panic);

    this.panic = false;

    this.rafHandle = request(this.boundAnimate);
};
