'use strict';

/* jshint -W064 */

var Vector2 = require('./vector2');

exports = module.exports = LineSegment2;

var cache = [];
var created = 0;

function LineSegment2(start, end) {
    if (!(this instanceof LineSegment2)) {
        var l = cache.pop();
        if (!l) {
            l = new LineSegment2(start, end);
            created++;
        } else {
            l.start.free();
            l.end.free();
            l.set(start, end);
        }
        return l;
    }
    this.start = start || Vector2();
    this.end = end || Vector2();
}

LineSegment2.getStats = function () {
    return [cache.length, created];
};

LineSegment2.prototype.set = function (start, end) {
    this.start = start || Vector2();
    this.end = end || Vector2();
    return this;
};

LineSegment2.prototype.free = function () {
    cache.push(this);
};

LineSegment2.prototype.lengthSq = function () {
    return this.start.distanceSq(this.end);
};

LineSegment2.prototype.length = function () {
    return this.start.distance(this.end);
};

LineSegment2.prototype.closestPoint = function (point, full) {
    var l2 = this.lengthSq();
    if (l2 === 0) {
        return this.start.clone();
    }
    var t = ((point.x - this.start.x) * (this.end.x - this.start.x) + (point.y - this.start.y) * (this.end.y - this.start.y)) / l2;
    if (!full) {
        if (t < 0) {
            return this.start.clone();
        }
        if (t > 1) {
            return this.end.clone();
        }
    }
    return Vector2(this.start.x + t * (this.end.x - this.start.x), this.start.y + t * (this.end.y - this.start.y));
};

LineSegment2.prototype.distanceSq = function (point, full) {
    var c = this.closestPoint(point, full);
    var d = point.distanceSq(c);
    c.free();
    return d;
};

LineSegment2.prototype.distance = function (point, full) {
    return Math.sqrt(this.distanceSq(point, full));
};

LineSegment2.prototype.intersect = function (l, full) {
    var u_b = (l.end.y - l.start.y) * (this.end.x - this.start.x) - (l.end.x - l.start.x) * (this.end.y - this.start.y);
    if (u_b !== 0) {
        var ua_t = (l.end.x - l.start.x) * (this.start.y - l.start.y) - (l.end.y - l.start.y) * (this.start.x - l.start.x);
        var ub_t = (this.end.x - this.start.x) * (this.start.y - l.start.y) - (this.end.y - this.start.y) * (this.start.x - l.start.x);
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;
        if (full || (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1)) {
            return Vector2(this.start.x - ua * (this.start.x - this.end.x), this.start.y - ua * (this.start.y - this.end.y));
        }
    } else {
        return null; // perpendicular
    }
    return false;
};

LineSegment2.prototype.intersectCircle = function (point, radius, full) {
    var r2 = radius * radius;
    var closest = this.closestPoint(point, full);
    var dist_v = point.clone().subtract(closest);
    var len2 = dist_v.distanceSq();
    dist_v.free();
    if (len2 < r2) {
        return closest;
    } else {
        closest.free();
        return false;
    }
};

LineSegment2.prototype.equals = function (other) {
    return (this.start === other.start && this.end === other.end);
};

LineSegment2.prototype.inverse = function () {
    return LineSegment2(this.end.clone(), this.start.clone());
};

/* jshint +W064 */
