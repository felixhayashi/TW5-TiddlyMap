/*\

title: $:/plugins/felixhayashi/tiddlymap/dialog_manager.js
type: application/javascript
module-type: library

@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var e=require("$:/plugins/felixhayashi/tiddlymap/callback_manager.js").CallbackManager;var i=function(t,e){this.wiki=$tw.wiki;this.logger=$tw.tiddlymap.logger;this.adapter=$tw.tiddlymap.adapter;this.opt=$tw.tiddlymap.opt;this.callbackManager=t;if(e){this.context=e}};i.prototype.open=function(e,i,a){if(!i){i={}}if(typeof a==="function"&&this.context){a=a.bind(this.context)}var l=this.opt.path.tempRoot+"/dialog-"+t.genUUID();var d={title:l,footer:t.getText(this.opt.ref.dialogStandardFooter),output:l+"/output",result:l+"/result",confirmButtonLabel:"Okay",cancelButtonLabel:"Cancel"};if(i.dialog){if(i.dialog.preselects){this.wiki.addTiddler(new $tw.Tiddler({title:d.output},i.dialog.preselects));delete i.dialog.preselects}$tw.utils.extend(d,i.dialog);delete i.dialog}this.callbackManager.add(d.result,function(e){var i=this.wiki.getTiddler(e);var l=i.fields.text;if(l){var o=this.wiki.getTiddler(d.output)}else{var o=null;$tw.tiddlymap.notify("operation cancelled")}if(typeof a==="function"){a(l,o)}t.deleteTiddlers([d.title,d.output,d.result])}.bind(this),true);var o=t.getTiddler(this.opt.path.dialogs+"/"+e);var r=new $tw.Tiddler(o,i,d);this.wiki.addTiddler(r);$tw.rootWidget.dispatchEvent({type:"tm-modal",param:r.fields.title,paramObject:r.fields});this.logger("debug","Opened dialog",r)};exports.DialogManager=i})();