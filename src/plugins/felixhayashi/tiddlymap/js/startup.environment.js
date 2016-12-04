// tw-module
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/environment
type: application/javascript
module-type: startup

@preserve

\*/

/*** Imports *******************************************************/

// NEVER

/*** Code **********************************************************/

/**
 * This module is responsible for registering a global namespace
 * under $tw and registering fundamental path variables.
 * 
 * Everything that doesn't change when the global config object is
 * updated. This includes prefixes (paths) and tiddler titles.
 * 
 * ATTENTION: The paths are deliberately written in full so they
 * are discovered when a search is performed over the TiddlyMap code.
 */

function run(parent) {
  
  window.$tm = {};
  
  // **ATTENTION: NO TRAILING SLASHES IN PATHS EVER**
  $tm.path = {
    pluginRoot:      "$:/plugins/felixhayashi/tiddlymap",
    edgeTypes:       "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes",
    nodeTypes:       "$:/plugins/felixhayashi/tiddlymap/graph/nodeTypes",
    views:           "$:/plugins/felixhayashi/tiddlymap/graph/views",
    options:         "$:/plugins/felixhayashi/tiddlymap/config",
    dialogs:         "$:/plugins/felixhayashi/tiddlymap/dialog",
    footers:         "$:/plugins/felixhayashi/tiddlymap/dialogFooter",
    tempRoot:        "$:/temp/tmap",
    tempStates:      "$:/temp/tmap/state",
    tempPopups:      "$:/temp/tmap/state/popup",
    localHolders:    "$:/temp/tmap/holders"
  };
  
  // static references to important tiddlers
  $tm.ref = {
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
  $tm.misc = {
    // if no edge label is specified, this is used as label
    unknownEdgeLabel: "tmap:undefined",
    liveViewLabel: "Live View",
    defaultViewLabel: "Default",
    mainEditorId: "main_editor",
    arrows: { "in": "⇦", "out": "➡", "bi": "⇄" }
  };

  $tm.config = {
    sys: {
      field: {
        nodeLabel: "caption",
        nodeIcon: "icon",
        nodeInfo: "description",
        viewMarker: "isview"
      },
      liveTab: {
        fallbackView: $tm.misc.liveViewLabel
      },
      suppressedDialogs: {},
      edgeClickBehaviour: "manager",
      debug: "false",
      notifications: "true",
      popups: {
        enabled: "true",
        delay: "600",
        width: "240px",
        height: "140px"
      },
      jsonIndentation: "1",
      editNodeOnCreate: "false",
      singleClickMode: "false",
      editorMenuBar: {
        showNeighScopeButton: "true",
        showScreenshotButton: "true"
      }
    }
  };
  
  // some popular filters
  $tm.filter = {
    nodeTypes: "[prefix[" + $tm.path.nodeTypes + "]]",
    edgeTypes: "[prefix[" + $tm.path.edgeTypes + "]]",
    views: "[" + $tm.config.sys.field.viewMarker + "[true]]"
  };

  $tm.filter.defaultEdgeTypeFilter = " -[prefix[_]]" +
                                   " -[[tw-body:link]]" +
                                   " -[[tw-list:tags]]" +
                                   " -[[tw-list:list]]";
  
  // some popular selectors
  // usually used from within tiddlers via the tmap macro
  var s = $tm.selector = {};
  var allSelector = "[all[tiddlers+shadows]!has[draft.of]]";

  // all edge-types (by label)
  s.allEdgeTypes = allSelector + " +" + $tm.filter.edgeTypes;
  s.allEdgeTypesById = s.allEdgeTypes
                          + " +[removeprefix[" + $tm.path.edgeTypes + "/]]";

  // all node-types (by label)
  s.allNodeTypes = allSelector + " +" + $tm.filter.nodeTypes;
  s.allNodeTypesById = s.allNodeTypes
                          + " +[removeprefix[" + $tm.path.nodeTypes + "/]]";

  // all views (by label)
  s.allViews = allSelector + " +" + $tm.filter.views;
  s.allViewsByLabel = s.allViews + "+[removeprefix[" + $tm.path.views + "/]]";

  // all non-draft non-system tiddlers
  s.allPotentialNodes = "[all[tiddlers]!is[system]!has[draft.of]]";

};


/*** Exports *******************************************************/

export const name = "tmap.environment";
export const platforms = [ "browser" ];
export const after = [ "startup" ];
export const before = [ "tmap.caretaker" ];
export const synchronous = true;
export const startup = run;