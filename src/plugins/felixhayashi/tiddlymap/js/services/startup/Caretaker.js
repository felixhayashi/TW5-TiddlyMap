// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/caretaker
type: application/javascript
module-type: startup

@preserve

\*/

/*** Imports *******************************************************/

import visConfig                  from '$:/plugins/felixhayashi/tiddlymap/js/config/vis';
import utils                      from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import fixer                      from '$:/plugins/felixhayashi/tiddlymap/js/fixer';
import Adapter                    from '$:/plugins/felixhayashi/tiddlymap/js/Adapter';
import EdgeTypeSubscriberRegistry from '$:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry';
import DialogManager              from '$:/plugins/felixhayashi/tiddlymap/js/DialogManager';
import CallbackManager            from '$:/plugins/felixhayashi/tiddlymap/js/CallbackManager';
import ViewAbstraction            from '$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction';
import EdgeType                   from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import NodeType                   from '$:/plugins/felixhayashi/tiddlymap/js/NodeType';
import vis                        from '$:/plugins/felixhayashi/vis/vis.js';
import * as environment           from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';
import URL                        from '$:/plugins/felixhayashi/tiddlymap/js/URL';

/*** Code **********************************************************/

/**
 * This module is responsible for registering a global namespace
 * under $tw and loading (and refreshing) the configuration.
 *
 * Attention: Careful with the order of the function calls in this
 * functions body!
 *
 */
function init() {

  $tm = { ...environment };

  // register utils
  $tm.utils = utils;

  // make classes publicly available
  $tm.keycharm = vis.keycharm;
  $tm.NodeType = NodeType;
  $tm.EdgeType = EdgeType;
  $tm.ViewAbstraction = ViewAbstraction;

  // create namespace for services
  $tm.services = {};

  // register url
  $tm.url = new URL(window.location.href);

  // build and integrate global options
  updateGlobals();

  // register meta file (if not done yet)
  createMetaFile();

  // cleanup previous session
  cleanup();

  // create indeces
  attachIndeces($tm);

  // inject modules
  var handler = $tw.modules.applyMethods('tmap.edgetypehandler');
  $tm.services.edgeTypeSubscriberRegistry = new EdgeTypeSubscriberRegistry(handler, $tm.indeces.allETy);

  // set defaults
  setDefaults();

  // attach the adapter object to the tiddlymap namespace
  $tm.adapter = new Adapter();

  // Run the fixer to update older wikis
  fixer.fix();

  // create global callback and dialog managers
  $tm.callbackManager = new CallbackManager();
  $tm.dialogManager = new DialogManager($tm.callbackManager);

  // all graphs need to register here. @see routineWalk()
  $tm.registry = [];
  window.setInterval(routineCheck, 5000);

  // AT THE VERY END: register change listener with the callback manager
  registerChangeListener($tm.callbackManager);

  // register DOM listeners
  registerMousemoveListener();
  registerClickListener();

  // check for fullscreen directives
  maybePrepareForFullscreenStart($tm.url);

  // issue notification
  $tm.logger('warn', 'TiddlyMap\'s caretaker successfully started');

}

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
    utils.unflatten($tw.wiki.getTiddlerData(p.ref.sysUserConf))
  );

  // CAREFUL: Never merge directly into the default vis config object
  p.config.vis = utils.merge(
    {}, visConfig, utils.parseFieldData(p.ref.visUserConf)
  );

  // a shortcut for fields property
  if (!p.field) p.field = utils.makeHashMap();
  $tw.utils.extend(p.field, p.config.sys.field);

};

/**
 * This function will cache/index some tiddler properties as javascript
 * objects for faster access.
 */
var attachIndeces = function(parent) {

  $tm.start('Attaching Indeces');

  if (!parent.indeces) {
    parent.indeces = {};

    var r = $tm.path.pluginRoot;
    parent.indeces.tmapTiddlers = $tw.wiki.getPluginInfo(r).tiddlers;
  }

  var allTiddlers = $tw.wiki.allTitles();

  updateTiddlerVsIdIndeces(parent.indeces, allTiddlers);
  updateNodeTypesIndeces(parent.indeces);
  updateEdgeTypesIndeces(parent.indeces);

  $tm.stop('Attaching Indeces');

};

/**
 * TiddlyMap uses ids to reference tiddlers. This function creates
 * a table that maps ids to tRefs and vice versa.
 *
 * Two indeces are added to the indeces chain:
 * 1. tById – tiddler references by id
 * 2. idByT – ids by tiddler references
 *
 * @param {Object} [parent] - The global indeces object indeces.
 *     If not stated, $tm.indeces is used.
 * @param {Array<TiddlerReference>} [allTiddlers] - The tiddlers to
 *     use as basis for this index. If not stated, all tiddlers in
 *     the wiki are used.
 */
