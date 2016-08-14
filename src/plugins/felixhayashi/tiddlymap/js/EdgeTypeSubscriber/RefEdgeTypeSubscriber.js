/*\

title: $:/plugins/felixhayashi/tiddlymap/js/RefEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = RefEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Edge  = require("$:/plugins/felixhayashi/tiddlymap/js/Edge");
var EdgeTypeSubscriber  = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function RefEdgeTypeSubscriber() {

  EdgeTypeSubscriber.call(this);
  
}

// !! EXTENSION !!
RefEdgeTypeSubscriber.prototype = Object.create(EdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * Loads edges stored in this tiddler.
 *
 * If typeWL is not initialized (= null) it means all types!
 */
RefEdgeTypeSubscriber.prototype.loadEdges = function(tObj, toWL, typeWL) {

  var refsByType = this.getRefsByType(tObj, toWL, typeWL);

  if (!refsByType || !utils.hasElements(refsByType)) return;

  var fromId = tObj.fields["tmap.id"];
  var idByT = $tm.indeces.idByT;
  var allETy = $tm.indeces.allETy;
  var fromTRef = utils.getTiddlerRef(tObj);

  var edges = utils.makeHashMap();

  for(var typeId in refsByType) {
    var toRefs = refsByType[typeId];

    if(!toRefs) continue;

    var type = allETy[typeId];
    for(var i = toRefs.length; i--;) {
      var toTRef = toRefs[i];

      if(!toTRef
          || !$tw.wiki.tiddlerExists(toTRef)
          || utils.isSystemOrDraft(toTRef)
          || (toWL && !toWL[toTRef])) continue;

      var id = type.id + $tw.utils.hashString(fromTRef + toTRef);
      edges[id] = new Edge(fromId, idByT[toTRef], type.id, id);
    }
  }

  return edges;

};

RefEdgeTypeSubscriber.prototype.getReferences = function(tObj, toWL, typeWL) {
  
    throw new Error("Function getReferences(tObj, toWL, typeWL) needs to be overridden.");
    
};

RefEdgeTypeSubscriber.prototype.getRefsByType = function(tObj, toWL, typeWL) {

  var refsByType = utils.makeHashMap();

  if (!typeWL || typeWL[this.subscription.type]) {
    var toRefs = this.getReferences(tObj, toWL, typeWL);

    if (toRefs && toRefs.length) {
      refsByType[this.subscription.type] = toRefs;
    }
  }
  
  return refsByType;
  
};
