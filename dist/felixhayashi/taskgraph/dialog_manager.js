/*\

title: $:/plugins/felixhayashi/taskgraph/dialog_manager.js
type: application/javascript
module-type: widget

@preserve

\*/

(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  
  "use strict";
  
  /**************************** IMPORTS ****************************/
   

  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
  var CallbackRegistry = require("$:/plugins/felixhayashi/taskgraph/callback_registry.js").CallbackRegistry;

  /***************************** CODE ******************************/
        
  /**
   * @constructor
   */
  var DialogManager = function(context, callbackRegistry) {
    
    // create shortcuts and aliases
    this.wiki = $tw.wiki;
    this.logger = $tw.taskgraph.logger;
    this.adapter = $tw.taskgraph.adapter;
    this.opt = $tw.taskgraph.opt;
    
    // create callback registry
    this.callbackRegistry = callbackRegistry;
    
    if(context) {
      this.context = context;
    }

  };
  
  
  /**
  * This function opens a dialog based on a skeleton and some fields and eventually
  * calls a callback once the dialog is closed. The callback contains an indicator
  * whether the dialog subject was confirmed or the operation cancelled. In any
  * case the output tiddler is passed to the callback. Each dialog may write its
  * changes to this tiddler in order to store the dialog result and make it available
  * to the callback.
  * 
  * How does it work?
  * 
  * The output of the dialog process is stored in a temporary tiddler that is only known
  * to the current instance of the dialog. This way it is ensured that only the dialog process
  * that created the temporary tiddler will retrieve the result. Now we are able to
  * provide unambigous and unique correspondance to dialog callbacks.
      
  * Any dialog output is stored in a unique output-tiddler. Once there is a result,
  * a new result tiddler is created with indicators how to interpret the output.
  * The result tiddler can be understood as exit code that is independent of the output.
  * It is the result tiddler that triggers the dialog callback that was registered before.
  * the output is then read immediately from the output-tiddler.
  * 
  * @param {$tw.Tiddler} skeleton - A skeleton tObj that is used as the dialog body
  * @param {Hashmap} [fields] - More fields that can be added.
  * @param {string} [fields.subtitle] - More fields that can be added. All
  *     properties of fields will be accessible as variables in the modal
  * @param {string} [fields.cancelButtonLabel] - The label of the cancel button.
  * @param {string} [fields.confirmButtonLabel] - The label of the confirm button.
  * @param {function} [callback] - A function with the signature
  *     function(isConfirmed, outputTObj). `outputTObj` contains data
  *     produced by the dialog (can be undefined even if confirmed!).
  *     Be careful: the tiddler that outputTObj represents is deleted immediately.
  */
  DialogManager.prototype.open = function(skeleton, fields, callback) {
            
    skeleton = utils.getTiddler(skeleton);
    
    var path = this.opt.path.dialogs + "/" + utils.genUUID();
    var dialogFields = {
      title : path,
      output : path + "/output",
      result : path + "/result",
      footer : this.wiki.getTiddler(this.opt.ref.dialogStandardFooter).fields.text
    };
    
    if(!fields || !fields.confirmButtonLabel) {
      dialogFields.confirmButtonLabel = "Okay";
    }
    if(!fields || !fields.cancelButtonLabel) {
      dialogFields.cancelButtonLabel = "Cancel";
    }
 
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L761
    var dialogTiddler = new $tw.Tiddler(skeleton, fields, dialogFields);
    this.logger("debug", "A dialog will be opened based on the following tiddler:", dialogTiddler);
    
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L841
    this.wiki.addTiddler(dialogTiddler);

    this.callbackRegistry.add(dialogFields.result, function(t) {

      var triggerTObj = this.wiki.getTiddler(t);
      var isConfirmed = triggerTObj.fields.text;
      
      if(isConfirmed) {
        var outputTObj = this.wiki.getTiddler(dialogFields.output);
      } else {
        var outputTObj = null;
        $tw.taskgraph.notify("operation cancelled");
      }
      
      if(typeof callback == "function") {
        if(this.context) {
          console.log("callback executed1");
          callback.call(this.context, isConfirmed, outputTObj);
        } else {
          console.log("callback executed2");
          callback(isConfirmed, outputTObj);
        }
      }
      
      // close and remove the tiddlers
      utils.deleteTiddlers([dialogFields.title, dialogFields.output, dialogFields.result]);
      
    }.bind(this), true);
            
    $tw.rootWidget.dispatchEvent({
      type: "tm-modal", param : dialogTiddler.fields.title, paramObject: dialogTiddler.fields
    }); 
    
  };

  // !! EXPORT !!
  exports.DialogManager = DialogManager;
  // !! EXPORT !!
  
})();

