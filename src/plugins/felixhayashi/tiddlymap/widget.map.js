/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/MapWidget
type: application/javascript
module-type: widget

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";

/*** Imports *******************************************************/
 
var Widget =          require("$:/core/modules/widgets/widget.js").widget;
var visDefConf =      require("$:/plugins/felixhayashi/tiddlymap/js/config/vis").config;
var utils =           require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
var DialogManager =   require("$:/plugins/felixhayashi/tiddlymap/js/DialogManager").DialogManager;
var CallbackManager = require("$:/plugins/felixhayashi/tiddlymap/js/CallbackManager").CallbackManager;
var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction").ViewAbstraction;
var EdgeType =        require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;
var NodeType =        require("$:/plugins/felixhayashi/tiddlymap/js/NodeType").NodeType;
var vis =             require("$:/plugins/felixhayashi/vis/vis.js");

/*** Code **********************************************************/
      
/**
 * The map widget is responsible for drawing the actual network
 * diagrams.
 * 
 * @constructor
 */
var MapWidget = function(parseTreeNode, options) {
  
  // call the parent constructor
  Widget.call(this);
  
  // call initialise on prototype
  this.initialise(parseTreeNode, options);
  
  // create shortcuts to services
  this.adapter = $tw.tmap.adapter;
  this.opt = $tw.tmap.opt;
  this.notify = $tw.tmap.notify;
  this.fsapi = utils.getFullScreenApis();
  this.getAttr = this.getAttribute;
  this.isDebug = utils.isTrue(this.opt.config.sys.debug, false);
  
  // instanciate managers
  this.callbackManager = new CallbackManager();
  this.dialogManager = new DialogManager(this.callbackManager, this);
      
  // make the html attributes available to this widget
  this.computeAttributes();
  this.editorMode = this.getAttr("editor");
  this.clickToUse = utils.isTrue(this.getAttr("click-to-use"), true);
  
  // who am I? the id is used for debugging and special cases
  this.objectId = this.getAttr("object-id") || utils.genUUID();
    
  // register listeners that are available in editor mode
  if(this.editorMode) {
    utils.addListeners({
      "tmap:tm-create-view": this.handleCreateView,
      "tmap:tm-rename-view": this.handleRenameView,
      "tmap:tm-delete-view": this.handleDeleteView,
      "tmap:tm-edit-view": this.handleEditView,
      "tmap:tm-configure-system": this.handleConfigureSystem,
      "tmap:tm-store-position": this.handleStorePositions,
      "tmap:tm-edit-filters": this.handleEditFilters,
      "tmap:tm-generate-widget": this.handleGenerateWidget,
      "tmap:tm-download-canvas": this.handleDownloadCanvas
    }, this, this);
  }
  
  // register listeners that are available in any case
  utils.addListeners({
    "tmap:tm-focus-node": this.handleFocusNode,
    "tmap:tm-reset-focus": this.repaintGraph
  }, this, this);
    
};

// !! EXTENSION !!
MapWidget.prototype = Object.create(Widget.prototype);
// !! EXTENSION !!
  
/**
 * This handler will open a dialog that allows the user to create a
 * new relationship between two edges. This includes, that the user
 * gets a chance to specify the edgetype of the connection.
 * 
 * Once the user confirmed the dialog, the edge is persisted.
 * 
 * @param {Edge} edge - A javascript object that contains at least
 *    the properties "from", "to" and "label"
 * @param {function} [callback] - A function with the signature
 *    function(isConfirmed);
 */
MapWidget.prototype.handleConnectionEvent = function(edge, callback) {

  var param = {
    fromLabel: this.adapter.selectNodeById(edge.from).label,
    toLabel: this.adapter.selectNodeById(edge.to).label
  };
  
  var name = "getEdgeType";
  this.dialogManager.open(name, param, function(isConfirmed, outTObj) {
  
    if(isConfirmed) {
      
      var type = utils.getText(outTObj);
      
      // get the default namespace of the view
      var ns = this.view.getConfig("edge_type_namespace");
      
      // check whether type string comes with a namespace
      var hasNamespace = utils.hasSubString(type, ":");
            
      // maybe add namespace to type and instanciate as EdgeType
      type = new EdgeType((ns && !hasNamespace ? ns : "") + type);
      
      // persist the type if it doesn't exist
      if(!type.exists()) type.persist();
      
      // add type to edge
      edge.type = type.getId();
      var isSuccess = this.adapter.insertEdge(edge);
      
      var edgeTypeFilter = this.view.getEdgeFilter("compiled");
      var typeWL = this.adapter.getEdgeTypeWhiteList(edgeTypeFilter);
      
      if(!typeWL[type.getId()]) {
        
        var dialog = {
          type: type.getId(),
          view: this.view.getLabel()
        }

        $tw.tmap.dialogManager.open("edgeNotVisible", dialog);
        
      }
      
      this.preventFitAfterRebuild = true;
      
    }
    
    if(typeof callback === "function") {
      callback(isConfirmed);
    }
      
  });
  
};

/**
 * The first time a map is opened, we want to display a welcome message.
 * Once shown, a flag is set and the message is not displayed again.
 */
MapWidget.prototype.checkForFreshInstall = function() {

  var sysMeta = this.opt.ref.sysMeta;
  if(utils.getEntry(sysMeta, "showWelcomeMessage", true)) {
    utils.setEntry(sysMeta, "showWelcomeMessage", false);
    this.dialogManager.open("welcome");
  }
  
};

/**
 * A very basic dialog that will tell the user he/she has to make
 * a choice.
 * 
 * @param {function} [callback] - A function with the signature
 *     function(isConfirmed).
 * @param {string} [message] - An small optional message to display.
 */
MapWidget.prototype.openStandardConfirmDialog = function(callback, message) {

  var param = { message : message };
  this.dialogManager.open("getConfirmation", param, callback);
  
};

/**
 * An extention of the default logger mechanism. It works like
 * `$tw.tmap.logger` but will include the object id of the widget
 * instance.
 * 
 * @param {string} type - The type of the message (debug, info, warning…)
 *     which is exactly the same as in `console[type]`.
 * @param {...*} message - An infinite number of arguments to be printed
 *     (just like console).
 */
MapWidget.prototype.logger = function(type, message /*, more stuff*/) {
  
  if(this.isDebug) {
  
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift("@" + this.objectId.toUpperCase());
    args.unshift(type);
    $tw.tmap.logger.apply(this, args);
    
  }
  
};

/**
 * Method to render this widget into the DOM.
 * 
 * @override
 */
MapWidget.prototype.render = function(parent, nextSibling) {
  
  // remember our place in the dom
  this.parentDomNode = parent;
  
  if(utils.isPreviewed(this)) {
    this.renderPreview(parent);
  } else {
    this.renderFullWidget(parent);
  }
      
};

/**
 * When the widget is only previewed we do some alternative rendering.
 */
MapWidget.prototype.renderPreview = function(parent) {
      
  $tw.utils.addClass(parent, "tmap-graph-placeholder");
  
};

/**
 * The standard way of rendering.
 * Attention: BE CAREFUL WITH THE ORDER OF FUNCTION CALLS IN THIS FUNCTION.
 */
MapWidget.prototype.renderFullWidget = function(parent) {
  
  // add widget classes
  this.registerClassNames(parent);
  
  // add a loading bar
  this.addLoadingBar(parent);
  
  // register 
  this.sidebar = utils.getFirstElementByClassName("tc-sidebar-scrollable");
  this.isContainedInSidebar = (this.sidebar
                               && this.sidebar.contains(this.parentDomNode));
      
  // get view and view holder
  this.viewHolderRef = this.getViewHolderRef();
  this.view = this.getView();
                  
  // flag that determines whether to zoom after stabilization finished;
  // always set to false after the next stabilization
  this.doFitAfterStabilize = true;
  
  // flag that determines whether to zoom after rebuilding the graph;
  // always set to false after the next rebuild
  this.preventFitAfterRebuild = false;
                  
  // *first* inject the bar
  this.initAndRenderEditorBar(parent);
  
  // *second* initialise graph variables and render the graph
  this.initAndRenderGraph(parent);

  // register this graph at the caretaker's graph registry
  $tw.tmap.registry.push(this);
  
  // if any refresh-triggers exist, register them
  this.reloadRefreshTriggers();
  
  // maybe display a welcome message
  this.checkForFreshInstall();
  
};

