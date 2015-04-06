/*\

title: $:/plugins/felixhayashi/tiddlymap/startup/listener.js
type: application/javascript
module-type: startup

@preserve

\*/

(function(){
  
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "tmap.listener";
exports.platforms = [ "browser" ];
exports.after = [ "rootwidget", "tmap.caretaker" ];
exports.before = [ "story" ];
exports.synchronous = true;

var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;

var GlobalListener = function() {
    
  //shortcuts
  this.adapter = $tw.tmap.adapter;
  this.wiki = $tw.wiki;
  this.logger = $tw.tmap.logger;
  this.opt = $tw.tmap.opt;
    
  // add handlers to the root widget to make them available from everywhere
  utils.addListeners({ 
    "tmap:tm-remove-edge": this.handleRemoveEdge,
    "tmap:tm-fill-edge-type-form": this.handleFillEdgeTypeForm,
    "tmap:tm-save-edge-type-form": this.handleSaveEdgeTypeForm,
    "tmap:tm-create-edge-type": this.handleCreateEdgeType,
    "tmap:tm-create-edge": this.handleCreateEdge,
    "tmap:tm-suppress-dialog": this.handleSuppressDialog,
    "tmap:tm-generate-widget": this.handleGenerateWidget,
    "tmap:tm-manage-edge-types": this.handleManageEdgeTypes
  }, $tw.rootWidget, this);
  
};
  
GlobalListener.prototype.handleManageEdgeTypes = function(event) {
  
  if(!event.paramObject) event.paramObject = {};
  
  var params = {
    param: {
      filter: this.opt.selector.allEdgeTypesByLabel
              + " +[search:title{$:/temp/tmap/edgeTypeSearch}]"
              + " +[sort[title]]"
    },
    dialog: {
      buttons: "edge_type_manager"
    }
  };
  
  var dialogTObj = $tw.tmap.dialogManager.open("edgeTypeManager", params);
  
  var type = event.paramObject.type;
  if(type) {
    this.handleFillEdgeTypeForm({
      paramObject: {
        id: type,
        output: dialogTObj.fields["output"]
      }
    });
  }
  
};  
  
GlobalListener.prototype.handleSuppressDialog = function(event) {

  if(utils.isTrue(event.paramObject.suppress, false)) {
    utils.setEntry(this.opt.ref.sysUserConf, "suppressedDialogs." + event.paramObject.dialog, true);
  }
  
};

GlobalListener.prototype.handleGenerateWidget = function(event) {
  
  if(!event.paramObject) event.paramObject = {};
  
  var options = {
    dialog: {
      buttons: "ok",
      preselects: { view: event.paramObject.view || "Default" }
    }
  };
  $tw.tmap.dialogManager.open("getWidgetCode", options);
  
};

GlobalListener.prototype.handleRemoveEdge = function(event) {
  this.adapter.deleteEdge(event.paramObject);
};

GlobalListener.prototype.handleCreateEdge = function(event) {
    
  var edge = {
    from: this.adapter.makeNode(event.paramObject.from).id,
    to: this.adapter.makeNode(event.paramObject.to).id,
    type: event.paramObject.label
  }
  
  this.adapter.insertEdge(edge);
  $tw.tmap.notify("Edge inserted");
   
};

GlobalListener.prototype.handleSaveEdgeTypeForm = function(event) {
  
  var tObj = utils.getTiddler(event.paramObject.output);
  var type = new EdgeType(tObj.fields.id);
  
  if(utils.isTrue(tObj.fields["temp.deleteType"], false)) {
    
    this.logger("debug", "Deleting type", type);
    this.adapter._processEdgesWithType(type, { action: "delete" });
    this.wiki.addTiddler(new $tw.Tiddler({title: event.paramObject.output}));
    
    $tw.tmap.notify("Deleted type");
    
  } else { 
    
    type.loadDataFromTiddler(tObj);
    type.persist();

    if(!tObj.fields["temp.newId"]) { // no new id set
      
      // set id back to original state
      utils.setField(tObj, "temp.newId", tObj.fields["id"]);
      
    } else if(tObj.fields["temp.newId"] !== tObj.fields["id"]) { //renamed
      
      this.adapter._processEdgesWithType(type, {
        action: "rename",
        newName: tObj.fields["temp.newId"]
      });
      
      utils.setField(tObj, "id", tObj.fields["temp.newId"]);

    }
    
    $tw.tmap.notify("Saved type data");
    
  }

};

GlobalListener.prototype.handleFillEdgeTypeForm = function(event) {
  
  var type = new EdgeType(event.paramObject.id);
  var outTRef = event.paramObject.output;
  var usage = this.adapter.selectEdgesByType(type);
  
  type.persist(outTRef, true);
  
  var isIdImmutable = (utils.startsWith(type.getId(), "tmap:") ? "true" : "");
  utils.setField(outTRef, "temp.idImmutable", isIdImmutable);
  utils.setField(outTRef, "temp.newId", type.getId());
  utils.setField(outTRef, "temp.usageCount", Object.keys(usage).length);
  
  console.log(utils.getTiddler(outTRef));
  console.log(usage);
  
  // reset the tabs to default
  utils.deleteByPrefix("$:/state/tabs/edgeTypeManager");
  
};

// TODO refactor to adapter!
GlobalListener.prototype.handleCreateEdgeType = function(event) {
  
  var name = this.wiki.generateNewTitle(this.opt.path.edgeTypes + "/New Type");
  var type = new EdgeType(utils.getBasename(name));
  
  type.persist();
    
  this.handleFillEdgeTypeForm({
    paramObject: {
      id: type.getId(),
      output: event.paramObject.output
    }
  });
  
};

exports.startup = function() {
  // will register its lister functions to the root widget
  new GlobalListener();
}

})();