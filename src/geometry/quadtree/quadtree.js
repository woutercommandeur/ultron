'use strict';

var PointNode = require('./pointnode'),
    BoundsNode = require('./boundsnode');

/**
 * QuadTree data structure.
 * @class QuadTree
 * @constructor
 * @param {Object} An object representing the bounds of the top level of the QuadTree. The object
 * should contain the following properties : x, y, width, height
 * @param {Boolean} pointQuad Whether the QuadTree will contain points (true), or items with bounds
 * (width / height)(false). Default value is false.
 * @param {Number} maxDepth The maximum number of levels that the quadtree will create. Default is 4.
 * @param {Number} maxChildren The maximum number of children that a node can contain before it is split into sub-nodes.
 **/
function QuadTree(bounds, pointQuad, maxDepth, maxChildren) {
    var node;
    if (pointQuad) {
        node = new PointNode(bounds, 0, maxDepth, maxChildren);
    } else {
        node = new BoundsNode(bounds, 0, maxDepth, maxChildren);
    }

    this.root = node;
}

/**
 * The root node of the QuadTree which covers the entire area being segmented.
 * @property root
 * @type Node
 **/
QuadTree.prototype.root = null;


/**
 * Inserts an item into the QuadTree.
 * @method insert
 * @param {Object|Array} item The item or Array of items to be inserted into the QuadTree. The item should expose x, y
 * properties that represents its position in 2D space.
 **/
QuadTree.prototype.insert = function (item) {
    if (item instanceof Array) {
        var i = 0,
            len = item.length;
        while (i < len) {
            this.root.insert(item[i]);
            i++;
        }
    } else {
        this.root.insert(item);
    }
};

/**
 * Clears all nodes and children from the QuadTree
 * @method clear
 **/
QuadTree.prototype.clear = function () {
    this.root.clear();
};

/**
 * Retrieves all items / points in the same node as the specified item / point. If the specified item
 * overlaps the bounds of a node, then all children in both nodes will be returned.
 * @method retrieve
 * @param {Object} item An object representing a 2D coordinate point (with x, y properties), or a shape
 * with dimensions (x, y, width, height) properties.
 **/
QuadTree.prototype.retrieve = function (item) {
    //get a copy of the array of items
    return this.root.retrieve(item);
    // var out = this.root.retrieve(item).slice(0);
    // return out;
};

module.exports = QuadTree;
