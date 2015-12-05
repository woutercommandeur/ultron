'use strict';

function PointNode(bounds, depth, maxDepth, maxChildren) {
    this._bounds = bounds;
    this.children = [];
    this.nodes = [];

    if (maxChildren) {
        this._maxChildren = maxChildren;
    }

    if (maxDepth) {
        this._maxDepth = maxDepth;
    }

    if (depth) {
        this._depth = depth;
    }
}

//subnodes
PointNode.prototype.nodes = null;
PointNode.prototype._classConstructor = PointNode;

//children contained directly in the node
PointNode.prototype.children = null;
PointNode.prototype._bounds = null;

//read only
PointNode.prototype._depth = 0;

PointNode.prototype._maxChildren = 4;
PointNode.prototype._maxDepth = 4;

PointNode.TOP_LEFT = 0;
PointNode.TOP_RIGHT = 1;
PointNode.BOTTOM_LEFT = 2;
PointNode.BOTTOM_RIGHT = 3;


PointNode.prototype.insert = function (item) {
    if (this.nodes.length) {
        var index = this._findIndex(item);

        this.nodes[index].insert(item);

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

PointNode.prototype.retrieve = function (item) {
    if (this.nodes.length) {
        var index = this._findIndex(item);

        return this.nodes[index].retrieve(item);
    }

    return this.children;
};

PointNode.prototype._findIndex = function (item) {
    var b = this._bounds;
    var left = (item.x > b.x + b.width / 2) ? false : true;
    var top = (item.y > b.y + b.height / 2) ? false : true;

    //top left
    var index = PointNode.TOP_LEFT;
    if (left) {
        //left side
        if (!top) {
            //bottom left
            index = PointNode.BOTTOM_LEFT;
        }
    } else {
        //right side
        if (top) {
            //top right
            index = PointNode.TOP_RIGHT;
        } else {
            //bottom right
            index = PointNode.BOTTOM_RIGHT;
        }
    }

    return index;
};


PointNode.prototype.subdivide = function () {
    var depth = this._depth + 1;

    var bx = this._bounds.x;
    var by = this._bounds.y;

    //floor the values
    var b_w_h = (this._bounds.width / 2) | 0; //todo: Math.floor?
    var b_h_h = (this._bounds.height / 2) | 0;
    var bx_b_w_h = bx + b_w_h;
    var by_b_h_h = by + b_h_h;

    //top left
    this.nodes[PointNode.TOP_LEFT] = new this._classConstructor({
            x: bx,
            y: by,
            width: b_w_h,
            height: b_h_h
        },
        depth, this._maxDepth, this._maxChildren);

    //top right
    this.nodes[PointNode.TOP_RIGHT] = new this._classConstructor({
            x: bx_b_w_h,
            y: by,
            width: b_w_h,
            height: b_h_h
        },
        depth, this._maxDepth, this._maxChildren);

    //bottom left
    this.nodes[PointNode.BOTTOM_LEFT] = new this._classConstructor({
            x: bx,
            y: by_b_h_h,
            width: b_w_h,
            height: b_h_h
        },
        depth, this._maxDepth, this._maxChildren);


    //bottom right
    this.nodes[PointNode.BOTTOM_RIGHT] = new this._classConstructor({
            x: bx_b_w_h,
            y: by_b_h_h,
            width: b_w_h,
            height: b_h_h
        },
        depth, this._maxDepth, this._maxChildren);
};

PointNode.prototype.clear = function () {
    this.children.length = 0;

    var len = this.nodes.length;

    var i;
    for (i = 0; i < len; i++) {
        this.nodes[i].clear();
    }

    this.nodes.length = 0;
};


exports = module.exports = PointNode;
