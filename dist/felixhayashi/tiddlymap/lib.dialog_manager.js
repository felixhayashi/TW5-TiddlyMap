/*\

title: $:/plugins/felixhayashi/tiddlymap/dialog_manager.js
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var t=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;var e=require("$:/plugins/felixhayashi/tiddlymap/callback_manager.js").CallbackManager;var i=function(t,e){this.wiki=$tw.wiki;this.logger=$tw.tmap.logger;this.adapter=$tw.tmap.adapter;this.opt=$tw.tmap.opt;this.callbackManager=t;if(e){this.context=e}};i.prototype.open=function(e,i,a){if(t.isTrue(this.opt.config.sys.suppressedDialogs[e],false)){this.logger("warning","Suppressed dialog",e);return}if(!i){i={}}this.logger("debug","Dialog param object",i);if(typeof a==="function"&&this.context){a=a.bind(this.context)}var l=this.opt.path.tempRoot+"/dialog-"+t.genUUID();var r={title:l,buttons:"ok_cancel",output:l+"/output",result:l+"/result",temp:l+"/temp",templateId:e,currentTiddler:l+"/output"};if(i.dialog){if(i.dialog.preselects){this.wiki.addTiddler(new $tw.Tiddler({title:r.output},i.dialog.preselects));delete i.dialog.preselects}t.merge(r,i.dialog);delete i.dialog}r.footer=t.getText(this.opt.path.footers+"/"+r.buttons),r=t.flatten(r);i=t.flatten(i);this.callbackManager.add(r.result,function(e){var i=this.wiki.getTiddler(e);var s=i.fields.text;if(s){var o=this.wiki.getTiddler(r.output)}else{var o=null;$tw.tmap.notify("operation cancelled")}if(typeof a==="function"){a(s,o)}var d=t.getMatches("[prefix["+l+"]]");t.deleteTiddlers(d)}.bind(this),true);var s=t.getTiddler(this.opt.path.dialogs+"/"+e);var o=new $tw.Tiddler(s,i,r);this.wiki.addTiddler(o);this.logger("debug","Opening dialog",o);$tw.rootWidget.dispatchEvent({type:"tm-modal",param:o.fields.title,paramObject:o.fields});return o};exports.DialogManager=i})();