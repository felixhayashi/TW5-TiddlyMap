/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = EdgeTypeSubscriber;

/*** Imports *******************************************************/

var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType");

/*** Code **********************************************************/

/**
 * @constructor
 */
function EdgeTypeSubscriber() {

  // may be undefined…
  if (this.subscription) {
    this.subscription.type = EdgeType._getId(this.subscription.marker, 
                                             this.subscription.namespace,
                                             this.subscription.name);
  }

}

EdgeTypeSubscriber.prototype.loadEdges = function(tObj, toWL, typeWL) {

  throw new Error("Handler does not override loadEdges() method");

};