/*\

title: $:/plugins/felixhayashi/tiddlymap/dialog_registry.js
type: application/javascript
module-type: library

@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var e=require("$:/plugins/felixhayashi/tiddlymap/callback_manager.js").CallbackManager;var i=function(t){this.manager=$tw.wiki;this.logger=$tw.tiddlymap.logger;this.adapter=$tw.tiddlymap.adapter;this.opt=$tw.tiddlymap.opt;this.callbackRegistry=callbackRegistry;if(context){this.context=context}};DialogManager.prototype.open=function(e,i,a){if(!i){i={}}var l=this.opt.path.tempRoot+"/dialog-"+t.genUUID();var d={title:l,footer:t.getText(this.opt.ref.dialogStandardFooter),output:l+"/output",result:l+"/result",confirmButtonLabel:"Okay",cancelButtonLabel:"Cancel"};if(i.dialog){if(i.dialog.preselects){this.wiki.addTiddler(new $tw.Tiddler({title:d.output},i.dialog.preselects));delete i.dialog.preselects}$tw.utils.extend(d,i.dialog);delete i.dialog}this.callbackRegistry.add(d.result,function(e){var i=this.wiki.getTiddler(e);var l=i.fields.text;if(l){var r=this.wiki.getTiddler(d.output)}else{var r=null;$tw.tiddlymap.notify("operation cancelled")}if(typeof a=="function"){if(this.context){a.call(this.context,l,r)}else{a(l,r)}}t.deleteTiddlers([d.title,d.output,d.result])}.bind(this),true);var r=t.getTiddler(this.opt.path.dialogs+"/"+e);var o=new $tw.Tiddler(r,i,d);this.wiki.addTiddler(o);$tw.rootWidget.dispatchEvent({type:"tm-modal",param:o.fields.title,paramObject:o.fields});this.logger("debug","Opened dialog",o)};exports.DialogManager=DialogManager})();