/**
 * Add some classes to give the user a chance to apply some css
 * to different graph modes.
 */  
MapWidget.prototype.registerClassNames = function(parent) {
  
  var addClass = $tw.utils.addClass;
  
  // add main class
  addClass(parent, "tmap-widget");
  
  // maybe add some of these classes as well…
  if(this.clickToUse) {
    addClass(parent, "tmap-click-to-use");
  }
  if(this.getAttr("editor") === "advanced") {
    addClass(parent, "tmap-advanced-editor");
  }
  if(!utils.isTrue(this.getAttr("show-buttons"), true)) {
    addClass(parent, "tmap-no-buttons");
  }
  if(this.getAttr("class")) {
    addClass(parent, this.getAttr("class"));
  }
  
};

/**
 * Adds a loading bar div below the parent.
 */
MapWidget.prototype.addLoadingBar = function(parent) {
                
  this.graphLoadingBarDomNode = document.createElement("div");
  $tw.utils.addClass(this.graphLoadingBarDomNode, "tmap-loading-bar");
  parent.appendChild(this.graphLoadingBarDomNode);
  
};

/**
 * The editor bar contains a bunch of widgets that allow the user
 * to manipulate the current view.
 * 
 * Attention: The Editor bar needs to render *after* the graph
 * because some elements depend on the graph's nodes which are
 * calculated when the network is created.
 * 
 * @param {Element} parent The dom node in which the editor bar will
 *     be injected in.
 */
MapWidget.prototype.initAndRenderEditorBar = function(parent) {
      
    this.graphBarDomNode = document.createElement("div");
    $tw.utils.addClass(this.graphBarDomNode, "tmap-topbar");
    parent.appendChild(this.graphBarDomNode);
    
    this.rebuildEditorBar();
    this.renderChildren(this.graphBarDomNode);
  
};

/**
 * Creates this widget's child-widgets.
 * 
 * @see https://groups.google.com/forum/#!topic/tiddlywikidev/sJrblP4A0o4
 * @see blob/master/editions/test/tiddlers/tests/test-wikitext-parser.js
 */
MapWidget.prototype.rebuildEditorBar = function() {
      
  // register variables
  
  var variables = utils.flatten({
    param: {
      viewLabel: this.view.getLabel(),
      isViewBound: String(this.isViewBound()),
      ref: {
        view: this.view.getRoot(),
        viewHolder: this.getViewHolderRef(),
        edgeFilter: this.view.getPaths().edgeFilter
      },
      allEdgesFilter: this.opt.selector.allEdgeTypes,
      searchOutput: "$:/temp/tmap/bar/search",
      nodeFilter: "[list[$:/temp/tmap/nodes/"
                  + this.view.getLabel()
                  + "]"
                  + "search:title{$:/temp/tmap/bar/search}]"
    }
  });
  
  for(var name in variables) {
    this.setVariable(name, variables[name]);
  }
  
  // Construct the child widget tree
  var body = {
    type: "tiddler",
    attributes: {
      tiddler: { type: "string", value: this.view.getRoot() }
    },
    children: []
  };
  
  if(this.editorMode === "advanced") {
    
    body.children.push({
      type: "transclude",
      attributes: {
        tiddler: { type: "string", value: this.opt.ref.graphBar }
      }
    });
    
  } else {
    
    body.children.push({
      type: "element",
      tag: "span",
      attributes: { class: { type: "string", value: "tmap-view-label" }},
      children: [ {type: "text", text: variables["param.viewLabel"] } ]
    });
    
  }
  
  body.children.push({
    type: "transclude",
    attributes: {
      tiddler: { type: "string", value: this.opt.ref.focusButton }
    }
  });

      
  this.makeChildWidgets([body]);

};
    
/**
 * This function is called by the system to notify the widget about
 * tiddler changes.
 * 
 * The changes are analyzed by several functions.
 * 
 * 1. checking for callbacks: some processes decide at runtime to 
 * listen to changes of single tiddlers (for example dialogs waiting
 * for results). So at first it is checked if a callback is triggered.
 * 
 * 2. checking for view changes: a view may be replaced (switched)
 * or modified. This will result in recalculation of the graph.
 * 
 * 3. checking for graph refresh: does the graph need an update
 * because nodes/edges have been modified, added or removed or the
 * view has changed?
 * 
 * 4. checking for graphbar refresh: Did some widgets need a rerendering
 * due to changes that affect the topbar (view switched or modified)?
 * 
 * @override
 * @see https://groups.google.com/d/msg/tiddlywikidev/hwtX59tKsIk/EWSG9glqCnsJ
 */
MapWidget.prototype.refresh = function(changedTiddlers) {
  
  if(this.isZombieWidget() || !this.network || utils.isPreviewed(this)) return;
     
  this.callbackManager.handleChanges(changedTiddlers);
  
  if(utils.hasPropWithPrefix(changedTiddlers, this.opt.path.options)) {
    this.reloadOptions();
  }
  
  if(utils.hasPropWithPrefix(changedTiddlers, this.opt.path.nodeTypes)) {
    this.rebuildGraph();
  }
  
  var isViewSwitched = this.checkForViewSwitch(changedTiddlers);
  var viewModifications = this.view.refresh(changedTiddlers);
  
  if(isViewSwitched || viewModifications.length) {

    // default actions
    var options = {
      resetData: true,
      resetOptions: true,
      resetFocus: { delay: 0, duration: 0 }
    };
    
    if(isViewSwitched) {
      this.logger("warn", "View switched");
      this.view = this.getView(true);
      
      // views may hold different triggers, so we need to reload them
      this.reloadRefreshTriggers();
      
    } else {
      this.logger("warn", "View modified", viewModifications);
      // not necessary to reset data
      options.resetData = false;
      if(this.preventFitAfterRebuild) {
        options.resetFocus = false;
      }
    }
    
    this.rebuildGraph(options);
                          
  } else {
    
    // check for changes that effect the graph on an element level
    this.checkOnGraph(changedTiddlers);
          
  }
  
  // in any case give child widgets a chance to refresh
  this.checkOnEditorBar(changedTiddlers, isViewSwitched, viewModifications);

};

/**
 * Refresh-triggers are tiddlers whose mere occurrence in the
 * changedTiddlers list forces tiddlymap to reassert
 * whether a filter expression returns the same set of matches as it
 * is currently displayed in the graph.
 * 
 * The raison d'etre for refresh-triggers is that a filter may contain
 * implicit text-references or variables that may require a filter to be
 * reasserted even though, the filter expression itself did not change.
 * 
 * For example a filter `[field:title{$:/HistoryList!!current-tiddler}]`
 * requires a `$:/HistoryList` refresh trigger to be added to the view so
 * everytime the `$:/HistoryList` tiddler changes, the filter gets
 * reasserted.
 */
MapWidget.prototype.reloadRefreshTriggers = function() { 
  
  // remove old triggers (if there are any)
  this.callbackManager.remove(this.refreshTriggers);
      
  // load new trigger list either from attribute or view config
  var str = this.getAttr("refresh-triggers")
            || this.view.getConfig("refresh-triggers");
  this.refreshTriggers = $tw.utils.parseStringArray(str) || [];
  
  this.logger("debug", "Registering refresh trigger", this.refreshTriggers);
  
  // TODO: not nice, if more than one trigger changed it
  // will cause multiple reassertments
  var fn = this.handleTriggeredRefresh.bind(this);
  for(var i = this.refreshTriggers.length; i--;) {
    this.callbackManager.add(this.refreshTriggers[i], fn, false);
  }
  
};

