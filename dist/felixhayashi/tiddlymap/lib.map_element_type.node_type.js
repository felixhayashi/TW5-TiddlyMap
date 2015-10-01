/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType").MapElementType;var e=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var i=function(e,a){if(e instanceof i){return e}t.call(this,e||"tmap:unknown",$tw.tmap.opt.path.nodeTypes,i._fieldMeta,a)};i.prototype=Object.create(t.prototype);i._fieldMeta=$tw.utils.extend(t._fieldMeta,{view:{},scope:{stringify:e.getWithoutNewLines},"fa-icon":{},"tw-icon":{}});i.prototype.getInheritors=function(t){var i=this["scope"];return i?e.getMatches(i,t||$tw.wiki.allTitles()):[]};exports.NodeType=i})();