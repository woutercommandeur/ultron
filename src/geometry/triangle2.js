'use strict';

/* jshint -W064 */

exports = module.exports = Triangle2;

var epsilon = 0.0000001;
var cache = [];
var created = 0;

function Triangle2 (v0, v1, v2) {
    if (!(this instanceof Triangle2)) {
        var v = cache.pop();
        if (!v) {
            v = new Triangle2(v0, v1, v2);
            created++;
        } else {
            v.set(v0, v1, v2);
            //v.calcCircumcircle();
        }
        return v;
    }
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    /*
    this.center = Vector2();
    this.radius = 0;
    this.radius_squared = 0;

    this.calcCircumcircle();
    */
}

Triangle2.getStats = function() {
    return [cache.length, created];
};

Triangle2.prototype.free = function ()
{
    cache.push(this);
};


Triangle2.prototype.set = function (v0, v1, v2)
{
    this.v0.free();
    this.v1.free();
    this.v2.free();

    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    return this;
};

Triangle2.prototype.translate = function (vec)
{
    this.v0.add(vec);
    this.v1.add(vec);
    this.v2.add(vec);
    return this;
};

Triangle2.prototype.calcCircumcircle = function() {
    // From: http://www.exaflop.org/docs/cgafaq/cga1.html

    var A = this.v1.x - this.v0.x;
    var B = this.v1.y - this.v0.y;
    var C = this.v2.x - this.v0.x;
    var D = this.v2.y - this.v0.y;

    var E = A * (this.v0.x + this.v1.x) + B * (this.v0.y + this.v1.y);
    var F = C * (this.v0.x + this.v2.x) + D * (this.v0.y + this.v2.y);

    var G = 2.0 * (A * (this.v2.y - this.v1.y) - B * (this.v2.x - this.v1.x));

    var dx, dy;

    if (Math.abs(G) < epsilon) {
        // Collinear - find extremes and use the midpoint

        var minx = Math.min(this.v0.x, this.v1.x, this.v2.x);
        var miny = Math.min(this.v0.y, this.v1.y, this.v2.y);
        var maxx = Math.max(this.v0.x, this.v1.x, this.v2.x);
        var maxy = Math.max(this.v0.y, this.v1.y, this.v2.y);

        this.center.set((minx + maxx) / 2, (miny + maxy) / 2);

        dx = this.center.x - minx;
        dy = this.center.y - miny;
    } else {
        var cx = (D * E - B * F) / G;
        var cy = (A * F - C * E) / G;

        this.center.set(cx, cy);

        dx = this.center.x - this.v0.x;
        dy = this.center.y - this.v0.y;
    }

    this.radius_squared = dx * dx + dy * dy;
    this.radius = Math.sqrt(this.radius_squared);
};

Triangle2.prototype.inCircumcircle = function(v) {
    var dx = this.center.x - v.x;
    var dy = this.center.y - v.y;
    var dist_squared = dx * dx + dy * dy;

    return (dist_squared <= this.radius_squared);
};
/* jshint +W064 */
