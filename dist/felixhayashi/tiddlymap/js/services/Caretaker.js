'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startup = exports.synchronous = exports.before = exports.after = exports.platforms = exports.name = undefined;

var _rebuilders;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/caretaker
type: application/javascript
module-type: startup

@preserve

\*/

/*** Imports *******************************************************/

var _vis = require('$:/plugins/felixhayashi/tiddlymap/js/config/vis');

var _vis2 = _interopRequireDefault(_vis);

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _Fixer = require('$:/plugins/felixhayashi/tiddlymap/js/Fixer');

var _Fixer2 = _interopRequireDefault(_Fixer);

var _Adapter = require('$:/plugins/felixhayashi/tiddlymap/js/Adapter');

var _Adapter2 = _interopRequireDefault(_Adapter);

var _tracker = require('$:/plugins/felixhayashi/tiddlymap/js/services/tracker');

var _tracker2 = _interopRequireDefault(_tracker);

var _EdgeTypeSubscriberRegistry = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry');

var _EdgeTypeSubscriberRegistry2 = _interopRequireDefault(_EdgeTypeSubscriberRegistry);

var _DialogManager = require('$:/plugins/felixhayashi/tiddlymap/js/DialogManager');

var _DialogManager2 = _interopRequireDefault(_DialogManager);

var _CallbackManager = require('$:/plugins/felixhayashi/tiddlymap/js/CallbackManager');

var _CallbackManager2 = _interopRequireDefault(_CallbackManager);

var _ViewAbstraction = require('$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction');

var _ViewAbstraction2 = _interopRequireDefault(_ViewAbstraction);

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _NodeType = require('$:/plugins/felixhayashi/tiddlymap/js/NodeType');

var _NodeType2 = _interopRequireDefault(_NodeType);

var _vis3 = require('$:/plugins/felixhayashi/vis/vis.js');

var _vis4 = _interopRequireDefault(_vis3);

var _environment = require('$:/plugins/felixhayashi/tiddlymap/js/lib/environment');

var env = _interopRequireWildcard(_environment);

var _URL = require('$:/plugins/felixhayashi/tiddlymap/js/URL');

var _URL2 = _interopRequireDefault(_URL);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*** Code **********************************************************/

/**
 * This module is responsible for registering a global namespace
 * under $tw and loading (and refreshing) the configuration and services.
 *
 * Attention: Careful with the order of the function calls in this
 * functions body!
 *
 */
var init = function init() {

  window.$tm = _extends({}, env, { utils: _utils2.default, url: new _URL2.default(window.location.href) });

  // cleanup previous session
  cleanup();

  registerPublicClasses($tm);

  // build and integrate global options
  updateGlobals($tm);

  // register meta file (if not done yet)
  createMetaFile($tm.logger);

  // create indeces
  var indeces = attachIndeces($tm);

  // create services
  var services = getInitializedServices(indeces);
  Object.assign($tm, services);

  // load defaults
  loadDefaultView($tm.config.sys.defaultView);

  // Run the fixer to update older wikis
  services.fixer.fix();

  // all graphs need to register here. @see routineWalk()
  $tm.registry = [];
  setInterval(routineCheck, 5000);

  // AT THE VERY END: register change listener with the callback manager
  registerChangeListener($tm.callbackManager);

  // register DOM listeners
  registerMousemoveListener();
  registerClickListener();

  // check for fullscreen directives
  if ($tm.url.query['tmap-enlarged']) {
    prepareFullscreenStart($tm.url);
  }

  // issue notification
  $tm.logger('warn', 'TiddlyMap\'s caretaker successfully started');
};

/**
 * Injects dependencies and registers services
 *
 * @param indeces
 * @return Object
 */
