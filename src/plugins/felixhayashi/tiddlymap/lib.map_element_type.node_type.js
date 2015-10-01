/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function() {

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";

/**************************** IMPORTS ****************************/

var MapElementType = require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType").MapElementType;
var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/***************************** CODE ******************************/

/**
 * Used to define the type of a node.
 *
 * @class
 * @extends MapElementType
 *
 */
var NodeType = function(id, data) {

  if(id instanceof NodeType) {
    return id; // bounce back!
  }
 
  // call the parent constructor
  MapElementType.call(
    this,
    id || "tmap:unknown",
    $tw.tmap.opt.path.nodeTypes,
    NodeType._fieldMeta,
    data
  );

};

// !! EXTENSION !!
NodeType.prototype = Object.create(MapElementType.prototype);
// !! EXTENSION !!

NodeType._fieldMeta = $tw.utils.extend(MapElementType._fieldMeta, {
  "view": {},
  "scope": {
    stringify: utils.getWithoutNewLines
  },
  "fa-icon": {},
  "tw-icon": {}
});

/**
 * Get all tiddlers that inherit this type.
 * 
 * @param {Array<TiddlerReference>} [src=$tw.wiki.allTitles()] - A list
 *     of tiddlers that is searched for inheritors.
 * @return {Array<TiddlerReference>} The inheritors.
 */
NodeType.prototype.getInheritors = function(src) {
   
  var s = this["scope"];
  return (s ? utils.getMatches(s, src || $tw.wiki.allTitles()) : []);
  
};

//~ /**
 //~ * Binds the node type to a set of views.
 //~ * 
 //~ * @param {Array<string|ViewAbstraction>} views - a set of views
 //~ *     to bind the array to.
 //~ */
//~ NodeType.prototype.setViews = function(views) {
  //~ 
  //~ this.views = utils.getArrayValuesAsHashmapKeys(views);
  //~ 
//~ };
//~ 
//~ NodeType.prototype.getViews = function(src) {
   
  //~ var s = this.scope;
  //~ return (s ? utils.getMatches(s, src || $tw.wiki.allTitles()) : []);
  
//~ };
      
// !! EXPORT !!
exports.NodeType = NodeType;
// !! EXPORT !!#
  
})();