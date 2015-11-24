'use strict';
/* jshint -W064 */

exports = module.exports = Vector2;

var epsilon = 0.0000001;
var degrees = 180 / Math.PI;

var cache = [];
var created = 0;

function Vector2 (x, y) {
    if (!(this instanceof Vector2)) {
        var v = cache.pop();
        if (!v) {
            v = new Vector2(x || 0, y || 0);
            created++;
        } else {
            v.set(x, y);
        }
        return v;
    }
    this.x = x || 0;
    this.y = y || 0;
}

Vector2.warmup = function(amount) {
    while(amount--) {
        new Vector2().free();
    }
}

Vector2.getStats = function() {
    return [cache.length, created];
};

Vector2.fromArray = function (arr) {
    return Vector2(arr[0] || 0, arr[1] || 0);
};

Vector2.fromObject = function (obj) {
    return Vector2(obj.x || 0, obj.y || 0);
};

Vector2.prototype.set = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
    return this;
};

Vector2.prototype.free = function () {
    cache.push(this);
};

Vector2.prototype.add = function (vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
};

Vector2.prototype.addScalar = function (scalar) {
    this.x += scalar;
    this.y += scalar;
    return this;
};


Vector2.prototype.subtract = function (vec) {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
};

Vector2.prototype.subtractScalar = function (scalar) {
    this.x -= scalar;
    this.y -= scalar;
    return this;
};


Vector2.prototype.divide = function (vec) {
    this.x /= vec.x;
    this.y /= vec.y;
    return this;
};

Vector2.prototype.multiply = function (vec) {
    this.x *= vec.x;
    this.y *= vec.y;
    return this;
};

Vector2.prototype.multiplyScalar = function (scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
};

Vector2.prototype.normalize = function () {
    var length = this.length();

    if (length === 0) {
        this.x = 0;
        this.y = 0;
    } else {
        this.x /= length;
        this.y /= length;
    }
    return this;
};

Vector2.prototype.clone = function () {
    return Vector2(this.x, this.y);
};

Vector2.prototype.copy = function (vec) {
    this.x = vec.x;
    this.y = vec.y;
    return this;
};

Vector2.prototype.zero = function () {
    this.x = this.y = 0;
    return this;
};

Vector2.prototype.dot = function (vec) {
    return this.x * vec.x + this.y * vec.y;
};

Vector2.prototype.cross = function (vec) {
    return (this.x * vec.y ) - (this.y * vec.x );
};

Vector2.prototype.projectOnto = function (vec) {
    var coeff = ( (this.x * vec.x)+(this.y * vec.y) ) / ((vec.x*vec.x)+(vec.y*vec.y));
    this.x = coeff * vec.x;
    this.y = coeff * vec.y;
    return this;
};

Vector2.prototype.setAngle = function(rad)
{
  var len = this.length();
  this.x = Math.cos(rad) * len;
  this.y = Math.sin(rad) * len;
}

Vector2.prototype.horizontalAngle = function () {
    return Math.atan2(this.y, this.x);
};

Vector2.prototype.horizontalAngleDeg = function () {
    return radian2degrees(this.horizontalAngle());
};

Vector2.prototype.verticalAngle = function () {
    return Math.atan2(this.x, this.y);
};

Vector2.prototype.verticalAngleDeg = function () {
    return radian2degrees(this.verticalAngle());
};

Vector2.prototype.angle = Vector2.prototype.horizontalAngle;
Vector2.prototype.angleDeg = Vector2.prototype.horizontalAngleDeg;
Vector2.prototype.direction = Vector2.prototype.horizontalAngle;

Vector2.prototype.rotate = function (angle, origin) {
    var ox = 0,
        oy = 0;
    if (origin) {
        ox = origin.x || 0;
        oy = origin.y || 0;
    }

    var nx = ox + (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
    var ny = oy + (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

    this.x = nx;
    this.y = ny;

    return this;
};

Vector2.prototype.rotateDeg = function (angle) {
    angle = degrees2radian(angle);
    return this.rotate(angle);
};

Vector2.prototype.rotateBy = function (rotation) {
    var angle = this.angle() + rotation;
    return this.rotate(angle);
};

Vector2.prototype.rotateByDeg = function (rotation) {
    rotation = degrees2radian(rotation);
    return this.rotateBy(rotation);
};

Vector2.prototype.distance = function (vec) {
    return Math.sqrt(this.distanceSq(vec));
};

Vector2.prototype.distanceSq = function (vec) {
    var dx = this.x - vec.x,
    dy = this.y - vec.y;
    return dx * dx + dy * dy;
};

Vector2.prototype.length = function () {
    return Math.sqrt(this.lengthSq());
};

Vector2.prototype.lengthSq = function () {
    return this.x * this.x + this.y * this.y;
};

Vector2.prototype.magnitude = Vector2.prototype.length;

Vector2.prototype.isZero = function() {
    return this.x === 0 && this.y === 0;
};
Vector2.prototype.isEqualTo = function(vec) {
    return this.x === vec.x && this.y === vec.y;
};

Vector2.prototype.isEqualEpsilon = function(vec) {
    return Math.abs(this.x - vec.x) < epsilon && Math.abs(this.y - vec.y) < epsilon;
};

Vector2.prototype.toString = function () {
    return 'x: ' + this.x + ', y: ' + this.y;
};

Vector2.prototype.toArray = function () {
    return [ this.x, this.y ];
};

Vector2.prototype.toObject = function () {
    return { x: this.x, y: this.y };
};

function radian2degrees (rad) {
    return rad * degrees;
}

function degrees2radian (deg) {
    return deg / degrees;
}
/* jshint +W064 */
