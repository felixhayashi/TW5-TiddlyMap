/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/caretaker
type: application/javascript
module-type: startup

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import visConfig                  from '$:/plugins/felixhayashi/tiddlymap/js/config/vis';
import utils                      from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import Fixer                      from '$:/plugins/felixhayashi/tiddlymap/js/Fixer';
import Adapter                    from '$:/plugins/felixhayashi/tiddlymap/js/Adapter';
import Tracker                    from '$:/plugins/felixhayashi/tiddlymap/js/services/tracker';
import EdgeTypeSubscriberRegistry from '$:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry';
import DialogManager              from '$:/plugins/felixhayashi/tiddlymap/js/DialogManager';
import CallbackManager            from '$:/plugins/felixhayashi/tiddlymap/js/CallbackManager';
import ViewAbstraction            from '$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction';
import EdgeType                   from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import NodeType                   from '$:/plugins/felixhayashi/tiddlymap/js/NodeType';
import vis                        from '$:/plugins/felixhayashi/vis/vis.js';
import * as env                   from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';
import URL                        from '$:/plugins/felixhayashi/tiddlymap/js/URL';

/*** Code **********************************************************/

/**
 * This module is responsible for registering a global namespace
 * under $tw and loading (and refreshing) the configuration and services.
 *
 * Attention: Careful with the order of the function calls in this
 * functions body!
 *
 */
