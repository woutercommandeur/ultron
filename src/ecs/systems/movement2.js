var IteratingSystem = require('../iteratingsystem'),
    Position2 = require('../components/position2'),
    Velocity2 = require('../components/velocity2');

exports = module.exports = Movement2System;

function Movement2System() {
    IteratingSystem.call(this);

    this.registerComponent(this.getComponent(Position2));
    this.registerComponent(this.getComponent(Velocity2));
}

Movement2System.prototype = Object.create(IteratingSystem.prototype);
Movement2System.prototype.constructor = IteratingSystem.constructor;

Movement2System.prototype.process = function(entity, elapsed) {
    var position = entity.get(this.getComponent(Position2));
    var velocity = entity.get(this.getComponent(Velocity2));

    position.x += velocity.dx * elapsed;
    position.y += velocity.dy * elapsed;
};