/*\

title: $:/plugins/felixhayashi/tiddlymap/dialog_manager.js
type: application/javascript
module-type: library

@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var i=require("$:/plugins/felixhayashi/tiddlymap/callback_registry.js").CallbackRegistry;var e=function(t,i){this.wiki=$tw.wiki;this.logger=$tw.tiddlymap.logger;this.adapter=$tw.tiddlymap.adapter;this.opt=$tw.tiddlymap.opt;this.callbackRegistry=i;if(t){this.context=t}};e.prototype.open=function(i,e,l){if(!e){e={}}var a=this.opt.path.tempRoot+"/dialog-"+t.genUUID();var d={title:a,footer:t.getText(this.opt.ref.dialogStandardFooter),output:a+"/output",result:a+"/result",confirmButtonLabel:"Okay",cancelButtonLabel:"Cancel"};if(e.dialog){if(e.dialog.preselects){this.wiki.addTiddler(new $tw.Tiddler({title:d.output},e.dialog.preselects));delete e.dialog.preselects}$tw.utils.extend(d,e.dialog);delete e.dialog}this.callbackRegistry.add(d.result,function(i){var e=this.wiki.getTiddler(i);var a=e.fields.text;if(a){var r=this.wiki.getTiddler(d.output)}else{var r=null;$tw.tiddlymap.notify("operation cancelled")}if(typeof l=="function"){if(this.context){l.call(this.context,a,r)}else{l(a,r)}}t.deleteTiddlers([d.title,d.output,d.result])}.bind(this),true);var r=t.getTiddler(this.opt.path.dialogs+"/"+i);var o=new $tw.Tiddler(r,e,d);this.wiki.addTiddler(o);$tw.rootWidget.dispatchEvent({type:"tm-modal",param:o.fields.title,paramObject:o.fields});this.logger("debug","Opened dialog",o)};exports.DialogManager=e})();