/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = AbstractMagicEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Edge  = require("$:/plugins/felixhayashi/tiddlymap/js/Edge");
var AbstractRefEdgeTypeSubscriber  = require("$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function AbstractMagicEdgeTypeSubscriber(allEdgeTypes) {

  // later used for edge retrieval to identify those fields that hold connections
  this.edgeTypesByFieldName = utils.makeHashMap();

  for (var id in allEdgeTypes) {
    var edgeType = allEdgeTypes[id];
    if (this.canHandle(edgeType)) {
      this.edgeTypesByFieldName[edgeType.name] = edgeType;
    }
  }

  AbstractRefEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
AbstractMagicEdgeTypeSubscriber.prototype = Object.create(AbstractRefEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

AbstractRefEdgeTypeSubscriber.prototype.getReferencesFromField = function(tObj, toWL, typeWL) {

  throw new utils.exception.MissingOverrideError(this, 'getReferencesFromField');

};

/**
 * @inheritDoc
 */
AbstractMagicEdgeTypeSubscriber.prototype.getReferences = function(tObj, toWL, typeWL) {

  var refsGroupedByType = utils.makeHashMap();
  var fieldNames = tObj.fields;

  for (var fieldName in fieldNames) {

    var type = this.edgeTypesByFieldName[fieldName];

    if (!type || (typeWL && !typeWL[type.id])) continue;

    var toRefs = this.getReferencesFromField(tObj, fieldName, toWL);

    if (toRefs && toRefs.length) {
      refsGroupedByType[type.id] = toRefs;
    }

  }

  return refsGroupedByType;

};
