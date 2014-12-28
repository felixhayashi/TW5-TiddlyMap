/*\

title: $:/plugins/felixhayashi/taskgraph/callback_registry.js
type: application/javascript
module-type: library

@preserve

\*/

(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  
  "use strict";
  
  /**************************** IMPORTS ****************************/
   
  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;

  /***************************** CODE ******************************/
        
  /**
   * @constructor
   */
  var CallbackRegistry = function() {
    
    this.wiki = $tw.wiki;
    this.logger = $tw.taskgraph.logger;
    this.callbacks = utils.getEmptyMap();

  };
          
  /**
   * The callback mechanism allows to dynamically listen to tiddler
   * changes without hardcoding a change-check for a tiddler name
   * in the refresh function.
   * 
   * @param [TiddlerReference] tRef - A tiddler whose change triggers
   *     the callback.
   * @param {function} callback - A function that is called when the
   *     tiddler has changed.
   * @param {boolean} [deleteOnCall=true] - True if to delete the
   *     callback once it has been called, false otherwise.
   */
  CallbackRegistry.prototype.add = function(tRef, callback, isDeleteOnCall) {
    
    this.logger("debug", "A callback was registered for changes of \"" + tRef + "\"");
    this.callbacks[tRef] = {
      execute : callback,
      isDeleteOnCall : (typeof isDeleteOnCall === "boolean" ? isDeleteOnCall : true)
    };
    
  };
  
  /**
   * Removes the callback from the list of tiddler callbacks.
   * 
   * @see CallbackRegistry#registerCallback
   */
  CallbackRegistry.prototype.remove = function(tRef) {
    
    if(this.callbacks[tRef]) {
      this.logger("debug", "A callback for \"" + tRef + "\" will be deleted");
      delete this.callbacks[tRef];
    }
    
  };
  
  /**
   * this method has to be implemented at the top of the refresh method.
   * It checks for changed tiddlers that have
   * registered callbacks. If `deleteOnCall` was specified during
   * registration of the callback, the callback will be deleted
   * automatically.
   * 
   * @see CallbackRegistry#registerCallback
   */
  CallbackRegistry.prototype.handleChanges = function(changedTiddlers) {
    
    if(this.callbacks.length == 0) {
      this.logger("debug", "No registered callbacks exist at the moment");
      return;
    }
    
    for(var tRef in changedTiddlers) {
            
      if(!this.callbacks[tRef]) continue;
      
      if(this.wiki.getTiddler(tRef)) {
        
        this.logger("debug", "A callback for \"" + tRef + "\" will be executed");
        this.callbacks[tRef].execute(tRef);
        
        // a continue prevents deleting the callback
        if(!this.callbacks.isDeleteOnCall) continue;
        
      }
      
      this.remove(tRef);
    }
    
  };

  // !! EXPORT !!
  exports.CallbackRegistry = CallbackRegistry;
  // !! EXPORT !!
  
})();

