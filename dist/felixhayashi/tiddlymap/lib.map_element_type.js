/*\

title: $:/plugins/felixhayashi/tiddlymap/js/MapElementType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var i=function(i,e,s,r){this.opt=$tw.tmap.opt;this.logger=$tw.tmap.logger;this.root=e;this.id=t.getWithoutPrefix(i,this.root+"/");this._fieldMeta=s;this.fullPath=this.root+"/"+this.id;this.isShipped=$tw.wiki.getSubTiddler(this.opt.path.pluginRoot,this.fullPath);this.load(r||this.fullPath)};i._fieldMeta={description:{},style:{parse:t.parseJSON,stringify:JSON.stringify},modified:{},created:{}};i.prototype.load=function(i){if(!i)return;if(typeof i==="string"){var e=!t.startsWith(i,this.root)?this.root+"/"+type:i;this.loadFromTiddler(e)}else if(i instanceof $tw.Tiddler){this.loadFromTiddler(i)}else if(typeof i==="object"){for(var s in this._fieldMeta){this[s]=i[s]}}};i.prototype.loadFromTiddler=function(i){var e=t.getTiddler(i);if(!e)return;var s=$tw.wiki.getSubTiddler(this.opt.path.pluginRoot,this.fullPath)||{};var r=$tw.utils.extend({},s.fields,e.fields);for(var o in this._fieldMeta){var l=this._fieldMeta[o].parse;var a=r[o];this[o]=l?l.call(this,a):a}};i.prototype.exists=function(){return t.tiddlerExists(this.fullPath)};i.prototype.setStyle=function(i,e){if(typeof i==="string"){i=t.parseJSON(i)}if(typeof i==="object"){if(e){t.merge(this.style,i)}else{this.style=i}}};i.prototype.save=function(i){if(!i){i=this.fullPath}if(typeof i==="string"){var e={title:i};if(!t.startsWith(i,this.root)){e.id=this.id}else{$tw.utils.extend(e,$tw.wiki.getModificationFields());if(!this.exists()){$tw.utils.extend(e,$tw.wiki.getCreationFields())}}for(var s in this._fieldMeta){var r=this._fieldMeta[s].stringify;e[s]=r?r.call(this,this[s]):this[s]}$tw.wiki.addTiddler(new $tw.Tiddler(e))}};exports.MapElementType=i})();