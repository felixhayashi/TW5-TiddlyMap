/*\

title: $:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function() {

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";

/**************************** IMPORTS ****************************/

var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;
var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/***************************** CODE ******************************/

/**
 * This class abstracts the various pieces that together make up the
 * view such as map, edge filter, node filter, config etc.
 * If {@code isCreate} is not specified, the viewAbstraction will only
 * represent the view and not create it or any missing part of it.
 * 
 * @param {string|ViewAbstraction|Tiddler} view - The view
 * @param {boolean} [isCreate] - True if the view should be created and override
 *     any existing view, false otherwise.
 * @constructor
 */
var ViewAbstraction = function(view, isCreate, protoView) {

  // register shortcuts and aliases
  this.opt = $tw.tmap.opt;
  this.logger = $tw.tmap.logger;

  if(view instanceof ViewAbstraction) {
    // bounce back the object we received
    return view;
  }

  // start building paths
  this._registerPaths(view, isCreate);
        
  if(isCreate) {
    this._createView(protoView);
  } else if(!this.exists()) { // no valid config path
    return; // skip initialization
  }
  
  // If a view is already up to date because the change
  // was introduced through the view instance itself then
  // a flag is set to avoid that the cache is rebuild in the next
  // refresh cycle.
  this._ignoreOnNextRebuild = utils.getDataMap();
  
  // force complete rebuild
  this.rebuildCache();
  
};

ViewAbstraction.prototype._registerPaths = function(view, isCreate) {
  
  // attention: path is only allowed to have direct child properties
  // otherwise the rebuild mechanism would need a change.
  this.path = this.path || utils.getDataMap(); 
  this.path.config = this._getConfigPath(view, isCreate);
  
  if(this.path.config) {
    // the view's store (=local store) for node properties
    this.path.map =        this.path.config + "/map";
    // filter stores
    this.path.nodeFilter = this.path.config + "/filter/nodes";
    this.path.edgeFilter = this.path.config + "/filter/edges";
  }
  
};

/**
 * Will try to translate the constructor param into the config path.
 * 
 * @private
 * @param {*} view - The constructor param to abstract or create the view.
 * @param {boolean} isCreate - If true and the supplied view did not
 *     result in a proper path, we will create one.
 * @result {string|undefined} The path or undefined if translation failed.
 */
ViewAbstraction.prototype._getConfigPath = function(view, isCreate) {

  if(view instanceof $tw.Tiddler) { // is a tiddler object
    return view.fields.title;
  }
  
  if(typeof view === "string") {
      
    // remove prefix and slash
    view = utils.getWithoutPrefix(view, this.opt.path.views + "/");

    if(view && !utils.hasSubString(view, "/")) {
      // a valid label must not contain any slashes
      return this.opt.path.views + "/" + view; // add prefix (again)
    }
  }
  
  if(isCreate) {
    return $tw.wiki.generateNewTitle(this.opt.path.views + "/My view");
  }
  
};

/**
 * A hashmap of all paths (tiddler titles) that make up this view.
 * 
 * @return {Hashmap} The paths.
 */
ViewAbstraction.prototype.getPaths = function() {
  return this.path;
};

/**
 * Will create the config tiddler which means that the view will start
 * existing.
 * 
 * @private
 */
ViewAbstraction.prototype._createView = function(protoView) {
  
  // destroy any former view that existed in this path
  if(this.exists()) { // I am alive!
    this.destroy(); // ...now die!
  }
  
  protoView = new ViewAbstraction(protoView);
  if(protoView.exists()) {
    var results = utils.changePrefix(protoView.getRoot(),
                                     this.path.config,
                                     true, // allow override
                                     false); // only copy
  }
    
  // create new view
  var fields = {};
  fields.title = this.path.config;
  fields[this.opt.field.viewMarker] = true;
  // an id is actually not used for view in TM, I just reserve it…
  fields.id = utils.genUUID();
  
  $tw.wiki.addTiddler(new $tw.Tiddler(
    utils.getTiddler(this.path.config), // in case we cloned the view
    fields
  ));
  
};

ViewAbstraction.prototype.isLocked = function() {
  
  return $tw.wiki.isShadowTiddler(this.path.config);
  
};

/**
 * This method will use the keys provided in `changedTiddlers` to
 * decide whether or not to update some parts of the cache.
 * 
 * @see ViewAbstraction#rebuildCache
 * 
 * @param {Hashmap<TiddlerReference, *>} changedTiddlers - A list of
 *     tiddlers that trigger a rebuild unless they are already up-to-date.
 * @return {Array<TiddlerReference> - A list of tiddlers that got updated.
 */
