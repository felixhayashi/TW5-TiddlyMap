/*\
title: $:/plugins/felixhayashi/tiddlymap/js/tmap
type: application/javascript
module-type: macro

In connection with tiddlymap, this macro allows us to access
system information from within tiddlers as well as to execute some
util functions.

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var r=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;exports.name="tmap";exports.params=function(r){var e=[];for(var t=0;t<r;t++){e.push({name:"arg"+t})}return e}(5);var e=function(){return};exports.run=function(){var r=$tw.tmap.utils;switch(arguments[0]){case"basename":return r.getBasename(arguments[1]||this.getVariable("currentTiddler"));case"testJSON":var e=$tw.wiki.getTiddler(this.getVariable("currentTiddler"));try{JSON.parse(e.fields[arguments[1]]);return"valid"}catch(t){return"malformed"}case"splitAndSelect":var a=this.getVariable("currentTiddler");var n=a.split(arguments[1])[arguments[2]];return n!=null?n:a;case"concat":var a="";for(var s=1,u=arguments.length;s<u;s++){a+=arguments[s]}return a;case"uuid":return r.genUUID();case"scale":var a="";for(var s=1,u=parseInt(arguments[1]);s<u;s++){a+="[["+s+"]]"}return a;case"option":var i=$tw.tmap.opt;var l=arguments[1].split(".");for(var s=0;s<l.length;s++){if(typeof i=="object"&&i[l[s]]){i=i[l[s]]}else{return"property doesn't exist"}}if(!(typeof i=="string"))return"property is not a string";return i}return"wrong signature"}})();