const init = () => {

  window.$tm = { ...env, utils, url: new URL(window.location.href) };

  // cleanup previous session
  cleanup();

  registerPublicClasses($tm);

  // build and integrate global options
  updateGlobals($tm);

  // register meta file (if not done yet)
  createMetaFile($tm.logger);

  // create indeces
  const indeces = attachIndeces($tm);

  // create services
  const services = getInitializedServices(indeces);
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
const getInitializedServices = indeces => {

  const tracker = new Tracker(fixer);

  // inject modules
  const handler = $tw.modules.applyMethods('tmap.edgetypehandler');
  const edgeTypeSubscriberRegistry = new EdgeTypeSubscriberRegistry(
    handler,
    indeces.allETy,
    tracker
  );

  // attach the adapter object to the tiddlymap namespace
  const adapter = new Adapter(
    tracker,
    edgeTypeSubscriberRegistry
  );

  const callbackManager = new CallbackManager();
  const dialogManager = new DialogManager(callbackManager);

  const fixer = new Fixer(adapter, $tm.logger, indeces.glNTy)

  return {
    edgeTypeSubscriberRegistry,
    tracker,
    adapter,
    callbackManager,
    dialogManager,
    fixer,
  };

};

/**
 * make classes available for console users
 */
const registerPublicClasses = (parent) => {
  parent.keycharm = vis.keycharm;
  parent.NodeType = NodeType;
  parent.EdgeType = EdgeType;
  parent.ViewAbstraction = ViewAbstraction;
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
var attachOptions = function(parent) {

  var p = parent;

  // default configurations mixed with user config
  if (!p.config) p.config = utils.makeHashMap();

  // Never modify the imported config objects; instead, merge them
  // into a new object

  // attention! it is a tw-data-tiddler!
  p.config.sys = utils.merge(
    p.config.sys,
    utils.unflatten($tw.wiki.getTiddlerData(env.ref.sysUserConf))
  );

  // CAREFUL: Never merge directly into the default vis config object
  p.config.vis = utils.merge(
    {}, visConfig, utils.parseFieldData(env.ref.visUserConf)
  );

  // a shortcut for fields property
  if (!p.field) p.field = utils.makeHashMap();
  $tw.utils.extend(p.field, p.config.sys.field);

};

/**
 * This function will cache/index some tiddler properties as javascript
 * objects for faster access.
 */
const attachIndeces = (parent) => {

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
var updateNodeTypesIndeces = function(parent) {

  parent = parent || $tm.indeces;

  var typePath = $tm.path.nodeTypes;
  var glNTy = parent.glNTy = [];
  var glNTyById = parent.glNTyById = utils.makeHashMap();

  $tw.wiki.eachTiddlerPlusShadows(function(tObj, tRef) {
    if (utils.startsWith(tRef, typePath)) {
      var type = NodeType.getInstance(tRef);
      glNTyById[type.id] = type;
      glNTy.push(type);
    }
  });

  glNTy.sort(function(a, b) {
    return a.priority - b.priority;
  });

};

var updateEdgeTypesIndeces = function(parent) {

  parent = parent || $tm.indeces;

  var typePath = $tm.path.edgeTypes;
  var allETy = parent.allETy = utils.makeHashMap();

  $tw.wiki.eachTiddlerPlusShadows(function(tObj, tRef) {

    if (utils.startsWith(tRef, typePath)) {

      var et = EdgeType.getInstance(tRef);
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
var attachFunctions = function(parent) {

  var fn = parent;
  var nirvana = function() { /* /dev/null */ };

  if (utils.isTrue($tm.config.sys.debug, false) && console) {

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
    fn.logger = function(/* type, [messages,] messages */) {
      if (arguments.length < 2) return;
      var args = Array.prototype.slice.call(arguments);
      var arg1 = args.shift(args);
      var type = (console.hasOwnProperty(arg1) ? arg1 : 'debug');
      console[type].apply(console, args);
    };

    fn.start = function(timerName) {
      console.time('[timer] ' + timerName);
    };

    fn.stop = function(timerName) {
      console.timeEnd('[timer] ' + timerName);
    };

  } else {

    fn.logger = fn.start = fn.stop = nirvana;

  }

  fn.notify = (utils.isTrue($tm.config.sys.notifications) ? utils.notify : nirvana);

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
var routineCheck = function() {

  for (var i = $tm.registry.length; i--;) {
    var widget = $tm.registry[i];

    if (!widget.destruct || !widget.isZombieWidget) return; // no duck!

    if (widget.isZombieWidget()) { // removed!
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
const dispatchUpdates = updates => {

  const registry = $tm.registry;
  for (let i = registry.length; i--;) {

    const widget = registry[i];

    if (widget.update && (widget.isZombieWidget && !widget.isZombieWidget())) {
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
const checkForClone = tObj => {

  const tRefs = utils.getDublicates(tObj);

  if (!tRefs.length) {
    return;
  }

  // remove any defined edges
  utils.setField(tObj, 'tmap.edges', undefined);

  // force override id
  $tm.tracker.assignId(tObj, true);

  // inform the user about what we did
  $tm.dialogManager.open('dublicateIdInfo', {
    param: {
      changedTiddler: tObj.fields.title,
      filter : utils.joinAndWrap(tRefs, '[[', ']]'),
      id: utils.getId(tObj),
    }
  });


};

/**
 * Builds and registers globals and the functions that depend on them.
 */
const updateGlobals = parent => {

  attachOptions($tm);
  attachFunctions($tm);

  // attention: logger() cannot be called before functions are rebuild
  $tm.logger('warn', 'Rebuilt globals');

};

var lastCurrentTiddler = null;
var updateLiveViewTrigger = function(changedTiddlers) {

  if (changedTiddlers['$:/HistoryList']) {
    var tRef = utils.getField('$:/HistoryList', 'current-tiddler');
  } else if (changedTiddlers['$:/temp/focussedTiddler']) {
    var tRef = utils.getField('$:/temp/focussedTiddler', 'text');
  }

  if (tRef != null && lastCurrentTiddler !== tRef) {
    lastCurrentTiddler = tRef;
    utils.setField('$:/temp/tmap/currentTiddler', 'text', tRef);
  }

};

/**
 * Only for debugging
 */
var printChanges = function(changedTiddlers, loopCount) {

  if (!utils.isTrue($tm.config.sys.debug, false)) return;

  $tm.logger('warn', '=== Refresh ' + loopCount + ' ===');

  for (var tRef in changedTiddlers) {

    var c = changedTiddlers[tRef].deleted ? '[Deleted]' : '[Modified]';

    $tm.logger('warn', c, tRef, $tw.wiki.getTiddler(tRef));
  }

};

/**
 * Saves the last mousemove event under $tm.mouse
 */
var registerMousemoveListener = function() {

  $tm.mouse = {};

  var fn = function(evt) { $tm.mouse = evt; };
  window.addEventListener('mousemove', fn, false);

};

/**
 * @TODO: suggest this to Jeremy for TW popup handling
 */
var registerClickListener = function() {

  var tempPopups = $tm.path.tempPopups;
  window.addEventListener('click', function(evt) {

    var popupStates = utils.getTiddlersByPrefix(tempPopups);

    for (var i = popupStates.length; i--;) {
      if (utils.getText(popupStates[i])) break;
    }

    if (i === -1) return;

    if (!$tw.utils.hasClass(evt.target, 'tc-drop-down')
       && !utils.getAncestorWithClass(evt.target, 'tc-drop-down')) {
    // = clicked on an element that isn't a dropdown or inside one
      for (var i = popupStates.length; i--;) {
        utils.setText(popupStates[i], '');
      }
    }

  }, false);
};

/**
 * Registers a change listener that will dispatch
 * @param callbackManager
 */
const registerChangeListener = callbackManager => {

  let loopCount = 0;

  $tw.wiki.addEventListener('change', changedTiddlers => {

    $tm.start('Caretaker handling changes');

    printChanges(changedTiddlers, loopCount++);
    callbackManager.refresh(changedTiddlers);

    const updates = { changedTiddlers: {} };

    for (let tRef in changedTiddlers) {

      const tObj = utils.getTiddler(tRef);

      if (tObj && tObj.isDraft()) {
        continue;
      }

      const isHandled = handleTiddlerChange(tRef, tObj, updates);

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
const rebuilders = {
  [env.path.options]: updateGlobals,
  [env.path.nodeTypes]: updateNodeTypesIndeces,
  [env.path.edgeTypes]: updateEdgeTypesIndeces,
};

/**
 * This function will deal with tiddler changes and will log changes
 * to the provided `updates` object.
 *
 * @param {TiddlerReference} tRef
 * @param {$tw.Tiddler} tObj
 * @param {Updates} updates
 */
const handleTiddlerChange = (tRef, tObj, updates) => {

  if ($tw.wiki.isSystemTiddler(tRef)) {

    for (let path in rebuilders) {
      if (utils.startsWith(tRef, path) && !updates[path]) {
        $tm.logger('warn', '[System change]', path);
        rebuilders[path]();
        updates[path] = true;
      }
    }

  } else if (tObj) { // created or modified

    if (tObj.fields.text === undefined) { // sic; '' is ok
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

  } else { // deleted or renamed

    const id = $tm.tracker.getIdByTiddler(tRef);

    if (!id) { // ignore tiddler without id
      return false;
    }

    const tRefWithId = utils.getTiddlerWithField('tmap.id', id);

    if (tRefWithId) { // only renamed

      $tm.logger('warn', '[Renamed]', tRef, 'into', tRefWithId);

    } else { // removed

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
const cleanup = () => {

  utils.deleteByPrefix('$:/temp/felixhayashi');
  utils.deleteByPrefix('$:/temp/tiddlymap');
  utils.deleteByPrefix('$:/temp/tmap');

};

/**
 * Register the view that should be displayed at startup.
 */
const loadDefaultView = defaultView => {

  if (defaultView) {
    utils.setText(env.ref.defaultViewHolder, $tm.config.sys.defaultView);
  }

};

/**
 * Init the wiki so we can start the main editor with the specified
 * view in fullscreen mode.
 *
 * @param {ViewAbstraction|string} view
 */
const prepareFullscreenStart = view => {

  const { mainEditor, defaultViewHolder } = env.ref;

  utils.setSidebarTab(mainEditor);

  if (ViewAbstraction.exists(view)) {
    view = new ViewAbstraction(view);
    utils.setField(defaultViewHolder, 'text', view.getLabel());
  }

};

/**
 * The meta file keeps track of installation data.
 */
const createMetaFile = (logger) => {

  if (utils.tiddlerExists(env.ref.sysMeta)) {
    return;
  }

  logger('warn', 'Creating meta file');

  const plugin = $tw.wiki.getTiddler(env.path.pluginRoot);

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

export const name = 'tmap.caretaker';
export const platforms = [ 'browser' ];
export const after = [ 'startup' ];
export const before = [ 'rootwidget' ];
export const synchronous = true;
export const startup = init;
