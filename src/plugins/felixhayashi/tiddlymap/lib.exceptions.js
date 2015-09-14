/*\

title: $:/plugins/felixhayashi/tiddlymap/js/exception
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function() {

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";
  
var Exception = {};

Exception.EnvironmentError = function(aspect) {
  this.name = "EnvironmentError";
  this.message = "Critical parts of the underlying system changed: " + aspect;
};

Exception.DependencyError = function(module) {
  this.name = "DependencyError";
  this.message = "TiddlyMap cannot run without: " + module;
};
  
for(var ex in Exception) {
  Exception[ex].prototype = Object.create(Error.prototype);
  Exception[ex].constructor = Exception[ex];
}

// !! EXPORT !!
exports.Exception = Exception;
// !! EXPORT !!
  
})();


