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

module.exports = {};

/*** Code **********************************************************/

var exception = module.exports;

exception.EnvironmentError = function(aspect) {
  this.message = "Critical parts of the underlying system changed: " + aspect;
};

exception.DependencyError = function(dep) {
  this.message = "TiddlyMap cannot run without: " + dep;
};

exception.MissingOverrideError = function(context, methodName) {
  this.message = context.constructor.name + ' does not override method ' + methodName;
};

for(var ex in exception) {
  exception[ex].prototype = Object.create(Error.prototype);
  exception[ex].constructor = exception[ex];
}
