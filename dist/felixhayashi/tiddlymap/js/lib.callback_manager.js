/*\

title: $:/plugins/felixhayashi/tiddlymap/js/CallbackManager
type: application/javascript
module-type: library

@preserve

\*/
"use strict";module.exports=CallbackManager;var utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");function CallbackManager(){this.callbacks=utils.makeHashMap()}CallbackManager.prototype.add=function(e,a,l){$tm.logger("debug",'A callback was registered for changes of "'+e+'"');this.callbacks[e]={execute:a,isDeleteOnCall:typeof l==="boolean"?l:true}};CallbackManager.prototype.remove=function(e){if(!e)return;if(typeof e==="string"){e=[e]}for(var a=e.length;a--;){var l=e[a];if(this.callbacks[l]){$tm.logger("debug",'A callback for "'+l+'" will be deleted');delete this.callbacks[l]}}};CallbackManager.prototype.handleChanges=function(e){if(this.callbacks.length==0)return;for(var a in e){if(!this.callbacks[a])continue;if($tw.wiki.getTiddler(a)){$tm.logger("debug","Executing a callback for: "+a);this.callbacks[a].execute(a);if(!this.callbacks.isDeleteOnCall)continue}this.remove(a)}};