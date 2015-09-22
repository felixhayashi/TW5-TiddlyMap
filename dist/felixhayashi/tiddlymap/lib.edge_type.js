/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/js/ElementType").ElementType;var e=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var i=function(e){if(e instanceof i){return e}t.call(this,e||"tmap:unknown",$tw.tmap.opt.path.edgeTypes,["label","show-label"])};i.prototype=Object.create(t.prototype);i.prototype.getLabel=function(){return this.data.label||this.getId(true)};i.prototype.getNamespace=function(){var t=this.id.match("^(.*):");return t?t[1]:""};i.prototype.getId=function(t){return t?this.id.substring(this.id.indexOf(":")+1):this.id};exports.EdgeType=i})();