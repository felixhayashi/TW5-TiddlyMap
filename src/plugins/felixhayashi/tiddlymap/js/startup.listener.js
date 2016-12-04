// tw-module
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/listener
type: application/javascript
module-type: startup

@preserve

\*/

/*** Imports *******************************************************/

import NodeType from '$:/plugins/felixhayashi/tiddlymap/js/NodeType';
import EdgeType from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import visDefConf from '$:/plugins/felixhayashi/tiddlymap/js/config/vis';

/*** Code **********************************************************/

/**
 * @class
 */
function GlobalListener() {
    
  // alias
  this.wiki = $tw.wiki;
    
  // add handlers to the root widget to make them available from everywhere
  utils.addTWlisteners({ 
    "tmap:tm-remove-edge": this.handleRemoveEdge,
    "tmap:tm-load-type-form": this.handleLoadTypeForm,
    "tmap:tm-save-type-form": this.handleSaveTypeForm,
    "tmap:tm-create-type": this.handleCreateType,
    "tmap:tm-create-edge": this.handleCreateEdge,
    "tmap:tm-suppress-dialog": this.handleSuppressDialog,
    "tmap:tm-generate-widget": this.handleGenerateWidget,
    "tmap:tm-download-graph": this.handleDownloadGraph,
    "tmap:tm-configure-system": this.handleConfigureSystem,
    "tmap:tm-manage-edge-types": this.handleOpenTypeManager,
    "tmap:tm-manage-node-types": this.handleOpenTypeManager,
    "tmap:tm-cancel-dialog": this.handleCancelDialog,
    "tmap:tm-clear-tiddler": this.handleClearTiddler,
    "tmap:tm-merge-tiddlers": this.handleMixTiddlers,
    "tmap:tm-confirm-dialog": this.handleConfirmDialog
  }, $tw.rootWidget, this);
  
};

GlobalListener.prototype.handleCancelDialog = function(event) {
  utils.setField(event.param, "text", "");
};

GlobalListener.prototype.handleClearTiddler = function(event) {
  
  var params = event.paramObject;
  if (!params || !params.title) return;
  
  var tObj = utils.getTiddler(params.title);
  var originalFields = tObj ? tObj.fields : {};
  var fieldsToKeep = params.keep ? params.keep.split() : [];
  var cloneFields = {
    title: params.title,
    text: "" // see https://github.com/Jermolene/TiddlyWiki5/issues/2025
  };
  
  for (var i = fieldsToKeep.length; i--;) {
    var fieldName = fieldsToKeep[i];
    cloneFields[fieldName] = originalFields[fieldName];
  }
  
  $tw.wiki.deleteTiddler(params.title);
  $tw.wiki.addTiddler(new $tw.Tiddler(cloneFields));
  
};

GlobalListener.prototype.handleMixTiddlers = function(event) {
  
  var params = event.paramObject;
  if (!params || !params.tiddlers) return;
  
  var tiddlers = $tw.utils.parseStringArray(params.tiddlers);
  var tObj = utils.getMergedTiddlers(tiddlers, params.output);
                                     
  $tw.wiki.addTiddler(tObj);
  
};

GlobalListener.prototype.handleConfirmDialog = function(event) {
  
  utils.setField(event.param, "text", "1");
  
};
  
GlobalListener.prototype.handleSuppressDialog = function(event) {

  if (utils.isTrue(event.paramObject.suppress, false)) {
    utils.setEntry(
        $tm.ref.sysUserConf,
        "suppressedDialogs." + event.paramObject.dialog,
        true
    );
  }
  
};

GlobalListener.prototype.handleDownloadGraph = function(event) {

  var graph = $tm.adapter.getGraph({ view: event.paramObject.view });  
  
  graph.nodes = utils.convert(graph.nodes, "array");
  graph.edges = utils.convert(graph.edges, "array");
  
  var tRef = "$:/temp/tmap/export";

  utils.setField(tRef, "text", JSON.stringify(graph, null, 2));
    
  $tw.rootWidget.dispatchEvent({
    type: "tm-download-file",
    param: tRef,
    paramObject: {
      filename: event.paramObject.view + ".json"
    }
  });
  
};

