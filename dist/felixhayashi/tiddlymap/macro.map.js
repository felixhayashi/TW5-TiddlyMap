/*\
title: $:/plugins/felixhayashi/tiddlymap/map-macro.js
type: application/javascript
module-type: macro

In connection with tiddlymap, this macro allows us to access
system information from within tiddlers as well as to execute some
util functions.

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var r=require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;exports.name="map-macro";exports.params=function(r){var e=[];for(var t=0;t<r;t++){e.push({name:"arg"+t})}return e}(5);var e=function(){return};exports.run=function(){switch(arguments[0]){case"basename":return r.getBasename(arguments[1]||this.getVariable("currentTiddler"));case"testJSON":var e=$tw.wiki.getTiddler(this.getVariable("currentTiddler"));try{JSON.parse(e.fields[arguments[1]]);return"valid"}catch(t){return"malformed"}case"splitAndSelect":var a=this.getVariable("currentTiddler");var n=a.split(arguments[1])[arguments[2]];return n!=null?n:a;case"option":var s=$tw.tmap.opt;var i=arguments[1].split(".");for(var u=0;u<i.length;u++){if(typeof s=="object"&&s[i[u]]){s=s[i[u]]}else{return"property doesn't exist"}}if(!(typeof s=="string"))return"property is not a string";return s}return"wrong signature"}})();