ViewAbstraction.prototype.refresh = function(changedTiddlers) {
  
  return this.rebuildCache(changedTiddlers);
  
}

/**
 * This method will rebuild the cache based on the references provided
 * via `components`. If a part (component) of the cache is marked as
 * being already up-to-date, then it is skipped. 
 * 
 * A special case is when the view's config tiddler changed
 * (corresponding to `this.path.config`). Since config changes often
 * affect the whole view's thinking, it makes sense to blindly
 * do a full rebuild! Yet, full rebuild always ignores any component
 * that is internally listet as up-to-date.
 * 
 * @param {Array<TiddlerReference>} components - A list of
 *     tiddler references that refer to components managed by the view.
 * @param {boolean} isForceRebuild - Do not selectively rebuild the
 *     cache but rebuild everything no matter what.
 * @return {Object<TiddlerReference, *>} - A list of tiddlers that got
 *     updated.
 */
ViewAbstraction.prototype.rebuildCache = function(changedTiddlers) {
  
  if(!this.exists()) return [];

  var isForceRebuild = (!changedTiddlers
                        || changedTiddlers[this.path.config]);
  if(isForceRebuild) {
    this.logger("debug", "Full reload of view config");
  }

  // dereference the ignore list as it might get freshly updated
  // when some setters are called during this rebuild phase.
  var ignoredOnCurRebuild = this._ignoreOnNextRebuild;
  this._ignoreOnNextRebuild = utils.getDataMap();
  
  // this object will be used as return value; it indicates, what
  // view components have changed.
  var modified = [];
  
  for(var component in this.path) {
    var componentPath = this.path[component];
    
    if(isForceRebuild || changedTiddlers[componentPath]) {
      // either we are forced to rebuild or the component has changed
      modified.push(component);
    } else {
      continue;
    }
    
    if(!isForceRebuild && ignoredOnCurRebuild[component]) {
      // no need to refresh, as as we are already up to date
      continue;
    }
      
    if(component === "config") {
      this.config = this.getConfig(null, true);
      
    } else if(component === "map") {
      this.nodeData = this.getNodeData(null, true);
      
    } else if(component === "nodeFilter") {
      this.nodeFilter = this.getNodeFilter(null, true);
      
    } else if(component === "edgeFilter") {
      this.edgeFilter = this.getEdgeFilter(null, true);
              
    }
  }
  
  return modified;
  
};

/**
 * A view exists if the constructor parameter was successfully
 * translated into a {@link TiddlerReference} that corresponds to
 * an existing view tiddler in the store.
 * 
 * @return {boolean} True if it exists, false otherwise.
 */
ViewAbstraction.prototype.exists = function() {
  return utils.tiddlerExists(this.path.config);
};

/**
 * The path to the config tiddler that represents the view.
 * 
 * @return {TiddlerReference} The view path.
 */
ViewAbstraction.prototype.getRoot = function() {
  return this.path.config;
};

/**
 * Returns this view's creation date.
 * 
 * @param {boolean} [asString] True if the returned value should be
 *     a string in any case.
 * @return {string|object|undefined} The creation date in the specified
 *     output format.
 */
ViewAbstraction.prototype.getCreationDate = function(asString) {
  
  if(!this.exists()) return;
  
  var val = $tw.wiki.getTiddler(this.path.config).fields["created"];
  if(asString) { 
    // note: th will be translated as well!
    return (val instanceof Date
            ? $tw.utils.formatDateString(val, "DDth MMM YYYY")
            : "");
  }
  
  return val;
  
};

/**
 * The label of the view (which is basically the roots basename).
 * 
 * @return {string} The label (name) of the view.
 */
ViewAbstraction.prototype.getLabel = function() {
    
  if(this.exists()) {
    return utils.getBasename(this.path.config);
  }
  
};

/**
 * Method to remove all tiddlers prefixed with the views root. This
 * will make the view non-existent.
 */
ViewAbstraction.prototype.destroy = function() {
  
  if(!this.exists()) return;
  
  // delete the view and all tiddlers stored in its path (map, edge-filter etc.)
  var filter = "[prefix[" + this.getRoot() + "]]";
  utils.deleteTiddlers(utils.getMatches(filter));
  
  this.path = utils.getDataMap();
  
  // rebuild all components to make sure no data remains in this
  // abstraction instance
  this.rebuildCache();
  
};

