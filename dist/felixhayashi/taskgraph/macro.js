/*\
title: $:/plugins/felixhayashi/taskgraph/tgmacro.js
type: application/javascript
module-type: macro

In connection with taskgraph, this macro allows us to access some
needed information from within tiddlers as well as to execute some
util functions.

@preserve

\*/
!function(){"use strict";var t=require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;exports.name="tgmacro",exports.params=function(t){for(var r=[],e=0;t>e;e++)r.push({name:"arg"+e});return r}(5);exports.run=function(){switch(arguments[0]){case"basename":return t.getBasename(arguments[1]);case"option":for(var r=$tw.taskgraph.opt,e=arguments[1].split("."),s=0;s<e.length;s++){if("object"!=typeof r||!r[e[s]])return"property doesn't exist";r=r[e[s]]}return"string"!=typeof r?"property is not a string":r}return"wrong signature"}}();