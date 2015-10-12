'use strict';



// Represents an edge from source to sink with capacity
var Edge = function(source, sink, capacity) {
    this.source = source;
    this.sink = sink;
    this.capacity = capacity;
};

// Main class to manage the network
var Graph = function() {
    this.edges = {};
    this.nodes = [];
    this.nodeMap = {};

    // Add a node to the graph
    this.addNode = function(node) {
        this.nodes.push(node);
        this.nodeMap[node] = this.nodes.length-1;
        this.edges[node] = [];
    };

    // Add an edge from source to sink with capacity
    this.addEdge = function(source, sink, capacity) {
        // Create the two edges = one being the reverse of the other
        this.edges[source].push(new Edge(source, sink, capacity));
        this.edges[sink].push(new Edge(sink, source, capacity));
    };

    // Does edge from source to sink exist?
    this.edgeExists = function(source, sink) {
        if(this.edges[source] !== undefined) {
            for(var i=0;i<this.edges[source].length;i++) {
                if(this.edges[source][i].sink === sink) {
                    return this.edges[source][i];
                }
            }
        }
        return null;
    };


    this.prim = function() {
        var result = [];
        var resultEdges = [];
        var usedNodes = {};

        function findMin(g) {
            var min = [999999,null];
            for(var i=0;i<result.length;i++) {
                for(var n=0;n<g.edges[result[i]].length;n++) {
                    if(g.edges[result[i]][n].capacity < min[0] && usedNodes[g.edges[result[i]][n].sink] === undefined) {
                        min = [g.edges[result[i]][n].capacity, g.edges[result[i]][n]];
                    }
                }
            }
            return min;
        }

        // Pick random start point
        var node = this.nodes[Math.round(Math.random()*(this.nodes.length-1))];
        result.push(node);
        usedNodes[node] = true;

        var min = findMin(this);
        while(min[1] !== null) {
            resultEdges.push(min[1]);
            result.push(min[1].sink);
            usedNodes[min[1].sink] = true;
            min = findMin(this);
        }

        return resultEdges;
    };

};

module.exports = Graph;