/**
 * Calling this method will cause the graph to be rebuild, which means
 * the graph data is refreshed. A rebuild of the graph will always
 * cause the network to stabilize again.
 * 
 * @param {Hashmap} [options] - An optional options object.
 * @param {boolean} [options.refreshData=false] - If this is set to
 *     true, all datasets will be cleared before new data is added.
 *     This guarantees a fresh start. This option should only be
 *     used when the topic of the graph changes (= view switched).
 * @param {boolean} [options.refreshOptions=false] - If this is set
 *     to true, the vis options will also be reloaded. This option
 *     should only be used if the options have actually changed, which
 *     is always the case when a view is switched or sometimes when
 *     a view is modified.
 * @param {Hashmap} [options.resetFocus=null] - If not false or null,
 *     this object requires two properties to be set: `delay` (the
 *     time to wait before starting the fit), `duration` (the length
 *     of the fit animation). If the global flag `preventFitAfterRebuild`
 *     is set to true at the time `rebuildGraph` is called with the
 *     `resetFocus` option specified, then it overrules this option
 *     and the fit will not take place. After the rebuild,
 *     `preventFitAfterRebuild` is said to false again.
 */
MapWidget.prototype.rebuildGraph = function(options) {
  
  if(utils.isPreviewed(this)) return;
  
  this.logger("debug", "Rebuilding graph");
    
  options = options || {};
  
  // always reset to allow handling of stabilized-event!
  this.hasNetworkStabilized = false;
  
  // make sure no node is selected
  this.network.selectNodes([]);
  this.network.releaseNode();
  
  if(options.resetData) {
    this.graphData.edges.clear();
    this.graphData.nodes.clear();
    this.graphData.edgesById = null;
    this.graphData.nodesById = null;
  }
      
  if(options.resetOptions) {
    this.reloadOptions();
  }
  
  if(!options.resetFocus) {
    // option or data resets always overrule any flags!
    this.doFitAfterStabilize = false;
  }
  
  this.rebuildGraphData(true);
  
  if(!utils.hasElements(this.graphData.nodesById)) {
    return;
  }

  // see https://github.com/almende/vis/issues/987#issuecomment-113226216
  // see https://github.com/almende/vis/issues/939
  this.network.stabilize();
  
  // resetting the focus is not the same as zooming after stabilization,
  // the question is whether after a rebuild the focus should be immediately
  // reset or not. Zooming after stabilization does always(!) takes place
  // after a rebuild, in contrast, resetting the focus doesn't necessarily take place.
  if(options.resetFocus && !this.preventFitAfterRebuild) {
    
    // a not-prevented focus reset will always also cause a fit after stabilize
    this.doFitAfterStabilize = true;
    this.fitGraph(options.resetFocus.delay, options.resetFocus.duration);
        
  }
  
  // in any case, reset to default
  this.preventFitAfterRebuild = false;
  
};

/**
 * Warning: Do not change this functionname as it is used by the
 * caretaker's routinely checkups.
 */
MapWidget.prototype.getContainer = function() {
  return this.parentDomNode;
};


MapWidget.prototype.reloadOptions = function() {
  
  // reset all previous options
  this.network.setOptions({
    nodes: undefined,
    edges: undefined,
    interaction: undefined,
    layout: undefined,
    manipulation: undefined,
    physics: undefined
  });
  
  // load and register new options
  this.graphOptions = this.getGraphOptions();
  
  // inject new options into the network
  this.network.setOptions(this.graphOptions);
};

/**
 * param {boolean} isRebuild
 * param {NodeCollection} [nodes] - An optional set of nodes to use
 *     instead of the set created according to the nodes filter. Supplying
 *     a nodes collection will always recreate the cache despite the value
 *     of `isRebuild`.
 */
MapWidget.prototype.rebuildGraphData = function(isRebuild) {
  
  $tw.tmap.start("Reloading Network");
  
  if(!isRebuild && this.graphData) {
    return this.graphData;
  }

  var graph = this.adapter.getGraph({ view: this.view });    
  var nodes = graph.nodes;
  var edges = graph.edges;
      
  this.graphData.nodes = this.getRefreshedDataSet(nodes, // new nodes
                                       this.graphData.nodesById, // old nodes
                                       this.graphData.nodes); // dataset
                                                                                
  this.graphData.edges = this.getRefreshedDataSet(edges, // new edges
                                       this.graphData.edgesById, // old edges
                                       this.graphData.edges); // dataset
                                     
  // create lookup tables
  
  this.graphData.nodesById = nodes;
  this.graphData.edgesById = edges;
  
  // TODO: that's a performance killer. this should be loaded when
  // the search is actually used!
  utils.setField("$:/temp/tmap/nodes/" + this.view.getLabel(),
                 "list",
                 this.adapter.getTiddlersById(nodes));
  
  $tw.tmap.stop("Reloading Network");
  
  return this.graphData;
      
};

MapWidget.prototype.isViewBound = function() {
  
  return utils.startsWith(this.getViewHolderRef(), this.opt.path.localHolders);  
  
};
  
MapWidget.prototype.checkForViewSwitch = function(changedTiddlers) {

  if(this.isViewBound()) {
    // bound views can never be switched!
    // TODO bound views should also be allowed to switch when
    // attribute is set.
    return false;
  }
  
  // check if view has changed
  if(changedTiddlers[this.getViewHolderRef()]) {
    if(!this.view.isEqual(utils.getText(this.getViewHolderRef()))) {
      this.prevView = null;
      return true;
    }
  }

  // check for triggers
  //~ if((this.view.isLiveView() || this.prevView)
     //~ && changedTiddlers["$:/temp/tmap/currentTiddler"]) {
  //~ 
    //~ var tRef = utils.getText("$:/temp/tmap/currentTiddler");
    //~ var view = utils.getField(tRef, "tmap.open-view");
//~ 
    //~ if(view) {
      //~ view = new ViewAbstraction(view);
      //~ if(!view.exists()) {
        //~ this.notify("View trigger doesn't exist");
      //~ } else if(!this.view.isEqual(view)) {
        //~ this.prevView = this.view;
        //~ this.setView(view);
        //~ this.notify("Triggered open view");
        //~ return true;
      //~ }
    //~ }
    //~ 
    //~ // current tiddler changed but not trigger was found;
    //~ // now we need to check if we did a triggered refresh before
    //~ // and if yes, we need to reset it to normal.
    //~ if(this.prevView) {
      //~ this.setView(this.prevView);
      //~ this.prevView = null;
      //~ return true;
    //~ }
    //~ 
  //~ }
      
  return false;
  
};

/**
 * This method will ckeck if any tw-widget needs a refresh.
 */
MapWidget.prototype.checkOnEditorBar = function(changedTiddlers, isViewSwitched, viewModifications) {
  
  // @TODO viewModifications is actually really heavy. I could narrow this.
  if(isViewSwitched || viewModifications.length) {
    
    // full rebuild
    //this.logger("info", "The graphbar needs a full refresh");
    this.removeChildDomNodes();
    // update all variables and build the tree
    this.rebuildEditorBar();
    this.renderChildren(this.graphBarDomNode);
    return true;
    
  } else {
    
    // let children decide for themselves
    //this.logger("info", "Propagate refresh to childwidgets");
    return this.refreshChildren(changedTiddlers);
    
  }
  
};

/**
 * Rebuild or update the graph if one of the following events occured:
 * 
 * 1. A node that matches the node filter has been added or modified.
 * 2. A node that once matched the node filter has been removed
 * 3. An edge that matches the edge filter has been added or removed.
 * 
 * @param {Hashmap<TiddlerReference, *>} changedTiddlers - A list of
 *     tiddler changes.
 */
MapWidget.prototype.checkOnGraph = function(changedTiddlers) {
   
  // check for changed or removed nodes and edges
  
  var nodeFilter = this.view.getNodeFilter("compiled");
  var matches = utils.getMatches(nodeFilter, Object.keys(changedTiddlers), true);
  for(var tRef in changedTiddlers) {
    
    if(utils.isSystemOrDraft(tRef)) continue;
    
    // whether the tiddler matches the view filter
    var isMatch = matches[tRef];
    // whether or not this tiddler is currently represented as node
    // in the graph (either as match or neighbour)
    var isContained = this.graphData.nodesById[this.adapter.getId(tRef)];
        
    if(isMatch || isContained) {
      // either (1) a match changed or (2) a former match is not
      // included anymore; a match change also includes changed
      // edges as edges are stored in the nodes!
      this.rebuildGraph();
      return;
    }
    
  }
  
  // check for changed edge-types
  
  var edgeFilter = this.view.getEdgeFilter("compiled");
  var changedEdgeTypes = utils.getMatches(edgeFilter, Object.keys(changedTiddlers));
  
  if(changedEdgeTypes.length) {
    this.logger("info", "Changed edge-types", changedEdgeTypes);
    this.rebuildGraph();
    return;
  }

};
    