/**
 * 
 */
ViewAbstraction.prototype.getReferences = function() {
  
  var filter = "[regexp:text[<\\$tiddlymap.*?view=." + this.getLabel() + "..*?>]]";
  return utils.getMatches(filter);
  
};

ViewAbstraction.prototype.rename = function(newLabel) {

  if(!this.exists() || typeof newLabel !== "string") return false;
    
  if(utils.inArray("/", newLabel)) {
    $tw.tmap.notify("A view name must not contain any \"/\"");
    return false;
  }
  
  // keep a reference to the old label before we change it
  var oldLabel = this.getLabel();
  
  // start the renaming
  var newRoot = this.opt.path.views + "/" + newLabel;
  var oldRoot = this.getRoot();
  var results = utils.changePrefix(oldRoot, newRoot, true);
    
  this._registerPaths(newLabel);
  this.rebuildCache();
  
  // iterate over all local node-types.
  var loNTy = $tw.tmap.indeces.loNTy;
  for(var i = loNTy.length; i--;) {
    var type = loNTy[i];
    if(type.view === oldLabel) {
      type.view = newLabel;
      type.save();
    }
  }
  
};

/**
 * All configurations that are toggled via checkboxes to have a value
 * either `true` or `false` can be accessed via this method.
 * 
 * @param {string} name - The configs name without the `_config` prefix.
 * @return {boolean} True if the configuration is enabled, false otherwise.
 */
ViewAbstraction.prototype.isEnabled = function(name) {
  
  return utils.isTrue(this.getConfig(name), false);
  
};

/**
 * Returns a configuration value relating to the given name. If no name
 * is given, an object with all configurations is returned.
 * 
 * @param {string} [name] - Instead of all configurations being returned,
 *     only the configuration named name is returned. The initial "config."
 *     may be omitted.
 * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
 * @result {string|Object} If `type` is not specified an object containing
 *     all configurations is returned, otherwise a single value will be returned.
 */
ViewAbstraction.prototype.getConfig = function(name, isRebuild, defValue) {
  
  if(!this.exists()) {
    var config = utils.getDataMap();
  } else if(!isRebuild && this.config) {
    var config = this.config;
  } else {
    var fields = $tw.wiki.getTiddler(this.path.config).fields;
    var config = utils.getPropertiesByPrefix(fields, "config.");
  }
  
  // TODO use regex to add "config."
  return (name
          ? config[(utils.startsWith(name, "config.")
                   ? name
                   : "config." + name)]
          : config);
  
};

/**
 * The returned value suggests a maximum number of iterations before
 * vis displays the graph. It is related to the previous number of
 * iterations the network needed to stabilize.
 * 
 * @return {number} The suggested number of iterations.
 */
ViewAbstraction.prototype.getStabilizationIterations = function() {
  
  return (this.stabIterations ? this.stabIterations : 1000);
  
};

/**
 * 
 */
ViewAbstraction.prototype.setStabilizationIterations = function(i) {
  
};


/**
 * If the active layout is set to *hierarchical*, this function will
 * return all edges that define the hierarchical order of this view.
 * If the layout is not set to *hierarchical*, an empty array is
 * returned.
 * 
 * @return {Array<string>} A list of edge labels of edges that define
 *     the hierarchy.
 */
ViewAbstraction.prototype.getHierarchyEdgeTypes = function() {
  
  if(this.getConfig("layout.active") !== "hierarchical") return [];
  
  var orderByEdges = utils.getPropertiesByPrefix(this.getConfig(), "config.layout.hierarchical.order-by-", true);
  
  var labels = utils.getDataMap();
  for(var id in orderByEdges) {
    if(orderByEdges[id] === "true") {
      var tObj = utils.getTiddler($tw.tmap.indeces.tById[id]);
      if(tObj) {
        labels[utils.getBasename(tObj.fields.title)] = true;
      }
    }
  }
        
  return labels;
  
};

/**
 * 
 */
