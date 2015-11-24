'use strict';

var Rectangle2 = require('../../geometry/rectangle2');
var Vector2 = require('../../geometry/vector2');
var LineSegment2 = require('../../geometry/linesegment2');
var gpc = require('../../geometry/gpc');
var Delaunay = require('delaunay-fast');
var Graph = require('../graph');
var avoidance = require('../../ai/steering').avoidance;


exports = module.exports = Dungeon;

var GENERATE_ROOMS = 1,
    EVADE_ROOMS = 2;


function Dungeon(chance, iterations, radius, minSide, maxSide)
{
  this.sizeChance = { min: minSide, max: maxSide };
  this.posChance = { min: 0, max: 1 };
  this.rooms = [];
  this.vectors = [];
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
    case EVADE_ROOMS:
      this.evadeRooms();
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

  var room = Rectangle2(x - (w/2), y - (h/2), w, h);
  this.rooms.push(room);
  this.vectors.push(Vector2());

  if (this.rooms.length == this.iterations ) {
    this.state = EVADE_ROOMS;
  }
};

Dungeon.prototype.evadeRooms = function()
{
  var l = this.rooms.length;
  var i,r,v,j,rr,f;
  var p1 = Vector2();
  var p2 = Vector2();
  for (i=0;i<l;i++) {
    r = this.rooms[i];
    v = this.vectors[i];
    for (j=0;j<l;j++) {
      if (j != i) {
        rr = this.rooms[j];
        if (r.intersects(rr)) {
          // avoidance force
          p1.set(r.x,r.y);
          p2.set(rr.x,rr.y);
          f = avoidance(p2,p1,v,10,10,5);
          v.copy(f);
          f.free();
        }
      }
    }
    r.x += v.x;
    r.y += v.y;
  }

  p1.free();
  p2.free();

}
