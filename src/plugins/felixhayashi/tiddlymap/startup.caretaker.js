/*\

title: $:/plugins/felixhayashi/tiddlymap/caretaker.js
type: application/javascript
module-type: startup

@preserve

\*/

/**
 * 
 * This module is responsible for registering a global namespace under $tw
 * and loading (and refreshing) the configuration.
 * 
 * Since changes in configuration tiddlers are instantly acknowledged,
 * the user does not need to refresh its browser.
 * 
 * Like a caretaker in real life, nobody can communicate with him. He does
 * all his work in the background without being ever seen. What I want to
 * say here is: do not require the caretaker!
 * 
 */ 
(function(){
  
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// Export name and synchronous status
exports.name = "tmap.caretaker";
exports.platforms = [ "browser" ];
exports.after = [ "startup" ];
exports.before = [ "rootwidget" ];
exports.synchronous = true;

/**************************** IMPORTS ****************************/
 
var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
var Adapter = require("$:/plugins/felixhayashi/tiddlymap/adapter.js").Adapter;
var DialogManager = require("$:/plugins/felixhayashi/tiddlymap/dialog_manager.js").DialogManager;
var CallbackManager = require("$:/plugins/felixhayashi/tiddlymap/callback_manager.js").CallbackManager;

/***************************** CODE ******************************/


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
                    
  var opt = parent;
  
  // **ATTENTION: NO TRAILING SLASHES IN PATHS EVER**
  if(!opt.path) opt.path = utils.getDataMap();
  
  // persistent plugin environment
  opt.path.pluginRoot =   "$:/plugins/felixhayashi/tiddlymap";
  opt.path.edgeTypes =    "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes";
  opt.path.views =        "$:/plugins/felixhayashi/tiddlymap/graph/views";
  opt.path.options =      "$:/plugins/felixhayashi/tiddlymap/config";
  // temporary environment
  opt.path.tempRoot =     "$:/temp/felixhayashi/tiddlymap";
  opt.path.localHolders = "$:/temp/felixhayashi/tiddlymap/holders";
  opt.path.dialogs =      "$:/plugins/felixhayashi/tiddlymap/dialog";
  opt.path.footers =      "$:/plugins/felixhayashi/tiddlymap/dialogFooter";
  
  // static references to important tiddlers
  if(!opt.ref) opt.ref = utils.getDataMap();
  
  opt.ref.defaultGraphViewHolder = "$:/plugins/felixhayashi/tiddlymap/misc/defaultViewHolder";
  opt.ref.graphBar =               "$:/plugins/felixhayashi/tiddlymap/misc/advancedEditorBar";
  opt.ref.sysConf =                "$:/plugins/felixhayashi/tiddlymap/config/sys";
  opt.ref.sysUserConf =            "$:/plugins/felixhayashi/tiddlymap/config/sys/user";
  opt.ref.visConf =                "$:/plugins/felixhayashi/tiddlymap/config/vis";
  opt.ref.visUserConf =            "$:/plugins/felixhayashi/tiddlymap/config/vis/user";
  opt.ref.welcomeFlag =            "$:/plugins/felixhayashi/tiddlymap/flag/welcome";
  opt.ref.focusButton =            "$:/plugins/felixhayashi/tiddlymap/misc/focusButton";
  opt.ref.sysMeta =                "$:/plugins/felixhayashi/tiddlymap/misc/meta";
  
  // default configurations mixed with user config
  if(!opt.config) opt.config = utils.getDataMap();

  opt.config.sys = utils.merge(
    $tw.wiki.getTiddlerData(opt.ref.sysConf, {}),
    utils.unflatten($tw.wiki.getTiddlerData(opt.ref.sysUserConf, {}))
  );
  
  opt.config.vis = utils.merge(
    $tw.wiki.getTiddlerData(opt.ref.visConf, {}),
    utils.unflatten($tw.wiki.getTiddlerData(opt.ref.visUserConf, {}))
  );

  // a shortcut for fields property
  if(!opt.field) opt.field = utils.getDataMap();
  $tw.utils.extend(opt.field, opt.config.sys.field);
      
  // some other options
  if(!opt.misc) opt.misc = utils.getDataMap();
  
  // if no edge label is specified, this is used as label
  opt.misc.unknownEdgeLabel = "tmap:undefined";
  opt.misc.cssPrefix = "tmap-";
  opt.misc.sysEdgeTypeNS = "tmap";

  // some popular filters
  if(!opt.filter) opt.filter = utils.getDataMap();
  
  opt.filter.edgeTypes = "[prefix[" + opt.path.edgeTypes + "]]";  
  opt.filter.views = "[has[" + opt.field.viewMarker + "]]";
  opt.filter.defaultEdgeFilter = opt.filter.edgeTypes
                                 + "-[suffix[tmap:link]]"
                                 + "-[suffix[tmap:tag]]";
  
  // some popular selectors (usually used from within tiddlers via map-macro)
  if(!opt.selector) opt.selector = utils.getDataMap();
  
  var allSelector = "[all[tiddlers+shadows]!has[draft.of]]";
  opt.selector.allEdgeTypes = allSelector + " +" + opt.filter.edgeTypes;
  opt.selector.allEdgeTypesByLabel = opt.selector.allEdgeTypes + " +[removeprefix[" + opt.path.edgeTypes + "/]]";
  opt.selector.allViews = allSelector + " +" + opt.filter.views;
  opt.selector.allViewsByLabel = opt.selector.allViews + "+[removeprefix[" + opt.path.views + "/]]";
  opt.selector.allPotentialNodes = "[all[tiddlers]!is[system]!has[draft.of]]";
  
};

var attachIndeces = function(parent) {
  
  $tw.tmap.start("Attaching Indeces");
  
  if(!parent.indeces) {
    parent.indeces = {
      tById: utils.getDataMap(),
      idByT: utils.getDataMap()
    };
  }
  
  var allTiddlers = $tw.wiki.allTitles();
  for(var i = 0; i < allTiddlers.length; i++) {
    var tRef = allTiddlers[i];
    var tObj = $tw.wiki.getTiddler(tRef);
    if(!utils.isSystemOrDraft(tObj)) {
      var id = tObj.fields[$tw.tmap.opt.field.nodeId];
      if(!id) {
        id = utils.genUUID();
        utils.setField(tObj, $tw.tmap.opt.field.nodeId, id);
      }
      
      parent.indeces.tById[id] = tRef;
      parent.indeces.idByT[tRef] = id;
    }
  }
  
  $tw.tmap.stop("Attaching Indeces");
  
};

/**
 * This function attaches all the top level functions to the
 * tiddlymap namespace.
 * 
 * @param {Hashmap} parent - The parent object to attach the options to.
 */
var attachFunctions = function(parent) {
  
  var fn = parent;
  
  var nirvana = function() { /* /dev/null */ }; 

  if($tw.tmap.opt.config.sys.debug === "true" && console) {
  
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
     */
    fn.logger = function() {
      if(arguments.length < 2) return;
      var args = Array.prototype.slice.call(arguments);
      var arg1 = args.shift(args);
      var type = (console.hasOwnProperty(arg1) ? arg1 : "debug");
      console[type].apply(console, args);
    };
    
    fn.start = function(timerName) {
      console.time("timer: " + timerName);
    };
    
    fn.stop = function(timerName) {
      console.timeEnd("timer: " + timerName);
    };
    
  } else {
    
    fn.logger = nirvana
    fn.start = nirvana;
    fn.stop = nirvana;
    
  }

  fn.notify = ($tw.tmap.opt.config.sys.notifications === "true" ? utils.notify : nirvana);
  
};

/**
 * This periodic check is needed to trigger a cleanup if a graph is
 * removed since a graph itself cannot react to its destruction.
 * This includes removing listeners that were not attached to the
 * local container or calling the vis destructor.
 */
var routineCheck = function() {
  
  for(var i = ($tw.tmap.registry.length-1); i >= 0; i--) {
    var graph = $tw.tmap.registry[i];
    if(!document.body.contains(graph.getContainer())) { // removed
      $tw.tmap.logger("warn", "A graph has been removed.");
      graph.destruct();
      $tw.tmap.registry.splice(i, 1);
    }
  }
  
};


var checkForDublicates = function(tObj, idField, id) {

  var opt = $tw.tmap.opt;
  var dublicates = utils.getTiddlersWithField(idField, id, { limit: 2 });
  delete dublicates[tObj.fields.title];
  
  var dublicate = Object.keys(dublicates)[0];
  
  if(dublicate) {
    
    var vars = {
      param: {
        changedTiddler: tObj.fields.title,
        existingTiddler: dublicate,
        idField: idField,
        id: id
      },
      dialog: {
        buttons: "ok_suppress"
      }
    }
    
    if(!utils.isTrue(opt.config.sys.suppressedDialogs["dublicateIdInfo"], false)) {
      $tw.tmap.dialogManager.open("dublicateIdInfo", vars);
    }
  }
  
  return dublicate;
  
};

/**
 * Builds and registers globals and the functions that depend on them.
 */
var rebuildGlobals = function(parent) {
  
  if(!parent) parent = $tw.tmap;
  if(!parent.opt) parent.opt = utils.getDataMap();
  
  attachOptions(parent.opt);
  attachFunctions(parent, parent.opt);
  
  // attention: logger() cannot be called before functions are rebuild
  $tw.tmap.logger("warn", "Rebuilt globals");
  
};

var registerChangeListener = function(callbackManager) {
    
  var filter = $tw.wiki.compileFilter(
    "[prefix[" + $tw.tmap.opt.path.options + "]!has[draft.of]]"
  );
  
  $tw.wiki.addEventListener("change", function(changedTiddlers) {
    
    $tw.tmap.start("Caretaker handling changes");
    
    callbackManager.handleChanges(changedTiddlers);
  
    $tw.tmap.logger("warn", "These tiddlers changed:", changedTiddlers);
    
    // check for changed globals
    var hasChangedGlobals = utils.getMatches(filter, Object.keys(changedTiddlers)).length;
    if(hasChangedGlobals) {
      rebuildGlobals();
    }
    
    for(var tRef in changedTiddlers) {
      
      if(utils.isSystemOrDraft(tRef)) continue;
      
      var tObj = utils.getTiddler(tRef);
      
      if(tObj) {
        var idField = $tw.tmap.opt.field.nodeId;
        var id = tObj.fields[idField];
        
        if(id) {
          var hasDublicates = checkForDublicates(tObj, idField, id);
        
          if(hasDublicates) {
            // remove any defined edges
            utils.setField(tObj, $tw.tmap.opt.field.edges, undefined);
            // override id
            $tw.tmap.adapter.assignId(tObj, true);
          }
          
        }
        
        // call assignId IN ANY CASE to make sure the index stays intact
        // also after a renaming operation
        $tw.tmap.adapter.assignId(tObj);
        
      } else { // deleted or renamed
        
        // remove node; any edges pointing in/out; update indeces
        // CAREFUL about recursion!
        // WROOONG WE CANNOT DO ANYTHING HERE BECAUSE WE DON'T KNOW WHETHER RENAMED OR DELETED
        //$tw.tmap.adapter.deleteNode($tw.tmap.indeces.idByT[tRef]);
        
      }
    }
    
    $tw.tmap.stop("Caretaker handling changes");
    
  });
  
};

var createMetaFile = function() {

  if(utils.tiddlerExists($tw.tmap.opt.ref.sysMeta)) return;
  
  $tw.tmap.logger("warn", "Creating meta file");
  
  var plugin = $tw.wiki.getTiddler($tw.tmap.opt.path.pluginRoot);
  $tw.wiki.setTiddlerData($tw.tmap.opt.ref.sysMeta, {
    // the version originally installed
    originalVersion: plugin.fields.version,
    // the data structure in use corresponds to version x
    // if the structure is obsolete, it will be automatically
    // fixed by the fixer module.
    dataStructureState: "0.6.9",
    // whether or not to display a welcome message
    showWelcomeMessage: true
  });
  
};

exports.startup = function() {
  
  // create namespaces
  $tw.tmap = utils.getDataMap();
  $tw.tmap.utils = utils;
  
  // all graphs need to register here. @see routineWalk()
  $tw.tmap.registry = [];
  window.setInterval(routineCheck, 1000);
  
  // build and integrate global options   
  rebuildGlobals($tw.tmap);
  
  // create indeces
  attachIndeces($tw.tmap);
      
  // attach the adapter object to the tiddlymap namespace
  $tw.tmap.adapter = new Adapter();
      
  // register meta file (if not done yet)
  createMetaFile();
  
  // create global callback and dialog managers 
  $tw.tmap.callbackManager = new CallbackManager();
  $tw.tmap.dialogManager = new DialogManager($tw.tmap.callbackManager);
      
  // finally register change listener with the callback manager
  registerChangeListener($tw.tmap.callbackManager);
  
  // issue notification
  $tw.tmap.logger("warn", "TiddlyMap's caretaker successfully started");
                
};

})();