/**
 * Rebuild the graph
 * 
 * @see
 *   - http://visjs.org/docs/network.html
 *   - http://visjs.org/docs/dataset.html
 */
MapWidget.prototype.initAndRenderGraph = function(parent) {
  
  this.logger("info", "Initializing and rendering the graph");
      
  this.graphDomNode = document.createElement("div");
  parent.appendChild(this.graphDomNode);
      
  $tw.utils.addClass(this.graphDomNode, "tmap-vis-graph");

  // in contrast to the graph height, which is assigned to the vis
  // graph wrapper, the graph width is assigned to the parent
  parent.style["width"] = this.getAttr("width", "100%");
    
  // always save reference to a bound function that is used as listener
  // see http://stackoverflow.com/a/22870717
  this.handleResizeEvent = this.handleResizeEvent.bind(this);
  this.handleClickEvent = this.handleClickEvent.bind(this);
  this.handleFullScreenChange = this.handleFullScreenChange.bind(this);
  
  window.addEventListener("resize", this.handleResizeEvent, false);
  
  if(!this.isContainedInSidebar) {
    this.callbackManager.add("$:/state/sidebar", this.handleResizeEvent);
  }
  
  window.addEventListener("click", this.handleClickEvent, false);
  
  if(this.fsapi) {
    window.addEventListener(this.fsapi["_fullscreenChange"],
                            this.handleFullScreenChange,
                            false);
  }
  
  this.handleResizeEvent();

  // register options and data
  this.graphOptions = this.getGraphOptions();
  this.graphData = {
    nodes: new vis.DataSet(),
    edges: new vis.DataSet(),
    nodesById: utils.getDataMap(),
    edgesById: utils.getDataMap()
  };
  
  // init the graph with dummy data as events are not registered yet
  this.network = new vis.Network(this.graphDomNode, this.graphData, this.graphOptions);
  
  this.visNetworkDomNode = this.graphDomNode.firstElementChild;

  this.addKeyBindings();

  // register events
  var handlers = {
    "click": this.handleVisSingleClickEvent,
    "doubleClick": this.handleVisDoubleClickEvent,
    "stabilized": this.handleVisStabilizedEvent,
    'dragStart': this.handleVisDragStart,
    "dragEnd": this.handleVisDragEnd,
    "select": this.handleVisRightClick,
    "oncontext": this.handleVisSelect,
    "beforeDrawing": this.handleVisBeforeDrawing,
    "showPopup": this.handleVisShowPopup,
    "stabilizationProgress": this.handleVisLoading,
    "stabilizationIterationsDone": this.handleVisLoadingDone
  };
  
  for(var event in handlers) {
    this.network.on(event, handlers[event].bind(this));
  }
  
  this.addGraphButtons({
    "fullscreen-button": function() { this.handleToggleFullscreen(false); }
  });
  
  if(this.isContainedInSidebar) {
    this.addGraphButtons({
      "halfscreen-button": function() { this.handleToggleFullscreen(true); }
    });
  }

  this.rebuildGraph({ resetFocus: { delay: 0, duration: 0 }});

};

MapWidget.prototype.addKeyBindings = function(parentDomNode) {
  
  // asign a tabindex to make it focussable
  this.visNetworkDomNode.tabIndex = 0;
  
  var keys = vis.keycharm({
    container: this.parentDomNode
  });
  
  keys.bind("delete", function() {
    this.handleRemoveElement(this.network.getSelection());
  }.bind(this));
  
};  

MapWidget.prototype.isMobileMode = function() {
  
  var breakpoint = utils.getText(this.opt.ref.sidebarBreakpoint, 960);
  return (window.innerWidth <= parseInt(breakpoint));
         
};

// TODO: Instead of redrawing the whole graph when an edge or node is added
// it may be worth considering only getting the element from the adapter
// and directly inserting it into the graph and *avoid* a reload of the
// graph via `rebuildGraph`!
MapWidget.prototype.getGraphOptions = function() {
            
  // merge options
  var globalOptions = this.opt.config.vis;
  var localOptions = utils.parseJSON(this.view.getConfig("vis"));
  var options = utils.merge({}, globalOptions, localOptions);
  
  options.clickToUse = this.clickToUse;

  options.manipulation.enabled = !!this.editorMode;
  
  options.manipulation.deleteNode = function(data, callback) {
    this.handleRemoveElement(data);
    this.resetVisManipulationBar(callback);
  }.bind(this);
  
  options.manipulation.deleteEdge = function(data, callback) {
    this.handleRemoveElement(data);
    this.resetVisManipulationBar(callback);
  }.bind(this);
  
  options.manipulation.addEdge = function(data, callback) {
    this.handleConnectionEvent(data);
    this.resetVisManipulationBar(callback);
  }.bind(this);

  options.manipulation.addNode = function(data, callback) {
    this.handleInsertNode(data);
    this.resetVisManipulationBar(callback);
  }.bind(this);

  options.manipulation.editEdge = function(data, callback) {
    this.handleReconnectEdge(data);
    this.resetVisManipulationBar(callback);
  }.bind(this);
  
  //~ // v4: formerly onEdit; doesn't work; upstream bug
  options.manipulation.editNode = function(data, callback) {
    this.handleEditNode(data);
    this.resetVisManipulationBar(callback);
  }.bind(this);
  
  // gravity needs to be set to very small value so graph still
  // looks balanced when physics is off!
  var gravity = (this.view.isEnabled("physics_mode") ? 0.001 : 0);
  
  var physics = options.physics;
  physics[physics.solver] = physics[physics.solver] || {};
  physics[physics.solver].centralGravity = gravity;
  physics.stabilization.iterations = this.view.getStabilizationIterations();
  
  this.logger("debug", "Loaded graph options", options);
    
  return options;
  
};

MapWidget.prototype.resetVisManipulationBar = function(visCallback) {
  if(visCallback) visCallback(null);
  this.network.disableEditMode();
  this.network.enableEditMode();
};

/**
 * Create an empty view. A dialog is opened that asks the user how to
 * name the view. The view is then registered as current view.
 */
MapWidget.prototype.handleCreateView = function() {
  
  this.dialogManager.open("createView", null, function(isConfirmed, outTObj) {
  
    if(isConfirmed) {
      
      var label = utils.getText(outTObj);
      var view = new ViewAbstraction(label);
      
      if(view.isLocked()) {
        this.notify("Forbidden!");
      } else {
        var view = this.adapter.createView(label);
        this.setView(view);
      }

    }
    
  });
  
};

MapWidget.prototype.handleRenameView = function() {
     
  if(!this.view.isLocked()) {

    var references = this.view.getReferences();
    
    var fields = {
      count : references.length.toString(),
      filter : utils.joinAndWrap(references, "[[", "]]")
    };

    this.dialogManager.open("getViewName", fields, function(isConfirmed, outTObj) {
    
      if(isConfirmed) {
        
        var label = utils.getText(outTObj);
        var view = new ViewAbstraction(label);
        
        if(!label || view.isLocked()) {
          this.notify("Forbidden!");
        } else {
          this.view.rename(label);
          this.setView(this.view);
        }
        
      }

    });
    
  } else {
    this.notify("Forbidden!");
  }
  
};

MapWidget.prototype.handleEditView = function() {
      
  var params = {
    view: this.view.getLabel(),
    createdOn: this.view.getCreationDate(true),
    numberOfNodes: "" + Object.keys(this.graphData.nodesById).length,
    numberOfEdges: "" + Object.keys(this.graphData.edgesById).length,
    dialog: {
      preselects: this.view.getConfig()
    }
  };
  
  params.dialog.preselects["vis-inherited"] = JSON.stringify(this.opt.config.vis);
  
  this.dialogManager.open("configureView", params, function(isConfirmed, outTObj) {
    
    if(!isConfirmed) return;
      
    var config = utils.getPropertiesByPrefix(outTObj.fields, "config.");
    this.view.setConfig(config);
    if(config["config.physics_mode"]) {
      // otherwise nodes would cludge together…
      this.handleStorePositions();
    }
          
  });
  
};

