'use strict';

/* jshint -W064 */
var RegularPolygon2 = require('../../geometry/regularpolygon2');
var Polygon2 = require('../../geometry/polygon2');
var Vector2 = require('../../geometry/vector2');
var LineSegment2 = require('../../geometry/linesegment2');
var gpc = require('../../geometry/gpc');
var Delaunay = require('delaunay-fast');
var Graph = require('../graph');

exports = module.exports = Building;

var createPoly = function (points) {
    var res = new gpc.geometry.PolyDefault();
    for (var i = 0; i < points.length; i++) {
        res.addPoint(new gpc.geometry.Point(points[i][0], points[i][1]));
    }
    return res;
};

var getPolygonVertices = function (poly) {
    var vertices = [];
    var numPoints = poly.getNumPoints();
    var i;

    for (i = 0; i < numPoints; i++) {
        vertices.push([poly.getX(i), poly.getY(i)]);
    }
    return vertices;
};

function Building(chance, iterations, minRadius, maxRadius, maxSides, noRotate) {
    var end, l;
    this.centers = [];
    iterations = iterations || 1;
//	if ( iterations < 3 ) {
//		iterations = 3;
//	}
    maxSides = maxSides || 6;
    if (maxSides < 4) {
        maxSides = 4;
    }
    var sidesChanceObj = {min: 4, max: maxSides};
    var radiusChanceObj = {min: minRadius, max: maxRadius};

    var sides = chance.integer(sidesChanceObj);
    var polygon = RegularPolygon2(chance.floating(radiusChanceObj), sides);
    var gpcPoly = createPoly(polygon.toArray());
    polygon.free();
    var vec, gpcPoly2, num;
    this.centers.push(Vector2());

    for (var i = 1; i < iterations; i++) {
        // new random polygon
        sides = chance.integer(sidesChanceObj);
        polygon = RegularPolygon2(chance.floating(radiusChanceObj), sides);

        // rotate random
        if (!noRotate) {
            polygon.rotate(chance.floating({min: 0, max: 2 * Math.PI / sides}));
        }

        // random point on prev poly
        num = chance.integer({min: 0, max: gpcPoly.getNumPoints() - 1});
        vec = Vector2(gpcPoly.getX(num), gpcPoly.getY(num));
        this.centers.push(vec);

        // center the polygon on a random point of the previous polygon
        polygon.translate(vec);
        gpcPoly2 = createPoly(polygon.toArray());
        gpcPoly = gpcPoly.union(gpcPoly2);

        // free our stuff for reuse
        polygon.free();
    }
    var arr = getPolygonVertices(gpcPoly);

    // generate final polygon
    polygon = Polygon2.fromArray(arr);
    this.polygon = polygon;

    // this.polygon.clean(30);

    // add outer doors
    var nrdoors = Math.ceil(iterations / 2);
    this.doors = [];

    var nr;
    var dooredges = {};
    for (i = 0; i < nrdoors; i++) {
        nr = chance.integer({min: 0, max: this.polygon.points.length - 1});
        while (dooredges[nr]) {
            nr = chance.integer({min: 0, max: this.polygon.points.length - 1});
        }
        dooredges[nr] = true;
        end = nr + 1;
        if (end === this.polygon.points.length) {
            end = 0;
        }
        l = LineSegment2(this.polygon.points[nr].clone(), this.polygon.points[end].clone());
        var p2 = l.end.clone();
        var p1 = l.start.clone();
        var length = l.length(); // p2.subtract(l.start).length();
        p2.subtract(l.start).normalize().multiplyScalar(length / 2);
        p1.add(p2);
        // this.centers.push(p1);
        this.doors.push(p1);
        p2.free();
        l.free();
    }


    var c = [];
    for (i = 0; i < this.centers.length; i++) {
        c.push(this.centers[i].toArray());
    }

    this.graph = new Graph();
    this.delaunay_used = {};

    // delaunay the centers
    this.delaunay = Delaunay.triangulate(c);

    for (i = 0; i < this.delaunay.length; i += 1) {
        if (!this.delaunay_used[this.delaunay[i]]) {
            this.graph.addNode(this.delaunay[i]);
            this.delaunay_used[this.delaunay[i]] = true;
        }
    }


    this.delaunay_exists = {};

    this.delaunay_triangles = [];
    this.delaunay_lines = [];
    for (i = 0; i < this.delaunay.length; i += 3) {
        // line 1
        this.addDelaunayLine(i, i + 1);
        this.addDelaunayLine(i + 1, i + 2);
        this.addDelaunayLine(i + 2, i);
    }

    // connect the doors;
    nr = this.centers.length;
    for (i = 0; i < this.doors.length; i++) {
        this.connectDoor(this.doors[i], nr);
    }


    // calculate the minimal spanning tree
    var edges = this.graph.prim(); // Prim(this.graph);
    // console.log(edges);
    this.mst_lines = [];

    for (i = 0; i < edges.length; i++) {
        var start = edges[i].source;
        end = edges[i].sink;
        l = LineSegment2(this.centers[start].clone(), this.centers[end].clone());
        this.mst_lines.push(l);
        //var l = LineSegment2()
    }


    this.outside = this.polygon.AABB();

    this.outside[0].subtractScalar(50);
    this.outside[1].addScalar(50);

}

Building.prototype.connectDoor = function (door, nr) {
    var min = 9999999;
    var l, d;
    var point = false;
    for (var i = 0; i < nr; i++) {
        l = LineSegment2(this.centers[i].clone(), door.clone());
        if (!this.polygon.intersectsLine(l, true)) {
            d = l.length();
            if (d < min) {
                min = d;
                point = i;
            }
        }
        l.free();
    }
    if (point !== false) {
        this.centers.push(door.clone());
        this.graph.addNode(this.centers.length - 1);
        this.graph.addEdge(point, this.centers.length - 1, min);
        this.delaunay_lines.push(LineSegment2(this.centers[point].clone(), door.clone()));
    } else {
        l.free();
    }

};

Building.prototype.addDelaunayLine = function (start, end) {
    var key1 = start + ':' + end;
    var key2 = end + ':' + start;
    if (this.delaunay_exists[key1] || this.delaunay_exists[key2]) {
        return;
    }
    this.delaunay_exists[key1] = true;
    this.delaunay_exists[key2] = true;
    var l = LineSegment2(this.centers[this.delaunay[start]].clone(), this.centers[this.delaunay[end]].clone());
    if (this.polygon.intersectsLine(l)) {
        l.free();
    } else {
        this.graph.addEdge(this.delaunay[start], this.delaunay[end], l.length());
        this.delaunay_lines.push(l);
    }
};


Building.prototype.translate = function (vec) {
    this.polygon.translate(vec);
    for (var i = 0; i < this.centers.length; i++) {
        this.centers[i].add(vec);
    }
    for (i = 0; i < this.delaunay_triangles.length; i++) {
        this.delaunay_triangles[i].translate(vec);
    }
    return this;
};


/* jshint +W064 */
