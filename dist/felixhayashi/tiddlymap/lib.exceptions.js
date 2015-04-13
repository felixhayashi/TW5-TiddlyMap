/*\

title: $:/plugins/felixhayashi/tiddlymap/exception.js
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){Exception={};Exception.EnvironmentError=function(n){this.name="EnvironmentError";this.message="Critical parts ("+n+") of the underlying system changed."};Exception.DependencyError=function(n){this.name="DependencyError";this.message="TiddlyMap cannot run without: "+n};for(var n in Exception){Exception[n].prototype=Object.create(Error.prototype);Exception[n].constructor=Exception[n]}exports.Exception=Exception})();