/**
 * Triggers a download dialog where the user can store the canvas
 * as png on his/her harddrive.
 */
MapWidget.prototype.handleDownloadCanvas = function() {
  
  var canvas = this.parentDomNode.getElementsByTagName("canvas")[0];
  var dataURL = canvas.toDataURL('image/png');
  var a = document.createElement("a");
  a.download = "Map snapshot – " + this.view.getLabel() + ".png";
  a.href = dataURL;

  // we cannot simply call click() on <a>; chrome is cool with it but
  // firefox requires us to create a mouse event…
  var event = new MouseEvent('click');
  a.dispatchEvent(event);
  
};

MapWidget.prototype.handleDeleteView = function() {
  
  var viewname = this.view.getLabel();
  
  if(this.view.isLocked()) {
    this.notify("Forbidden!");
    return;
  }
  
  // regex is non-greedy

  var references = this.view.getReferences();
  if(references.length) {
          
    var fields = {
      count : references.length.toString(),
      filter : utils.joinAndWrap(references, "[[", "]]")
    };

    this.dialogManager.open("cannotDeleteViewDialog", fields);

    return;
    
  }

  var message = "You are about to delete the view " + 
                "''" + viewname + "'' (no tiddler currently references this view).";
                
  this.openStandardConfirmDialog(function(isConfirmed) { // TODO: this dialog needs an update
    
    if(isConfirmed) {
      this.view.destroy();
      this.setView(this.opt.misc.defaultViewLabel); 
      this.notify("view \"" + viewname + "\" deleted ");
    }

  }, message);
  
};

/**
 * This will rebuild the graph after a trigger has been activated.
 * 
 * Prior to TiddlyMap v0.9, an additional check was performed
 * to verify, if the graph had actually changed before rebuilding
 * the graph. This check, however, was an overkill and as such removed.
 */
MapWidget.prototype.handleTriggeredRefresh = function(trigger) {
      
    this.logger("log", trigger, "Triggered a refresh");
  
    this.rebuildGraph({
      resetData: false,
      resetOptions: false,
      resetFocus: { delay: 1000, duration: 1000 }
    });
  
};
  
MapWidget.prototype.handleConfigureSystem = function() {

  var args = {
    dialog: {
      preselects: {
        "vis-inherited": JSON.stringify(visDefConf),
        "config.vis": utils.getText(this.opt.ref.visUserConf),
        "config.sys": this.opt.config.sys
      }
    }
  };

  var name = "configureTiddlyMap";
  this.dialogManager.open(name, args, function(isConfirmed, outTObj) {
    
    if(isConfirmed && outTObj) {
      
      var config = utils.getPropertiesByPrefix(outTObj.fields,
                                               "config.sys.",
                                               true);

      this.wiki.setTiddlerData(this.opt.ref.sysUserConf, config);
      
      // tw doesn't translate the json to an object so this is already a string
      utils.setField(this.opt.ref.visUserConf, "text", outTObj.fields["config.vis"]);
            
    }

  });
  
};

/**
 * Handler that guides the user through the process of creating edges
 * 
 * This action represents a direct graph manipulation by the user,
 * which means it will prevent a graph fitting (viewport adjusting)
 * in the course of the next rebuild.
 */
MapWidget.prototype.handleReconnectEdge = function(updates) {
  
  // get current edge data
  var oldEdge = this.graphData.edges.get(updates.id);
  
  // delete old edge from store
  this.adapter.deleteEdge(oldEdge);
  
  // update from and to properties
  var newEdge = $tw.utils.extend(oldEdge, updates);
  
  // prevent focus reset
  this.preventFitAfterRebuild = true;
      
  // insert updated edge into store
  return this.adapter.insertEdge(newEdge);
  
};

/**
 * Called by vis when the user tries to delete a node or an edge.
 * The action is delegated to subhandlers.
 * 
 * @param {Object} elements - An object containing the elements to be removed.
 * @param {Array<Id>} elements.nodes - Removed edges.
 * @param {Array<Id>} elements.edges - Removed nodes.
 */
MapWidget.prototype.handleRemoveElement = function(elements) {
  
  if(elements.edges.length && !elements.nodes.length) {
    this.handleRemoveEdges(elements.edges);
  }
                      
  if(elements.nodes.length) {
    this.handleRemoveNode(this.graphData.nodesById[elements.nodes[0]]);
  }
  
  this.resetVisManipulationBar();
  
};

MapWidget.prototype.handleRemoveEdges = function(edges) {
  
  this.adapter.deleteEdges(this.graphData.edges.get(edges));
  this.notify("edge" + (edges.length > 1 ? "s" : "") + " removed");
  
  this.preventFitAfterRebuild = true;
  
};


/**
 * Handler that guides the user through the process of deleting a node
 * from the graph. The nodes may be removed from the filter (if possible)
 * or from the system.
 * 
 * This action represents a direct graph manipulation by the user,
 * which means it will prevent a graph fitting (viewport adjusting)
 * in the course of the next rebuild.
 */
MapWidget.prototype.handleRemoveNode = function(node) {

  var params = {
    "var.nodeLabel": node.label,
    "var.nodeRef": $tw.tmap.indeces.tById[node.id],
    dialog: {
      preselects: {
        "opt.delete": "from" + " " + (this.view.isExplicitNode(node) // plain ugly
                                      ? "filter"
                                      : "system")
      }
    }
  };

  this.dialogManager.open("deleteNodeDialog", params, function(isConfirmed, outTObj) {
    
    if(isConfirmed) {
      
      if(outTObj.fields["opt.delete"] === "from system") {

        // will also delete edges
        this.adapter.deleteNode(node);

      } else {
      
        var success = this.view.removeNodeFromFilter(node);
        
        if(!success) {
          this.notify("Couldn't remove node from filter");
          return;
        }
        
      }
      
      this.preventFitAfterRebuild = true;
      
      this.notify("Node removed " + outTObj.fields["opt.delete"]);
      
    }
    
  });
    
};

/**
 * Called by browser when a fullscreen change occurs (entering or
 * exiting). Its purpose is to call the toggle fullscreen function
 * once the exit fullscreen event has occured.
 */
MapWidget.prototype.handleFullScreenChange = function() {
  
  if(this.fsapi
     && this.enlargedMode === "fullscreen"
     && !document[this.fsapi["_fullscreenElement"]]) {
    this.handleToggleFullscreen();
  }
  
};

/**
 * Calling this function will toggle the enlargement of the map
 * instance. We cannot set the element itself to native fullscreen as
 * as this would cause modals to be hidden. Therefore markers need to
 * be added at various places to ensure the map stretches properly.
 * This includes marking ancestor dom nodes to be able to shift the
 * stacking context.
 */
MapWidget.prototype.handleToggleFullscreen = function(useHalfscreen) {
  
  this.logger("log", "Toggled graph enlargement");
      
  if(this.enlargedMode) {
    
    this.network.setOptions({ clickToUse: this.clickToUse });
    
    // remove markers
    utils.findAndRemoveClassNames([
      "tmap-" + this.enlargedMode,
      "tmap-has-" + this.enlargedMode + "-child"
    ]);
    
    if(this.enlargedMode === "fullscreen") {
      document[this.fsapi["_exitFullscreen"]]();
    }
    
    // reset
    this.enlargedMode = null;
    
  } else {
    
    if(!useHalfscreen && !this.fsapi) {
      this.dialogManager.open("fullscreenNotSupported");
      return;
    }

    this.enlargedMode = (this.isContainedInSidebar && useHalfscreen
                         ? "halfscreen"
                         : "fullscreen");
                         
    $tw.utils.addClass(this.parentDomNode, "tmap-" + this.enlargedMode);
      
    var pContainer = (this.isContainedInSidebar
                      ? this.sidebar
                      : utils.getFirstElementByClassName("tc-story-river"));
            
    $tw.utils.addClass(pContainer, "tmap-has-" + this.enlargedMode + "-child");        
    
    if(this.enlargedMode === "fullscreen") {
      document.documentElement[this.fsapi["_requestFullscreen"]](Element.ALLOW_KEYBOARD_INPUT);
    }
        
    this.notify("Activated " + this.enlargedMode + " mode");
    
    this.network.setOptions({ clickToUse: false });

  }
  
  this.handleResizeEvent();

};
   
