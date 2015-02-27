/*\

title: $:/plugins/felixhayashi/tiddlymap/fixer.js
type: application/javascript
module-type: startup

@preserve

\*/

(function(){
  
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";
  
  // Export name and synchronous status
  exports.name = "tmap.fixer";
  exports.after = ["tmap.caretaker"];
  exports.before = ["rootwidget"];
  exports.synchronous = true;
  
  /**************************** IMPORTS ****************************/
   
  var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
  var Adapter = require("$:/plugins/felixhayashi/tiddlymap/adapter.js").Adapter;
  var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/view_abstraction.js").ViewAbstraction;
  
  /***************************** CODE ******************************/

  var updateDataStructure = function() {
    
    var moveEdges = function(path) {
      //~ utils.getMatches("[prefix[path]/");
      //~ $tw.wiki.getTiddlerData(
    };
    
    // move default edges
    moveEdges($tw.tiddlymap.opt.path.edges);
    
    // move view-edges
    var filter = $tw.tiddlymap.opt.filter.allViews;
    var viewRefs = utils.getMatches(filter);
    for(var i = 0; i < viewRefs.length; i++) {
      var view = new ViewAbstraction(viewRefs[i]);
      if(view.isConfEnabled("private_edge_mode")) {
        moveEdges(view.getEdgeStoreLocation());
      }
    }
    
  };
  
  exports.startup = function() {
    
    updateDataStructure();
        
  };

})();
