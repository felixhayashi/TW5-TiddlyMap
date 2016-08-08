/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@preserve

\*/
"use strict";module.exports=EdgeType;var MapElementType=require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType");var utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");function EdgeType(e,t,r){if(e instanceof EdgeType)return e;r=r||{};this.root=$tm.path.edgeTypes;var i=EdgeType._getIdParts(e,this.root);if(!i.name)return new EdgeType("tmap:unknown");this.marker=i.marker;this.name=i.name;this.namespace=i.namespace;this.id=EdgeType._getId(this.marker,this.namespace,this.name);if(!this.namespace&&r.namespace){if(!new EdgeType(this.id).exists()){return new EdgeType(r.namespace+":"+this.name)}}MapElementType.call(this,this.id,this.root,EdgeType._fieldMeta,t);var s=this.style&&this.style.arrows;if(s){this.invertedArrow=this._isArrow(s,"from");this.toArrow=this._isArrow(s,"to")||this._isArrow(s,"middle");this.biArrow=this.invertedArrow===this.toArrow;if(this.biArrow)this.toArrow=this.invertedArrow=true}else{this.toArrow=true}}EdgeType.prototype=Object.create(MapElementType.prototype);EdgeType._fieldMeta=$tw.utils.extend({},MapElementType._fieldMeta,{label:{},"show-label":{}});EdgeType.edgeTypeRegexStr="^(_?)([^:_][^:]*):?([^:]*)";EdgeType.edgeTypeRegex=new RegExp(EdgeType.edgeTypeRegexStr);EdgeType._getIdParts=function(e,t){e=utils.getWithoutPrefix(e||"",t+"/");var r=e.match(EdgeType.edgeTypeRegex)||[];return{marker:r[1]||"",namespace:r[3]&&r[2]||"",name:r[3]||r[2]||""}};EdgeType._getId=function(e,t,r){return e+t+(t?":":"")+r};EdgeType.prototype.getLabel=function(){return this.label||this.name};EdgeType.prototype._isArrow=function(e,t){var r=e[t];return t==="to"&&r==null||r===true||typeof r==="object"&&r.enabled!==false};