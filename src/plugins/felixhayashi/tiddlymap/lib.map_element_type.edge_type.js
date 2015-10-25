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

var MapElementType = require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType").MapElementType;
var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/***************************** CODE ******************************/

/**
 * This class is used to abstract edge types. It facilitates inter
 * alia the parsing of style information, the translation of type
 * names into actual type data or the persistance of edge type data.
 * 
 * @class
 * @extends MapElementType
 * 
 * @param {string|EdgeType} type - Either the edge type id (name)
 *     or a tiddler reference denoting the type or an
 *     `EdgeType` object (that is directly bounced back). If the
 *     id can be translated into a tiddler object that resides in
 *     the edge type path, then its data is retrieved automatically.
 */
var EdgeType = function(id, data) {
  
  if(id instanceof EdgeType) {
    return id; // bounce back!
  }
        
  // call the parent constructor
  MapElementType.call(
    this,
    id || "tmap:unknown",
    $tw.tmap.opt.path.edgeTypes,
    EdgeType._fieldMeta,
    data
  );
  
  this.namespace = this._getNamespace();

};

// !! EXTENSION !!
EdgeType.prototype = Object.create(MapElementType.prototype);
// !! EXTENSION !!

EdgeType._fieldMeta = $tw.utils.extend({}, MapElementType._fieldMeta, {
  "label": {},
  "show-label": {}
});

EdgeType.prototype.getLabel = function() {

  return this.label || this.getId(true);

};

EdgeType.prototype._getNamespace = function() {

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