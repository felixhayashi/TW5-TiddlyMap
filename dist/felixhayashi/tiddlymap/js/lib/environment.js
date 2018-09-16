'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/environment
type: application/javascript
 module-type: library

@preserve

\*/

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

// **ATTENTION: NO TRAILING SLASHES IN PATHS EVER**
var path = exports.path = {
  pluginRoot: '$:/plugins/felixhayashi/tiddlymap',
  edgeTypes: '$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes',
  nodeTypes: '$:/plugins/felixhayashi/tiddlymap/graph/nodeTypes',
  views: '$:/plugins/felixhayashi/tiddlymap/graph/views',
  options: '$:/plugins/felixhayashi/tiddlymap/config',
  dialogs: '$:/plugins/felixhayashi/tiddlymap/dialog',
  footers: '$:/plugins/felixhayashi/tiddlymap/dialogFooter',
  tempRoot: '$:/temp/tmap',
  tempStates: '$:/temp/tmap/state',
  tempPopups: '$:/temp/tmap/state/popup',
  localHolders: '$:/temp/tmap/holders'
};

// static references to important tiddlers
var ref = exports.ref = {
  defaultViewHolder: '$:/plugins/felixhayashi/tiddlymap/misc/defaultViewHolder',
  graphBar: '$:/plugins/felixhayashi/tiddlymap/misc/advancedEditorBar',
  sysUserConf: '$:/plugins/felixhayashi/tiddlymap/config/sys/user',
  visUserConf: '$:/plugins/felixhayashi/tiddlymap/config/vis/user',
  welcomeFlag: '$:/plugins/felixhayashi/tiddlymap/flag/welcome',
  focusButton: '$:/plugins/felixhayashi/tiddlymap/misc/focusButton',
  sysMeta: '$:/plugins/felixhayashi/tiddlymap/misc/meta',
  liveTab: '$:/plugins/felixhayashi/tiddlymap/hook/liveTab',
  mainEditor: '$:/plugins/felixhayashi/tiddlymap/hook/editor',
  sidebarBreakpoint: '$:/themes/tiddlywiki/vanilla/metrics/sidebarbreakpoint'
};

// some other options
var misc = exports.misc = {
  // if no edge label is specified, this is used as label
  unknownEdgeLabel: 'tmap:undefined',
  liveViewLabel: 'Live View',
  defaultViewLabel: 'Default',
  mainEditorId: 'main_editor',
  arrows: { 'in': '⇦', 'out': '➡', 'bi': '⇄' }
};

var config = exports.config = {
  sys: {
    field: {
      nodeLabel: 'caption',
      nodeIcon: 'icon',
      nodeInfo: 'description',
      viewMarker: 'isview'
    },
    liveTab: {
      fallbackView: misc.liveViewLabel
    },
    suppressedDialogs: {},
    edgeClickBehaviour: 'manager',
    debug: 'false',
    notifications: 'true',
    popups: {
      enabled: 'true',
      delay: '600',
      width: '240px',
      height: '140px'
    },
    jsonIndentation: '1',
    alwaysAddNodeIdToViewFilter: 'true',
    editNodeOnCreate: 'false',
    singleClickMode: 'false',
    editorMenuBar: {
      showNeighScopeButton: 'true',
      showRasterMenuButton: 'true',
      showScreenshotButton: 'true'
    }
  }
};

// some popular filters
var filter = exports.filter = {
  nodeTypes: '[prefix[' + path.nodeTypes + ']]',
  edgeTypes: '[prefix[' + path.edgeTypes + ']]',
  views: '[' + config.sys.field.viewMarker + '[true]]',
  defaultEdgeTypeFilter: '-[prefix[_]] -[[tw-body:link]] -[[tw-list:tags]] -[[tw-list:list]]'
};

var allSelector = '[all[tiddlers+shadows]!has[draft.of]]';

// some popular selectors
// usually used from within tiddlers via the tmap macro

var s = {
  allEdgeTypes: allSelector + ' +' + filter.edgeTypes,
  allNodeTypes: allSelector + ' +' + filter.nodeTypes,
  allViews: allSelector + ' +' + filter.views,
  allPotentialNodes: '[all[tiddlers]!is[system]!has[draft.of]]'
};

var selector = exports.selector = _extends({}, s, {
  allEdgeTypesById: s.allEdgeTypes + ' +[removeprefix[' + path.edgeTypes + '/]]',
  allNodeTypesById: s.allNodeTypes + ' +[removeprefix[' + path.nodeTypes + '/]]',
  allViewsByLabel: s.allViews + ' +[removeprefix[' + path.views + '/]]'
});
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/lib/environment.js.map
