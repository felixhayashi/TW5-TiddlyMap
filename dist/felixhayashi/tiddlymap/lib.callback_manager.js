/*\

title: $:/plugins/felixhayashi/tiddlymap/callback_manager.js
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var e=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var t=function(){this.wiki=$tw.wiki;this.logger=$tw.tmap.logger;this.callbacks=e.getDataMap()};t.prototype.add=function(e,t,i){this.logger("debug",'A callback was registered for changes of "'+e+'"');this.callbacks[e]={execute:t,isDeleteOnCall:typeof i==="boolean"?i:true}};t.prototype.remove=function(e){if(!e)return;if(typeof e==="string"){e=[e]}for(var t=0;t<e.length;t++){var i=e[t];if(this.callbacks[i]){this.logger("debug",'A callback for "'+i+'" will be deleted');delete this.callbacks[i]}}};t.prototype.handleChanges=function(e){if(this.callbacks.length==0){this.logger("debug","No registered callbacks exist at the moment");return}for(var t in e){if(!this.callbacks[t])continue;if(this.wiki.getTiddler(t)){this.logger("debug",'A callback for "'+t+'" will be executed');this.callbacks[t].execute(t);if(!this.callbacks.isDeleteOnCall)continue}this.remove(t)}};exports.CallbackManager=t})();