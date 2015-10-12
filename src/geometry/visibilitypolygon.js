'use strict';
/* jshint -W064 */

/*
    Based upon https://code.google.com/p/visibility-polygon-js/
    Made by Byron Knoll in 2013/2014.
*/

var Polygon2 = require('./polygon2'),
    Vector2 = require('./vector2'),
    LineSegment2 = require('./linesegment2');

var PI = Math.PI;
var PI2 = PI*2;
var PImin = -1*PI;
var epsilon = 0.0000001;

var segmentIter = ['start', 'end'];
function pointsorter(a,b) {
    return a[2] - b[2];
}

function VisibilityPolygon(segments)
{
    this.polygon = Polygon2();
    this.segments = segments;
    this.heap = [];
    this.map = new Array(this.segments.length);
    this.points = new Array(this.segments.length * 2);
    this.position = Vector2();
}

VisibilityPolygon.prototype.angle = function (p1, p2)
{
    var p = p2.clone().subtract(p1);
    var a = p.angle();
    p.free();
    return a;
};

VisibilityPolygon.prototype.angle2 = function (a, b, c) {
    var a1 = this.angle(a, b);
    var a2 = this.angle(b, c);
    var a3 = a1 - a2;
    if (a3 < 0) { a3 += PI2; }
    if (a3 > PI2) { a3 -= PI2; }
    return a3;
};


VisibilityPolygon.prototype.compute = function (position)
{
    this.position.copy(position);
    this.reset();
    this.sortPoints();

    var start = this.position.clone();
    start.x +=1; // why?

    var i = 0,
        n = this.segments.length;
    while (i < n) {
        var a1 = this.angle(this.segments[i].start, this.position);
        var a2 = this.angle(this.segments[i].end, this.position);
        if (
            ( a1 > PImin && a1 <= 0 && a2 <= PI && a2 >= 0 && a2 - a1 > PI) ||
            (a2 > PImin && a2 <= 0 && a1 <= PI && a1 >= 0 && a1 - a2 > PI)
        ) {
            this.insert(i, start);
        }
        i += 1;
    }
    i = 0;
    n = this.segments.length*2;
    while (i < n) {
        var extend = false;
        var shorten = false;
        var orig = i;
        var vertex = this.segments[this.points[i][0]][this.points[i][1]];
        var old_segment = this.heap[0];
        do {
            if (this.map[this.points[i][0]] !== -1) {
                if (this.points[i][0] === old_segment) {
                    extend = true;
                    vertex = this.segments[this.points[i][0]][this.points[i][1]];
                }
                this.remove(this.map[this.points[i][0]], vertex);
            } else {
                this.insert(this.points[i][0], vertex);
                if (this.heap[0] !== old_segment) {
                    shorten = true;
                }
            }
            ++i;
            if (i === n) { break; }
        } while (this.points[i][2] < this.points[orig][2] + epsilon);

        var l = LineSegment2(position.clone(), vertex.clone());
        if (extend) {
            this.polygon.add(vertex.clone());
            var cur = this.segments[this.heap[0]].intersect(l, true);
            if (cur ) {
                if (!cur.isEqualEpsilon(vertex)) {
                    this.polygon.add(cur);
                } else {
                    cur.free();
                }
            }
        } else if (shorten) {
            this.polygon.add(this.segments[old_segment].intersect(l, true));
            this.polygon.add(this.segments[this.heap[0]].intersect(l, true));
        }
    }
    return this.polygon;
};


VisibilityPolygon.prototype.insert = function (index, destination) {
    var l = LineSegment2(this.position.clone(), destination.clone());
    var intersect = this.segments[index].intersect(l, true);
    if (intersect === false) {
        l.free();
        return;
    }
    intersect.free();

    var cur = this.heap.length;
    this.heap.push(index);
    this.map[index] = cur;
    while (cur > 0) {
        var parent = this.parent(cur);
        if (!this.lessThan(this.heap[cur], this.heap[parent], destination)) {
            break;
        }
        this.map[this.heap[parent]] = cur;
        this.map[this.heap[cur]] = parent;
        var temp = this.heap[cur];
        this.heap[cur] = this.heap[parent];
        this.heap[parent] = temp;
        cur = parent;
    }
};

