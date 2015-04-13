/*\

title: $:/plugins/felixhayashi/tiddlymap/dialog_manager.js
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  
  "use strict";
  
  /**************************** IMPORTS ****************************/
   

  var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
  var CallbackManager = require("$:/plugins/felixhayashi/tiddlymap/callback_manager.js").CallbackManager;

  /***************************** CODE ******************************/
        
  /**
   * The DialogManager is responsible for preparing, displaying and
   * finalizing all the dialogs.
   * 
   * @param {CallbackManager} callbackManager - A callback manager that
   *     is informed about changed tiddlers and keeps track of the
   *     various tiddlers produced during the dialog process.
   * @param {Object} [context] - An optional *this*-reference to bind the
   *     callback of each called dialog to. Otherwise, the callback of
   *     each dialog has to be bound manually to the callback if required.
   * @constructor
   */
  var DialogManager = function(callbackManager, context) {
    
    // create shortcuts and aliases
    this.wiki = $tw.wiki;
    this.logger = $tw.tmap.logger;
    this.adapter = $tw.tmap.adapter;
    this.opt = $tw.tmap.opt;
    
    // create callback registry
    this.callbackManager = callbackManager;
    
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
  * @param {string} templateId - The dialog id which is the basename of
  *     the template title.
  * @param {Hashmap} [param] - All properties (except those with special meanings)
  *     of param will be accessible as variables in the modal
  * @param {string} [param.subtitle] - 
  * @param {string} [param.cancelButtonLabel] - The label of the cancel button.
  * @param {string} [param.confirmButtonLabel] - The label of the confirm button.
  * @param {function} [callback] - A function with the signature
  *     function(isConfirmed, outputTObj). `outputTObj` contains data
  *     produced by the dialog (can be undefined even if confirmed!).
  *     Be careful: the tiddler that outputTObj represents is deleted immediately.
  * @return {$tw.Tiddler} The dialog tddler object with all its fields.
  */
  DialogManager.prototype.open = function(templateId, param, callback) {
    
    if(utils.isTrue(this.opt.config.sys.suppressedDialogs[templateId], false)) {
      this.logger("warning", "Suppressed dialog", templateId);
      return;
    }
    
    if(!param) { param = {}; }
  
    if(typeof callback === "function" && this.context) {
      callback = callback.bind(this.context);
    }
    
    // create a temporary tiddler reference for the dialog
    var dialogTRef = this.opt.path.tempRoot + "/dialog-" + utils.genUUID();
    
    // fields used to handle the dialog process
    var dialog = {
      title: dialogTRef,
      buttons: "ok_cancel",
      output: dialogTRef + "/output",
      result: dialogTRef + "/result",
      temp: dialogTRef + "/temp",
      templateId: templateId,
      currentTiddler: dialogTRef + "/output"
    };
    
    if(param.dialog) {
      
      if(param.dialog.preselects) {
        
        // register preselects
        this.wiki.addTiddler(new $tw.Tiddler(
          { title : dialog.output },
          param.dialog.preselects
        ));
        
        // remove preselects from param object
        delete param.dialog.preselects;
        
      }
      
      // extend the dialog object with parameters provided by the user
      utils.merge(dialog, param.dialog);
      
      // remove the user provided dialog object
      delete param.dialog;

    }
    
    // set the footer
    dialog.footer = utils.getText(this.opt.path.footers + "/" + dialog.buttons),
    
    // flatten dialog and param object
    dialog = utils.flatten(dialog);
    param = utils.flatten(param);
    
    // add trigger 
    this.callbackManager.add(dialog.result, function(t) {

      var triggerTObj = this.wiki.getTiddler(t);
      var isConfirmed = triggerTObj.fields.text;
      
      if(isConfirmed) {
        var outputTObj = this.wiki.getTiddler(dialog.output);
      } else {
        var outputTObj = null;
        $tw.tmap.notify("operation cancelled");
      }
      
      if(typeof callback === "function") {
        callback(isConfirmed, outputTObj);
      }
      
      // close and remove all tiddlers used by the dialog
      var deletes = utils.getMatches("[prefix[" + dialogTRef + "]]");
      utils.deleteTiddlers(deletes);
      
    }.bind(this), true);
    
    // get the dialog template
    var skeleton = utils.getTiddler(this.opt.path.dialogs + "/" + templateId);
    var dialogTiddler = new $tw.Tiddler(skeleton, param, dialog);
    this.wiki.addTiddler(dialogTiddler);
    
    $tw.rootWidget.dispatchEvent({
      type: "tm-modal",
      param : dialogTiddler.fields.title,
      paramObject: dialogTiddler.fields
    }); 
    
    this.logger("debug", "Opened dialog", dialogTiddler);
    
    return dialogTiddler;
    
  };

  // !! EXPORT !!
  exports.DialogManager = DialogManager;
  // !! EXPORT !!
  
})();