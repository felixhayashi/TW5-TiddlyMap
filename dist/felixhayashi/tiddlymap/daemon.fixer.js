/*\

title: $:/plugins/felixhayashi/tiddlymap/fixer.js
type: application/javascript
module-type: startup

@preserve

\*/
(function(){"use strict";exports.name="tmap.fixer";exports.after=["tmap.caretaker"];exports.before=["rootwidget"];exports.synchronous=true;var t=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var e=require("$:/plugins/felixhayashi/tiddlymap/adapter.js").Adapter;var a=require("$:/plugins/felixhayashi/tiddlymap/view_abstraction.js").ViewAbstraction;var r=require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;var i=function(e,a){var i=t.getByPrefix(e);for(var s=0;s<i.length;s++){var p=t.getBasename(i[s]);if(p==="__noname__"){p="tmap:unknown"}p=new r(p);if(!p.exists())p.persist();var d=$tw.wiki.getTiddlerData(i[s]);for(var u=0;u<d.length;u++){d[u].type=(a?a+":":"")+p.getId();$tw.tmap.adapter.insertEdge(d[u])}$tw.wiki.deleteTiddler(i[s])}};exports.startup=function(){var e=$tw.wiki.getTiddlerData($tw.tmap.opt.ref.sysMeta,{});var r=$tw.wiki.getTiddler($tw.tmap.opt.path.pluginRoot);$tw.tmap.logger("debug","Fixer is started");$tw.tmap.logger("debug","Data-structure currently in use: ",e.dataStructureState);if($tw.utils.checkVersions("0.6.11",e.dataStructureState)){$tw.tmap.logger("debug","Updating data structure from version",e.dataStructureState);i("$:/plugins/felixhayashi/tiddlymap/graph/edges",null);var s=$tw.tmap.opt.selector.allViews;var p=t.getMatches(s);for(var d=0;d<p.length;d++){var u=new a(p[d]);i(u.getRoot()+"/graph/edges",u)}t.setEntry($tw.tmap.opt.ref.sysMeta,"dataStructureState","0.7.0")}}})();