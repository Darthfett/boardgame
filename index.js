var assert = require('assert');
var dagre = require('dagre');
var dot = require('graphlib-dot');

var graph ="digraph {\n"+
"    S [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    A [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    B [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    C [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    D [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    E [shape=circle, width=16, height=16, fixedsize=true];\n"+
"    S -> A;\n"+
"    A -> B;\n"+
"    A -> S;\n"+
"    B -> C;\n"+
"    C -> D;\n"+
"    C -> S;\n"+
"    D -> E;\n"+
"    E -> S;\n"+
"}";

console.log(graph);

function main() {

    // Parse the graphviz format graph
    var digraph = dot.parse(graph);

    // Use Dagre to generate a layout
    var layout = dagre.layout().run(digraph);

    // Debug: print out the node and edge information
    layout.eachNode(function(u, value) {
        console.log("Node " + u + ": " + JSON.stringify(value));
    });
    layout.eachEdge(function(e, u, v, value) {
        console.log("Edge " + u + " -> " + v + ": " + JSON.stringify(value));
    });
    
    // Prepare to draw to canvas
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext('2d');

    // Draw a circle for each node at the x, y given by the Dagre layout
    layout.eachNode(function(u, node) {
        var rad = parseInt(node.width);
        var cx = node.x;
        var cy = node.y;

        context.beginPath();
        context.arc(cx, cy, rad, 0, 2 * Math.PI, false);
        context.stroke();
        context.font = "bold 8px Arial";
        context.fillText(u, cx, cy);
    });
    
    // Not really working: Draw lines starting from Node U, to each point in value, finally to node V
    layout.eachEdge(function(e, u, v, value) {
        var points = [layout.node(u)];
        points.push.apply(points, value.points);        
        points.push(layout.node(v));
        
        // Debug: Draw a circle at each point
        context.beginPath();
        context.arc(points[0].x, points[0].y, 3, 0, 2 * Math.PI, false);
        context.stroke();
        
        for(var i = 1; i < points.length; i++) {
            var p0 = points[i-1];
            var p1 = points[i];
            context.beginPath();
            context.moveTo(p0.x, p0.y);
            context.lineTo(p1.x, p1.y);
            context.stroke();
            
            context.beginPath();
            context.arc(p1.x, p1.y, 3, 0, 2 * Math.PI, false);
            context.stroke();
        }
    });

}

document.addEventListener("DOMContentLoaded", main);