var getInitializedServices = function getInitializedServices(indeces) {

  var tracker = new _tracker2.default(fixer);

  // inject modules
  var handler = $tw.modules.applyMethods('tmap.edgetypehandler');
  var edgeTypeSubscriberRegistry = new _EdgeTypeSubscriberRegistry2.default(handler, indeces.allETy, tracker);

  // attach the adapter object to the tiddlymap namespace
  var adapter = new _Adapter2.default(tracker, edgeTypeSubscriberRegistry);

  var callbackManager = new _CallbackManager2.default();
  var dialogManager = new _DialogManager2.default(callbackManager);

  var fixer = new _Fixer2.default(adapter, $tm.logger, indeces.glNTy);

  return {
    edgeTypeSubscriberRegistry: edgeTypeSubscriberRegistry,
    tracker: tracker,
    adapter: adapter,
    callbackManager: callbackManager,
    dialogManager: dialogManager,
    fixer: fixer
  };
};

/**
 * make classes available for console users
 */
var registerPublicClasses = function registerPublicClasses(parent) {
  parent.keycharm = _vis4.default.keycharm;
  parent.NodeType = _NodeType2.default;
  parent.EdgeType = _EdgeType2.default;
  parent.ViewAbstraction = _ViewAbstraction2.default;
};

/**
 * This function will append the global options to the tree. In case
 * this function is called again, only the option leafs are rebuild
 * so a process may safely store a reference to a branch of the option
 * tree as the reference doesn't change.
 *
 * ATTENTION: For the path options, no trailing or double slashes!
 * This is NOT unix where paths are normalized (// is not rewritten to /).
 *
 * @see
 *   - [TW5] Is there a designated place for TW plugins to store stuff in the dom?
 *     https://groups.google.com/forum/#!topic/tiddlywikidev/MZZ37XiVcvY
 * @param {object} parent The root where to insert the options into
 */
var attachOptions = function attachOptions(parent) {

  var p = parent;

  // default configurations mixed with user config
  if (!p.config) p.config = _utils2.default.makeHashMap();

  // Never modify the imported config objects; instead, merge them
  // into a new object

  // attention! it is a tw-data-tiddler!
  p.config.sys = _utils2.default.merge(p.config.sys, _utils2.default.unflatten($tw.wiki.getTiddlerData(env.ref.sysUserConf)));

  // CAREFUL: Never merge directly into the default vis config object
  p.config.vis = _utils2.default.merge({}, _vis2.default, _utils2.default.parseFieldData(env.ref.visUserConf));

  // a shortcut for fields property
  if (!p.field) p.field = _utils2.default.makeHashMap();
  $tw.utils.extend(p.field, p.config.sys.field);
};

/**
 * This function will cache/index some tiddler properties as javascript
 * objects for faster access.
 */
var attachIndeces = function attachIndeces(parent) {

  $tm.start('Attaching Indeces');

  parent.indeces = parent.indeces || {};

  updateNodeTypesIndeces(parent.indeces);
  updateEdgeTypesIndeces(parent.indeces);

  $tm.stop('Attaching Indeces');

  return parent.indeces;
};

/**
 * For faster access to node-type styles, we store all node-type
 * objects as indeces in a table.
 *
 * Types without a filter are not indexed since they are either
 * special types that TiddlyMap manually assignes (e.g. tmap:neighbour,
 * or tmap:selected).
 *
 * Indeces added to the indeces chain:
 * 1. glNTy – all global node types
 *
 * @param {Object} [parent] - The global indeces object indeces.
 *     If not stated, $tm.indeces is used.
 * @param {Array<TiddlerReference>} [allTiddlers] - The tiddlers to
 *     use as basis for this index. If not stated, all tiddlers in
 *     the wiki are used.
 */
var updateNodeTypesIndeces = function updateNodeTypesIndeces(parent) {

  parent = parent || $tm.indeces;

  var typePath = $tm.path.nodeTypes;
  var glNTy = parent.glNTy = [];
  var glNTyById = parent.glNTyById = _utils2.default.makeHashMap();

  $tw.wiki.eachTiddlerPlusShadows(function (tObj, tRef) {
    if (_utils2.default.startsWith(tRef, typePath)) {
      var type = _NodeType2.default.getInstance(tRef);
      glNTyById[type.id] = type;
      glNTy.push(type);
    }
  });

  glNTy.sort(function (a, b) {
    return a.priority - b.priority;
  });
};

