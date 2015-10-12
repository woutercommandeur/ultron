'use strict';

var Cell = require('./cell');
var DoublyLinkedList = require('../../linkedlist/doublylinkedlist');

function Grid(bounds, rows, cols) {
    this.bounds = bounds;
    this.rows = rows;
    this.cols = cols;
    this.cellX = this.bounds.width / this.cols;
    this.cellY = this.bounds.height / this.rows;
    this.cells = [];
    this.out = new DoublyLinkedList();
    for( var col = 0;col<this.cols;col++) {
        this.cells[col] = [];
        for ( var row=0;row<this.rows;row++) {
            this.cells[col][row] = new Cell(col*this.cellX, row*this.cellY, this.cellX, this.cellY);
        }
    }
}

Grid.prototype.insert = function(item) {
    if (item instanceof Array) {
        var i = 0,
            n = item.length;
            while (i<n) {
                this.insert(item);
                i++;
            }
    } else {
        for( var col = 0;col<this.cols;col++) {
            for ( var row=0;row<this.rows;row++) {
                this.cells[col][row].insert(item);
            }
        }
    }
};

Grid.prototype.addOut = function(items) {
    var i = 0,
        n = items.length;
    while (i<n) {
        this.out.add(items[i]);
        i++;
    }
};

Grid.prototype.retrieve = function(item) {
    // figure out cells
    var nx = ((item.x%this.cellX) + item.width) > this.cellX ? true : false,
        ny = ((item.y%this.cellY) + item.height) > this.cellY ? true : false,
        x = Math.floor(item.x / this.cellX),
        y = Math.floor(item.y / this.cellY);
    this.out.clear();

    this.addOut(this.cells[x][y].items);
    if (nx) {
        this.addOut(this.cells[x+1][y].items);
    }
    if (ny) {
        this.addOut(this.cells[x][y+1].items);
    }
    if (nx && ny) {
        this.addOut(this.cells[x+1][y+1].items);
    }
    return this.out;
};

exports = module.exports = Grid;
