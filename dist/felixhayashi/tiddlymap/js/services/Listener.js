'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startup = exports.synchronous = exports.before = exports.after = exports.platforms = exports.name = undefined;

var _NodeType = require('$:/plugins/felixhayashi/tiddlymap/js/NodeType');

var _NodeType2 = _interopRequireDefault(_NodeType);

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _Edge = require('$:/plugins/felixhayashi/tiddlymap/js/Edge');

var _Edge2 = _interopRequireDefault(_Edge);

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _vis = require('$:/plugins/felixhayashi/tiddlymap/js/config/vis');

var _vis2 = _interopRequireDefault(_vis);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*** Code **********************************************************/

/**
 * @param {Object} param - event.param
 */
var handleCancelDialog = function handleCancelDialog(_ref) {
  var param = _ref.param;

  _utils2.default.setField(param, 'text', '');
};

/**
 * @param {Object} paramObject - event.paramObject
 */
/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/listener
type: application/javascript
module-type: startup

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

var handleClearTiddler = function handleClearTiddler() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      paramObject = _ref2.paramObject;

  var title = paramObject.title,
      keep = paramObject.keep;


  if (!title) return;

  var tObj = _utils2.default.getTiddler(title);
  var originalFields = tObj ? tObj.fields : {};
  var fieldsToKeep = keep ? keep.split() : [];
  var cloneFields = {
    title: title,
    text: '' // see https://github.com/Jermolene/TiddlyWiki5/issues/2025
  };

  for (var i = fieldsToKeep.length; i--;) {
    var fieldName = fieldsToKeep[i];
    cloneFields[fieldName] = originalFields[fieldName];
  }

  $tw.wiki.deleteTiddler(title);
  $tw.wiki.addTiddler(new $tw.Tiddler(cloneFields));
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleMixTiddlers = function handleMixTiddlers(_ref3) {
  var _ref3$paramObject = _ref3.paramObject,
      paramObject = _ref3$paramObject === undefined ? {} : _ref3$paramObject;
  var tiddlersStringArray = paramObject.tiddlers,
      output = paramObject.output;


  if (!tiddlersStringArray || !output) return;

  var tiddlers = $tw.utils.parseStringArray(tiddlersStringArray);
  var tObj = _utils2.default.getMergedTiddlers(tiddlers, output);

  $tw.wiki.addTiddler(tObj);
};

/**
 * @param {string} param - event.param
 */
