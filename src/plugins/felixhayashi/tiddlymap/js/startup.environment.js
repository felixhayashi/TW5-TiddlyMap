/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/environment
type: application/javascript
module-type: startup

@module TiddlyMap
@preserve

\*/

(
/**
 * 
 * This module is responsible for registering a global namespace
 * under $tw and registering fundamental path variables.
 * 
 * @lends module:TiddlyMap
 */ 
function(){
  
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

// Export name and synchronous status
exports.name = "tmap.environment";
exports.platforms = [ "browser" ];
exports.after = [ "startup" ];
exports.before = [ "tmap.caretaker" ];
exports.synchronous = true;
exports.startup = run;

/*** Imports *******************************************************/

// NEVER

/*** Code **********************************************************/

/**
 * Everything that doesn't change when the global config object is
 * updated. This includes prefixes (paths) and tiddler titles.
 * 
 * ATTENTION: The paths are deliberately written in full so they
 * are discovered when a search is performed over the TiddlyMap code.
 */

function run(parent) {
  
  $tw.tmap = {};
    
  var o = $tw.tmap;
  
  // **ATTENTION: NO TRAILING SLASHES IN PATHS EVER**
  o.path = {
    pluginRoot:     "$:/plugins/felixhayashi/tiddlymap",
    edgeTypes:      "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes",
    nodeTypes:      "$:/plugins/felixhayashi/tiddlymap/graph/nodeTypes",
    listEdgeTypes:  "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes/tw-list:",
    fieldEdgeTypes: "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes/tw-field:",
    views:          "$:/plugins/felixhayashi/tiddlymap/graph/views",
    options:        "$:/plugins/felixhayashi/tiddlymap/config",
    dialogs:        "$:/plugins/felixhayashi/tiddlymap/dialog",
    footers:        "$:/plugins/felixhayashi/tiddlymap/dialogFooter",
    tempRoot:       "$:/temp/tmap",
    tempStates:     "$:/temp/tmap/state",
    tempPopups:     "$:/temp/tmap/state/popup",
    localHolders:   "$:/temp/tmap/holders"
  };
  
  var p = o.path;

  // static references to important tiddlers
  o.ref = {
    defaultViewHolder:  "$:/plugins/felixhayashi/tiddlymap/misc/defaultViewHolder",
    graphBar:           "$:/plugins/felixhayashi/tiddlymap/misc/advancedEditorBar",
    sysUserConf:        "$:/plugins/felixhayashi/tiddlymap/config/sys/user",
    visUserConf:        "$:/plugins/felixhayashi/tiddlymap/config/vis/user",
    welcomeFlag:        "$:/plugins/felixhayashi/tiddlymap/flag/welcome",
    focusButton:        "$:/plugins/felixhayashi/tiddlymap/misc/focusButton",
    sysMeta:            "$:/plugins/felixhayashi/tiddlymap/misc/meta",
    liveTab:            "$:/plugins/felixhayashi/tiddlymap/hook/liveTab",
    mainEditor:         "$:/plugins/felixhayashi/tiddlymap/hook/editor",
    sidebarBreakpoint:  "$:/themes/tiddlywiki/vanilla/metrics/sidebarbreakpoint"
  };
  
  // some other options
  o.misc = {
    // if no edge label is specified, this is used as label
    unknownEdgeLabel: "tmap:undefined",
    liveViewLabel: "Live View",
    defaultViewLabel: "Default",
    mainEditorId: "main_editor",
    arrows: { "in": "⇦", "out": "➡", "bi": "⇄" }
    
  };

  o.config = {
    sys: {
      field: {
        nodeLabel: "caption",
        nodeIcon: "icon",
        nodeInfo: "description",
        viewMarker: "isview"
      },
      liveTab: {
        fallbackView: o.misc.liveViewLabel
      },
      suppressedDialogs: {},
      edgeClickBehaviour: "manager",
      debug: "false",
      notifications: "true",
      popups: "true",
      editNodeOnCreate: "false",
      singleClickMode: "false",
      editorMenuBar: {
        showNeighScopeButton: "true",
        showScreenshotButton: "true"
      }
    }
  };
  
  // some popular filters
  o.filter = {
    nodeTypes: "[prefix[" + o.path.nodeTypes + "]]",
    edgeTypes: "[prefix[" + o.path.edgeTypes + "]]",
    listEdgeTypes: "[prefix[" + o.path.listEdgeTypes + "]]",
    fieldEdgeTypes: "[prefix[" + o.path.fieldEdgeTypes + "]]",
    views: "[" + o.config.sys.field.viewMarker + "[true]]"
  };
    
  o.filter.defaultEdgeTypeFilter = " -[[tw-body:link]]" +
                                   " -[[tw-list:tags]]" +
                                   " -[[tw-list:list]]";
  
  // some popular selectors
  // usually used from within tiddlers via the tmap macro
  var s = o.selector = {};
  var allSelector = "[all[tiddlers+shadows]!has[draft.of]]";

  // all edge-types (by label)
  s.allEdgeTypes = allSelector + " +" + o.filter.edgeTypes;
  s.allEdgeTypesById = s.allEdgeTypes
                          + " +[removeprefix[" + p.edgeTypes + "/]]";

  // all node-types (by label)
  s.allNodeTypes = allSelector + " +" + o.filter.nodeTypes;
  s.allNodeTypesById = s.allNodeTypes
                          + " +[removeprefix[" + p.nodeTypes + "/]]";

  // all views (by label)
  s.allViews = allSelector + " +" + o.filter.views;
  s.allViewsByLabel = s.allViews + "+[removeprefix[" + p.views + "/]]";

  // all non-draft non-system tiddlers
  s.allPotentialNodes = "[all[tiddlers]!is[system]!has[draft.of]]";

  // all names of fields that contain multiple references edges
  s.allListEdgeStores = allSelector
                        + " +" + o.filter.listEdgeTypes
                        + " +[removeprefix[" + p.listEdgeTypes + "]]";
                                   
  // all names of fields that store edges
  s.allFieldEdgeStores = allSelector
                         + " +" + o.filter.fieldEdgeTypes
                         + " +[removeprefix[" + p.fieldEdgeTypes + "]]";
  
};



})();
