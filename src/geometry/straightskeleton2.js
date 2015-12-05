'use strict';
/* jshint -W064 */

var Vector2 = require('./vector2'),
    LineSegment2 = require('./linesegment2');

module.exports = StraightSkeleton2;

function StraightSkeleton2(polygon) {
    this.polygon = polygon;
    this.points = [];
    this.edges = [];
    this.generate();
}

StraightSkeleton2.prototype.generate = function () {
    var lines = this.buildStart();
    do {
        lines = this.build(lines);
    } while (lines !== false);
};

StraightSkeleton2.prototype.buildStart = function () {
    // polygon winding
    var w = this.polygon.winding() ? 1 : -1;
    var lines = [];
    var cur = Vector2(),
        prev = Vector2(),
        next = Vector2(),
        normal1 = Vector2(),
        normal2 = Vector2(),
        vv = Vector2(),
        p, i, n;
    for (i = 0; i < this.polygon.points.length; i++) {
        p = i - 1;
        if (p < 0) {
            p = this.polygon.points.length - 1;
        }
        n = i + 1;
        if (n === this.polygon.points.length) {
            n = 0;
        }
        cur.copy(this.polygon.points[i]);
        next.copy(this.polygon.points[n]);
        prev.copy(this.polygon.points[p]);

        // if we define dx=x2-x1 and dy=y2-y1, then the normals are (-dy, dx) and (dy, -dx).
        normal1.set(w * (next.y - cur.y), -1 * w * (next.x - cur.x)).normalize();
        normal2.set(w * (cur.y - prev.y), -1 * w * (cur.x - prev.x)).normalize();

        vv.copy(normal2).add(normal1).add(cur);

        var l = LineSegment2(cur.clone(), vv.clone());
        lines.push(l);
        this.addPoint(cur);
    }
    cur.free();
    prev.free();
    next.free();
    normal1.free();
    normal2.free();
    vv.free();

    return lines;
};

StraightSkeleton2.prototype.build = function (lines) {
    var i, j, vv;
    var curP = Vector2();
    var otherP = Vector2();
    var interP = Vector2();
    var n1 = Vector2();
    var n2 = Vector2();
    var newlines = [];
    for (i = 0; i < lines.length; i++) {
        curP.copy(lines[i].start);
        j = i + 1;
        if (j === lines.length) {
            j = 0;
        }
        vv = lines[i].intersect(lines[j], true);
        if (!vv || !this.polygon.containsPoint(vv)) {
            continue;
        }
        var ll = LineSegment2(curP.clone(), vv.clone());
        if (this.polygon.intersectsLine(ll, true)) {
            ll.free();
            continue;
        }
        otherP.copy(lines[j].start);
        interP.copy(vv);
        ll.free();
        var e1 = this.addPoint(curP);
        var e2 = this.addPoint(otherP);
        var e3 = this.addPoint(interP);
        this.edges.push([e1, e3]);
        this.edges.push([e2, e3]);
        /*
         vv.copy(normal2).add(normal1).add(cur);
         var l = LineSegment2(cur.clone(), vv.clone());
         lines.push(l);
         */
        // new line from these 2
        // TODO HERE
    }
    curP.free();
    otherP.free();
    interP.free();
    n1.free();
    n2.free();
    var lc = lines.pop();
    while (lc) {
        lc.free();
        lc = lines.pop();
    }
    return ( newlines.length > 0 ? newlines : false);
};


StraightSkeleton2.prototype.build2 = function (lines) {
    var i, j, vv, shortest;
    var curP = Vector2();
    var otherP = Vector2();
    var interP = Vector2();
    var n1 = Vector2();
    var n2 = Vector2();
    var newlines = [];
    for (i = 0; i < lines.length; i++) {
        shortest = -1;
        curP.copy(lines[i].start);
        for (j = 0; j < lines.length; j++) {
            if (j === i) {
                continue;
            }
            vv = lines[i].intersect(lines[j], true);
            if (!vv || !this.polygon.containsPoint(vv)) {
                continue;
            }
            n1.copy(lines[i].end).subtract(lines[i].start).normalize();
            n2.copy(vv).subtract(lines[i].start).normalize();
            if (n1.angle() === n2.angle()) {
                continue;
            }
            var ll = LineSegment2(curP.clone(), vv.clone());
            if (this.polygon.intersectsLine(ll, true)) {
                ll.free();
                continue;
            }
            var ln = ll.lengthSq();
            if (shortest < 0 || ln < shortest) {
                // found shortest intersection for this line with another
                shortest = ln;
                otherP.copy(lines[j].start);
                interP.copy(vv);
            }
            ll.free();
        }
        if (shortest !== -1) { // intersection found
            var e1 = this.addPoint(curP);
            var e2 = this.addPoint(otherP);
            var e3 = this.addPoint(interP);
            this.edges.push([e1, e3]);
            this.edges.push([e2, e3]);


            /*
             vv.copy(normal2).add(normal1).add(cur);
             var l = LineSegment2(cur.clone(), vv.clone());
             lines.push(l);
             */
            // new line from these 2
            // TODO HERE
        }
    }
    curP.free();
    otherP.free();
    interP.free();
    n1.free();
    n2.free();
    var lc = lines.pop();
    while (lc) {
        lc.free();
        lc = lines.pop();
    }
    return ( newlines.length > 0 ? newlines : false);
};


StraightSkeleton2.prototype.addPoint = function (point) {
    for (var i = 0; i < this.points.length; i++) {
        if (this.points[i].isEqualTo(point)) {
            console.log('shared point found ' + i);
            return i;
        }
    }
    this.points.push(point.clone());
    return this.points.length - 1;
};

/* jshint +W064 */
