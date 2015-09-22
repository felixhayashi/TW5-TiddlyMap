/*\

title: $:/plugins/felixhayashi/tiddlymap/js/CallbackManager
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var e=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;var t=function(){this.logger=$tw.tmap.logger;this.callbacks=e.getDataMap()};t.prototype.add=function(e,t,l){this.logger("debug",'A callback was registered for changes of "'+e+'"');this.callbacks[e]={execute:t,isDeleteOnCall:typeof l==="boolean"?l:true}};t.prototype.remove=function(e){if(!e)return;if(typeof e==="string"){e=[e]}for(var t=e.length;t--;){var l=e[t];if(this.callbacks[l]){this.logger("debug",'A callback for "'+l+'" will be deleted');delete this.callbacks[l]}}};t.prototype.handleChanges=function(e){if(this.callbacks.length==0){this.logger("debug","No registered callbacks exist at the moment");return}for(var t in e){if(!this.callbacks[t])continue;if($tw.wiki.getTiddler(t)){this.logger("debug",'A callback for "'+t+'" will be executed');this.callbacks[t].execute(t);if(!this.callbacks.isDeleteOnCall)continue}this.remove(t)}};exports.CallbackManager=t})();