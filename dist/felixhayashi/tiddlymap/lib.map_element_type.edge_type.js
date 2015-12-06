/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType").MapElementType;var e=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var i=function(e,r){if(e instanceof i){return e}t.call(this,e||"tmap:unknown",$tw.tmap.opt.path.edgeTypes,i._fieldMeta,r);var s=this.style&&this.style.arrows;if(s){this.invertedArrow=this._isArrow(s,"from");this.toArrow=this._isArrow(s,"to")||this._isArrow(s,"middle");this.biArrow=this.invertedArrow===this.toArrow;if(this.biArrow)this.toArrow=this.invertedArrow=true}else{this.toArrow=true}this.namespace=this._getNamespace()};i.prototype=Object.create(t.prototype);i._fieldMeta=$tw.utils.extend({},t._fieldMeta,{label:{},"show-label":{}});i.prototype.getLabel=function(){return this.label||this.getId(true)};i.prototype._getNamespace=function(){var t=this.id.match("^(.*):");return t?t[1]:""};i.prototype._isArrow=function(t,e){var i=t[e];return e==="to"&&i==null||i===true||typeof i==="object"&&i.enabled!==false};i.prototype.getId=function(t){return t?this.id.substring(this.id.indexOf(":")+1):this.id};exports.EdgeType=i})();