/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports.NodeType = NodeType;

/*** Imports *******************************************************/

var MapElementType = require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType").MapElementType;
var utils          = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/*** Code **********************************************************/

/**
 * Used to define the type of a node.
 *
 * @class
 * @extends MapElementType
 *
 */
function NodeType(id, data) {

  if(id instanceof NodeType) {
    return id; // bounce back!
  }
 
  id = (typeof id === "string"
        ? utils.getWithoutPrefix(id, $tm.path.nodeTypes + "/")
        : "tmap:unknown");
 
  // call the parent constructor
  MapElementType.call(
    this,
    id,
    $tm.path.nodeTypes,
    NodeType._fieldMeta,
    data
  );

};

// !! EXTENSION !!
NodeType.prototype = Object.create(MapElementType.prototype);
// !! EXTENSION !!

NodeType._fieldMeta = $tw.utils.extend({}, MapElementType._fieldMeta, {
  "view": {},
  "priority": {
    parse: function(raw) {
      return (isNaN(raw) ? 1 : parseInt(raw));
    },
    stringify: function(num) {
      return utils.isInteger(num) ? num.toString() : "1";
    }
  },
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
   
  var s = this.scope;
  return (s ? utils.getMatches(s, src || $tw.wiki.allTitles()) : []);
  
};