/*\

title: $:/plugins/felixhayashi/tiddlymap/exception.js
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){
  
  Exception = {};
  
  Exception.EnvironmentError = function(aspect) {
    this.name = "EnvironmentError";
    this.message = "Critical parts (" + aspect + ") of the underlying system changed.";
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