var handleConfirmDialog = function handleConfirmDialog(_ref4) {
  var param = _ref4.param;


  _utils2.default.setField(param, 'text', '1');
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleSuppressDialog = function handleSuppressDialog(_ref5) {
  var paramObject = _ref5.paramObject;
  var dialog = paramObject.dialog,
      suppress = paramObject.suppress;


  if (_utils2.default.isTrue(suppress, false)) {
    _utils2.default.setEntry($tm.ref.sysUserConf, 'suppressedDialogs.' + dialog, true);
  }
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleDownloadGraph = function handleDownloadGraph(_ref6) {
  var paramObject = _ref6.paramObject;
  var view = paramObject.view;

  var graph = $tm.adapter.getGraph({ view: view });

  graph.nodes = _utils2.default.convert(graph.nodes, 'array');
  graph.edges = _utils2.default.convert(graph.edges, 'array');

  var tRef = '$:/temp/tmap/export';

  _utils2.default.setField(tRef, 'text', JSON.stringify(graph, null, 2));

  $tw.rootWidget.dispatchEvent({
    type: 'tm-download-file',
    param: tRef,
    paramObject: {
      filename: view + '.json'
    }
  });
};

/**
 *
 */
var handleConfigureSystem = function handleConfigureSystem() {

  var allTiddlers = _utils2.default.getMatches($tm.selector.allPotentialNodes);
  var allEdges = $tm.adapter.getEdgesForSet(allTiddlers);
  var plugin = $tw.wiki.getTiddler($tm.path.pluginRoot).fields;
  var meta = $tw.wiki.getTiddlerData($tm.ref.sysMeta);
  var hasLiveTab = _utils2.default.getTiddler($tm.ref.liveTab).hasTag('$:/tags/SideBar');

  var args = {
    numberOfNodes: '' + allTiddlers.length,
    numberOfEdges: '' + Object.keys(allEdges).length,
    pluginVersion: 'v' + plugin.version,
    dataStructureVersion: 'v' + meta.dataStructureState,
    dialog: {
      preselects: {
        'liveTab': '' + hasLiveTab,
        'vis-inherited': JSON.stringify(_vis2.default),
        'config.vis': _utils2.default.getText($tm.ref.visUserConf),
        'config.sys': $tm.config.sys
      }
    }
  };

  $tm.dialogManager.open('globalConfig', args, function (isConfirmed, outTObj) {

    if (!isConfirmed) return;

    var config = _utils2.default.getPropertiesByPrefix(outTObj.fields, 'config.sys.', true);

    // CAREFUL: this is a data tiddler!
    $tw.wiki.setTiddlerData($tm.ref.sysUserConf, config);

    // show or hide the live tab; to hide the live tab, we override
    // the shadow tiddler; to show it, we remove the overlay again.
    if (_utils2.default.isTrue(outTObj.fields.liveTab, false)) {
      _utils2.default.setField($tm.ref.liveTab, 'tags', '$:/tags/SideBar');
    } else {
      $tw.wiki.deleteTiddler($tm.ref.liveTab);
    }

    // tw doesn't translate the json to an object so this is already a string
    _utils2.default.setField($tm.ref.visUserConf, 'text', outTObj.fields['config.vis']);
  });
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleGenerateWidget = function handleGenerateWidget(_ref7) {
  var _ref7$paramObject = _ref7.paramObject,
      paramObject = _ref7$paramObject === undefined ? {} : _ref7$paramObject;


  var options = {
    dialog: {
      preselects: {
        'var.view': paramObject.view || $tm.misc.defaultViewLabel
      }
    }
  };

  $tm.dialogManager.open('widgetCodeGenerator', options);
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleRemoveEdge = function handleRemoveEdge(_ref8) {
  var paramObject = _ref8.paramObject;


  $tm.adapter.deleteEdge(paramObject);
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleCreateEdge = function handleCreateEdge(_ref9) {
  var paramObject = _ref9.paramObject;
  var from = paramObject.from,
      to = paramObject.to,
      isForce = paramObject.force;


  if (!from || !to) return;

  if (_utils2.default.tiddlerExists(from) && _utils2.default.tiddlerExists(to) || isForce) {

    // will not override any existing tiddlers…
    _utils2.default.addTiddler(to);
    _utils2.default.addTiddler(from);

    var edge = new _Edge2.default($tm.adapter.makeNode(from).id, $tm.adapter.makeNode(to).id, paramObject.label, paramObject.id);

    $tm.adapter.insertEdge(edge);
    $tm.notify('Edge inserted');
  }
};

/**
 * @param {string} type - event.type
 * @param {Object} [paramObject] - event.paramObject
 */
var handleOpenTypeManager = function handleOpenTypeManager(_ref10) {
  var type = _ref10.type,
      _ref10$paramObject = _ref10.paramObject,
      paramObject = _ref10$paramObject === undefined ? {} : _ref10$paramObject;


  // either 'manage-edge-types' or 'manage-node-types'
  var mode = type.match(/tmap:tm-(.*)/)[1];

  if (mode === 'manage-edge-types') {
    var topic = 'Edge-Type Manager';
    var allTypesSelector = $tm.selector.allEdgeTypes;
    var typeRootPath = $tm.path.edgeTypes;
  } else {
    var topic = 'Node-Type Manager';
    var allTypesSelector = $tm.selector.allNodeTypes;
    var typeRootPath = $tm.path.nodeTypes;
  }

  var args = {
    mode: mode,
    topic: topic,
    searchSelector: allTypesSelector,
    typeRootPath: typeRootPath
  };

  var dialogTObj = $tm.dialogManager.open('MapElementTypeManager', args);

  if (paramObject.type) {
    handleLoadTypeForm({
      paramObject: {
        mode: mode,
        id: paramObject.type,
        output: dialogTObj.fields['output']
      }
    });
  }
};

/**
 * @param {string} id - The id of a {@link MapElementType}
 * @param {('manage-edge-types'|'manage-node-types')} mode
 * @param {TiddlerReference} output
 */
var handleLoadTypeForm = function handleLoadTypeForm(_ref11) {
  var _ref11$paramObject = _ref11.paramObject,
      mode = _ref11$paramObject.mode,
      id = _ref11$paramObject.id,
      output = _ref11$paramObject.output;


  var outTRef = output;
  var type = mode === 'manage-edge-types' ? _EdgeType2.default.getInstance(id) : _NodeType2.default.getInstance(id);

  // inject all the type data as fields into the dialog output
  type.save(outTRef, true);

  // fields that need preprocessing

  if (mode === 'manage-edge-types') {
    var usage = $tm.adapter.selectEdgesByType(type);
    var count = Object.keys(usage).length;
    _utils2.default.setField(outTRef, 'temp.usageCount', count);
  }

  $tw.wiki.addTiddler(new $tw.Tiddler(_utils2.default.getTiddler(outTRef), {
    'typeTRef': type.fullPath,
    'temp.idImmutable': type.isShipped ? 'true' : '',
    'temp.newId': type.id,
    'vis-inherited': JSON.stringify($tm.config.vis)
  }));

  // reset the tabs to default
  _utils2.default.deleteByPrefix('$:/state/tabs/MapElementTypeManager');
};

/**
 * @param {Object} paramObject - event.paramObject
 */
var handleSaveTypeForm = function handleSaveTypeForm(_ref12) {
  var paramObject = _ref12.paramObject;


  var tObj = _utils2.default.getTiddler(paramObject.output);
  if (!tObj) return;

  var id = tObj.fields.id;
  var mode = paramObject.mode;

  if (_utils2.default.isTrue(tObj.fields['temp.deleteType'], false)) {
    deleteType(mode, id, tObj);
  } else {
    saveType(mode, id, tObj);
  }
};

var deleteType = function deleteType(mode, id, dialogOutput) {

  var type = mode === 'manage-edge-types' ? _EdgeType2.default.getInstance(id) : _NodeType2.default.getInstance(id);

  $tm.logger('debug', 'Deleting type', type);

  if (mode === 'manage-edge-types') {
    $tm.adapter._processEdgesWithType(type, { action: 'delete' });
  } else {
    $tm.adapter.removeNodeType(type);
  }

  $tw.wiki.addTiddler(new $tw.Tiddler({
    title: _utils2.default.getTiddlerRef(dialogOutput)
  }));

  $tm.notify('Deleted type');
};

/**
 * @param {string} id - The id of a {@link MapElementType}
 * @param {('manage-edge-types'|'manage-node-types')} mode
 * @param {TiddlerReference} output
 */
var saveType = function saveType(mode, id, output) {

  var tObj = _utils2.default.getTiddler(output);

  // update the type with the form data
  var Type = mode === 'manage-edge-types' ? _EdgeType2.default : _NodeType2.default;
  var type = new Type(id, tObj);
  type.save();

  var newId = tObj.fields['temp.newId'];

  if (newId && newId !== tObj.fields['id']) {
    //renamed

    if (mode === 'manage-edge-types') {

      $tm.adapter._processEdgesWithType(type, {
        action: 'rename',
        newName: newId
      });
    } else {

      new _NodeType2.default(newId, type).save();
      $tw.wiki.deleteTiddler(type.fullPath);
    }

    _utils2.default.setField(tObj, 'id', newId);
  }

  $tm.notify('Saved type data');
};

/**
 * @param {string} id - The id of a {@link MapElementType}
 * @param {('manage-edge-types'|'manage-node-types')} mode
 * @param {TiddlerReference} output
 */
var handleCreateType = function handleCreateType(_ref13) {
  var _ref13$paramObject = _ref13.paramObject,
      mode = _ref13$paramObject.mode,
      _ref13$paramObject$id = _ref13$paramObject.id,
      id = _ref13$paramObject$id === undefined ? 'New type' : _ref13$paramObject$id,
      output = _ref13$paramObject.output;


  var type = mode === 'manage-edge-types' ? new _EdgeType2.default(id) : new _NodeType2.default(id);

  type.save();

  handleLoadTypeForm({ paramObject: { id: type.id, mode: mode, output: output } });
};

/*** Exports *******************************************************/

var name = exports.name = 'tmap.listener';
var platforms = exports.platforms = ['browser'];
var after = exports.after = ['rootwidget', 'tmap.caretaker'];
var before = exports.before = ['story'];
var synchronous = exports.synchronous = true;
var startup = exports.startup = function startup() {
  _utils2.default.addTWlisteners({
    'tmap:tm-remove-edge': handleRemoveEdge,
    'tmap:tm-load-type-form': handleLoadTypeForm,
    'tmap:tm-save-type-form': handleSaveTypeForm,
    'tmap:tm-create-type': handleCreateType,
    'tmap:tm-create-edge': handleCreateEdge,
    'tmap:tm-suppress-dialog': handleSuppressDialog,
    'tmap:tm-generate-widget': handleGenerateWidget,
    'tmap:tm-download-graph': handleDownloadGraph,
    'tmap:tm-configure-system': handleConfigureSystem,
    'tmap:tm-manage-edge-types': handleOpenTypeManager,
    'tmap:tm-manage-node-types': handleOpenTypeManager,
    'tmap:tm-cancel-dialog': handleCancelDialog,
    'tmap:tm-clear-tiddler': handleClearTiddler,
    'tmap:tm-merge-tiddlers': handleMixTiddlers,
    'tmap:tm-confirm-dialog': handleConfirmDialog
  }, $tw.rootWidget, undefined);
};
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/Listener.js.map
