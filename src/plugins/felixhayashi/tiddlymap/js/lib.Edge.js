/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Edge
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = Edge;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");

/***************************** CODE ********************************/

/**
 * @constructor
 */
function Edge(from, to, type, id) {
  
  this.from = from;
  this.to = to;
  this.type = type;
  this.id = (id || utils.genUUID());
  
}