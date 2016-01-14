/*\

title: $:/plugins/felixhayashi/tiddlymap/js/caretaker
type: application/javascript
module-type: startup

@module TiddlyMap
@preserve

\*/


(
/**
 * 
 * This module is responsible for registering a global namespace under $tw
 * and loading (and refreshing) the configuration.
 * 
 * @lends module:TiddlyMap
 */ 
function(){
  
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Imports *******************************************************/

var visConfig =       require("$:/plugins/felixhayashi/tiddlymap/js/config/vis").config;
var utils =           require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
var fixer =           require("$:/plugins/felixhayashi/tiddlymap/js/fixer").fixer;
var Adapter =         require("$:/plugins/felixhayashi/tiddlymap/js/Adapter").Adapter;
var DialogManager =   require("$:/plugins/felixhayashi/tiddlymap/js/DialogManager").DialogManager;
var CallbackManager = require("$:/plugins/felixhayashi/tiddlymap/js/CallbackManager").CallbackManager;
var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction").ViewAbstraction;
var EdgeType =        require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;
var NodeType =        require("$:/plugins/felixhayashi/tiddlymap/js/NodeType").NodeType;
var vis =             require("$:/plugins/felixhayashi/vis/vis.js");

/*** Code **********************************************************/

/**
 * Everything that doesn't change when the global config object is
 * updated. This includes prefixes (paths) and tiddler titles.
 * 
 * ATTENTION: The paths are deliberately written in full so they
 * are discovered when a search is performed over the TiddlyMap code.
 */
var attachStaticConfig = function(parent) {
  
  if(parent.path) return; // already assigned
  
  var o = parent;
  
  // **ATTENTION: NO TRAILING SLASHES IN PATHS EVER**
  o.path = {
    pluginRoot:     "$:/plugins/felixhayashi/tiddlymap",
    edgeTypes:      "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes",
    nodeTypes:      "$:/plugins/felixhayashi/tiddlymap/graph/nodeTypes",
    listEdgeTypes:  "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes/tw-list:",
    fieldEdgeTypes: "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes/tw-field:",
    filterEdgeTypes: "$:/plugins/felixhayashi/tiddlymap/graph/edgeTypes/tw-filter:",
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
    defaultViewHolder:      "$:/plugins/felixhayashi/tiddlymap/misc/defaultViewHolder",
    graphBar:               "$:/plugins/felixhayashi/tiddlymap/misc/advancedEditorBar",
    sysUserConf:            "$:/plugins/felixhayashi/tiddlymap/config/sys/user",
    visUserConf:            "$:/plugins/felixhayashi/tiddlymap/config/vis/user",
    welcomeFlag:            "$:/plugins/felixhayashi/tiddlymap/flag/welcome",
    focusButton:            "$:/plugins/felixhayashi/tiddlymap/misc/focusButton",
    sysMeta:                "$:/plugins/felixhayashi/tiddlymap/misc/meta",
    liveTab:                "$:/plugins/felixhayashi/tiddlymap/hook/liveTab",
    sidebarBreakpoint:      "$:/themes/tiddlywiki/vanilla/metrics/sidebarbreakpoint"
  };
  
  // some other options
  o.misc = {
    // if no edge label is specified, this is used as label
    unknownEdgeLabel: "tmap:undefined",
    liveViewLabel: "Live View",
    defaultViewLabel: "Default"
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
    filterEdgeTypes: "[prefix[" + o.path.filterEdgeTypes + "]]",
    views: "[" + o.config.sys.field.viewMarker + "[true]]"
  };
    
  o.filter.defaultEdgeFilter = o.filter.edgeTypes
                               + "-[suffix[tw-body:link]]"
                               + "-[suffix[tw-list:tags]]"
                               + "-[suffix[tw-list:list]]";
  
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
  
  // all names of fields that store edges
  s.allFilterEdgeStores = allSelector
                         + " +" + o.filter.filterEdgeTypes
                         + " +[removeprefix[" + p.filterEdgeTypes + "]]";

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
                    
  var opt = parent;
  
  // first thing to attach
  attachStaticConfig(opt);
  
  // default configurations mixed with user config
  if(!opt.config) opt.config = utils.getDataMap();

  // Never modify the imported config objects; instead, merge them
  // into a new object  

  // attention! it is a tw-data-tiddler!
  opt.config.sys = utils.merge(
    opt.config.sys,
    utils.unflatten($tw.wiki.getTiddlerData(opt.ref.sysUserConf))
  );
  
  // CAREFUL: Never merge directly into the default vis config object
  opt.config.vis = utils.merge(
    {}, visConfig, utils.parseFieldData(opt.ref.visUserConf)
  );

  // a shortcut for fields property
  if(!opt.field) opt.field = utils.getDataMap();
  $tw.utils.extend(opt.field, opt.config.sys.field);
        
};

/**
 * This function will cache/index some tiddler properties as javascript
 * objects for faster access.
 */
var attachIndeces = function(parent) {
  
  $tw.tmap.start("Attaching Indeces");
  
  if(!parent.indeces) {
    parent.indeces = {};
    
    var r = $tw.tmap.opt.path.pluginRoot;
    parent.indeces.tmapTiddlers = $tw.wiki.getPluginInfo(r).tiddlers;
  }
  
  var allTiddlers = $tw.wiki.allTitles();
    
  updateTiddlerVsIdIndeces(parent.indeces, allTiddlers);
  updateNodeTypesIndeces(parent.indeces);
  updateEdgeTypesIndeces(parent.indeces);
  
  $tw.tmap.stop("Attaching Indeces");
  
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
 *     If not stated, $tw.tmap.indeces is used.
 * @param {Array<TiddlerReference>} [allTiddlers] - The tiddlers to
 *     use as basis for this index. If not stated, all tiddlers in
 *     the wiki are used.
 */
var updateTiddlerVsIdIndeces = function(parent, allTiddlers) {
  
  parent = parent || $tw.tmap.indeces;
  allTiddlers = allTiddlers || $tw.wiki.allTitles();
  
  // usually the fixer is not to be called at this point but
  // since the fixer relies on the adapter and the adapter
  // relies on indeces but the indeces must not be build before
  // the fixer had a chance to move ids, we have to call the fixer
  // function at this place :(
  // @TODO: remove this fixer code in 2016/2017 when it is highly
  // unlikely that people are still using an older version  
  fixer.fixId()

  var tById = parent.tById = {}; // tiddlerById
  var idByT = parent.idByT = {}; // idByTiddler
  
  $tw.wiki.each(function(tObj, tRef) {
  
    if(utils.isSystemOrDraft(tObj)) return;
    
    var id = tObj.fields["tmap.id"];
    if(!id) {
      id = utils.genUUID();
      utils.setField(tObj, "tmap.id", id);
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
 *     If not stated, $tw.tmap.indeces is used.
 * @param {Array<TiddlerReference>} [allTiddlers] - The tiddlers to
 *     use as basis for this index. If not stated, all tiddlers in
 *     the wiki are used.
 */
var updateNodeTypesIndeces = function(parent) {

  parent = parent || $tw.tmap.indeces;
  
  var typePath = $tw.tmap.opt.path.nodeTypes;
  var glNTy = parent.glNTy = [];
    
  $tw.wiki.eachTiddlerPlusShadows(function(tObj, tRef) {
    if(utils.startsWith(tRef, typePath)) {
      glNTy.push(new NodeType(tRef));
    }
  });
  
  glNTy.sort(function(a, b) {
    return a.priority - b.priority;
  });

};

var updateEdgeTypesIndeces = function(parent) {

  parent = parent || $tw.tmap.indeces;

  var typePath = $tw.tmap.opt.path.edgeTypes;
  var listEdgeTypes = $tw.tmap.opt.path.listEdgeTypes;
  var fieldEdgeTypes = $tw.tmap.opt.path.fieldEdgeTypes;
  var filterEdgeTypes = $tw.tmap.opt.path.filterEdgeTypes;
  var allETy = parent.allETy = utils.getDataMap();
  var liETy = parent.liETy = utils.getDataMap();
  var fiETy = parent.fiETy = utils.getDataMap();
  var ftETy = parent.ftETy = utils.getDataMap();
  // magic edge-type field name
  var maETyFiNa = parent.maETyFiNa = utils.getDataMap();
  
  $tw.wiki.eachTiddlerPlusShadows(function(tObj, tRef) {
    if(utils.startsWith(tRef, typePath)) {
      var et = new EdgeType(tRef);
      allETy[et.id] = et;
      if(utils.startsWith(tRef, listEdgeTypes)) {
        liETy[et.id] = et;
        maETyFiNa[et.getId(true)] = true;
      } else if(utils.startsWith(tRef, fieldEdgeTypes)) {
        fiETy[et.id] = et;
        maETyFiNa[et.getId(true)] = true;
      } else if(utils.startsWith(tRef, filterEdgeTypes)) {
        ftETy[et.id] = et;
        maETyFiNa[et.getId(true)] = true;
      }
    }
  });

};

var updateAdjacencyList = function(tRefs) {

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

  if(utils.isTrue($tw.tmap.opt.config.sys.debug, false) && console) {
  
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
      if(arguments.length < 2) return;
      var args = Array.prototype.slice.call(arguments);
      var arg1 = args.shift(args);
      var type = (console.hasOwnProperty(arg1) ? arg1 : "debug");
      console[type].apply(console, args);
    };
    
    fn.start = function(timerName) {
      console.time("[timer] " + timerName);
    };
    
    fn.stop = function(timerName) {
      console.timeEnd("[timer] " + timerName);
    };
    
  } else {
    
    fn.logger = fn.start = fn.stop = nirvana;
    
  }

  fn.notify = (utils.isTrue($tw.tmap.opt.config.sys.notifications)
               ? utils.notify
               : nirvana);
  
};

/**
 * This periodic check is needed to trigger a cleanup if a graph is
 * removed since a graph itself cannot react to its destruction.
 * This includes removing listeners that were not attached to the
 * local container or calling the vis destructor.
 */
var routineCheck = function() {
  
  for(var i = $tw.tmap.registry.length; i--;) {
    var graph = $tw.tmap.registry[i];
    if(graph.isZombieWidget()) { // removed
      $tw.tmap.logger("warn", "A graph has been removed.");
      graph.destruct();
      $tw.tmap.registry.splice(i, 1);
    }
  }
  
};

var checkForDublicates = function(tObj) {

  var id = tObj.fields["tmap.id"];
  
  if(!id) return;
  
  var opt = $tw.tmap.opt;
  var dublicates = utils.getTiddlersWithField("tmap.id", id, { limit: 2 });
  delete dublicates[tObj.fields.title];
  
  var dublicate = Object.keys(dublicates)[0];
  
  if(dublicate) {
    
    var vars = {
      param: {
        changedTiddler: tObj.fields.title,
        existingTiddler: dublicate,
        id: id
      }
    }

    $tw.tmap.dialogManager.open("dublicateIdInfo", vars);

  }
  
  if(dublicate) {
    // remove any defined edges
    utils.setField(tObj, "tmap.edges", undefined);
    // override id
    $tw.tmap.adapter.assignId(tObj, true);
  }  
  
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

var lastCurrentTiddler = null;
var updateLiveViewTrigger = function(changedTiddlers) {
  
  if(changedTiddlers["$:/HistoryList"]) {
    var tRef = utils.getField("$:/HistoryList", "current-tiddler");
  } else if(changedTiddlers["$:/temp/focussedTiddler"]) {
    var tRef = utils.getField("$:/temp/focussedTiddler", "text");
  }
  
  if(tRef != null && lastCurrentTiddler !== tRef) {
    lastCurrentTiddler = tRef;
    utils.setField("$:/temp/tmap/currentTiddler", "text", tRef);
  }   
      
};

/**
 * Only for debugging
 */
var printChanges = function(changedTiddlers) {

  if(utils.isTrue($tw.tmap.opt.config.sys.debug, false)) {
    for(var tRef in changedTiddlers) {
      if(changedTiddlers[tRef].deleted) {
        $tw.tmap.logger("warn", "Tiddler deleted:", tRef);
      } else {
        $tw.tmap.logger("warn", "Tiddler modified:", tRef,
                        utils.getTiddler(tRef));
      }
    }
  }

};

/**
 * @TODO: suggest this to Jeremy for TW popup handling
 */
var registerClickListener = function() {

  var tempPopups = $tw.tmap.opt.path.tempPopups;
  window.addEventListener("click", function(evt) {
    
    var popupStates = utils.getTiddlersByPrefix(tempPopups);
    
    for(var i = popupStates.length; i--;) {
      if(utils.getText(popupStates[i])) break;
    }
    
    if(i === -1) return;
                                          
    if(!$tw.utils.hasClass(evt.target, "tc-drop-down")
       && !utils.getAncestorWithClass(evt.target, "tc-drop-down")) {
    // = clicked on an element that isn't a dropdown or inside one
      for(var i = popupStates.length; i--;) {
        utils.setText(popupStates[i], "");
      }
    }
    
  }, false);
};

var registerChangeListener = function(callbackManager) {
  
  var loopCount = 0;
  var rebuilders = {};
  rebuilders[$tw.tmap.opt.path.nodeTypes] = updateNodeTypesIndeces;
  rebuilders[$tw.tmap.opt.path.edgeTypes] = updateEdgeTypesIndeces;
  rebuilders[$tw.tmap.opt.path.options] = rebuildGlobals;

  $tw.wiki.addEventListener("change", function(changedTiddlers) {
    
    $tw.tmap.start("Caretaker handling changes");
    
    $tw.tmap.logger("warn", "=== Refresh " + (loopCount++) + " ===");
    
    // debugging
    printChanges(changedTiddlers);
    
    // check on callbacks
    callbackManager.handleChanges(changedTiddlers);
        
    var hasUpdated = [];
    
    for(var tRef in changedTiddlers) {
      var tObj = utils.getTiddler(tRef);
      
      if(utils.isDraft(tObj)) continue;
      
      // check for relevant system tiddler changes
      if($tw.wiki.isSystemTiddler(tRef)) {
        for(var prefix in rebuilders) {
          if(utils.startsWith(tRef, prefix) && !hasUpdated[prefix]) {
            $tw.tmap.logger("warn", "Rebuilding index:", prefix);
            rebuilders[prefix].call(this);
            hasUpdated[prefix] = true;
            break;
          }
        }
        continue;
      }
      
      // check for non-system tiddler changes
      
      var tObj = utils.getTiddler(tRef);
      
      if(tObj) { // created or modified
        
        checkForDublicates(tObj);
        
        // call assignId IN ANY CASE to make sure the index
        // stays intact, also after a renaming operation
        $tw.tmap.adapter.assignId(tObj);
                
      } else { // deleted or renamed
        
        var id = $tw.tmap.indeces.idByT[tRef];
        if(!id) {
          $tw.tmap.logger("warn", "Ignoring Tiddler", tRef,
                                  "without id; Assuming draft");
          continue;
        }
        
        var tWithId = utils.getTiddlerWithField("tmap.id", id);
        
        if(tWithId) { // only renamed
        
          $tw.tmap.logger("warn", "Tiddler", tRef,
                                  "renamed into", tWithId);
        
        } else {
          
          $tw.tmap.logger("warn", "Tiddler", tRef, "removed");
        
          // remove node; any edges pointing in/out; update indeces
          // CAREFUL about recursion!
          $tw.tmap.adapter.deleteNode(id);
          
        }
        
      }
    }
    
    // finally update live view
    updateLiveViewTrigger(changedTiddlers);
    
    $tw.tmap.stop("Caretaker handling changes");
    
  });
  
};

var cleanup = function() {
  
  utils.deleteByPrefix("$:/temp/felixhayashi");
  utils.deleteByPrefix("$:/temp/tiddlymap");
  utils.deleteByPrefix("$:/temp/tmap");
                 
};

var setDefaults = function() {
  
  var defaultView = $tw.tmap.opt.config.sys.defaultView;
  if(defaultView) {
    utils.setField($tw.tmap.opt.ref.defaultViewHolder,
                   "text", defaultView);
  }
                 
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

/*** Exports *******************************************************/

// Export name and synchronous status
exports.name = "tmap.caretaker";
exports.platforms = [ "browser" ];
exports.after = [ "startup" ];
exports.before = [ "rootwidget" ];
exports.synchronous = true;

/**
 * Attention: Careful with the order of the function calls in this
 * functions body!
 */
exports.startup = function() {
  
  // create namespaces
  $tw.tmap = utils.getDataMap();
  $tw.tmap.utils = utils;
  
  // make classes publicly available
  $tw.tmap.keycharm = vis.keycharm;
  $tw.tmap.NodeType = NodeType;
  $tw.tmap.EdgeType = EdgeType;
  $tw.tmap.ViewAbstraction = ViewAbstraction;
  
  // build and integrate global options   
  rebuildGlobals($tw.tmap);
  
  // register meta file (if not done yet)
  createMetaFile();

  // cleanup previous session
  cleanup();
  
  // create indeces
  attachIndeces($tw.tmap);
  
  // set defaults
  setDefaults();
      
  // attach the adapter object to the tiddlymap namespace
  $tw.tmap.adapter = new Adapter();
        
  // Run the fixer to update older wikis
  fixer.fix()
    
  // create global callback and dialog managers 
  $tw.tmap.callbackManager = new CallbackManager();
  $tw.tmap.dialogManager = new DialogManager($tw.tmap.callbackManager);
  
  // all graphs need to register here. @see routineWalk()
  $tw.tmap.registry = [];
  window.setInterval(routineCheck, 5000);
        
  // AT THE VERY END: register change listener with the callback manager
  registerChangeListener($tw.tmap.callbackManager);
  registerClickListener();
  
  // issue notification
  $tw.tmap.logger("warn", "TiddlyMap's caretaker successfully started");
                
};

})();
