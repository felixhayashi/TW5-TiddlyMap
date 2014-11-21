/*\
title: $:/plugins/felixhayashi/taskgraph/taskgraph.js
type: application/javascript
module-type: widget

The Factory used in this file will export the appropriate taskgraph
instance based on the mode attribute specified.

The TaskGraphWidget class presented in this file is used as prototype
for the mode-dependent TaskGraphWidgets.

\*/

(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  
  "use strict";
  
  /*************************** PARAMETER ***************************/
  
  var AVAILABLE_MODES = [
    "graph", "search", "button"
  ];
    
  /**************************** IMPORTS ****************************/
   
  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var Adapter = require("$:/plugins/felixhayashi/taskgraph/adapter.js").Adapter;
  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
  var vis = require("$:/plugins/felixhayashi/vis/vis.js");
  
  /***************************** CODE ******************************/
        
  /**
   * This class is used as basic prototype for all taskgraph widgets.
   * It creates a global namespace below the $tw object and registers
   * all the shared variables in this namespace.
   */
  var TaskGraphWidget = function(parseTreeNode, options) {
    
    // Main initialisation inherited from widget.js
    this.initialise(parseTreeNode, options);
        
    // mediator layer to abstract tw as a db-query-system
    this.adapter = new Adapter(this.wiki);
    
    // key (a tiddler) -> callback (called when tiddler changes)
    this.dialogCallbacks = {};
        
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/widgets/widget.js#L211
    this.computeAttributes();
    this.mode = this.getAttribute("mode");

  };
  
  // !! EXTENSION !!
  TaskGraphWidget.prototype = new Widget();
  // !! EXTENSION !!
        
  /**
   * Add some classes to give the user a chance to apply some css
   * to different graph modes.
   */
  TaskGraphWidget.prototype.registerParentDomNode = function(parent) {
    this.parentDomNode = parent;
    if(!$tw.utils.hasClass(this.parentDomNode, "taskgraph")) {
      $tw.utils.addClass(this.parentDomNode, "taskgraph");
      $tw.utils.addClass(this.parentDomNode, "taskgraph_" + this.mode);
    }
  }
  
  /**
   * The callback mechanism allows to dynamically listen to tiddler
   * changes without hardcoding a change-check for a tiddler name
   * in the refresh function.
   * 
   * @tiddlerTitle a tiddler whose change triggers the callback
   * @callback a function that is called when @tiddlerTitle is changed
   * @deleteOnCall whether or not to delete the callback once called
   *    if it is not deleted automatically, the api user has to do
   *    it himself. Defaults to true.
   */
  TaskGraphWidget.prototype.registerCallback = function(tiddlerTitle, callback, deleteOnCall) {
    if($tw.taskgraph.opt.tw.debug) console.debug("the callback was registered for changes on \"" + tiddlerTitle + "\"");
    this.dialogCallbacks[tiddlerTitle] = {
      execute : callback,
      deleteOnCall : (typeof deleteOnCall == "Boolean" ? deleteOnCall : true)
    }
  }
  
  /**
   * Removes the callback from the list of tiddler callbacks.
   * @see registerCallback
   */
  TaskGraphWidget.prototype.removeCallback = function(t) {
    if(t in this.dialogCallbacks) {
      if($tw.taskgraph.opt.tw.debug) console.debug("callback for \"" + t + "\" will be deleted");
      delete this.dialogCallbacks[t];
    }
  }
  
  /**
   * this method has to be implemented at the top of any widget's
   * refresh method. It checks for changed tiddlers that have
   * registered callbacks. If @deleteOnCall was specified during
   * registration of the callback, the callback will be deleted
   * automatically.
   * 
   * @see registerCallback
   */
  TaskGraphWidget.prototype.checkForCallbacks = function(changedTiddlers) {
    
    if(this.dialogCallbacks.length == 0) {
      if($tw.taskgraph.opt.tw.debug) console.debug("no registered callbacks exist at the moment");
      return;
    }
    
    for(var t in changedTiddlers) {
      
      if(!(t in this.dialogCallbacks)) continue;
      
      // TODO: better use tiddler.exists() function or how is it called?
      if(this.wiki.getTiddler(t)) {
        
        if($tw.taskgraph.opt.tw.debug) console.debug("the callback for \"" + t + "\" will be executed");
        this.dialogCallbacks[t].execute(t);
        
        // a continue prevents deleting the callback
        if(!this.dialogCallbacks.deleteOnCall) continue;
        
      }
      
      this.removeCallback(t);
      
    }
  }
  
  /**
   * This handler will open a dialog in which the user specifies an
   * edgetype to use to create an edge between to nodes.
   * 
   * Before any result is displayed to the user on the graph, the
   * relationship needs to be persisted in the store for the according
   * edgetype. If that operation was successful, each graph will instantly
   * be aware of the change as it listens to tiddler changes.
   * 
   * @data a javascript object that contains at least the properties
   *    "from", "to" and "label"
   * @callback an optional function with the signature function(isSuccess);
   */
  TaskGraphWidget.prototype.handleConnectionEvent = function(data, callback) {
       
    if($tw.taskgraph.opt.tw.debug) console.info("will open a dialog for creating an edge");
    
    // TODO: option paths seriously need some refactoring!
    var skeleton = this.wiki.getTiddler($tw.taskgraph.opt.tw.template.dialog.getEdgeType);
    var fields = {
      fromLabel : this.adapter.selectNodeFromStoreById(data.from).label,
      toLabel : this.adapter.selectNodeFromStoreById(data.to).label,
      defaultViewBindingChoice : $tw.taskgraph.opt.tw.defaultViewBindingChoice,
      rememberViewBindingChoice : ($tw.taskgraph.opt.tw.defaultViewBindingChoice ? "true" : "false")
    };
    
    if($tw.taskgraph.opt.tw.debug) console.log(fields);
    
    this.openDialog(skeleton, fields, function(isConfirmed, outputTObj) {
    
        var isSuccess = isConfirmed && outputTObj && outputTObj.fields.text;
    
        if(isSuccess) {
          var text = outputTObj.fields.text;
          if($tw.taskgraph.opt.tw.debug) console.debug("the edgetype is set to: " + text);        
          data.label = text;
          
          if($tw.taskgraph.opt.tw.debug) console.log(outputTObj.fields);
          
          if(outputTObj.fields.view) {
            data.view = outputTObj.fields.view;
            if(outputTObj.fields.rememberViewBindingChoice) {
              var twOptions = $tw.wiki.getTiddlerData("$:/plugins/felixhayashi/taskgraph/options/tw");
              twOptions.defaultViewBindingChoice = data.view;
              this.wiki.setTiddlerData("$:/plugins/felixhayashi/taskgraph/options/tw", twOptions);
            }
          }
          
          // persist
          this.adapter.insertEdgeIntoStore(data);  
          utils.notify("edge added");
        }
        
        if(typeof callback == "function") {
          callback(isSuccess);
        }
        
    }.bind(this));
    
  }
  
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
  * @skeleton a skeleton tObj that is used as the dialog body
  * @fields more fields that can be added. All properties of fields will
  * be accessible as variables in the modal. Special fields are subtitle,
  * confirmButtonLabel and cancelButtonLabel
  * @callback an optional function with the signature function(isConfirmed, outputTObj).
  *    outputTObj contains data produced by the dialog. Still it may be undefined!
  *    WATCH OUT: the tiddler, outputTObj originates from, is deleted immediately.
  */
  TaskGraphWidget.prototype.openDialog = function(skeleton, fields, callback) {
    
    if($tw.taskgraph.opt.tw.debug) console.debug("creating a dialog");
        
    var uuid = vis.util.randomUUID();
    var dialogFields = {
      title : $tw.taskgraph.opt.tw["dialogPrefix"] + uuid,
      output : $tw.taskgraph.opt.tw["dialogOutputPrefix"] + uuid,
      result : $tw.taskgraph.opt.tw["dialogResultPrefix"] + uuid,
      footer : this.wiki.getTiddler($tw.taskgraph.opt.tw["dialogStandardFooter"]).fields.text
    };
    
    if(!fields || !fields.confirmButtonLabel) { dialogFields.confirmButtonLabel = "Okay" };
    if(!fields || !fields.cancelButtonLabel) { dialogFields.cancelButtonLabel = "Cancel" };
 
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L761
    var dialogTiddler = new $tw.Tiddler(skeleton, fields, dialogFields);
    if($tw.taskgraph.opt.tw.debug) console.debug("A dialog will be opened based on the following tiddler:");
    if($tw.taskgraph.opt.tw.debug) console.debug(dialogTiddler);
    
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L841
    this.wiki.addTiddler(dialogTiddler);

    this.registerCallback(dialogFields.result, function(t) {

      var triggerTObj = this.wiki.getTiddler(t);
      var isConfirmed = triggerTObj.fields.text;
      
      if(isConfirmed) {
        var outputTObj = this.wiki.getTiddler(dialogFields.output);
      } else {
        var outputTObj = null;
        utils.notify("operation cancelled");
      }
      
      if(typeof callback == "function") {
        callback(isConfirmed, outputTObj);
      }
      
      // close and remove the tiddlers
      utils.deleteTiddlers([dialogFields.title, dialogFields.output, dialogFields.result]);
      
    }.bind(this), true);
            
    this.dispatchEvent({
      type: "tm-modal", param : dialogTiddler.fields.title, paramObject: dialogTiddler.fields
    }); 
    
  }
  
  /**
   * Promts a dialog that will confront the user with making a tough choice :)
   * @callback a function with the signature function(isConfirmed)
   * @message an optional message
   */
  TaskGraphWidget.prototype.openStandardConfirmDialog = function(callback, message) {
  
    // TODO: option paths seriously need some refactoring!
    var tRef = $tw.taskgraph.opt.tw.template.dialog.getConfirmation;
    var dialogSkeletonTObj = this.wiki.getTiddler(tRef);
    var vars = {
      message : message,
      confirmButtonLabel: "Yes mom, I know what I'm doing!",
      cancelButtonLabel: "Uuups, hell no!"
    };
    
    this.openDialog(dialogSkeletonTObj, vars, callback);
  };
  
  /**
   * Wrapper class which is similar to a Factory, except that it returns
   * an object directly via its constructor and not by a method. This is
   * because TW instanciates the exported object.
   * 
   * It decides by the given mode, which object to create.
   * This is necessary because everything shall be kept in a single plugin that
   * ships with a single widget call, yet, the plugin needs to react to different
   * environments and the code should not mix.
   */
  var Factory = function(parseTreeNode, options) {
        
    var mode = parseTreeNode.attributes.mode;
    
    if(mode && AVAILABLE_MODES.indexOf(mode.value) != -1) {

      var constrObj = new TaskGraphWidget(parseTreeNode, options);
      
      if($tw.taskgraph.opt.tw.debug) console.debug("Require class for mode \"" + mode.value + "\"");
      var TaskgraphMode = require("$:/plugins/felixhayashi/taskgraph/taskgraph_" + mode.value + ".js")
                           .getClass(constrObj);
      
      
      if($tw.taskgraph.opt.tw.debug) console.warn("Initializing a taskgraph widget in mode \"" + mode.value + "\"");
      var modeObject = new TaskgraphMode(parseTreeNode, options);
      if($tw.taskgraph.opt.tw.debug) console.info("Done initializing a taskgraph widget");
            
      return modeObject;
      
    } else {
     
      throw "Taskgraph mode \"" + mode.value + "\" not allowed.";
      
    }
    
  };

  exports.taskgraph = Factory;

})();

