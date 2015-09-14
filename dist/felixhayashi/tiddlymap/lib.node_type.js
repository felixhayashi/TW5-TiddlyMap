/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/js/ElementType").ElementType;var e=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var i=function(e){if(e instanceof i){return e}t.call(this,e||"tmap:unknown",$tw.tmap.opt.path.nodeTypes,["scope","view","fa-icon","tw-icon"])};i.prototype=Object.create(t.prototype);i.prototype.getInheritors=function(t){var i=this.getData("scope");return i?e.getMatches(i,t||$tw.wiki.allTitles()):[]};exports.NodeType=i})();