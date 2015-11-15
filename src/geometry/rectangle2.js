'use strict';
/* jshint -W064 */

exports = module.exports = Rectangle2;

var cache = [];
var created = 0;

function Rectangle2 (x, y, width, height) {
    if (!(this instanceof Rectangle2)) {
        var v = cache.pop();
        if (!v) {
            v = new Rectangle2(x || 0, y || 0);
            created++;
        } else {
            v.set(x, y);
        }
        return v;
    }
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
}

Rectangle2.getStats = function() {
    return [cache.length, created];
};

Rectangle2.fromArray = function (arr) {
    return Rectangle2(arr[0] || 0, arr[1] || 0, arr[2] || 0, arr[3] || 0);
};

Rectangle2.fromObject = function (obj) {
    return Rectangle2(obj.x || 0, obj.y || 0, obj.width || 0, obj.height || 0);
};

Rectangle2.prototype.set = function (x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    return this;
};

Rectangle2.prototype.free = function () {
    cache.push(this);
};

Rectangle2.prototype.translate = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
};

Rectangle2.prototype.toString = function () {
    return 'x: ' + this.x + ', y: ' + this.y + ', width: ' + this.width + ', height: ' + this.height;
};

Rectangle2.prototype.toArray = function () {
    return [ this.x, this.y ];
};

Rectangle2.prototype.toObject = function () {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
};

/* jshint +W064 */
