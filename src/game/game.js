'use strict';

var StateStack = require('./statestack');
var GameLoop = require('../timer/gameloop');
var NOOP = function() {};

exports = module.exports = Game;

function Game () {
  this.states = {};
  this.statestack = new StateStack();
  this.gameloop = new GameLoop();

  var self = this;

  this.gameloop.setBegin(
    function(timestamp, frameDelta) {
      self.begin(timestamp, frameDelta);
      self.statestack.begin(timestamp, frameDelta);
    }
  );

  this.gameloop.setUpdate(
    function(simulationTimestep) {
      self.update(simulationTimestep);
      self.statestack.update(simulationTimestep);
    }
  );

  this.gameloop.setRender(
    function(percentageTimestepRemaining) {
      self.render(percentageTimestepRemaining);
      self.statestack.render(percentageTimestepRemaining);
    }
  );

  this.gameloop.setEnd(
    function(fps, panic) {
      self.end(fps. panic);
      self.statestack.end(fps, panic);
    }
  );

}

/* GAMELOOP HANDLING */

Game.prototype.start = function() {
  return this.gameloop.start();
};

Game.prototype.stop = function() {
  return this.gameloop.stop();
};

Game.prototype.begin = NOOP;
Game.prototype.end = NOOP;
Game.prototype.update = NOOP;
Game.prototype.render = NOOP;



/* STATE HANDLING */

Game.prototype.addState = function(state) {
  state.game = this;
  this.states[state.name] = state;
  return this;
};

Game.prototype.startState = function (stateName) {
  var state = this.states[stateName];
  if (!state) {
    return;
  }
  return this.statestack.push(this.states[stateName]);
};

Game.prototype.stopState = function (stateName) {
  var state = this.states[stateName];
  if (!state) {
    return;
  }
  return this.statestack.pop(state);
};
