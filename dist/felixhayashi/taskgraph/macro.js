/*\
title: $:/plugins/felixhayashi/taskgraph/tgmacro.js
type: application/javascript
module-type: macro

In connection with taskgraph, this macro allows us to access some
needed information from within tiddlers as well as to execute some
util functions.

@preserve

\*/
(function(){"use strict";var r=require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;exports.name="tgmacro";exports.params=function(r){var t=[];for(var e=0;e<r;e++){t.push({name:"arg"+e})}return t}(5);var t=function(){return};exports.run=function(){switch(arguments[0]){case"basename":return r.getBasename(arguments[1]);case"option":var t=$tw.taskgraph.opt;var e=arguments[1].split(".");for(var n=0;n<e.length;n++){if(typeof t=="object"&&t[e[n]]){t=t[e[n]]}else{return"property doesn't exist"}}if(!(typeof t=="string"))return"property is not a string";return t}return"wrong signature"}})();