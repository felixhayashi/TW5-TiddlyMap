/*\
title: $:/plugins/felixhayashi/taskgraph/taskgraph_button.js
type: application/javascript
module-type: library
\*/

/**************************** IMPORTS ****************************/

var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;

/***************************** CODE ******************************/

exports.getClass = function(constrObj) {
    
  /**
   * This is the Button-version of the TaskGraphWidget.
   */
  var TaskGraphWidget = function(parseTreeNode, options) {
    
    this.addEventListeners([
      { type: "tw-create-connection", handler: this.handleButtonConnection }
    ]);  

  };
  
  // !! EXTENSION !!
  TaskGraphWidget.prototype = constrObj;
  // !! EXTENSION !!
  
  TaskGraphWidget.prototype.handleButtonConnection = function(event) {

    var fromRefHolder = this.wiki.getTiddler("$:/temp/connectFromRef");
    var toRefHolder = this.wiki.getTiddler("$:/temp/connectToRef");
    
    if(fromRefHolder && toRefHolder && fromRefHolder.fields.text && toRefHolder.fields.text){
      
      var fromTObj = this.wiki.getTiddler(fromRefHolder.fields.text);
      var toTObj = this.wiki.getTiddler(toRefHolder.fields.text);
      
      if(fromTObj && toTObj) {
        
        $tw.taskgraph.fn.console.info("User want's to create an edge from \"" +  fromTObj.fields.title + "\" to \"" +  toTObj.fields.title + "\"");
      
        $tw.taskgraph.fn.console.debug("setup the tiddlers to ensure they have an id field and a title");
        // prepare tiddlers before 
        fromTObj = this.adapter.setupTiddler(fromTObj);
        toTObj = this.adapter.setupTiddler(toTObj);
      
        // which field to use as id?
        var data = {
          from : fromTObj.fields[$tw.taskgraph.opt.tw.fields.id],
          to : toTObj.fields[$tw.taskgraph.opt.tw.fields.id]
        };
      
        this.handleConnectionEvent(data, function(isSuccess) {
          // in any case
          utils.deleteTiddlers(["$:/temp/connectToRef", "$:/temp/connectFromRef"]);
        }.bind(this));
      }
    }
  };

  /**
   * @Override Widget.render():
   * Method to render this widget into the DOM
   */
  TaskGraphWidget.prototype.render = function(parent,nextSibling) {
    
    this.registerParentDomNode(parent);
                
    // make child widgets
    this.execute();
    
    this.renderChildren(parent, nextSibling);
  };  
  
  /**
   * @Override Widget.refresh();
   * Selectively refreshes the widget if needed. Returns true if the
   * widget or any of its children needed re-rendering.
   */
  TaskGraphWidget.prototype.refresh = function(changedTiddlers) {
    this.checkForCallbacks(changedTiddlers);
    this.refreshSelf();
  }

  return TaskGraphWidget;

}
