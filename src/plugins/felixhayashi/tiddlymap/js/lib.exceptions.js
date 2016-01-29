/*\

title: $:/plugins/felixhayashi/tiddlymap/js/exception
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports.exception = {};

/*** Code **********************************************************/
  
var exception = exports.exception;

exception.EnvironmentError = function(aspect) {
  this.name = "EnvironmentError";
  this.message = "Critical parts of the underlying system changed: " + aspect;
};

exception.DependencyError = function(module) {
  this.name = "DependencyError";
  this.message = "TiddlyMap cannot run without: " + module;
};
  
for(var ex in exception) {
  exception[ex].prototype = Object.create(Error.prototype);
  exception[ex].constructor = exception[ex];
}