GlobalListener.prototype.handleConfigureSystem = function() {

  var allTiddlers = $tm.adapter.getAllPotentialNodes();
  var allEdges = $tm.adapter.getEdgesForSet(allTiddlers);
  var plugin = $tw.wiki.getTiddler($tm.path.pluginRoot).fields;
  var meta = $tw.wiki.getTiddlerData($tm.ref.sysMeta);
  var hasLiveTab = utils.getTiddler($tm.ref.liveTab)
                        .hasTag("$:/tags/SideBar");
                        
  var args = {
    numberOfNodes: "" + allTiddlers.length,
    numberOfEdges: "" + Object.keys(allEdges).length,
    pluginVersion: "v" + plugin.version,
    dataStructureVersion: "v" + meta.dataStructureState,
    dialog: {
      preselects: {
        "liveTab": "" + hasLiveTab,
        "vis-inherited": JSON.stringify(visDefConf),
        "config.vis": utils.getText($tm.ref.visUserConf),
        "config.sys": $tm.config.sys
      }
    }
  };

  var name = "globalConfig";
  $tm.dialogManager.open(name, args, function(isConfirmed, outTObj) {
    
    if (!isConfirmed) return;
      
    var config = utils.getPropertiesByPrefix(outTObj.fields,
                                             "config.sys.",
                                             true);
                                             
    // CAREFUL: this is a data tiddler!
    $tw.wiki.setTiddlerData($tm.ref.sysUserConf, config);

    // show or hide the live tab; to hide the live tab, we override
    // the shadow tiddler; to show it, we remove the overlay again.
    if (utils.isTrue(outTObj.fields.liveTab, false)) {
      utils.setField($tm.ref.liveTab, "tags", "$:/tags/SideBar");
    } else {
      $tw.wiki.deleteTiddler($tm.ref.liveTab);
    }
    
    // tw doesn't translate the json to an object so this is
    // already a string
    utils.setField($tm.ref.visUserConf,
                   "text",
                   outTObj.fields["config.vis"]);
            


  }.bind(this));
  
};

GlobalListener.prototype.handleGenerateWidget = function(event) {
  
  if (!event.paramObject) event.paramObject = {};
  
  var options = {
    dialog: {
      preselects: {
        view: (event.paramObject.view || $tm.misc.defaultViewLabel)
      }
    }
  };
  $tm.dialogManager.open("widgetCodeGenerator", options);
  
};

GlobalListener.prototype.handleRemoveEdge = function(event) {
  
  $tm.adapter.deleteEdge(event.paramObject);
  
};

GlobalListener.prototype.handleCreateEdge = function(event) {

  var from = event.paramObject.from;
  var to = event.paramObject.to;
  var isForce = event.paramObject.force;
  
  if (!from || !to) return;
  
  if ((utils.tiddlerExists(from) && utils.tiddlerExists(to)) || isForce) {

    // will not override any existing tiddlers…
    utils.addTiddler(to);
    utils.addTiddler(from);

    var edge = {
      from: $tm.adapter.makeNode(from).id,
      to: $tm.adapter.makeNode(to).id,
      type: event.paramObject.label,
      id: event.paramObject.id
    }
    
    $tm.adapter.insertEdge(edge);
    $tm.notify("Edge inserted");
    
  }
   
};