var updateEdgeTypesIndeces = function updateEdgeTypesIndeces(parent) {

  parent = parent || $tm.indeces;

  var typePath = $tm.path.edgeTypes;
  var allETy = parent.allETy = _utils2.default.makeHashMap();

  $tw.wiki.eachTiddlerPlusShadows(function (tObj, tRef) {

    if (_utils2.default.startsWith(tRef, typePath)) {

      var et = _EdgeType2.default.getInstance(tRef);
      allETy[et.id] = et;
    }
  });

  if ($tm.edgeTypeSubscriberRegistry) {
    $tm.edgeTypeSubscriberRegistry.updateIndex(allETy);
  }
};

/**
 * This function attaches all the top level functions to the
 * tiddlymap namespace.
 *
 * This will add the
 * 1. global logger method,
 * 2. the notify method
 * 3. the stopwatch methods `start` and `stop`.
 *
 * @param {Hashmap} parent - The parent object to attach the options to.
 */
var attachFunctions = function attachFunctions(parent) {

  var fn = parent;
  var nirvana = function nirvana() {/* /dev/null */};

  if (_utils2.default.isTrue($tm.config.sys.debug, false) && console) {

    /**
     * A logging mechanism that uses the first argument as type and
     * passes all consequent arguments as console arguments. The
     * reason for this functions existence is to be able to switch
     * off the logging without redirecting every single console function
     * such as log, debug, warn etc. Plus, we have more control over
     * the logging.
     *
     * @see http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
     * @see http://stackoverflow.com/questions/9521921/why-does-console-log-apply-throw-an-illegal-invocation-error
     *
     * @param {string} type - The type of the message (debug, info, warning…)
     *     which is exactly the same as in `console[type]`.
     * @param {...*} message - An infinite number of arguments to be printed
     *     (just like console).
     */
    fn.logger = function () /* type, [messages,] messages */{
      if (arguments.length < 2) return;
      var args = Array.prototype.slice.call(arguments);
      var arg1 = args.shift(args);
      var type = console.hasOwnProperty(arg1) ? arg1 : 'debug';
      console[type].apply(console, args);
    };

    fn.start = function (timerName) {
      console.time('[timer] ' + timerName);
    };

    fn.stop = function (timerName) {
      console.timeEnd('[timer] ' + timerName);
    };
  } else {

    fn.logger = fn.start = fn.stop = nirvana;
  }

  fn.notify = _utils2.default.isTrue($tm.config.sys.notifications) ? _utils2.default.notify : nirvana;
};

/**
 * This periodic check is needed to trigger a cleanup if a graph is
 * removed since a graph itself cannot react to its destruction.
 * This includes removing listeners that were not attached to the
 * local container or calling the vis destructor.
 *
 * @todo Specify which functions are required for widgets that register
 * themselves in the registry.
 */
var routineCheck = function routineCheck() {

  for (var i = $tm.registry.length; i--;) {
    var widget = $tm.registry[i];

    if (!widget.destruct || !widget.isZombieWidget) return; // no duck!

    if (widget.isZombieWidget()) {
      // removed!
      $tm.logger('warn', 'a widget will be removed');
      $tm.registry.splice(i, 1);
      widget.destruct();
    }
  }
};

/**
 * Every widget that has registered itself in the registry
 * will receive the `updates` object. The `updates` object is a more
 * advanced
 *
 * @param {Updates} updates
 */
var dispatchUpdates = function dispatchUpdates(updates) {

  var registry = $tm.registry;
  for (var i = registry.length; i--;) {

    var widget = registry[i];

    if (widget.update && widget.isZombieWidget && !widget.isZombieWidget()) {
      widget.update(updates);
    }
  }
};

/**
 * We need to do this check as TiddlyWiki does not allow us to hook into the
 * clone process to find out whether a node was cloned.
 *
 * @param tObj
 */
var checkForClone = function checkForClone(tObj) {

  var tRefs = _utils2.default.getDublicates(tObj);

  if (!tRefs.length) {
    return;
  }

  // remove any defined edges
  _utils2.default.setField(tObj, 'tmap.edges', undefined);

  // force override id
  $tm.tracker.assignId(tObj, true);

  // inform the user about what we did
  $tm.dialogManager.open('dublicateIdInfo', {
    param: {
      changedTiddler: tObj.fields.title,
      filter: _utils2.default.joinAndWrap(tRefs, '[[', ']]'),
      id: _utils2.default.getId(tObj)
    }
  });
};