MapWidget.prototype.handleGenerateWidget = function(event) {
  
  $tw.rootWidget.dispatchEvent({
    type: "tmap:tm-generate-widget",
    paramObject: { view: this.view.getLabel() }
  });
  
};

MapWidget.prototype.handleStorePositions = function(withNotify) {
  
  this.view.saveNodeData(this.network.getPositions());
  
  if(!this.view.isEnabled("physics_mode")) {
    // when not in physics mode, rebuild graph to prevent floating afterwards
    this.rebuildGraph();
  }
  
  if(withNotify) {
    this.notify("positions stored");
  }
  
};

MapWidget.prototype.handleEditFilters = function() {

  var pnf = utils.getPrettyFilter(this.view.getNodeFilter("expression"));
  var pef = utils.getPrettyFilter(this.view.getEdgeFilter("expression"));

  var param = {
    view: this.view.getLabel(),
    dialog: {
      preselects: {
        prettyNodeFilter: pnf,
        prettyEdgeFilter: pef 
      }
    }
  };
  
  this.dialogManager.open("editFilters", param, function(isConfirmed, outTObj) {
    if(isConfirmed) {
      this.view.setNodeFilter(utils.getField(outTObj, "prettyNodeFilter", pnf));
      this.view.setEdgeFilter(utils.getField(outTObj, "prettyEdgeFilter", pef));
    }
  });
    
};

/**
 * Called by vis when the graph has stabilized itself.
 * 
 * ATTENTION: never store positions in a view's map during stabilize
 * as this will affect other graphs positions and will cause recursion!
 * Storing positions inside vis' nodes is fine though
 */
MapWidget.prototype.handleVisStabilizedEvent = function(properties) {
  
  if(!this.hasNetworkStabilized) {
    this.hasNetworkStabilized = true;
    this.logger("log", "Network stabilized after " + properties.iterations + " iterations");
    this.view.setStabilizationIterations(properties.iterations);
    var isFloatingMode = this.view.isEnabled("physics_mode");

    this.network.storePositions();
    this.setNodesMoveable(this.graphData.nodesById, isFloatingMode);
        
    if(this.doFitAfterStabilize) {
      this.doFitAfterStabilize = false;
      this.fitGraph(1000, 1000);
    }
  }
  
};

/**
 * Zooms on a specific node in the graph
 * 
 * @param {Object} event - An object containing a `param` property
 *     that holds a tiddler reference/title.
 */
MapWidget.prototype.handleFocusNode = function(event) {
  this.network.focus(this.adapter.getId(event.param), {
    scale: 1.5,
    animation: true
  });
};

/**
 * A zombie widget is a widget that is removed from the dom tree
 * but still referenced or still partly executed -- I mean
 * otherwise you couldn't call this function, right?
 */
MapWidget.prototype.isZombieWidget = function() {
  return !document.body.contains(this.getContainer());
};

/**
 * This method allows us to specify after what time and for how long
 * the zoom-to-fit process should be executed for a graph.
 * 
 * @param {number} [delay=0] - How long to wait before starting to zoom.
 * @param {number} [duration=0] - After the delay, how long should it
 *     take for the graph to be zoomed.
 */
MapWidget.prototype.fitGraph = function(delay, duration) {
    
  // clear any existing fitting attempt
  window.clearTimeout(this.activeFitTimeout);
  
  var fit = function() {
        
    // happens when widget is removed after stabilize but before fit
    if(this.isZombieWidget()) return;
    
    // fixes #97
    this.network.redraw();
    
    this.network.fit({ // v4: formerly zoomExtent
      animation: {
        duration: duration || 0,
        easingFunction: "easeOutQuart"
      }
    });
    
  };
  
  this.activeFitTimeout = window.setTimeout(fit.bind(this), delay || 0);
  
}

/**
 * Spawns a dialog in which the user can specify node attributes.
 * Once the dialog is closed, the node is inserted into the current
 * view, unless the operation was cancelled.
 */
MapWidget.prototype.handleInsertNode = function(node) {
      
  this.dialogManager.open("getNodeTitle", null, function(isConfirmed, outTObj) {
    if(isConfirmed) {
      
      var title = utils.getText(outTObj);
      
      if(utils.tiddlerExists(title)) {
        
        if(utils.isMatch(title, this.view.getNodeFilter("compiled"))) {
          
          this.notify("Node already exists");
          return;
          
        } else {
          node = this.adapter.makeNode(title, node);
          this.view.addNodeToView(node);
        }
        
      } else {
      
        node.label = title;
        this.adapter.insertNode(node, {
          view: this.view,
          editNodeOnCreate: false
        });
      
      }
      
      this.preventFitAfterRebuild = true;
      
    }
  });
  
};

/**
 * Open the node editor to style the node.
 */
MapWidget.prototype.handleEditNode = function(node) {
    
  var tRef = $tw.tmap.indeces.tById[node.id];
  var tObj = utils.getTiddler(tRef);
  var globalDefaults = JSON.stringify(this.opt.config.vis);
  var localDefaults = this.view.getConfig("vis");
  var nodeStylesByTRef = this.adapter.getInheritedNodeStyles([ node.id ]);
  var groupStyles = JSON.stringify(nodeStylesByTRef[tRef]);
  var globalNodeStyle = JSON.stringify(utils.merge(
                          {},
                          { color: tObj.fields["color"] },
                          utils.parseJSON(tObj.fields["tmap.style"])));
  
  var viewLabel = this.view.getLabel();
  var rawNode = { id: node.id };
  // we do not used the cashed version since we need a new object
  var nodeData = this.view.getNodeData(node.id, true) || {};
  // we need to delete the positions so they are not reset when a user
  // resets the style…
  delete nodeData.x;
  delete nodeData.y;
  
  var param = {
    "view": viewLabel,
    "tiddler": tObj.fields.title,
    "tidColor": tObj.fields["color"],
    "tidIcon": tObj.fields[this.opt.field.nodeIcon]
               || tObj.fields["tmap.fa-icon"],
    dialog: {
      preselects: {
        "inherited-global-default-style": globalDefaults,
        "inherited-local-default-style": localDefaults,
        "inherited-group-styles": groupStyles,
        "global-node-style": globalNodeStyle,
        "local-node-style": JSON.stringify(nodeData)
      }
    }
  };

  this.dialogManager.open("editNode", param, function(isConfirmed, outTObj) {
    
    if(!isConfirmed) return;
    
    // save or remove global individual style
    var globalStyle = outTObj.fields["global-node-style"];
    utils.setField(tRef, "tmap.style", globalStyle || null);
    
    // save local individual style
    var style = utils.parseJSON(outTObj.fields["local-node-style"]);
    this.view.saveNodeStyle(node.id, style);
    
    this.preventFitAfterRebuild = true;
     
  });

};

/**
 * This handler is registered at and called by the vis network event
 * system.
 */
MapWidget.prototype.handleVisSingleClickEvent = function(properties) {
  
  if(utils.isTrue(this.opt.config.sys.singleClickMode)) {
    this.handleVisClickEvent(properties);
  }
  
};
  
/**
 * This handler is registered at and called by the vis network event
 * system.
 * 
 * @see
 *   - Coordinates not passed on click/tap events within the properties object
 *     https://github.com/almende/vis/issues/440
 * 
 * @properties a list of nodes and/or edges that correspond to the
 * click event.
 */
MapWidget.prototype.handleVisDoubleClickEvent = function(properties) {
  
  if(!properties.nodes.length && !properties.edges.length) { // clicked on an empty spot
    
    if(this.editorMode) {
      this.handleInsertNode(properties.pointer.canvas);
    }
    
  } else if(!utils.isTrue(this.opt.config.sys.singleClickMode)) {
    this.handleVisClickEvent(properties);
  }
  
};

