/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/listener
type: application/javascript
module-type: startup

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){
  
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/**************************** IMPORTS ****************************/

var NodeType = require("$:/plugins/felixhayashi/tiddlymap/js/NodeType").NodeType;
var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;

/***************************** CODE ******************************/

var GlobalListener = function() {
    
  //shortcuts
  this.adapter = $tw.tmap.adapter;
  this.wiki = $tw.wiki;
  this.logger = $tw.tmap.logger;
  this.opt = $tw.tmap.opt;
  this.utils = $tw.tmap.utils;
  this.dialogManager = $tw.tmap.dialogManager;
    
  // add handlers to the root widget to make them available from everywhere
  this.utils.addListeners({ 
    "tmap:tm-remove-edge": this.handleRemoveEdge,
    "tmap:tm-load-type-form": this.handleLoadTypeForm,
    "tmap:tm-save-type-form": this.handleSaveTypeForm,
    "tmap:tm-create-type": this.handleCreateType,
    "tmap:tm-create-edge": this.handleCreateEdge,
    "tmap:tm-suppress-dialog": this.handleSuppressDialog,
    "tmap:tm-generate-widget": this.handleGenerateWidget,
    "tmap:tm-download-graph": this.handleDownloadGraph,
    "tmap:tm-manage-edge-types": this.handleOpenTypeManager,
    "tmap:tm-manage-node-types": this.handleOpenTypeManager,
    "tmap:tm-cancel-dialog": this.handleCancelDialog,
    "tmap:tm-confirm-dialog": this.handleConfirmDialog
  }, $tw.rootWidget, this);
  
};

GlobalListener.prototype.handleCancelDialog = function(event) {
  this.utils.setField(event.param, "text", "");
};

GlobalListener.prototype.handleConfirmDialog = function(event) {
  this.utils.setField(event.param, "text", "1");
};
  
GlobalListener.prototype.handleSuppressDialog = function(event) {

  if(this.utils.isTrue(event.paramObject.suppress, false)) {
    this.utils.setEntry(
        this.opt.ref.sysUserConf,
        "suppressedDialogs." + event.paramObject.dialog,
        true
    );
  }
  
};

GlobalListener.prototype.handleDownloadGraph = function(event) {

  var graph = this.adapter.getGraph({ view: event.paramObject.view });  
  
  graph.nodes = this.utils.convert(graph.nodes, "array");
  graph.edges = this.utils.convert(graph.edges, "array");
  
  var tRef = "$:/temp/tmap/export";

  this.utils.setField(tRef, "text", JSON.stringify(graph, null, 2));
    
  $tw.rootWidget.dispatchEvent({
    type: "tm-download-file",
    param: tRef,
    paramObject: {
      filename: event.paramObject.view + ".json"
    }
  });
  
};

GlobalListener.prototype.handleGenerateWidget = function(event) {
  
  if(!event.paramObject) event.paramObject = {};
  
  var options = {
    dialog: {
      preselects: { view: event.paramObject.view || "Default" }
    }
  };
  this.dialogManager.open("getWidgetCode", options);
  
};

GlobalListener.prototype.handleRemoveEdge = function(event) {
  
  this.adapter.deleteEdge(event.paramObject);
  
};

GlobalListener.prototype.handleCreateEdge = function(event) {

  var edge = {
    from: this.adapter.makeNode(event.paramObject.from).id,
    to: this.adapter.makeNode(event.paramObject.to).id,
    type: event.paramObject.label,
    id: event.paramObject.id
  }
  
  this.adapter.insertEdge(edge);
  $tw.tmap.notify("Edge inserted");
   
};

GlobalListener.prototype.handleOpenTypeManager = function(event) {
    
  if(!event.paramObject) event.paramObject = {};
  
  // either "manage-edge-types" or "manage-node-types"
  var mode = event.type.match(/tmap:tm-(.*)/)[1];
  
  if(mode === "manage-edge-types") {
    var topic = "Edge-Type Manager";
    var allTypesSelector = this.opt.selector.allEdgeTypesByLabel;
  } else {
    var topic = "Node-Type Manager";
    var allTypesSelector = this.opt.selector.allNodeTypesByLabel;
  }
                          
  var opts = {
    mode: mode,
    topic: topic,
    filter: allTypesSelector
            + " +[search:title{$:/temp/tmap/elementTypeSearch}]"
            + " +[sort[title]]"
  };
  
  var dialogTObj = this.dialogManager.open("elementTypeManager", opts);
  
  if(event.paramObject.type) {
    this.handleLoadTypeForm({
      paramObject: {
        mode: mode,
        id: event.paramObject.type,
        output: dialogTObj.fields["output"]
      }
    });
  }
  
};

GlobalListener.prototype.handleLoadTypeForm = function(event) {
  
  var outTRef = event.paramObject.output;
    
  var type = (event.paramObject.mode === "manage-edge-types"
              ? new EdgeType(event.paramObject.id)
              : new NodeType(event.paramObject.id));
  
  // inject all the type data as fields into the dialog output
  type.persist(outTRef, true);
  
  // fields that need preprocessing
  
  if(event.paramObject.mode === "manage-edge-types") {
    var usage = this.adapter.selectEdgesByType(type);
    var count = Object.keys(usage).length;
    this.utils.setField(outTRef, "temp.usageCount", count);
  }
  
  $tw.wiki.addTiddler(new $tw.Tiddler(
    this.utils.getTiddler(outTRef),
    {
      "temp.idImmutable": (type.isShipped() ? "true" : ""),
      "temp.newId": type.getId(),
      "vis-inherited": JSON.stringify(this.opt.config.vis)
    }
  ));

  // reset the tabs to default
  this.utils.deleteByPrefix("$:/state/tabs/elementTypeManager");
  
};

GlobalListener.prototype.handleSaveTypeForm = function(event) {
  
  var tObj = this.utils.getTiddler(event.paramObject.output);  
  if(!tObj) return;
  
  var mode = event.paramObject.mode;
  var type = (mode === "manage-edge-types"
              ? new EdgeType(tObj.fields.id)
              : new NodeType(tObj.fields.id));
  
  if(this.utils.isTrue(tObj.fields["temp.deleteType"], false)) {
    this.deleteType(mode, type, tObj);
  } else {
    this.saveType(mode, type, tObj);
  }
  
};

GlobalListener.prototype.deleteType = function(mode, type, dialogOutput) {
  
  this.logger("debug", "Deleting type", type);
      
  if(mode === "manage-edge-types") {
    this.adapter._processEdgesWithType(type, { action: "delete" });
  } else {
    this.adapter.removeNodeType(type);
  }
  
  this.wiki.addTiddler(new $tw.Tiddler({
    title: this.utils.getTiddlerRef(dialogOutput)
  }));
  
  $tw.tmap.notify("Deleted type");
  
};

GlobalListener.prototype.saveType = function(mode, type, dialogOutput) {
  
  var tObj = this.utils.getTiddler(dialogOutput);
  
  // save
  type.loadDataFromTiddler(tObj);
  type.persist();
  
  if(!tObj.fields["temp.newId"]) { // no new id set
    
    // set id back to original state
    this.utils.setField(tObj, "temp.newId", tObj.fields["id"]);
    
  } else if(tObj.fields["temp.newId"] !== tObj.fields["id"]) { //renamed
    
    if(mode === "manage-edge-types") {
      this.adapter._processEdgesWithType(type, {
        action: "rename",
        newName: tObj.fields["temp.newId"]
      });
    }
    this.utils.setField(tObj, "id", tObj.fields["temp.newId"]);
  }
  
  $tw.tmap.notify("Saved type data");
  
};

GlobalListener.prototype.handleCreateType = function(event) {
  
  var id = event.paramObject.id;
  var type = (event.paramObject.mode === "manage-edge-types" ? "edge" : "node");

  this.handleLoadTypeForm({
    paramObject: {
      id: this.adapter.createType(type, id).getId(),
      mode: event.paramObject.mode,
      output: event.paramObject.output
    }
  });
  
};

/**
 * Helper
 */
GlobalListener.prototype.getTypeFromEvent = function(event) {
    
  return (event.paramObject.mode === "manage-edge-types"
          ? new EdgeType(event.paramObject.id)
          : new NodeType(event.paramObject.id));
          
};

/**************************** EXPORTS ****************************/

exports.name = "tmap.listener";
exports.platforms = [ "browser" ];
exports.after = [ "rootwidget", "tmap.caretaker" ];
exports.before = [ "story" ];
exports.synchronous = true;
exports.startup = function() {
  // will register its lister functions to the root widget
  new GlobalListener();
};

})();