GlobalListener.prototype.handleOpenTypeManager = function(event) {
    
  if (!event.paramObject) event.paramObject = {};
  
  // either "manage-edge-types" or "manage-node-types"
  var mode = event.type.match(/tmap:tm-(.*)/)[1];
  
  if (mode === "manage-edge-types") {
    var topic = "Edge-Type Manager";
    var allTypesSelector = $tm.selector.allEdgeTypes;
    var typeRootPath = $tm.path.edgeTypes;
  } else {
    var topic = "Node-Type Manager";
    var allTypesSelector = $tm.selector.allNodeTypes;
    var typeRootPath = $tm.path.nodeTypes;
  }
                          
  var args = {
    mode: mode,
    topic: topic,
    searchSelector: allTypesSelector,
    typeRootPath: typeRootPath
  };
  
  var dialogTObj = $tm.dialogManager.open("MapElementTypeManager", args);
  
  if (event.paramObject.type) {
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
  type.save(outTRef);
  
  // fields that need preprocessing
  
  if (event.paramObject.mode === "manage-edge-types") {
    var usage = $tm.adapter.selectEdgesByType(type);
    var count = Object.keys(usage).length;
    utils.setField(outTRef, "temp.usageCount", count);
  }
  
  $tw.wiki.addTiddler(new $tw.Tiddler(
    utils.getTiddler(outTRef),
    {
      "typeTRef": type.fullPath,
      "temp.idImmutable": (type.isShipped ? "true" : ""),
      "temp.newId": type.id,
      "vis-inherited": JSON.stringify($tm.config.vis)
    }
  ));

  // reset the tabs to default
  utils.deleteByPrefix("$:/state/tabs/MapElementTypeManager");
  
};

GlobalListener.prototype.handleSaveTypeForm = function(event) {
  
  var tObj = utils.getTiddler(event.paramObject.output);  
  if (!tObj) return;
  
  var mode = event.paramObject.mode;
  var type = (mode === "manage-edge-types"
              ? new EdgeType(tObj.fields.id)
              : new NodeType(tObj.fields.id));
  
  if (utils.isTrue(tObj.fields["temp.deleteType"], false)) {
    this.deleteType(mode, type, tObj);
  } else {
    this.saveType(mode, type, tObj);
  }
  
};

GlobalListener.prototype.deleteType = function(mode, type, dialogOutput) {
  
  $tm.logger("debug", "Deleting type", type);
      
  if (mode === "manage-edge-types") {
    $tm.adapter._processEdgesWithType(type, { action: "delete" });
  } else {
    $tm.adapter.removeNodeType(type);
  }
  
  this.wiki.addTiddler(new $tw.Tiddler({
    title: utils.getTiddlerRef(dialogOutput)
  }));
  
  $tm.notify("Deleted type");
  
};

GlobalListener.prototype.saveType = function(mode, type, dialogOutput) {
  
  var tObj = utils.getTiddler(dialogOutput);
  
  // update the type with the form data
  type.loadFromTiddler(tObj);
  type.save();
    
  var newId = tObj.fields["temp.newId"];
  
  if (newId && newId !== tObj.fields["id"]) { //renamed
    
    if (mode === "manage-edge-types") {
      
      $tm.adapter._processEdgesWithType(type, {
        action: "rename",
        newName: newId
      });
      
    } else {
      
      var newType = new NodeType(newId);
      newType.load(type);
      newType.save();
      $tw.wiki.deleteTiddler(type.fullPath);
      
    }
    
    utils.setField(tObj, "id", newId);
    
  }
    
  $tm.notify("Saved type data");
  
};

GlobalListener.prototype.handleCreateType = function(event) {
  
  var id = event.paramObject.id || "New type";
  var type = (event.paramObject.mode === "manage-edge-types"
              ? new EdgeType(id)
              : new NodeType(id));
  type.save();

  this.handleLoadTypeForm({
    paramObject: {
      id: type.id,
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


/*** Exports *******************************************************/

export const name = "tmap.listener";
export const platforms = [ "browser" ];
export const after = [ "rootwidget", "tmap.caretaker" ];
export const before = [ "story" ];
export const synchronous = true;
export const startup = () => {
  // will register its lister functions to the root widget
  new GlobalListener();
};