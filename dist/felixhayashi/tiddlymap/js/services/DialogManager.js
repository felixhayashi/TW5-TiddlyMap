"use strict";Object.defineProperty(exports,"__esModule",{value:true});var _createClass=function(){function e(e,t){for(var a=0;a<t.length;a++){var l=t[a];l.enumerable=l.enumerable||false;l.configurable=true;if("value"in l)l.writable=true;Object.defineProperty(e,l.key,l)}}return function(t,a,l){if(a)e(t.prototype,a);if(l)e(t,l);return t}}();/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/DialogManager
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */var _utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");var _utils2=_interopRequireDefault(_utils);var _CallbackManager=require("$:/plugins/felixhayashi/tiddlymap/js/CallbackManager");var _CallbackManager2=_interopRequireDefault(_CallbackManager);function _interopRequireDefault(e){return e&&e.__esModule?e:{default:e}}function _classCallCheck(e,t){if(!(e instanceof t)){throw new TypeError("Cannot call a class as a function")}}var DialogManager=function(){function e(t,a){_classCallCheck(this,e);this.callbackManager=t;this.context=a}_createClass(e,[{key:"open",value:function t(a){var l=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};var i=arguments[2];if(_utils2.default.isTrue($tm.config.sys.suppressedDialogs[a],false)){$tm.logger("warning","Suppressed dialog",a);return}$tm.logger("debug","Dialog param object",l);if(typeof i==="function"&&this.context){i=i.bind(this.context)}var r=$tm.path.tempRoot+"/dialog-"+_utils2.default.genUUID();var n=_utils2.default.getTiddler($tm.path.dialogs+"/"+a);var u={title:r,buttons:n.fields["buttons"]||"ok_cancel",classes:"tmap-modal-content "+n.fields["classes"],output:r+"/output",result:r+"/result",temp:r+"/temp",template:n.fields.title,templateId:a,currentTiddler:r+"/output",text:_utils2.default.getText($tm.path.dialogs)};_utils2.default.touch(u.output);if(l.dialog){if(l.dialog.preselects){$tw.wiki.addTiddler(new $tw.Tiddler({title:u.output},_utils2.default.flatten(l.dialog.preselects)));delete l.dialog.preselects}_utils2.default.merge(u,l.dialog)}u.footer=_utils2.default.getText($tm.path.footers);u=_utils2.default.flatten(u);l=_utils2.default.flatten(l);var s=function t(a){e.getElement("hidden-close-button").click();var l=$tw.wiki.getTiddler(a);var n=l.fields.text;var s=null;if(n){s=$tw.wiki.getTiddler(u.output)}else{$tm.notify("operation cancelled")}if(typeof i==="function"){i(n,s)}_utils2.default.deleteByPrefix(r)};this.callbackManager.add(u.result,s,true);var o=new $tw.Tiddler(n,l,u);$tw.wiki.addTiddler(o);$tm.logger("debug","Opening dialog",o);$tw.rootWidget.dispatchEvent({type:"tm-modal",param:o.fields.title,paramObject:o.fields});e.addKeyBindings();return o}}],[{key:"getElement",value:function e(t){return _utils2.default.getFirstElementByClassName("tmap-"+t)}},{key:"addKeyBindings",value:function t(){var a=$tm.keycharm({container:_utils2.default.getFirstElementByClassName("tc-modal")});var l=/tmap-triggers-(.+?)-on-(.+?)(?:\s|$)/;var i=document.getElementsByClassName("tmap-trigger-field");var r=function t(r){var n=i[r].className.split(" ");var u=function t(i){var r=n[i].match(l);if(!r){return"continue"}var u=r[1];var s=r[2];var o=e.getElement(u);if(!o){return"continue"}a.bind(s,(function(){if(document.getElementsByClassName(n[i]).length){o.click()}}))};for(var s=n.length;s--;){var o=u(s);if(o==="continue")continue}};for(var n=i.length;n--;){r(n)}}}]);return e}();exports.default=DialogManager;