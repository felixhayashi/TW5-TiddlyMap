/*\

title: $:/plugins/felixhayashi/tiddlymap/defaults.js
type: application/javascript
module-type: library

@preserve

\*/

(function(){
  
  var defaults = {
    
    // prefixes to manage compositions
    path: {
      
      // persistent plugin environment
      pluginRoot:   "$:/plugins/felixhayashi/tiddlymap",
      edgeTypes:    "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes",
      views:        "$:/plugins/felixhayashi/tiddlymap/graph/views",
      options:      "$:/plugins/felixhayashi/tiddlymap/config",
      
      // temporary environment
      tempRoot:     "$:/temp/felixhayashi/tiddlymap",
      localHolders: "$:/temp/felixhayashi/tiddlymap/holders",
      dialogs:      "$:/plugins/felixhayashi/tiddlymap/dialog"

    },
    
    // static references to important tiddlers
    ref: {
  
      dialogStandardFooter:   "$:/plugins/felixhayashi/tiddlymap/dialog/standardFooter",
      defaultGraphViewHolder: "$:/plugins/felixhayashi/tiddlymap/misc/defaultViewHolder",
      graphBar:               "$:/plugins/felixhayashi/tiddlymap/misc/advancedEditorBar",
      sysConf:                "$:/plugins/felixhayashi/tiddlymap/config/sys",
      sysUserConf:            "$:/plugins/felixhayashi/tiddlymap/config/sys/user",
      visConf:                "$:/plugins/felixhayashi/tiddlymap/config/vis",
      visUserConf:            "$:/plugins/felixhayashi/tiddlymap/config/vis/user",
      welcomeFlag:            "$:/plugins/felixhayashi/tiddlymap/flag/welcome",
      focusButton:            "$:/plugins/felixhayashi/tiddlymap/misc/focusButton",
      sysMeta:                "$:/plugins/felixhayashi/tiddlymap/misc/meta"
    
    },
   
    // configurations
    config: {
      
      // system configuration
      sys: {
        
        // important field names
        field: {
          
          nodeId: "tmap.id",
          nodeLabel: "caption",
          nodeIcon: "icon",
          nodeInfo: "description",
          viewMarker: "isview",
          edgeTypeMarker: "isview",
          edges: "tmap.edges"
          
        },
        suppressedDialogs: {
          // dialogs that are not shown are added as property
        },
        debug: "false",
        notifications: "true",
        editNodeOnCreate: "false",
        singleClickMode: "false"
      }
    },
    
    // some other options
    misc: {
  
      // if no edge label is specified, this is used as label
      unknownEdgeLabel: "__noname__",
      cssPrefix: "tmap-",
      sysEdgeTypeNS: "tmap"
  
   }
  };

  // !! EXPORT !!
  exports.defaults = defaults;
  // !! EXPORT !!
  
})();


