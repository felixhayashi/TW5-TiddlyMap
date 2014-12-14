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
  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
  var vis = require("$:/plugins/felixhayashi/vis/vis.js");
  var ViewAbstraction = require("$:/plugins/felixhayashi/taskgraph/view_abstraction.js").ViewAbstraction;
  
  /***************************** CODE ******************************/
        
  /**
   * This class is used as basic prototype for all taskgraph widgets.
   * It creates a global namespace below the $tw object and registers
   * all the shared variables in this namespace.
   */
  var TaskGraphWidget = function(parseTreeNode, options) {
    
    // Main initialisation inherited from widget.js
    this.initialise(parseTreeNode, options);
        
    // create shortcuts and aliases
    this.adapter = $tw.taskgraph.adapter;
    this.opt = $tw.taskgraph.opt;
    
    // key (a tiddler) -> callback (called when tiddler changes)
    this.dialogCallbacks = utils.getEmptyMap();
        
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
  TaskGraphWidget.prototype.registerCallback = function(tRef, callback, isDeleteOnCall) {
    this.logger("debug", "A callback was registered for changes of \"" + tRef + "\"");
    this.dialogCallbacks[tRef] = {
      execute : callback,
      isDeleteOnCall : (typeof isDeleteOnCall == "Boolean" ? isDeleteOnCall : true)
    }
  };
  
  /**
   * Removes the callback from the list of tiddler callbacks.
   * @see registerCallback
   */
  TaskGraphWidget.prototype.removeCallback = function(tRef) {
    if(this.dialogCallbacks[tRef]) {
      this.logger("debug", "A callback for \"" + tRef + "\" will be deleted");
      delete this.dialogCallbacks[tRef];
    }
  };
  
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
      this.logger("debug", "No registered callbacks exist at the moment");
      return;
    }
    
    for(var tRef in changedTiddlers) {
            
      if(!this.dialogCallbacks[tRef]) continue;
      
      if(this.wiki.getTiddler(tRef)) {
        
        this.logger("debug", "A callback for \"" + tRef + "\" will be executed");
        this.dialogCallbacks[tRef].execute(tRef);
        
        // a continue prevents deleting the callback
        if(!this.dialogCallbacks.isDeleteOnCall) continue;
        
      }
      
      this.removeCallback(tRef);
      
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
   * @callback an optional function with the signature function(isConfirmed);
   */
  TaskGraphWidget.prototype.handleConnectionEvent = function(data, callback) {
       
    this.logger("info", "Opening a dialog for creating an edge");

    var edgeFilterExpr = (this.mode === "graph"
                          ? this.getView().getAllEdgesFilterExpr(true) // true => byLabel
                          : this.opt.filter.allSharedEdgesByLabel);

    var vars = {
      isShowScopeOption: String(this.mode === "button"),
      edgeFilterExpr: edgeFilterExpr,
      fromLabel: this.adapter.selectNodeById(data.from).label,
      toLabel: this.adapter.selectNodeById(data.to).label,
      defaultViewBindingChoice: this.opt.user.defaultViewBindingChoice,
      rememberViewBindingChoice: (this.opt.user.defaultViewBindingChoice
                                  ? "true"
                                  : "false")
    };
    
    this.openDialog(this.opt.ref.edgeTypeDialog, vars, function(isConfirmed, outputTObj) {
    
        if(isConfirmed) {
          
          var resultFields = utils.getEmptyMap();
          
          if(outputTObj) {
            // copy fields (needs to be done as tObj are immutable)
            $tw.utils.extend(resultFields, outputTObj.fields);
          }
          
          if(!resultFields.text) {
            resultFields.text = this.opt.misc.unknownEdgeLabel;
          }
          
          this.logger("debug", "The edgetype is set to: " + resultFields.text);        
          data.label = resultFields.text;
          
          if(resultFields.view) {
            data.view = resultFields.view;
            if(resultFields.rememberViewBindingChoice) {
              var tgOptions = $tw.wiki.getTiddlerData(this.opt.ref.tgOptions);
              tgOptions.defaultViewBindingChoice = data.view;
              this.wiki.setTiddlerData(this.opt.ref.tgOptions, tgOptions);
            }
          }
          
          var view = (this.mode === "graph" ? this.getView() : null);
          
          // persist
          this.adapter.insertEdge(data, view);  
          $tw.taskgraph.notify("edge added");
        }
        
        if(typeof callback == "function") {
          callback(isConfirmed);
        }
        
    });
    
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

    this.registerCallback(dialogFields.result, function(t) {

      var triggerTObj = this.wiki.getTiddler(t);
      var isConfirmed = triggerTObj.fields.text;
      
      if(isConfirmed) {
        var outputTObj = this.wiki.getTiddler(dialogFields.output);
      } else {
        var outputTObj = null;
        $tw.taskgraph.notify("operation cancelled");
      }
      
      if(typeof callback == "function") {
        callback.call(this, isConfirmed, outputTObj);
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

    var vars = {
      message : message,
      confirmButtonLabel: "Yes mom, I know what I'm doing!",
      cancelButtonLabel: "Uuups, hell no!"
    };
    
    this.openDialog(this.opt.ref.confirmationDialog, vars, callback);
  };
  
  /**
   * Used for debugging
   */
  TaskGraphWidget.prototype.getObjectId = function() {
    if(this.objectId) return this.objectId;
    this.objectId = this.getAttribute("object-id");
    return (this.objectId ? this.objectId : utils.genUUID());
  };
  
  TaskGraphWidget.prototype.logger = function(type, message /*, more stuff*/) {
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift("@" + this.getObjectId().toUpperCase());
    args.unshift(type);
    $tw.taskgraph.logger.apply(this, args);
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

      $tw.taskgraph.logger("warn", "Initializing a taskgraph widget in mode \"" + mode.value + "\"");

      var constrObj = new TaskGraphWidget(parseTreeNode, options);

      $tw.taskgraph.logger("debug", "Require class for mode \"" + mode.value + "\"");
      
      var TaskgraphMode = require("$:/plugins/felixhayashi/taskgraph/taskgraph_" + mode.value + ".js")
                           .getClass(constrObj);
                           
      var modeObject = new TaskgraphMode(parseTreeNode, options);
      $tw.taskgraph.logger("info", "Done initializing a taskgraph widget");
            
      return modeObject;
      
    } else {
     
      throw "Taskgraph: Mode \"" + mode.value + "\" does not exist";
      
    }
    
  };

  exports.taskgraph = Factory;

})();

