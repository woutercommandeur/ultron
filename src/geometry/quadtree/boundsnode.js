'use strict';

var PointNode = require('./pointnode');

function BoundsNode(bounds, depth, maxChildren, maxDepth) {
    PointNode.call(this, bounds, depth, maxChildren, maxDepth);
    this._stuckChildren = [];
}

BoundsNode.prototype = new PointNode();
BoundsNode.prototype._classConstructor = BoundsNode;
BoundsNode.prototype._stuckChildren = null;

//we use this to collect and conctenate items being retrieved. This way
//we dont have to continuously create new Array instances.
//Note, when returned from QuadTree.retrieve, we then copy the array
BoundsNode.prototype._out = [];

BoundsNode.prototype.insert = function (item) {
    if (this.nodes.length) {
        var index = this._findIndex(item);
        var node = this.nodes[index];

        //todo: make _bounds bounds
        if (item.x >= node._bounds.x &&
            item.x + item.width <= node._bounds.x + node._bounds.width &&
            item.y >= node._bounds.y &&
            item.y + item.height <= node._bounds.y + node._bounds.height) {

            this.nodes[index].insert(item);

        } else {
            this._stuckChildren.push(item);
        }

        return;
    }

    this.children.push(item);

    var len = this.children.length;

    if (this._depth < this._maxDepth &&
        len > this._maxChildren) {

        this.subdivide();

        var i;
        for (i = 0; i < len; i++) {
            this.insert(this.children[i]);
        }

        this.children.length = 0;
    }
};

BoundsNode.prototype.getChildren = function () {
    return this.children.concat(this._stuckChildren);
};

BoundsNode.prototype.retrieve = function (item) {
    var out = this._out;
    out.length = 0;
    if (this.nodes.length) {
        var index = this._findIndex(item);
        var node = this.nodes[index];

        if (item.x >= node._bounds.x &&
            item.x + item.width <= node._bounds.x + node._bounds.width &&
            item.y >= node._bounds.y &&
            item.y + item.height <= node._bounds.y + node._bounds.height) {

            out.push.apply(out, this.nodes[index].retrieve(item));
        } else {
            //Part of the item are overlapping multiple child nodes. For each of the overlapping nodes, return all containing objects.

            if (item.x <= this.nodes[PointNode.TOP_RIGHT]._bounds.x) {
                if (item.y <= this.nodes[PointNode.BOTTOM_LEFT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.TOP_LEFT].retrieve(item));
                }

                if (item.y + item.height > this.nodes[PointNode.BOTTOM_LEFT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.BOTTOM_LEFT].retrieve(item));
                }
            }

            if (item.x + item.width > this.nodes[PointNode.TOP_RIGHT]._bounds.x) {//position+width bigger than middle x
                if (item.y <= this.nodes[PointNode.BOTTOM_RIGHT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.TOP_RIGHT].retrieve(item));
                }

                if (item.y + item.height > this.nodes[PointNode.BOTTOM_RIGHT]._bounds.y) {
                    out.push.apply(out, this.nodes[PointNode.BOTTOM_RIGHT].retrieve(item));
                }
            }
        }
    }

    out.push.apply(out, this._stuckChildren);
    out.push.apply(out, this.children);

    return out;
};

//Returns all contents of node.
BoundsNode.prototype.getAllContent = function () {
    var out = this._out;
    if (this.nodes.length) {

        var i;
        for (i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllContent();
        }
    }
    out.push.apply(out, this._stuckChildren);
    out.push.apply(out, this.children);
    return out;
};

BoundsNode.prototype.clear = function () {

    this._stuckChildren.length = 0;

    //array
    this.children.length = 0;

    var len = this.nodes.length;

    if (!len) {
        return;
    }

    var i;
    for (i = 0; i < len; i++) {
        this.nodes[i].clear();
    }

    //array
    this.nodes.length = 0;

    //we could call the super clear function but for now, im just going to inline it
    //call the hidden super.clear, and make sure its called with this = this instance
    //Object.getPrototypeOf(BoundsNode.prototype).clear.call(this);
};

module.exports = BoundsNode;
