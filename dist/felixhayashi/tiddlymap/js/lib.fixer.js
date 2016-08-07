/*\

title: $:/plugins/felixhayashi/tiddlymap/js/fixer
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = {};

/*** Imports *******************************************************/
 
var utils =           require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Adapter =         require("$:/plugins/felixhayashi/tiddlymap/js/Adapter");
var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction");
var EdgeType =        require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType");

/*** Code **********************************************************/

var moveEdges = function(path, view) {
    
  var matches = utils.getTiddlersByPrefix(path);
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
      $tm.adapter.insertEdge(edges[j]);
    }
  
    // finally remove the store
    $tw.wiki.deleteTiddler(matches[i]);
    
  }

};

var executeUpgrade = function(toVersion, curVersion, upgrade) {
  
  if(!utils.isLeftVersionGreater(toVersion, curVersion)) return;
  // = current data structure version is newer than version we
  // want to upgrade to.
    
  // issue debug message
  $tm.logger("debug",  "Upgrading data structure to " + toVersion);      
  // execute fix
  var msg = upgrade();
  // update meta
  utils.setEntry($tm.ref.sysMeta, "dataStructureState", toVersion);
  
  return msg;
  
};

var fixer = module.exports;

/**
 * Special fix that is not invoked along with the other fixes but
 * when creating the index (see caretaker code).
 * 
 * Changes:
 * 1. The node id field is moved to tmap.id if **original version**
 *    is below v0.9.2.
 */
fixer.fixId = function() {
  
  var meta = $tw.wiki.getTiddlerData($tm.ref.sysMeta, {});
  var upgrade = { before: "0.9.0", after: "0.9.2" };
  
  executeUpgrade("0.9.2", meta.dataStructureState, function() {
    
    if(utils.isLeftVersionGreater("0.9.2", meta.originalVersion)) {
      // path of the user conf at least in 0.9.2
      var userConf = "$:/plugins/felixhayashi/tiddlymap/config/sys/user";
      var nodeIdField = utils.getEntry(userConf, "field.nodeId", "tmap.id");
      utils.moveFieldValues(nodeIdField, "tmap.id", true, false);
    }

  });
  
};

fixer.fix = function() {
  
  var meta = $tw.wiki.getTiddlerData($tm.ref.sysMeta, {});
  
  $tm.logger("debug", "Fixer is started");
  $tm.logger("debug", "Data-structure currently in use: ", meta.dataStructureState);
  
  /**
   * Changes:
   * 1. Edges are stored in tiddlers instead of type based edge stores
   * 2. No more private views
   */   
  executeUpgrade("0.7.0", meta.dataStructureState, function() {
    
    // move edges that were formerly "global"
    moveEdges("$:/plugins/felixhayashi/tiddlymap/graph/edges", null);
    
    // move edges that were formerly bound to view ("private")
    var filter = $tm.selector.allViews;
    var viewRefs = utils.getMatches(filter);
    for(var i = 0; i < viewRefs.length; i++) {
      var view = new ViewAbstraction(viewRefs[i]);
      moveEdges(view.getRoot()+"/graph/edges", view);
    }

  });
  
  /**
   * Changes:
   * 1. Changes to the live view filter and refresh trigger field
   */
  executeUpgrade("0.7.32", meta.dataStructureState, function() {
    
    var liveView = new $tm.ViewAbstraction("Live View");
    if(!liveView.exists()) return;
    
    // Only listen to the current tiddler of the history list
    liveView.setNodeFilter("[field:title{$:/temp/tmap/currentTiddler}]",
                           true);
    
    liveView.setConfig({
      "refresh-trigger": null, // delete the field (renamed)
      "refresh-triggers": $tw.utils.stringifyList([
        "$:/temp/tmap/currentTiddler"
      ])
    });

  });
  
  /**
   * Changes:
   * 1. Group styles for matches and neighbours are now modulized
   *    and stored as node-types.
   * 2. vis user configuration is restored unflattened!
   *    The user only interacts through the GUI.
   * 3. If the node id field was "id" it is moved to tmap.id
   */
  executeUpgrade("0.9.0", meta.dataStructureState, function() {
        
    var confRef = $tm.ref.visUserConf;
    var userConf = utils.unflatten($tw.wiki.getTiddlerData(confRef, {}));
    
    if(typeof userConf.groups === "object") {
                
      var type = new $tm.NodeType("tmap:neighbour");
      type.setStyle(userConf.groups["neighbours"]);
      type.save();
                      
      delete userConf.groups;
      $tw.wiki.setTiddlerData(confRef, userConf);
                  
    }
     
  });
  
  /**
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
    
    var glNTy = $tm.indeces.glNTy;
    for(var i = glNTy.length; i--;) {
      glNTy[i].save(null, true);
    }
    
  });
  
  /**
   * Fixes the live tab
   */
  executeUpgrade("0.10.3", meta.dataStructureState, function() {
    
    var liveTab = $tm.ref.liveTab;
    if(utils.getTiddler(liveTab).hasTag("$:/tags/SideBar")) {
      $tw.wiki.deleteTiddler(liveTab);
      utils.setField(liveTab, "tags", "$:/tags/SideBar");
    }
    
  });
  
  /**
   * 1) Fixes the edge type filter. Before, an empty filter was
   * treated as default filter, i.e. no links and tags shown.
   * Now an empty filter means that we show all edge types.
   * 
   * 2) Adds prefix to hide private edges per default
   * 
   * 3) Corrects view-namespaces (formerly stored with colon).
   * 
   */
  executeUpgrade("0.11.0", meta.dataStructureState, function() {

    var views = utils.getMatches($tm.selector.allViews);
    
    for(var i = views.length; i--;) {
      
      var view = new ViewAbstraction(views[i]);
      var eTyFilter = view.getEdgeTypeFilter("raw");
      var confKey = "edge_type_namespace";
      view.setConfig(confKey, view.getConfig(confKey));
      
      if(eTyFilter) {
        
        // remove any occurences of the egde type path prefix
        var edgeTypePath = $tm.path.edgeTypes;
        eTyFilter = utils.replaceAll(eTyFilter, "", [
          edgeTypePath,
          edgeTypePath + "/",
          "[prefix[" + edgeTypePath + "]]",
          "[prefix[" + edgeTypePath + "/]]",
          [ "[suffix[tw-body:link]]", "[[tw-body:link]]" ],
          [ "[suffix[tw-list:tags]]", "[[tw-list:tags]]" ],
          [ "[suffix[tw-list:list]]", "[[tw-body:list]]" ],
          [ "[suffix[tmap:unknown]]", "[[tmap:unknown]]" ],
          [ "[suffix[unknown]]", "[[tmap:unknown]]" ],
        ]);
    
        var f = "-[prefix[_]] " + eTyFilter;
        
      } else { // no filter present
        
        var f = $tm.filter.defaultEdgeTypeFilter;
        
      }
      
      view.setEdgeTypeFilter(f)
    }
    
  });
                
};
