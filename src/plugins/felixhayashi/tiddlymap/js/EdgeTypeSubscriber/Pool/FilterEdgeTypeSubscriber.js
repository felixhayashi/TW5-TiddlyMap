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
var MagicEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/MagicEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function FilterEdgeTypeSubstriber() {

  MagicEdgeTypeSubscriber.call(this);

}

// !! EXTENSION !!
FilterEdgeTypeSubstriber.prototype = Object.create(MagicEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @type EdgeTypeSubscriberInfo
 */
FilterEdgeTypeSubstriber.prototype.subscription = {
  namespace: "tw-filter"
};

/**
 * @override
 */
FilterEdgeTypeSubstriber.prototype.getReferences = function(tObj, fieldName, toWL) {

  var filter = tObj.fields[fieldName];
  var toRefs = utils.getMatches(filter, toWL);

  return toRefs;

};