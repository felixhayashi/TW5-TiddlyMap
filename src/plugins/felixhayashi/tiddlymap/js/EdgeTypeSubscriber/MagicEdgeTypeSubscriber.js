/*\

title: $:/plugins/felixhayashi/tiddlymap/js/MagicEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = MagicEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Edge  = require("$:/plugins/felixhayashi/tiddlymap/js/Edge");
var RefEdgeTypeSubscriber  = require("$:/plugins/felixhayashi/tiddlymap/js/RefEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function MagicEdgeTypeSubscriber() {

  RefEdgeTypeSubscriber.call(this);
  
  var namespace = this.subscription.namespace;
  if (!namespace || !utils.startsWith(namespace, "tw-")) {
    throw new Error("Cannot create MagicEdgeTypeSubscriber for namespace: " + namespace);
  }
  
  if (!this.getReferences) {
    throw new Error("Function getReferences() is required for Magic EdgeType subscribers");
  }
  
  this.subscription.magic = true;

}

// !! EXTENSION !!
MagicEdgeTypeSubscriber.prototype = Object.create(RefEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

MagicEdgeTypeSubscriber.prototype.getReferences = function(tObj, toWL, typeWL) {
  
  throw new Error("Function getReferences(tObj, fieldName, toWL) needs to be overridden.");
    
};

/**
 * @override
 */
MagicEdgeTypeSubscriber.prototype.getRefsByType = function(tObj, toWL, typeWL) {

  var maETyFiNa = $tm.indeces.maETyFiNa; // magic edge-type field names
  var fromTObjFields = tObj.fields;

  var refsByType = utils.makeHashMap();
  for (var fieldName in fromTObjFields) {

    var type = maETyFiNa[fieldName];

    if (!type || (typeWL && !typeWL[type.id])) continue;
    if (type.namespace !== this.subscription.namespace) continue;

    var toRefs = this.getReferences(tObj, fieldName, toWL);

    if (toRefs && toRefs.length) {
      refsByType[type.id] = toRefs;
    }

  }
  
  return refsByType;
  
};
