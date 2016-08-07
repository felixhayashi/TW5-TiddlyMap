/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = EdgeType;

/*** Imports *******************************************************/

var MapElementType = require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType");
var utils          = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
  
/*** Code **********************************************************/

/**
 * This class is used to abstract edge types. It facilitates inter
 * alia the parsing of style information, the translation of type
 * names into actual type data or the persistance of edge type data.
 * 
 * @todo Make certain properties immutable, especially
 *     the id attribute and its parts!
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
function EdgeType(id, data, options) {
  
  if(id instanceof EdgeType) return id; // bounce back!
  
  options = options || {};
  
  this.root = $tm.path.edgeTypes;
  
  var parts = EdgeType._getIdParts(id, this.root);
  if(!parts.name) return new EdgeType("tmap:unknown");
  
  this.marker = parts.marker;
  this.name = parts.name;
  this.namespace = parts.namespace;
  this.id = EdgeType._getId(this.marker, this.namespace, this.name);
  
  // if the id contains no namespace itself and a namespace has
  // been provided, moreover, a type without the namespace
  // doesn't exist, then we apply the provided namespace and
  // recreate the id.
  // Attention: the namespace is really a prefix and can have a
  // marker, which needs to be considered!
  if(!this.namespace && options.namespace) {
    
    if(!(new EdgeType(this.id)).exists()) {
      return new EdgeType(options.namespace + ":" + this.name);
    }  
  }
  
  // call the parent constructor
  MapElementType.call(this, this.id, this.root, EdgeType._fieldMeta, data);
    
  var ar = this.style && this.style.arrows;
  
  if(ar) {
    this.invertedArrow = this._isArrow(ar, "from");
    this.toArrow = this._isArrow(ar, "to") || this._isArrow(ar, "middle");
    // determine if bi arrows (either from+to or no arrows)
    this.biArrow = (this.invertedArrow === this.toArrow);
    if(this.biArrow) this.toArrow = this.invertedArrow = true;
  } else {
    this.toArrow = true;
  }

};

// !! EXTENSION !!
EdgeType.prototype = Object.create(MapElementType.prototype);
// !! EXTENSION !!

EdgeType._fieldMeta = $tw.utils.extend(
  {},
  MapElementType._fieldMeta,
  {
    "label": {},
    "show-label": {}
  }
);

/**
 * An edge-type id consists of the following parts of which the
 * first two are optional: `[marker][namespace:]name`
 * 
 * The colon is not considered to be part of the namespace.
 */
EdgeType.edgeTypeRegexStr = "^(_?)([^:_][^:]*):?([^:]*)";
EdgeType.edgeTypeRegex = new RegExp(EdgeType.edgeTypeRegexStr);
  
EdgeType._getIdParts = function(str, rootPath) {

  str = utils.getWithoutPrefix(str || "", rootPath + "/");
  var match = str.match(EdgeType.edgeTypeRegex) || [];
    
  return {
    marker: match[1] || "",
    namespace: (match[3] && match[2]) || "",
    name: (match[3] || match[2]) || ""
  };
  
};

EdgeType._getId = function(marker, namespace, name) {

  return marker + namespace + (namespace ? ":" : "") + name;

};

EdgeType.prototype.getLabel = function() {

  return this.label || this.name;

};

EdgeType.prototype._isArrow = function(arrowObj, pos) {
  
  var type = arrowObj[pos];
  return (pos === "to" && type == null
          || type === true
          || typeof type === "object" && type.enabled !== false);
  
};