MapWidget.prototype.handleVisClickEvent = function(properties) {
  
  if(properties.nodes.length) { // clicked on a node    
    
    this.openTiddlerWithId(properties.nodes[0]);
    
  } else if(properties.edges.length) { // clicked on an edge
    
    if(!this.editorMode) return;
    
    this.logger("debug", "Clicked on an Edge");
    
    var behaviour = this.opt.config.sys.edgeClickBehaviour;
    var type = new EdgeType(this.graphData.edgesById[properties.edges[0]].type);
    
    if(behaviour === "manager") {        
      $tw.rootWidget.dispatchEvent({
        type: "tmap:tm-manage-edge-types",
        paramObject: { type: type.getId() }
      });        
    }
  }

};

/**
 * Listener will be removed if the parent is not part of the dom anymore
 * 
 * @see
 *   - [TW5] Is there a destructor for widgets?
 *     https://groups.google.com/d/topic/tiddlywikidev/yuQB1KwlKx8/discussion
 *   - https://developer.mozilla.org/en-US/docs/Web/API/Node.contains
 */
MapWidget.prototype.handleResizeEvent = function(event) {
  
  if(this.isZombieWidget()) return;
  
  var height = this.getAttr("height");
  
  if(!height && this.isContainedInSidebar) {
  
    var canvasOffset = this.parentDomNode.getBoundingClientRect().top;
    var distanceBottom = parseInt(this.getAttr("bottom-spacing", 25));
    var calculatedHeight = window.innerHeight - canvasOffset;
    height = (calculatedHeight - distanceBottom) + "px";
  
  }
  
  this.parentDomNode.style["height"] = height || "300px";
  
  this.repaintGraph(); // redraw graph
  
};
  
/**
 * used to prevent nasty deletion as edges are not unselected when leaving vis
 */
MapWidget.prototype.handleClickEvent = function(event) {
  
  if(this.isZombieWidget() || !this.network) return;
  
  var element = document.elementFromPoint(event.clientX, event.clientY);
  if(!this.parentDomNode.contains(element)) { // clicked outside
    var selected = this.network.getSelection();
    if(selected.nodes.length || selected.edges.length) {
      this.logger("debug", "Clicked outside; deselecting nodes/edges");
      // upstream bug: this.network.unselectAll() doesn't work
      this.network.selectNodes([]); // deselect nodes and edges
      this.resetVisManipulationBar();
    }
  } else if(this.graphDomNode.contains(element)) {
    this.visNetworkDomNode.focus();
  }

};

/**
 * Fired by vis when the user click on the canvas with the right
 * mouse button. 
 */
MapWidget.prototype.handleVisRightClick = function(properties) {
  
  //~ var id = this.network.getNodeAt(properties.pointer.DOM);
  //~ if(id) {
    //~ alert("right" + id);
  //~ }
  
};

/**
 * Fired by vis when the user click on the canvas with the right
 * mouse button. 
 */
MapWidget.prototype.handleVisShowPopup = function(id) {
  
};

/**
 * Called by vis when the dragging of a node(s) has ended.
 * @param {Object} properties - A vis object containing event-related
 *     information.
 * @param {Array<Id>} properties.nodes - Array of ids of the nodes
 *     that were being dragged.
 */
MapWidget.prototype.handleVisDragEnd = function(properties) {
  
  if(properties.nodes.length) {
    
    var node = this.graphData.nodesById[properties.nodes[0]]; // v4: formerly nodeIds
    
    // only store positions if in floating mode
    if(!this.view.isEnabled("physics_mode")) { 
      
      // fix node again
      this.setNodesMoveable([ node ], false);
      
      var raster = parseInt(this.opt.config.sys.raster);
      if(raster) { // apply raster
        var pos = this.network.getPositions()[node.id];
        // only update x,y to prevent a lost update (allowedToMove stuff)
        this.graphData.nodes.update({
          id: node.id,
          x: pos.x - (pos.x % raster),
          y: pos.y - (pos.y % raster)
        });
      }
      
      // finally store positions
      this.handleStorePositions();
      
    }
  }
      
};

MapWidget.prototype.handleVisSelect = function(properties) {
  //
};

MapWidget.prototype.handleVisBeforeDrawing = function(context2d) {
  //utils.drawRaster(context2d, this.network.getScale(), this.network.getViewPosition());
};

MapWidget.prototype.handleVisLoading = function(params) {
  
  this.graphLoadingBarDomNode.style.display = "block";
  var text = "Loading " + ((params.iterations / params.total) * 100) + "%";
  this.graphLoadingBarDomNode.innerHTML = text;

};

MapWidget.prototype.handleVisLoadingDone = function(params) {
  this.graphLoadingBarDomNode.style.display = "none";
};

/**
 * Called by vis when a node is being dragged.
 * @param {Object} properties - A vis object containing event-related
 *     information.
 * @param {Array<Id>} properties.nodes - Array of ids of the nodes
 *     that are being dragged.
 */
MapWidget.prototype.handleVisDragStart = function(properties) {

  if(properties.nodes.length) {
    var node = this.graphData.nodesById[properties.nodes[0]];
    this.setNodesMoveable([ node ], true);
  }
};
 
/**
 * called from outside.
 */
MapWidget.prototype.destruct = function() {
  
  window.removeEventListener("resize", this.handleResizeEvent);
  window.removeEventListener("click", this.handleClickEvent);
  window.removeEventListener("click", this.handleFullScreenChange);
  
  if(this.network) { this.network.destroy(); }
  
};

/**
 * Opens the tiddler that corresponds to the given id either as
 * modal (when in fullscreen mode) or in the story river.
 */
MapWidget.prototype.openTiddlerWithId = function(id) {
  
  var tRef = $tw.tmap.indeces.tById[id];
  
  this.logger("debug", "Opening tiddler", tRef, "with id", id);
  
  if(this.enlargedMode === "fullscreen") {
    
    var draftTRef = this.wiki.findDraft(tRef);
    var wasInDraftAlready = !!draftTRef;
        
    if(!wasInDraftAlready) {
      
      var type = "tm-edit-tiddler";
      this.dispatchEvent({ type: type, tiddlerTitle: tRef });
      draftTRef = this.wiki.findDraft(tRef);
      
    }
        
    var args = {
      draftTRef: draftTRef
    };

    var name = "fullscreenTiddlerEditor";
    this.dialogManager.open(name, args, function(isConfirmed, outTObj) {
    
      if(isConfirmed) {
        
        var type = "tm-save-tiddler";
        this.dispatchEvent({ type: type, tiddlerTitle: draftTRef }); 
        
      } else if(!wasInDraftAlready) {
        
        var type = "tm-cancel-tiddler";
        this.dispatchEvent({ type: type, tiddlerTitle: draftTRef }); 
        
      }
      
      // in any case, remove the original tiddler from the river
      var type = "tm-close-tiddler";
      this.dispatchEvent({ type: type, tiddlerTitle: tRef }); 
      
    });
    
  } else {
    
    this.dispatchEvent({
      type: "tm-navigate", navigateTo: tRef
    }); 
    
  }
};
 
/**
 * The view holder is a tiddler that stores a references to the current
 * view. If the graph is not bound to a view by the user via an
 * attribute, the default view holder is used. Otherwise, a temporary
 * holder is created whose value is set to the view specified by the user.
 * This way, the graph is independent from view changes made in a
 * tiddlymap editor.
 * 
 * This function will only calculate a new reference to the holder
 * on first call (that is when no view holder is registered to "this".
 * 
 */
