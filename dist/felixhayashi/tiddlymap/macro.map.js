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
(function(){"use strict";var r=require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;exports.name="tmap";exports.params=function(r){var t=[];for(var e=0;e<r;e++){t.push({name:"arg"+e})}return t}(5);var t=function(){return};exports.run=function(){var r=$tw.tmap.utils;switch(arguments[0]){case"basename":return r.getBasename(arguments[1]||this.getVariable("currentTiddler"));case"testJSON":var t=$tw.wiki.getTiddler(this.getVariable("currentTiddler"));try{JSON.parse(t.fields[arguments[1]]);return"valid"}catch(e){return"malformed"}case"splitAndSelect":var a=this.getVariable("currentTiddler");var n=a.split(arguments[1])[arguments[2]];return n!=null?n:a;case"uuid":return r.genUUID();case"option":var s=$tw.tmap.opt;var i=arguments[1].split(".");for(var u=0;u<i.length;u++){if(typeof s=="object"&&s[i[u]]){s=s[i[u]]}else{return"property doesn't exist"}}if(!(typeof s=="string"))return"property is not a string";return s}return"wrong signature"}})();