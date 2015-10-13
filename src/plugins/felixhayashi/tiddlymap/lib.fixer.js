/*\

title: $:/plugins/felixhayashi/tiddlymap/js/fixer
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
 
var utils =           require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
var Adapter =         require("$:/plugins/felixhayashi/tiddlymap/js/Adapter").Adapter;
var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction").ViewAbstraction;
var EdgeType =        require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;

/***************************** CODE ******************************/

var moveEdges = function(path, view) {
    
  var matches = utils.getByPrefix(path);
  for(var i = 0; i < matches.length; i++) {
    
    // create edge type
    var type = utils.getBasename(matches[i]);
    if(type === "__noname__") { type = "tmap:unknown"; }
    type = new EdgeType(type);
    
    if(!type.exists()) type.save();

    // move edges
    var edges = $tw.wiki.getTiddlerData(matches[i]);
    for(var j = 0; j < edges.length; j++) {        
      // prefix formerly private edges with view name as namespace
      edges[j].type = (view ? view + ":" : "") + type.id;
      $tw.tmap.adapter.insertEdge(edges[j]);
    }
  
    // finally remove the store
    $tw.wiki.deleteTiddler(matches[i]);
    
  }

};

var executeUpgrade = function(toVersion, curVersion, upgrade) {
  
  if(utils.isLeftVersionGreater(toVersion, curVersion)) {
  // = current data structure version is outdated
    
    $tw.tmap.logger("debug",
                    "Upgrading data structure to " + toVersion);
                    
    // execute fix
    upgrade();

    // update meta
    utils.setEntry($tw.tmap.opt.ref.sysMeta,
                   "dataStructureState",
                   toVersion);
     
  }
  
};

var fixer = {};

fixer.fixId = function() {
  /**
   * Upgrade datastructure from below or equal v0.9.0 to v0.9.2
   * 
   * Changes:
   * 1. The node id field is moved to tmap.id if **original version**
   *    is below v0.9.2.
   */
  var meta = $tw.wiki.getTiddlerData($tw.tmap.opt.ref.sysMeta, {});
  var upgrade = { before: "0.9.0", after: "0.9.2" };
  if(utils.isLeftVersionGreater(upgrade.before, meta.dataStructureState)) {
    // = is "before" greater than current data structure version?
    
    $tw.tmap.logger("debug", "Upgrading data structure to", upgrade.after);
    
    if(utils.isLeftVersionGreater("0.9.2", meta.originalVersion)) {
      // path of the user conf at least in 0.9.2
      var userConf = "$:/plugins/felixhayashi/tiddlymap/config/sys/user";
      var nodeIdField = utils.getEntry(userConf, "field.nodeId", "tmap.id");
      utils.moveFieldValues(nodeIdField, "tmap.id", true, false);
    }
        
    // update meta
    utils.setEntry($tw.tmap.opt.ref.sysMeta, "dataStructureState", upgrade.after);
  }
};

fixer.fix = function() {
  
  var meta = $tw.wiki.getTiddlerData($tw.tmap.opt.ref.sysMeta, {});
  
  $tw.tmap.logger("debug", "Fixer is started");
  $tw.tmap.logger("debug", "Data-structure currently in use: ", meta.dataStructureState);
  
  /**
   * Upgrade datastructure from below or equal v0.6.11 to v0.7.0
   * 
   * Changes:
   * 1. Edges are stored in tiddlers instead of type based edge stores
   * 2. No more private views
   */   
  var upgrade = { before: "0.6.11", after: "0.7.0" };
  if(utils.isLeftVersionGreater(upgrade.before, meta.dataStructureState)) {
    // = is "before" greater than current data structure version?
    
    $tw.tmap.logger("debug", "Upgrading data structure to", upgrade.after);
    
    // move edges that were formerly "global"
    moveEdges("$:/plugins/felixhayashi/tiddlymap/graph/edges", null);
    
    // move edges that were formerly bound to view ("private")
    var filter = $tw.tmap.opt.selector.allViews;
    var viewRefs = utils.getMatches(filter);
    for(var i = 0; i < viewRefs.length; i++) {
      var view = new ViewAbstraction(viewRefs[i]);
      moveEdges(view.getRoot()+"/graph/edges", view);
    }
    
    // update meta
    utils.setEntry($tw.tmap.opt.ref.sysMeta, "dataStructureState", upgrade.after);
  }
  
  /**
   * Upgrade datastructure from below or equal v0.7.31 to v0.7.32
   * 
   * Changes:
   * 1. Changes to the live view filter and refresh trigger field
   * 
   */
  var upgrade = { before: "0.7.31", after: "0.7.32" };
  if(utils.isLeftVersionGreater(upgrade.before, meta.dataStructureState)) {
    // = is "before" greater than current data structure version?
    $tw.tmap.logger("debug", "Upgrading data structure to", upgrade.after);

    var liveView = $tw.tmap.adapter.getView("Live View");
    // Only listen to the current tiddler of the history list
    liveView.setNodeFilter("[field:title{$:/temp/tmap/currentTiddler}]",
                           true);
    
    liveView.setConfig({
      "refresh-trigger": null, // delete the field (renamed)
      "refresh-triggers": $tw.utils.stringifyList([ "$:/temp/tmap/currentTiddler" ])
    });
    
    // update meta
    utils.setEntry($tw.tmap.opt.ref.sysMeta, "dataStructureState", upgrade.after);
     
  }
  
  /**
   * Upgrade datastructure from below or equal v0.7.32 to v0.9.0
   * 
   * Changes:
   * 1. Group styles for matches and neighbours are now modulized
   *    and stored as node-types.
   * 2. vis user configuration is restored unflattened!
   *    The user only interacts through the GUI.
   * 3. If the node id field was "id" it is moved to tmap.id
   */
  var upgrade = { before: "0.7.32", after: "0.9.0" };
  if(utils.isLeftVersionGreater(upgrade.before, meta.dataStructureState)) {
    // = is "before" greater than current data structure version?
    
    $tw.tmap.logger("debug", "Upgrading data structure to", upgrade.after);
    
    var confRef = $tw.tmap.opt.ref.visUserConf;
    var userConf = utils.unflatten($tw.wiki.getTiddlerData(confRef, {}));
    
    if(typeof userConf.groups === "object") {
                
      var type = new $tw.tmap.NodeType("tmap:neighbour");
      type.setStyle(userConf.groups["neighbours"]);
      type.save();
                      
      delete userConf.groups;
      $tw.wiki.setTiddlerData(confRef, userConf);
                  
    }
        
    // update meta
    utils.setEntry($tw.tmap.opt.ref.sysMeta, "dataStructureState", upgrade.after);
     
  }
  
  /**
   * Upgrade datastructure from below or equal v0.9.0 to v0.9.2
   * 
   * Changes:
   * 1. The node id field is moved to tmap.id if **original version**
   *    is below v0.9.2.
   */
  fixer.fixId();
   
  
  /**
   * This will ensure that all node types have a prioritization field
   * set.
   */
  executeUpgrade("0.9.16", meta.dataStructureState, function() {
    var glNTy = $tw.tmap.indeces.glNTy;
    for(var i = glNTy.length; i--;) {
      glNTy[i].save(null, true);
    }
  });
                
};

exports.fixer = fixer;

})();
