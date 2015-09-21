/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
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

/**
 * This class is used to abstract edge types. It facilitates inter
 * alia the parsing of style information, the translation of type
 * names into actual type data or the persistance of edge type data.
 * 
 * @constructor
 * 
 * @param {string|EdgeType} type - Either the edge type id (name)
 *     or a tiddler reference denoting the type or an
 *     `EdgeType` object (that is directly bounced back). If the
 *     id can be translated into a tiddler object that resides in
 *     the edge type path, then its data is retrieved automatically.
 */
var EdgeType = function(type) {

  if(type instanceof EdgeType) {
    return type; // bounce back the object
  }
      
  // call the parent constructor
  ElementType.call(
    this,
    type || "tmap:unknown",
    $tw.tmap.opt.path.edgeTypes,
    [ "label", "show-label" ]
  );

};

// !! EXTENSION !!
EdgeType.prototype = Object.create(ElementType.prototype);
// !! EXTENSION !!
    
EdgeType.prototype.getLabel = function() {

  return this.data.label || this.getId(true);

};

EdgeType.prototype.getNamespace = function() {

  var match = this.id.match("^(.*):");
  return (match ? match[1] : "");

};

/**
 * @override
 */
EdgeType.prototype.getId = function(stripNamespace) {
  
  return stripNamespace
         ? this.id.substring(this.id.indexOf(":") + 1)
         : this.id;

};
  
// !! EXPORT !!
exports.EdgeType = EdgeType;
// !! EXPORT !!#
  
})();