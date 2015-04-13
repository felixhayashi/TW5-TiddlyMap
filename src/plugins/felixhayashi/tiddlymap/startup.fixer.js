/*\

title: $:/plugins/felixhayashi/tiddlymap/fixer.js
type: application/javascript
module-type: startup

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){
  
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";
  
  // Export name and synchronous status
  exports.name = "tmap.fixer";
  exports.after = [ "tmap.caretaker" ];
  exports.before = [ "rootwidget" ];
  exports.synchronous = true;
  
  /**************************** IMPORTS ****************************/
   
  var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
  var Adapter = require("$:/plugins/felixhayashi/tiddlymap/adapter.js").Adapter;
  var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/view_abstraction.js").ViewAbstraction;
  var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;
  
  /***************************** CODE ******************************/

  var moveEdges = function(path, view) {
      
    var matches = utils.getByPrefix(path);
    for(var i = 0; i < matches.length; i++) {
      
      // create edge type
      var type = utils.getBasename(matches[i]);
      if(type === "__noname__") { type = "tmap:unknown"; }
      type = new EdgeType(type);
      
      if(!type.exists()) type.persist();

      // move edges
      var edges = $tw.wiki.getTiddlerData(matches[i]);
      for(var j = 0; j < edges.length; j++) {        
        edges[j].type = (view ? view + ":" : "") + type.getId();
        $tw.tmap.adapter.insertEdge(edges[j]);
      }
    
      // finally remove the store
      $tw.wiki.deleteTiddler(matches[i]);
      
    }

  };

  exports.startup = function() {
    
    var meta = $tw.wiki.getTiddlerData($tw.tmap.opt.ref.sysMeta, {});
    var plugin = $tw.wiki.getTiddler($tw.tmap.opt.path.pluginRoot);
    
    $tw.tmap.logger("debug", "Fixer is started");
    $tw.tmap.logger("debug", "Data-structure currently in use: ", meta.dataStructureState);
    
    if($tw.utils.checkVersions("0.6.11", meta.dataStructureState)) {
      
      $tw.tmap.logger("debug", "Updating data structure from version", meta.dataStructureState);
      
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
      utils.setEntry($tw.tmap.opt.ref.sysMeta, "dataStructureState", "0.7.0" );
       
    }
                  
  };

})();
