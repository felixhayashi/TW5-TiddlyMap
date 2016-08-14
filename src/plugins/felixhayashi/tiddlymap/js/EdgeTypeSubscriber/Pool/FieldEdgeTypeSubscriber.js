/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/field
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tw-field"] = FieldEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Edge  = require("$:/plugins/felixhayashi/tiddlymap/js/Edge");
var MagicEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/MagicEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function FieldEdgeTypeSubscriber() {

  MagicEdgeTypeSubscriber.call(this);

}

// !! EXTENSION !!
FieldEdgeTypeSubscriber.prototype = Object.create(MagicEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @type EdgeTypeSubscriberInfo
 */
FieldEdgeTypeSubscriber.prototype.subscription = {
  namespace: "tw-field"
};

/**
 * @override
 */
FieldEdgeTypeSubscriber.prototype.getReferences = function(tObj, fieldName) {

  // wrap in array
  return [ tObj.fields[fieldName] ];

};

/**
 * Stores and maybe overrides an edge in this tiddler
 */
FieldEdgeTypeSubscriber.prototype.insertEdge = function(tObj, edge, type) {
    
  var toTRef = $tm.indeces.tById[edge.to];
  if(toTRef == null) return; // null or undefined
        
  // only use the name without the private marker or the namespace
  utils.setField(tObj, type.name, toTRef);
  
  return edge;

};

/**
 * Deletes an edge in this tiddler
 */
FieldEdgeTypeSubscriber.prototype.deleteEdge = function(tObj, edge, type) {

  var toTRef = $tm.indeces.tById[edge.to];
  if(toTRef == null) return; // null or undefined
    
  // only use the name without the private marker or the namespace
  utils.setField(tObj, type.name, "");
  
  return edge;

};