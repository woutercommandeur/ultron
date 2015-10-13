var core = {};


core.geometry = require('./geometry');
core.linkedlist = require('./linkedlist');
core.procedural = require('./procedural');
core.timer = require('./timer');
core.input = require('./input');
core.game = require('./game');

module.exports = core;

global.ULTRON = core;
