/*\

title: $:/plugins/felixhayashi/tiddlymap/fixer.js
type: application/javascript
module-type: startup

@preserve

\*/
(function(){"use strict";exports.name="tmap.fixer";exports.after=["tmap.caretaker"];exports.before=["rootwidget"];exports.synchronous=true;var t=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var e=require("$:/plugins/felixhayashi/tiddlymap/adapter.js").Adapter;var a=require("$:/plugins/felixhayashi/tiddlymap/view_abstraction.js").ViewAbstraction;var r=function(){var e=function(t){};e($tw.tiddlymap.opt.path.edges);var r=$tw.tiddlymap.opt.filter.allViews;var i=t.getMatches(r);for(var s=0;s<i.length;s++){var o=new a(i[s]);if(o.isConfEnabled("private_edge_mode")){e(o.getEdgeStoreLocation())}}};exports.startup=function(){r()}})();