MapWidget.prototype.getViewHolderRef = function() {
  
  // the viewholder is never recalculated once it exists
  if(this.viewHolderRef) {
    return this.viewHolderRef;
  }
  
  this.logger("info", "Retrieving or generating the view holder reference");
  
  // if given, try to retrieve the viewHolderRef by specified attribute
  var viewName = this.getAttr("view");
  if(viewName) {
    
    this.logger("log", "User wants to bind view \"" + viewName + "\" to graph");
          
    var viewRef = this.opt.path.views + "/" + viewName;
    if(this.wiki.getTiddler(viewRef)) {
      
      // create a view holder that is exclusive for this graph
      
      var holderRef = this.opt.path.localHolders + "/" + utils.genUUID();
      this.logger("log", "Created an independent temporary view holder \"" + holderRef + "\"");
      
      // we do not use setView here because it would store and reload the view unnecessarily...
      this.wiki.addTiddler(new $tw.Tiddler({ 
        title: holderRef,
        text: viewRef
      }));
      
      this.logger("log", "View \"" + viewRef + "\" inserted into independend holder");
      
    } else {
      this.logger("log", "View \"" + viewName + "\" does not exist");
    }
    
  }
  
  if(typeof holderRef === "undefined") {
    this.logger("log", "Using default (global) view holder");
    var holderRef =  this.opt.ref.defaultViewHolder;
  }
  
  return holderRef;
  
};

/**
 * This function will switch the current view reference of the
 * view holder. If no view is specified, the current view is
 * simply updated.
 * 
 * @param {ViewAbstraction|string} [view] – A reference to the view.
 * @param {string} [viewHolderRef] – A reference to the view holder.
 */
MapWidget.prototype.setView = function(view, viewHolderRef) {
  
  if(view) {
    
    var viewLabel = new ViewAbstraction(view).getLabel();
    viewHolderRef = viewHolderRef || this.viewHolderRef;
    this.logger("info", "Inserting view '"
                        + viewLabel
                        + "' into holder '"
                        + viewHolderRef
                        + "'");
    this.wiki.addTiddler(new $tw.Tiddler({ 
      title : viewHolderRef,
      text : viewLabel
    }));
    
  }
  
  // register the new value; no need to update the adapter as this is done during refresh
  this.view = this.getView(true);
};

/**
 * This function will return a view abstraction that is based on the
 * view specified in the view holder of this graph.
 * 
 * @param {boolean} isRebuild - Retrieve the view reference again
 *     from the holder and recreate the view abstraction object.
 * @return {ViewAbstraction} the view
 */
MapWidget.prototype.getView = function(isRebuild) {
  
  if(!isRebuild && this.view) {
    return this.view;
  }
  
  var viewHolderRef = this.getViewHolderRef();
                     
  // transform into view object
  var view = new ViewAbstraction(utils.getText(viewHolderRef));
  
  // if no view has ever been loaded and we are in a map editor
  // and there is a default view then use this one; otherwise
  // use the view that was stored in the holder before.
  //~ var defaultView = this.opt.config.sys.defaultView;
  //~ var view = new ViewAbstraction(!this.view && defaultView && this.editorMode
                                 //~ ? defaultView
                                 //~ : utils.getText(viewHolderRef));
  
  this.logger("info", "Retrieved view \"" + view.getLabel() + "\" from holder \"" + viewHolderRef + "\"");
  
  if(view.exists()) {
    return view;
  } else {
    this.logger("log", "Warning: View \"" + view.getLabel() + "\" doesn't exist. Default is used instead.");
    return new ViewAbstraction("Default");
  }
  
};

/**
 * using an existing dataset to reflect the changes between
 * two node sets.
 * 
 * @param {Hashmap<id, Node>} lt1 - Lookup table that contains the
 *     *new* set of nodes.
 * @param {Hashmap<id, Node>} lt2 - lookup table that holds the
 *     *old* set of nodes.
 * @param {vis.DataSet} [ds] - The dataset to be updated
 */
MapWidget.prototype.getRefreshedDataSet = function(ltNew, lTOld, ds) {
  
  if(!ds) {
    return new vis.DataSet(utils.convert(ltNew, "array"));
  }
  
  // first remove
  var removes = [];
  for(var id in lTOld) {
    if(!ltNew[id]) {
      removes.push(id);
    }
  }
  ds.remove(removes);
  
  // get all nodes that remain after the remove operation
  var existing = ds.get({ returnType: "Object" });
  
  var updates = [];
  for(var id in ltNew) {
    var update = ltNew[id];
    
    // see https://github.com/almende/vis/issues/1226
    if(existing[id]) { // node already exists in graph
      for(var prop in existing[id]) {
        // some stuff like x and y should remain
        if(prop === "x" || prop === "y") continue;
        // if not contained in update, explicitly set to null to
        // override old properties

        if(update[prop] === undefined) {
          update[prop] = null;
        }
      }
    }
    
    // now push
    updates.push(update);
  }
  ds.update(updates);
  
  return ds;
  
};

/**
 * Repaint this graph instance if
 * 0. The network object exists
 * 1. fullscreen is not possible at all
 * 2. no part of the document is running in fullscreen
 *    (halfscreen does not count)
 * 3. this graph instance is currently running fullscreen.
 */
MapWidget.prototype.repaintGraph = function() {
  
  if(this.network
     && (
       !this.fsapi
       || !document[this.fsapi["_fullscreenElement"]] 
       || this.enlargedMode
     )) {
  
    this.logger("info", "Repainting the whole graph");
  
    this.network.redraw();
    this.fitGraph(0, 1000);
    
  }
  
};
  
/**
 * If a button is enabled it means it is displayed on the graph canvas.
 * 
 * @param {string} name - The name of the button to enabled. Has to
 *     correspond with the css button name.
 * @param {boolean} enable - True if the button should be visible,
 *     false otherwise.
 */ 
MapWidget.prototype.setGraphButtonEnabled = function(name, enable) {
  
  var className = "vis-button" + " " + "tmap-" + name;
  var b = utils.getFirstElementByClassName(className, this.parentDomNode);
  $tw.utils.toggleClass(b, "tmap-button-enabled", enable);
  
}; 

MapWidget.prototype.dialogPostProcessor = function() {
    
  this.network.selectNodes([]);
  this.resetVisManipulationBar();

}; 

/**
 * Allow the given nodes to be moveable.
 * 
 * @param {vis.DataSet} nodes - The nodes for which to allow any
 *     movement (either by physics or by dragging).
 * @param {boolean} isEnabled - True, if the nodes are allowed to
 *     move or be moved.
 */    
MapWidget.prototype.setNodesMoveable = function(nodes, isMoveable) {

  this.network.storePositions();

  var updates = [];
  var keys = Object.keys(nodes);
  for(var i = keys.length; i--;) {
    
    var id = nodes[keys[i]].id;
    
    var update = {
      id: id,
      fixed: {  // v4: formerly allowToMoveX, allowToMoveY
        x: !isMoveable,
        y: !isMoveable
      }
    };
    
    updates.push(update);
    
  }

  this.graphData.nodes.update(updates);

};

/**
 * This function will create the dom elements for all tiddlymap-vis
 * buttons and register the event listeners.
 * 
 * @param {Object<string, function>} buttonEvents - The label of the
 *     button that is used as css class and the click handler.
 */
MapWidget.prototype.addGraphButtons = function(buttonEvents) {
  
  // v4: formerly network-frame
  var parent = utils.getFirstElementByClassName("vis-navigation", this.parentDomNode);
  
  for(var name in buttonEvents) {
    var div = document.createElement("div");
    div.className = "vis-button " + " " + "tmap-" + name;
    div.addEventListener("click", buttonEvents[name].bind(this), false);
    parent.appendChild(div);
    
    this.setGraphButtonEnabled(name, true);
    
  }
  
};

/*** TO AVOID STRANGE LIB ERRORS FROM BUBBLING UP *****************/

if($tw.boot.tasks.trapErrors) {
  
  var defaultHandler = window.onerror;
  window.onerror = function(errorMsg, url, lineNumber) {
    if(errorMsg.indexOf("NS_ERROR_NOT_AVAILABLE") !== -1
       && url == "$:/plugins/felixhayashi/vis/vis.js") {
      console.error("Strange firefox related vis.js error (see #125)",
                    arguments);
    } else if(errorMsg.indexOf("Permission denied to access property") !== -1) {
      console.error("Strange firefox related vis.js error (see #163)",
                    arguments);
    } else if(defaultHandler) {
      defaultHandler.apply(this, arguments);
    }
  }
  
}

/*** Exports *******************************************************/

exports.tiddlymap = MapWidget;

  
})();