/**
 * Builds and registers globals and the functions that depend on them.
 */
var updateGlobals = function updateGlobals(parent) {

  attachOptions($tm);
  attachFunctions($tm);

  // attention: logger() cannot be called before functions are rebuild
  $tm.logger('warn', 'Rebuilt globals');
};

var lastCurrentTiddler = null;
var updateLiveViewTrigger = function updateLiveViewTrigger(changedTiddlers) {

  if (changedTiddlers['$:/HistoryList']) {
    var tRef = _utils2.default.getField('$:/HistoryList', 'current-tiddler');
  } else if (changedTiddlers['$:/temp/focussedTiddler']) {
    var tRef = _utils2.default.getField('$:/temp/focussedTiddler', 'text');
  }

  if (tRef != null && lastCurrentTiddler !== tRef) {
    lastCurrentTiddler = tRef;
    _utils2.default.setField('$:/temp/tmap/currentTiddler', 'text', tRef);
  }
};

/**
 * Only for debugging
 */
var printChanges = function printChanges(changedTiddlers, loopCount) {

  if (!_utils2.default.isTrue($tm.config.sys.debug, false)) return;

  $tm.logger('warn', '=== Refresh ' + loopCount + ' ===');

  for (var tRef in changedTiddlers) {

    var c = changedTiddlers[tRef].deleted ? '[Deleted]' : '[Modified]';

    $tm.logger('warn', c, tRef, $tw.wiki.getTiddler(tRef));
  }
};

/**
 * Saves the last mousemove event under $tm.mouse
 */
var registerMousemoveListener = function registerMousemoveListener() {

  $tm.mouse = {};

  var fn = function fn(evt) {
    $tm.mouse = evt;
  };
  window.addEventListener('mousemove', fn, false);
};

/**
 * @TODO: suggest this to Jeremy for TW popup handling
 */
var registerClickListener = function registerClickListener() {

  var tempPopups = $tm.path.tempPopups;
  window.addEventListener('click', function (evt) {

    var popupStates = _utils2.default.getTiddlersByPrefix(tempPopups);

    for (var i = popupStates.length; i--;) {
      if (_utils2.default.getText(popupStates[i])) break;
    }

    if (i === -1) return;

    if (!$tw.utils.hasClass(evt.target, 'tc-drop-down') && !_utils2.default.getAncestorWithClass(evt.target, 'tc-drop-down')) {
      // = clicked on an element that isn't a dropdown or inside one
      for (var i = popupStates.length; i--;) {
        _utils2.default.setText(popupStates[i], '');
      }
    }
  }, false);
};

/**
 * Registers a change listener that will dispatch
 * @param callbackManager
 */
var registerChangeListener = function registerChangeListener(callbackManager) {

  var loopCount = 0;

  $tw.wiki.addEventListener('change', function (changedTiddlers) {

    $tm.start('Caretaker handling changes');

    printChanges(changedTiddlers, loopCount++);
    callbackManager.refresh(changedTiddlers);

    var updates = { changedTiddlers: {} };

    for (var tRef in changedTiddlers) {

      var tObj = _utils2.default.getTiddler(tRef);

      if (tObj && tObj.isDraft()) {
        continue;
      }

      var isHandled = handleTiddlerChange(tRef, tObj, updates);

      if (isHandled) {
        updates.changedTiddlers[tRef] = changedTiddlers[tRef];
      }
    }

    dispatchUpdates(updates);

    // NOTE: changes will affect the next refresh cycle
    updateLiveViewTrigger(changedTiddlers);

    $tm.stop('Caretaker handling changes');
  });
};

/**
 * Mapping of paths and callbacks that should be invoked if tiddlers
 * within theses paths change.
 */
var rebuilders = (_rebuilders = {}, _defineProperty(_rebuilders, env.path.options, updateGlobals), _defineProperty(_rebuilders, env.path.nodeTypes, updateNodeTypesIndeces), _defineProperty(_rebuilders, env.path.edgeTypes, updateEdgeTypesIndeces), _rebuilders);

