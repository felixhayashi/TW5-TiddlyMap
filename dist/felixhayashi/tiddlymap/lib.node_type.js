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

var ElementType = require("$:/plugins/felixhayashi/tiddlymap/js/ElementType").ElementType;
var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/***************************** CODE ******************************/

var NodeType = function(type) {

  if(type instanceof NodeType) {
    return type; // bounce back the object
  }
      
  // call the parent constructor
  ElementType.call(
    this,
    type || "tmap:unknown",
    $tw.tmap.opt.path.nodeTypes,
    [ "scope", "view", "fa-icon", "tw-icon" ]);

};

// !! EXTENSION !!
NodeType.prototype = Object.create(ElementType.prototype);
// !! EXTENSION !!

/**
 * Get all tiddlers that inherit this type.
 * 
 * @param {Array<TiddlerReference>} [src=$tw.wiki.allTitles()] - A list
 *     of tiddlers that is searched for inheritors.
 * @return {Array<TiddlerReference>} The inheritors.
 */
NodeType.prototype.getInheritors = function(src) {
   
  var s = this.getData("scope");
  return (s ? utils.getMatches(s, src || $tw.wiki.allTitles()) : []);
  
};
      
// !! EXPORT !!
exports.NodeType = NodeType;
// !! EXPORT !!#
  
})();