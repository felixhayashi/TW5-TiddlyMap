/*\

title: $:/plugins/felixhayashi/tiddlymap/js/exception
type: application/javascript
module-type: library

@preserve

\*/
"use strict";module.exports={};var exception=module.exports;exception.EnvironmentError=function(e){this.name="EnvironmentError";this.message="Critical parts of the underlying system changed: "+e};exception.DependencyError=function(e){this.name="DependencyError";this.message="TiddlyMap cannot run without: "+e};for(var ex in exception){exception[ex].prototype=Object.create(Error.prototype);exception[ex].constructor=exception[ex]}