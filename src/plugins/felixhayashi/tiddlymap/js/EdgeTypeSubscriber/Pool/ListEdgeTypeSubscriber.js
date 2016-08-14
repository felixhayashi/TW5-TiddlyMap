/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/list
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tw-list"] = ListEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Edge  = require("$:/plugins/felixhayashi/tiddlymap/js/Edge");
var MagicEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/MagicEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function ListEdgeTypeSubscriber() {

  MagicEdgeTypeSubscriber.call(this);

}

// !! EXTENSION !!
ListEdgeTypeSubscriber.prototype = Object.create(MagicEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @type EdgeTypeSubscriberInfo
 */
ListEdgeTypeSubscriber.prototype.subscription = {
  namespace: "tw-list"
};

/**
 *
 */
ListEdgeTypeSubscriber.prototype.getReferences = function(tObj, fieldName) {

  return $tw.utils.parseStringArray(tObj.fields[fieldName]);

};

/**
 * Stores and maybe overrides an edge in this tiddler
 */
ListEdgeTypeSubscriber.prototype.insertEdge = function(tObj, edge, type) {

  if(!edge.to) return;
  
    // get the name without the private marker or the namespace
  var name = type.name;
  
  var list = $tw.utils.parseStringArray(tObj.fields[name]);
  // we need to clone the array since tiddlywiki might directly
  // returned the auto-parsed field value (as in case of tags, or list)
  // and this array would be read only!
  list = (list || []).slice()
  
  // transform
  var toTRef = $tm.indeces.tById[edge.to];
      
  list.push(toTRef);

  // save
  utils.setField(tObj, name, $tw.utils.stringifyList(list));
  
  return edge;
  
};

/**
 * Deletes an edge in this tiddler
 */
ListEdgeTypeSubscriber.prototype.deleteEdge = function(tObj, edge, type) {
  
  var list = $tw.utils.parseStringArray(tObj.fields[type.name]);
  // we need to clone the array since tiddlywiki might directly
  // returned the auto-parsed field value (as in case of tags, or list)
  // and this array would be read only!
  list = (list || []).slice()
  
  // transform
  var toTRef = $tm.indeces.tById[edge.to];
      
  var index = list.indexOf(toTRef);
  if(index > -1) {
    list.splice(index, 1);
  }

  // save
  utils.setField(tObj, type.name, $tw.utils.stringifyList(list));
  
  return edge;

};
