/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@preserve

\*/
"use strict";module.exports=NodeType;var MapElementType=require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType");var utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");function NodeType(e,t){if(e instanceof NodeType){return e}e=typeof e==="string"?utils.getWithoutPrefix(e,$tm.path.nodeTypes+"/"):"tmap:unknown";MapElementType.call(this,e,$tm.path.nodeTypes,NodeType._fieldMeta,t)}NodeType.prototype=Object.create(MapElementType.prototype);NodeType._fieldMeta=$tw.utils.extend({},MapElementType._fieldMeta,{view:{},priority:{parse:function(e){return isNaN(e)?1:parseInt(e)},stringify:function(e){return utils.isInteger(e)?e.toString():"1"}},scope:{stringify:utils.getWithoutNewLines},"fa-icon":{},"tw-icon":{}});NodeType.prototype.getInheritors=function(e){var t=this.scope;return t?utils.getMatches(t,e||$tw.wiki.allTitles()):[]};