ViewAbstraction.prototype.setConfig = function() {
  
  if(arguments[0] == null) return; // null or undefined
  
  if(arguments.length === 1 && typeof arguments[0] === "object") {
    
    for(var prop in arguments[0]) {
      this.setConfig(prop, arguments[0][prop]);
    }
    
  } else if(arguments.length === 2 && typeof arguments[0] === "string") {
    
    var prop = utils.getWithoutPrefix(arguments[0], "config.");
    var val = arguments[1];
    
    if(val === undefined) {
      return;
    }
    
    if(val === null) {
      this.logger("debug", "Removing config", prop);
      delete this.config["config."+prop];
    } else {
      if(prop === "edge_type_namespace" && typeof val === "string" && val.length) {
        // if the user left out the colon, we will add it!
        val = val.replace(/([^:])$/, "$1:");
      }
    }
    
    this.logger("log", "Setting config", prop, val);
    this.config["config."+prop] = val;

    
  } else { // not allowed
    return;
  }
  
  // save
  $tw.wiki.addTiddler(new $tw.Tiddler(
    $tw.wiki.getTiddler(this.path.config), this.config
  ));

  this._ignoreOnNextRebuild["config"] = true;
  
};

ViewAbstraction.prototype.isExplicitNode = function(node) {
  
  var regex = $tw.utils.escapeRegExp(this._getAddNodeFilterPart(node));
  return this.getNodeFilter("expression").match(regex);
             
};

ViewAbstraction.prototype.isLiveView = function() {
  
  return (this.getLabel() === this.opt.misc.liveViewLabel);
  
};

/**
 * Attention: Never remove the node data (i.e. style and positions)
 * from the node-data store. This will be done by a garbage collector
 * – @TODO: implement garbage collector.
 */
ViewAbstraction.prototype.removeNodeFromFilter = function(node) {
    
  if(!this.isExplicitNode(node)) return false;
    
  var curExpr = this.getNodeFilter("expression");
  var newFilter = curExpr.replace(this._getAddNodeFilterPart(node), "");
                   
  this.setNodeFilter(newFilter);
  return true;
  
};

ViewAbstraction.prototype._getAddNodeFilterPart = function(node) {
  
  if(!node) { throw "Supplied param is not a node!"; }
  
  var id = (typeof node === "object" ? node.id : node);
  return "[field:tmap.id[" + id + "]]";
  
};

/**
 * Sets and rebuilds the node filter according to the expression provided.
 * 
 * @param {string} expr - A tiddlywiki filter expression.
 */
ViewAbstraction.prototype.setNodeFilter = function(expr, force) {
  
  if(!this.exists()) return;
      
  expr = expr.replace(/[\n\r]/g, " ");
  
  if(this.getNodeFilter.expression === expr) { // already up to date;
    // This check is critical to prevent recursion!
    return;
  }
  
  if(this.isLiveView() && !force) {
    $tw.tmap.notify("It is forbidden to change the node filter of the live view!");
    return;
  }
      
  utils.setField(this.path.nodeFilter, "filter", expr);
  
  this.logger("debug","Node filter set to", expr);

  // rebuild filter now and prevent another rebuild at refresh
  this.nodeFilter = this.getNodeFilter(null, true);
  
  this._ignoreOnNextRebuild["nodeFilter"] = true;
  
};

ViewAbstraction.prototype.setEdgeFilter = function(expr) {
  
  if(!this.exists()) return;
  
  expr = expr.replace(/[\n\r]/g, " ");
  
  if(this.getEdgeFilter.expression === expr) { // already up to date
    // This check is critical to prevent recursion!
    return;
  }
  
  utils.setField(this.path.edgeFilter, "filter", expr);
  
  this.logger("debug","Edge filter set to", expr);

  // rebuild filter now and prevent another rebuild at refresh
  this.edgeFilter = this.getEdgeFilter(null, true);
  
  // why should I ever want to ignore the view filter???
  this._ignoreOnNextRebuild["edgeFilter"] = true;
  
}; 

/**
 * Method to append a filter part to the current filter (*or*-style).
 * 
 * @param {string} A tiddlywiki filter expression.
 */
ViewAbstraction.prototype.appendToNodeFilter = function(filter) {
  
  var filter = this.getNodeFilter("expression") + " " + filter;
  this.setNodeFilter(filter);
  
  return true;
  
};

ViewAbstraction.prototype.addNodeToView = function(node) {
   
  if(this.isExplicitNode(node)) { // already in filter
    return;
  }
  
  this.appendToNodeFilter(this._getAddNodeFilterPart(node));
  this.saveNodePosition(node);
  
};

/**
 * Method will return a tiddlywiki edge filter that is used to
 * decide which edge types are displayed by the graph.
 * 
 * @param {("expression"|"compiled")} [type] - Use this param to control the output.
 * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
 * @result {TiddlyWikiFilter|Object} If `type` is not specified an object containing
 *     both types as properties is returned.
 *     Note: If the view doesn't exist, the filter will be empty and not match anything.
 */