/**
 * This function will deal with tiddler changes and will log changes
 * to the provided `updates` object.
 *
 * @param {TiddlerReference} tRef
 * @param {$tw.Tiddler} tObj
 * @param {Updates} updates
 */
var handleTiddlerChange = function handleTiddlerChange(tRef, tObj, updates) {

  if ($tw.wiki.isSystemTiddler(tRef)) {

    for (var path in rebuilders) {
      if (_utils2.default.startsWith(tRef, path) && !updates[path]) {
        $tm.logger('warn', '[System change]', path);
        rebuilders[path]();
        updates[path] = true;
      }
    }
  } else if (tObj) {
    // created or modified

    if (tObj.fields.text === undefined) {
      // sic; '' is ok
      // to make sure that the tiddler's body is fully loaded
      // we postpone the handling of the tiddler
      // see https://github.com/felixhayashi/TW5-TiddlyMap/issues/222#issuecomment-268978764
      $tw.wiki.dispatchEvent('lazyLoad', tRef);

      return false;
    }

    checkForClone(tObj);

    // call assignId IN ANY CASE to make sure the index
    // stays intact, also after a renaming operation
    $tm.tracker.assignId(tObj);
  } else {
    // deleted or renamed

    var id = $tm.tracker.getIdByTiddler(tRef);

    if (!id) {
      // ignore tiddler without id
      return false;
    }

    var tRefWithId = _utils2.default.getTiddlerWithField('tmap.id', id);

    if (tRefWithId) {
      // only renamed

      $tm.logger('warn', '[Renamed]', tRef, 'into', tRefWithId);
    } else {
      // removed

      // remove node; any edges pointing in/out; update indeces
      // CAREFUL with recursion here!
      $tm.adapter.deleteNode(id);
    }
  }

  return true;
};

/**
 * Remove temp files from previous session.
 */
var cleanup = function cleanup() {

  _utils2.default.deleteByPrefix('$:/temp/felixhayashi');
  _utils2.default.deleteByPrefix('$:/temp/tiddlymap');
  _utils2.default.deleteByPrefix('$:/temp/tmap');
};

/**
 * Register the view that should be displayed at startup.
 */
var loadDefaultView = function loadDefaultView(defaultView) {

  if (defaultView) {
    _utils2.default.setText(env.ref.defaultViewHolder, $tm.config.sys.defaultView);
  }
};

/**
 * Init the wiki so we can start the main editor with the specified
 * view in fullscreen mode.
 *
 * @param {ViewAbstraction|string} view
 */
var prepareFullscreenStart = function prepareFullscreenStart(view) {
  var _env$ref = env.ref,
      mainEditor = _env$ref.mainEditor,
      defaultViewHolder = _env$ref.defaultViewHolder;


  _utils2.default.setSidebarTab(mainEditor);

  if (_ViewAbstraction2.default.exists(view)) {
    view = new _ViewAbstraction2.default(view);
    _utils2.default.setField(defaultViewHolder, 'text', view.getLabel());
  }
};

/**
 * The meta file keeps track of installation data.
 */
var createMetaFile = function createMetaFile(logger) {

  if (_utils2.default.tiddlerExists(env.ref.sysMeta)) {
    return;
  }

  logger('warn', 'Creating meta file');

  var plugin = $tw.wiki.getTiddler(env.path.pluginRoot);

  $tw.wiki.setTiddlerData(env.ref.sysMeta, {
    // the version originally installed
    originalVersion: plugin.fields.version,
    // the data structure in use corresponds to version x
    // if the structure is obsolete, it will be automatically
    // fixed by the fixer module.
    dataStructureState: '0.6.9',
    // whether or not to display a welcome message
    showWelcomeMessage: true
  });
};

/*** Exports *******************************************************/

var name = exports.name = 'tmap.caretaker';
var platforms = exports.platforms = ['browser'];
var after = exports.after = ['startup'];
var before = exports.before = ['rootwidget'];
var synchronous = exports.synchronous = true;
var startup = exports.startup = init;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/Caretaker.js.map
