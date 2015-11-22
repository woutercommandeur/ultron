'use strict';

var Rectangle2 = require('../../geometry/rectangle2');
var Vector2 = require('../../geometry/vector2');
var LineSegment2 = require('../../geometry/linesegment2');
var gpc = require('../../geometry/gpc');
var Delaunay = require('delaunay-fast');
var Graph = require('../graph');


exports = module.exports = Dungeon;

var GENERATE_ROOMS = 1,
    EVADE_ROOMS = 2;


function Dungeon(chance, iterations, radius, minSide, maxSide)
{
  this.sizeChance = { min: minSide, max: maxSide };
  this.posChance = { min: 0, max: 1 };
  this.rooms = [];
  this.chance = chance;
  this.iterations = iterations;
  this.radius = radius;
  this.minSide = minSide;
  this.maxSide = maxSide;
  this.state = GENERATE_ROOMS;
}


Dungeon.prototype.step = function()
{
  switch(this.state) {
    case GENERATE_ROOMS:
      this.addRoom();
      break;
    default:
      break;
  }
};

Dungeon.prototype.addRoom = function()
{
  var t = 2*Math.PI*this.chance.floating(this.posChance);
  var u = this.chance.floating(this.posChance) + this.chance.floating(this.posChance);
  var r = ( u>1 ? 2-u : u );
  var x = this.radius*r*Math.cos(t);
  var y = this.radius*r*Math.sin(t);
  var w = this.chance.integer(this.sizeChance);
  var h = this.chance.integer(this.sizeChance);

  var room = Rectangle2(x, y, w, h);
  this.rooms.push(room);

  if (this.rooms.length == this.iterations ) {
    this.state = EVADE_ROOMS;
  }
};
