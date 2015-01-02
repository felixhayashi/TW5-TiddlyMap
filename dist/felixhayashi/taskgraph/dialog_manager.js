/*\

title: $:/plugins/felixhayashi/taskgraph/dialog_manager.js
type: application/javascript
module-type: library

@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;var e=require("$:/plugins/felixhayashi/taskgraph/callback_registry.js").CallbackRegistry;var i=function(t,e){this.wiki=$tw.wiki;this.logger=$tw.taskgraph.logger;this.adapter=$tw.taskgraph.adapter;this.opt=$tw.taskgraph.opt;this.callbackRegistry=e;if(t){this.context=t}};i.prototype.open=function(e,i,a){if(!i){i={}}var l=this.opt.path.tempRoot+"/dialog-"+t.genUUID();var r={title:l,footer:t.getText(this.opt.ref.dialogStandardFooter),output:l+"/output",result:l+"/result",confirmButtonLabel:"Okay",cancelButtonLabel:"Cancel"};if(i.dialog){if(i.dialog.preselects){this.wiki.addTiddler(new $tw.Tiddler({title:r.output},i.dialog.preselects));delete i.dialog.preselects}$tw.utils.extend(r,i.dialog);delete i.dialog}this.callbackRegistry.add(r.result,function(e){var i=this.wiki.getTiddler(e);var l=i.fields.text;if(l){var s=this.wiki.getTiddler(r.output)}else{var s=null;$tw.taskgraph.notify("operation cancelled")}if(typeof a=="function"){if(this.context){a.call(this.context,l,s)}else{a(l,s)}}t.deleteTiddlers([r.title,r.output,r.result])}.bind(this),true);var s=t.getTiddler(this.opt.path.dialogs+"/"+e);var o=new $tw.Tiddler(s,i,r);this.wiki.addTiddler(o);$tw.rootWidget.dispatchEvent({type:"tm-modal",param:o.fields.title,paramObject:o.fields});this.logger("debug","Opened dialog",o)};exports.DialogManager=i})();