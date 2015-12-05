'use strict';

/* jshint -W064 */

var Vector2 = require('./vector2'),
    Polygon2 = require('./polygon2');

exports = module.exports = RegularPolygon2;

function RegularPolygon2(radius, sides, center) {
    center = center || Vector2();

    if (!sides || sides < 2) {
        sides = 3;
    }
    if (!radius || radius <= 0) {
        radius = 1;
    }

    var p = Polygon2();
    for (var i = 0; i < sides; i++) {
        p.add(Vector2(center.x + radius * Math.cos((i * 2 * Math.PI / sides) + 0.25 * Math.PI), center.y + radius * Math.sin((i * 2 * Math.PI / sides) + 0.25 * Math.PI)));
    }
    return p;
}
/* jshint +W064 */
