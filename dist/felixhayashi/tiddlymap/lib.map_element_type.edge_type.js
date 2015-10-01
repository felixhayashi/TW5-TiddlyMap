/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType").MapElementType;var e=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var i=function(e,a){if(e instanceof i){return e}t.call(this,e||"tmap:unknown",$tw.tmap.opt.path.edgeTypes,i._fieldMeta,a);this.namespace=this._getNamespace()};i.prototype=Object.create(t.prototype);i._fieldMeta=$tw.utils.extend(t._fieldMeta,{label:{},"show-label":{}});i.prototype.getLabel=function(){return this.label||this.getId(true)};i.prototype._getNamespace=function(){var t=this.id.match("^(.*):");return t?t[1]:""};i.prototype.getId=function(t){return t?this.id.substring(this.id.indexOf(":")+1):this.id};exports.EdgeType=i})();