/*\

title: $:/plugins/felixhayashi/tiddlymap/js/exception
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var r={};r.EnvironmentError=function(r){this.name="EnvironmentError";this.message="Critical parts of the underlying system changed: "+r};r.DependencyError=function(r){this.name="DependencyError";this.message="TiddlyMap cannot run without: "+r};for(var t in r){r[t].prototype=Object.create(Error.prototype);r[t].constructor=r[t]}exports.Exception=r})();