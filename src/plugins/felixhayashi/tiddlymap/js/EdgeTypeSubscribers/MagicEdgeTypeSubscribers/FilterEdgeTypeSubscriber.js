/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tw-filter"] = FilterEdgeTypeSubstriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var AbstractMagicEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * The FilterEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields via a dynamic filter.
 *
 * @see http://tiddlymap.org/#tw-filter
 * @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/206
 *
 * @constructor
 */
function FilterEdgeTypeSubstriber(allEdgeTypes) {

  AbstractMagicEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
FilterEdgeTypeSubstriber.prototype = Object.create(AbstractMagicEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @inheritDoc
 */
FilterEdgeTypeSubstriber.prototype.priority = 10;

/**
 * @inheritDoc
 */
FilterEdgeTypeSubstriber.prototype.canHandle = function(edgeType) {

  return edgeType.namespace === "tw-filter";

};

/**
 * @override
 */
FilterEdgeTypeSubstriber.prototype.getReferencesFromField = function(tObj, fieldName, toWL) {

  var filter = tObj.fields[fieldName];
  var toRefs = utils.getMatches(filter, toWL);

  return toRefs;

};