VisibilityPolygon.prototype.remove = function (index, destination) {
    this.map[this.heap[index]] = -1;
    if (index === this.heap.length - 1) {
        this.heap.pop();
        return;
    }
    this.heap[index] = this.heap.pop();
    this.map[this.heap[index]] = index;
    var cur = index;
    var parent = this.parent(cur);
    if (cur !== 0 && this.lessThan(this.heap[cur], this.heap[parent], destination)) {
        while (cur > 0) {
            parent = this.parent(cur);
            if (!this.lessThan(this.heap[cur], this.heap[parent], destination)) {
                break;
            }
            this.swap(cur, parent);
            cur = parent;
        }
    } else {
        while (true) {
            var left = this.child(cur);
            var right = left + 1;
            if (left < this.heap.length && this.lessThan(this.heap[left], this.heap[cur], destination) &&
                (right === this.heap.length || this.lessThan(this.heap[left], this.heap[right], destination))) {
                    this.swap(cur, left);
                    cur = left;
                } else if (right < this.heap.length && this.lessThan(this.heap[right], this.heap[cur], destination)) {
                    this.swap(cur, right);
                    cur = right;
                } else {
                    break;
                }
            }
        }
    };



VisibilityPolygon.prototype.lessThan = function (index1, index2, destination) {
    var l = LineSegment2(this.position.clone(), destination.clone());
    var inter1 = this.segments[index1].intersect(l, true);
    var inter2 = this.segments[index2].intersect(l, true);
    if (!inter1.isEqualEpsilon(inter2)) {
        var d1 = inter1.distanceSq(this.position);
        var d2 = inter2.distanceSq(this.position);
        inter1.free();
        inter2.free();
        l.free();
        return d1 < d2;
    }
    var end1 = this.segments[index1].start;
    if (inter1.isEqualEpsilon(this.segments[index1].start)) {
        end1 = this.segments[index1].end;
    }
    var end2 = this.segments[index2].start;
    if (inter2.isEqualEpsiolon(this.segments[index2].start)) {
        end2 = this.segments[index2].end;
    }
    var a1 = this.angle2(end1, inter1, this.position);
    var a2 = this.angle2(end2, inter2, this.position);
    inter1.free();
    inter2.free();
    if (a1 < PI) {
        if (a2 > PI) {
            return true;
        }
        return a2 < a1;
    }
    return a1 < a2;
};

VisibilityPolygon.prototype.parent = function (index) {
    return Math.floor((index - 1) / 2);
};

VisibilityPolygon.prototype.child = function (index) {
    return 2 * index + 1;
};

VisibilityPolygon.prototype.swap = function (c, l) {
    this.map[this.heap[l]] = c;
    this.map[this.heap[c]] = l;
    var temp = this.heap[l];
    this.heap[l] = this.heap[c];
    this.heap[c] = temp;
};


VisibilityPolygon.prototype.sortPoints = function ()
{
    var i = 0,
    n = this.segments.length,
    p = null,
    pp = Vector2();
    while (i < n) {
        for (var j = 0; j < 2; ++j) {
            if (j === 0) {
                p = this.segments[i][segmentIter[j]];
            } else {
                p = this.segments[i][segmentIter[j]];
            }
            pp.copy(this.position).subtract(p);
            var nr = 2 * i + j;
            if (this.points[nr]) {
                this.points[nr][0] = i;
                this.points[nr][1] = segmentIter[j];
                this.points[nr][2] = pp.angle();
            } else {
                this.points[nr] = [i, segmentIter[j], pp.angle()];
            }
        }
        i += 1;
    }
    pp.free();
    this.points = this.points.sort(pointsorter);
};

VisibilityPolygon.prototype.reset = function ()
{
    this.polygon.freePoints();
    var i = 0,
    n = this.map.length;
    while (i < n) {
        this.map[i] = -1;
        i += 1;
    }
    while (this.heap.length > 0) {
        this.heap.pop();
    }
};
/* jshint +W064 */