var updateTiddlerVsIdIndeces = function(parent, allTiddlers) {

  parent = parent || $tm.indeces;

  // usually the fixer is not to be called at this point but
  // since the fixer relies on the adapter and the adapter
  // relies on indeces but the indeces must not be build before
  // the fixer had a chance to move ids, we have to call the fixer
  // function at this place :(
  // @TODO: remove this fixer code in 2016/2017 when it is highly
  // unlikely that people are still using an older version
  fixer.fixId();

  var tById = parent.tById = {}; // tiddlerById
  var idByT = parent.idByT = {}; // idByTiddler

  $tw.wiki.each(function(tObj, tRef) {

    if (utils.isSystemOrDraft(tObj)) return;

    var id = tObj.fields['tmap.id'];
    if (!id) {
      id = utils.genUUID();
      utils.setField(tObj, 'tmap.id', id);
    }

    tById[id] = tRef; // tiddlerById
    idByT[tRef] = id; // idByTiddler

  });

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
      var type = new NodeType(tRef);
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

      var et = new EdgeType(tRef);
      allETy[et.id] = et;

    }

  });

  if ($tm.services.edgeTypeSubscriberRegistry) {
    $tm.services.edgeTypeSubscriberRegistry.updateIndex(allETy);
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

  fn.notify = (utils.isTrue($tm.config.sys.notifications)
               ? utils.notify
               : nirvana);

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
 * A more advanced change system.
 *
 * @todo The MapConfigWidget does register itself in the registry to
 * have its destructor called. Is this ok?
 */
var dispatchUpdates = function(updates) {

  var registry = $tm.registry;
  for (var i = registry.length; i--;) {
    var widget = registry[i];

    if (!widget.destruct || !widget.isZombieWidget) return; // no duck!

    if (widget.update && !widget.isZombieWidget()) {
      widget.update(updates);
    }
  }

};

var checkForDublicates = function(tObj) {

  var id = tObj.fields['tmap.id'];

  if (!id) return;

  var dublicates = utils.getTiddlersWithField('tmap.id', id, { limit: 2 });
  delete dublicates[tObj.fields.title];

  var dublicate = Object.keys(dublicates)[0];

  if (dublicate) {

    var vars = {
      param: {
        changedTiddler: tObj.fields.title,
        existingTiddler: dublicate,
        id: id
      }
    };

    $tm.dialogManager.open('dublicateIdInfo', vars);

  }

  if (dublicate) {
    // remove any defined edges
    utils.setField(tObj, 'tmap.edges', undefined);
    // override id
    $tm.adapter.assignId(tObj, true);
  }

};

/**
 * Builds and registers globals and the functions that depend on them.
 */
var updateGlobals = function(parent) {

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

var registerChangeListener = function(callbackManager) {

  var loopCount = 0;
  var rebuilders = {};
  rebuilders[$tm.path.options] = updateGlobals;
  rebuilders[$tm.path.nodeTypes] = updateNodeTypesIndeces;
  rebuilders[$tm.path.edgeTypes] = updateEdgeTypesIndeces;

  $tw.wiki.addEventListener('change', function(changedTiddlers) {

    $tm.start('Caretaker handling changes');

    printChanges(changedTiddlers, loopCount++);
    callbackManager.handleChanges(changedTiddlers);

    var updates = { changedTiddlers: changedTiddlers };

    for (var tRef in changedTiddlers) {


      var tObj = utils.getTiddler(tRef);
      if (tObj && tObj.isDraft()) continue;


      if ($tw.wiki.isSystemTiddler(tRef)) {

        handleSysTidChanges(tRef, tObj, updates, rebuilders);
      } else {

        handleTidChanges(tRef, tObj, updates);
      }

    }

    dispatchUpdates(updates);

    // NOTE: changes will affect the next refresh cycle
    updateLiveViewTrigger(changedTiddlers);

    $tm.stop('Caretaker handling changes');

  });

};

var handleSysTidChanges = function(tRef, tObj, updates, rebuilders) {

  for (var prefix in rebuilders) {

    if (utils.startsWith(tRef, prefix) && !updates[prefix]) {

      $tm.logger('warn', '[System change]', prefix);

      rebuilders[prefix]();

      updates[prefix] = true;
      return;
    }
  }

};

var handleTidChanges = function(tRef, tObj, updates) {

  if (tObj) { // created or modified

    checkForDublicates(tObj);

    // call assignId IN ANY CASE to make sure the index
    // stays intact, also after a renaming operation
    $tm.adapter.assignId(tObj);

  } else { // deleted or renamed

    var id = $tm.indeces.idByT[tRef];

    // Ignore tiddler without id; assuming draft
    if (!id) return;

    var tWithId = utils.getTiddlerWithField('tmap.id', id);

    if (tWithId) { // only renamed

      $tm.logger('warn', '[Renamed]', tRef, 'into', tWithId);

    } else { // removed

      // remove node; any edges pointing in/out; update indeces
      // CAREFUL with recursion here!
      $tm.adapter.deleteNode(id);

    }

  }
};

var cleanup = function() {

  utils.deleteByPrefix('$:/temp/felixhayashi');
  utils.deleteByPrefix('$:/temp/tiddlymap');
  utils.deleteByPrefix('$:/temp/tmap');

};

var setDefaults = function() {

  var defaultView = $tm.config.sys.defaultView;
  if (!defaultView) return;

  utils.setField($tm.ref.defaultViewHolder, 'text', defaultView);

};

var maybePrepareForFullscreenStart = function(url) {

  if (!url.query['tmap-enlarged']) return;

  var ref = $tm.ref;
  var tRef = utils.getTiddlersByPrefix('$:/state/tab/sidebar-')[0];

  utils.setText(tRef, ref.mainEditor);

  var view = new ViewAbstraction(url.query['tmap-view']);
  if (view.exists()) {
    utils.setField(ref.defaultViewHolder, 'text', view.getLabel());
  }

};

var createMetaFile = function() {

  if (utils.tiddlerExists($tm.ref.sysMeta)) return;

  $tm.logger('warn', 'Creating meta file');

  var plugin = $tw.wiki.getTiddler($tm.path.pluginRoot);
  $tw.wiki.setTiddlerData($tm.ref.sysMeta, {
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
export const after = [ 'startup', 'tmap.environment' ];
export const before = [ 'rootwidget' ];
export const synchronous = true;
export const startup = init;
