'use strict';

/* jshint -W064 */

var Vector2 = require('./vector2');
var LineSegment2 = require('./linesegment2');
var epsilon = 0.0000001;

exports = module.exports = Polygon2;

var cache = [];
var created = 0;

function Polygon2(points) {
    if (!(this instanceof Polygon2)) {
        var p = cache.pop();
        if (!p) {
            p = new Polygon2(points);
            created++;
        } else {
            p.freePoints();
            p.set(points);
        }
        return p;
    }
    this.points = points || [];
}

Polygon2.fromArray = function (points) {
    var p = Polygon2();
    for (var i = 0; i < points.length; i++) {
        p.add(Vector2.fromArray(points[i]));
    }
    return p;
};

Polygon2.getStats = function () {
    return [cache.length, created];
};

Polygon2.prototype.free = function () {
    this.freePoints();
    cache.push(this);
};

Polygon2.prototype.freePoints = function () {
    var p = this.points.pop();
    while (p) {
        p.free();
        p = this.points.pop();
    }
    return this;
};

Polygon2.prototype.set = function (points) {
    this.points = points || [];
    return this;
};

Polygon2.prototype.add = function (point) {
    this.points.push(point);
    return this;
};

Polygon2.prototype.translate = function (vec) {
    for (var i = 0; i < this.points.length; i++) {
        this.points[i].add(vec);
    }
    return this;
};

Polygon2.prototype.rotate = function (angle, origin) {
    for (var i = 0; i < this.points.length; i++) {
        this.points[i].rotate(angle, origin);
    }
    return this;
};

Polygon2.prototype.containsPoint = function (point) {
    var inside = false;
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var xi = this.points[i].x, yi = this.points[i].y;
        var xj = this.points[j].x, yj = this.points[j].y;

        var intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
};

Polygon2.prototype.intersectsLine = function (line, ignorePoints) {
    var tempLine = LineSegment2();

    var intersect = false;
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var xi = this.points[i].x, yi = this.points[i].y;
        var xj = this.points[j].x, yj = this.points[j].y;
        tempLine.start.set(xi, yi);
        tempLine.end.set(xj, yj);
        var is = tempLine.intersect(line);
        if (is) {
            if (ignorePoints && (this.points[i].isEqualEpsilon(is) || this.points[j].isEqualEpsilon(is) || line.start.isEqualEpsilon(is) || line.end.isEqualEpsilon(is) )) {
                // special perpendicular test
                var a = this.points[i].clone().subtract(this.points[j]).normalize();
                var aa = a.angle();
                a.copy(line.start).subtract(line.end).normalize();
                var bb = a.angle();
                a.free();
                is.free();
                if (Math.abs(aa - bb) < epsilon) {
                    intersect = true;
                    break;
                }
                continue;
            }
            is.free();
            intersect = true;
            break;
        }
    }
    tempLine.free();
    return intersect;
};


Polygon2.prototype.intersectsTriangle = function (triangle, ignorePoints) {
    var tempLine = LineSegment2();

    tempLine.start.copy(triangle.v0);
    tempLine.end.copy(triangle.v1);

    if (this.intersectsLine(tempLine, ignorePoints)) {
        tempLine.free();
        return true;
    }

    tempLine.start.copy(triangle.v1);
    tempLine.end.copy(triangle.v2);

    if (this.intersectsLine(tempLine, ignorePoints)) {
        tempLine.free();
        return true;
    }

    tempLine.start.copy(triangle.v2);
    tempLine.end.copy(triangle.v0);

    if (this.intersectsLine(tempLine, ignorePoints)) {
        tempLine.free();
        return true;
    }
    return false;
};

Polygon2.prototype.AABB = function () {
    var min = this.points[0].clone();
    var max = this.points[0].clone();

    for (var i = 1; i < this.points.length; i++) {
        var p = this.points[i];
        if (p.x < min.x) {
            min.x = p.x;
        } else if (p.x > max.x) {
            max.x = p.x;
        }
        if (p.y < min.y) {
            min.y = p.y;
        } else if (p.y > max.y) {
            max.y = p.y;
        }
    }
    return [min, max];
};

// negative = CCW
Polygon2.prototype.winding = function () {
    return this.area() > 0;
};

Polygon2.prototype.rewind = function (cw) {
    cw = !!cw;
    var winding = this.winding();
    if (winding !== cw) {
        this.points.reverse();
    }
    return this;
};

Polygon2.prototype.area = function () {
    var area = 0;
    var first = this.points[0];
    var p1 = Vector2();
    var p2 = Vector2();
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        p1.copy(first).subtract(this.points[i]);
        p2.copy(first).subtract(this.points[j]);
        area += p1.cross(p2);
    }
    p1.free();
    p2.free();
    return area / 2;
};

Polygon2.prototype.clean = function (distance) {
    var p1 = Vector2();
    var newpoints = [];
    for (var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var length = p1.copy(this.points[i]).subtract(this.points[j]).length();
        if (length > distance) {
            newpoints.push(this.points[i]);
        } else {
            this.points[i].free();
        }
    }
    this.points = newpoints;
};

Polygon2.prototype.toArray = function () {
    var ret = [];
    for (var i = 0; i < this.points.length; i++) {
        ret.push(this.points[i].toArray());
    }
    return ret;
};


/* jshint +W064 */