ViewAbstraction.prototype.getEdgeFilter = function(type, isRebuild) {
  
  if(!isRebuild && this.edgeFilter) {
    
    var filter = this.edgeFilter;
    
  } else {
    
    var filter = utils.getDataMap();

    var tObj = $tw.wiki.getTiddler(this.path.edgeFilter);
    filter.expression = (tObj && tObj.fields.filter
                         ? tObj.fields.filter
                         : this.opt.filter.defaultEdgeFilter);
    
    filter.compiled = $tw.wiki.compileFilter(filter.expression);
    
  }
    
  return (type ? filter[type] : filter);
  
};

/**
 * Method will return a tiddlywiki node filter that is used to
 * decide which nodes are displayed by the graph.
 * 
 * @param {("expression"|"compiled")} [type] - Use this param to control the output.
 * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
 * @result {TiddlyWikiFilter|Object} If `type` is not specified an object containing
 *     both types as properties is returned.
 *     Note: If the view doesn't exist, the filter will be empty and not match anything.
 */
ViewAbstraction.prototype.getNodeFilter = function(type, isRebuild) {

  if(!isRebuild && this.nodeFilter) {
    
    var filter = this.nodeFilter;
    
  } else {
    
    var filter = utils.getDataMap();
    var tObj = $tw.wiki.getTiddler(this.path.nodeFilter);
    filter.expression = (tObj && tObj.fields.filter ? tObj.fields.filter : "");
    filter.compiled = $tw.wiki.compileFilter(filter.expression);
    
  }

  return (type ? filter[type] : filter);

};

/**
 * This method will return the node data stored in the view.
 * 
 * @todo When to delete obsolete data?
 * 
 * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
 * @result {Hashmap<Id, Object>} A Hashmap with node data.
 *     Note: If the view doesn't exist, the hashmap will be empty.
 */
ViewAbstraction.prototype.getNodeData = function(id, isRebuild) {
  
  var data = (!isRebuild && this.nodeData
              ? this.nodeData
              : utils.parseFieldData(this.path.map, "text", {}));
              
  return (id ? data[id] : data);
  
};

ViewAbstraction.prototype.isEqual = function(view) {
  
  var view = new ViewAbstraction(view);
  return (this.getRoot() === view.getRoot());
  
};



/**
 * This function will merge the given data in the view's node store.
 * 
 * If two arguments are provided, the first parameter is assumed
 * to be a node id and the second to be the data object. The data
 * will extend the existing data. If data is not an object, it is
 * assumed to be a delete directive and consequently the node data
 * in the store will be deleted.
 * 
 * Otherwise, if a single object parameter is provided, it is regarded
 * as a node collection and the whole object is used to extend the store.
 * 
 * @TODO I need to delete data of nodes that are not in view anymore
 */
ViewAbstraction.prototype.saveNodeData = function() {
  
  if(!this.exists()) return;
  
  var args = arguments;
  var data = this.getNodeData();
  
  if(args.length === 2 && typeof args[0] === "string") {
    
    if(typeof args[1] === "object") {
      if(args[1] === null) {
        // remember – in js null is an object :D
        // we use null as a signal for deletion of the item
        delete data[args[0]];
      } else {
        data[args[0]] = $tw.utils.extend(data[args[0]] || {}, args[1]);
      }
    }
    
  } else if(args.length === 1 && typeof args[0] === "object") {
    
    $tw.tmap.logger("log", "Storing data in", this.path.map);
    
    $tw.utils.extend(data, args[0]);
        
  } else {
    return;
  }
  
  utils.writeFieldData(this.path.map, "text", data);
  
  // cache new values and prevent rebuild at refresh
  this.nodeData = data;
  this._ignoreOnNextRebuild["map"] = true;
 
};

ViewAbstraction.prototype.saveNodePosition = function(node) {
    
  if(node.id && node.x && node.y) {
    this.saveNodeData(node.id, { x: node.x, y: node.y });
  }
  
};

ViewAbstraction.prototype.saveNodeStyle = function(id, style) {
  
  if(!this.exists()) return;
  
  var data = this.getNodeData()[id];
  if(!data) return;
  
  // delete all previous properties, except positions
  for(var p in data) {
    if(p !== "x" && p !== "y") delete data[p];
  }
  
  // save new style
  this.saveNodeData(id, style);
 
};

// !! EXPORT !!
exports.ViewAbstraction = ViewAbstraction;
// !! EXPORT !!#
  
})();