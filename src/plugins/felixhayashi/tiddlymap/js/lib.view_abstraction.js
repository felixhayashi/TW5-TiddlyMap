/*\

title: $:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports.ViewAbstraction = ViewAbstraction;

/*** Imports *******************************************************/

var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;
var utils    = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/*** Code **********************************************************/

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
function ViewAbstraction(view, options) {
  
  options = options || {};

  // register shortcuts and aliases
  this._edgeTypePath = $tm.path.edgeTypes;

  if(view instanceof ViewAbstraction) {
    // bounce back the object we received
    return view;
  }

  // start building paths
  this._registerPaths(view, options.isCreate);
        
  if(options.isCreate) {
    
    this._createView(options);
    
  } else if(!this.exists()) { // no valid config path
    
    // if the view doesn't exist, then we return a dummy object
    // whose sole purpose is to tell the world that this
    // view doesn't exist.
    return { exists: function() {  return false; } };
    
  }
    
  // force complete rebuild
  this.rebuildCache();
  
};

/**
 * If a ViewAbstraction instance has been modified and changes
 * have been persisted, then the next refresh cycle would trigger
 * a rebuild of the cache since tiddlers related to this view
 * changed. To avoid this, all functions that modify the state
 * of this view related to cached properties need to set a flag
 * in this variable. This flag prevents a rebuild in the next
 * refresh cycle.
 *
 * NOTE: This is done for mere performance reasons, if some
 * function is implemented without setting this flag to true
 * at the end, it doesn't real cause trouble.
 * 
 */
ViewAbstraction.prototype._noNeedToRebuildCache = false;

/**
 * 
 */
ViewAbstraction.prototype._registerPaths = function(view, isCreate) {
  
  // attention: To ensure that the refresh mechanism detects changes,
  // comp is only allowed to have direct child properties
  this.comp = this.comp || utils.makeHashMap(); 
  this.comp.config = this._getConfigPath(view, isCreate);
  
  // the view's store (=local store) for node properties
  this.comp.map = this.comp.config + "/map";
  
  // filter stores
  this.comp.nodeFilter = this.comp.config + "/filter/nodes";
  this.comp.edgeTypeFilter = this.comp.config + "/filter/edges";
  
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
    view = utils.getWithoutPrefix(view, $tm.path.views + "/");

    if(view && !utils.hasSubString(view, "/")) {
      // a valid label must not contain any slashes
      return $tm.path.views + "/" + view; // add prefix (again)
    }
  }
  
  if(isCreate) {
    var t = $tm.path.views + "/" + utils.getRandomLabel({ plural: true });
    return $tw.wiki.generateNewTitle(t);
  }
  
};

/**
 * A hashmap of all paths (tiddler titles) that make up this view.
 * 
 * @return {Hashmap} The paths.
 */
ViewAbstraction.prototype.getPaths = function() {
  
  return this.comp;
  
};

/**
 * Will create the config tiddler which means that the view will
 * start to exist.
 * 
 * @private
 */
ViewAbstraction.prototype._createView = function(options) {
  
  // destroy any former view that existed in this path
  if(this.exists()) {
    
    if(!options.isForce) return;
    
    this.destroy();
  }
  
  var protoView = new ViewAbstraction(options.protoView);
  if(protoView.exists()) {
    var results = utils.cp(protoView.getRoot(), this.comp.config, true);
  }
    
  // create new view
  var fields = {};
  fields.title = this.comp.config;
  
  if(!options.isHidden) {
    fields[$tm.field.viewMarker] = true;
  }
  
  // an id is actually not used for view in TM, I just reserve it…
  fields.id = utils.genUUID();
  
  $tw.wiki.addTiddler(new $tw.Tiddler(
    utils.getTiddler(this.comp.config), // in case we cloned the view
    fields
  ));
  
  this.setEdgeTypeFilter($tm.filter.defaultEdgeTypeFilter);
    
};

ViewAbstraction.prototype.isLocked = function() {
  
  return $tw.wiki.isShadowTiddler(this.comp.config);
  
};

/**
 * 
 * @see ViewAbstraction#rebuildCache
 * 
 * @return {boolean} True if the instance has updated itself
 */
ViewAbstraction.prototype.update = function(updates) {
  
  var changedTiddlers = updates.changedTiddlers;
  
  if(updates[$tm.path.edgeTypes]
     || utils.hasKeyWithPrefix(changedTiddlers, this.comp.config)) {
    
    this.rebuildCache();
    
    return true;
    
  }
  
};

/**
 * This method will rebuild the cache.
 */
ViewAbstraction.prototype.rebuildCache = function(isForce) {
  
  if(!isForce && this._noNeedToRebuildCache) {
    this._noNeedToRebuildCache = false;
    return;
  }
  
  this.config = this.getConfig(null, true);
  this.nodeData = this.getNodeData(null, true);
  this.nodeFilter = this.getNodeFilter(null, true);
  this.edgeTypeFilter = this.getEdgeTypeFilter(null, true);
  
};

/**
 * clones the tiddler denoted via tRef and uses it as placeholder
 * for this view when a widget using this view is displayed in
 * static mode
 */
ViewAbstraction.prototype.addPlaceholder = function(tRef) {
  
  utils.cp(tRef, this.getRoot() + "/snapshot", true);
  
}

/**
 * A view exists if the constructor parameter was successfully
 * translated into a {@link TiddlerReference} that corresponds to
 * an existing view tiddler in the store.
 * 
 * @return {boolean} True if it exists, false otherwise.
 */
ViewAbstraction.prototype.exists = function() {
  return utils.tiddlerExists(this.comp.config);
};

/**
 * The path to the config tiddler that represents the view.
 * 
 * @return {TiddlerReference} The view path.
 */
ViewAbstraction.prototype.getRoot = function() {
  return this.comp.config;
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
    
  var val = $tw.wiki.getTiddler(this.comp.config).fields["created"];
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
    
  return utils.getBasename(this.comp.config);
  
};

/**
 * Method to remove all tiddlers prefixed with the views root. This
 * will make the view non-existent.
 * 
 * ATTENTION: Do not use the object anymore after you called
 * this function!
 */
ViewAbstraction.prototype.destroy = function() {
  
  // delete the view and all tiddlers stored in its path (map, edge-filter etc.)
  var filter = "[prefix[" + this.getRoot() + "]]";
  utils.deleteTiddlers(utils.getMatches(filter));
    
};

/**
 * 
 */
ViewAbstraction.prototype.getOccurrences = function() {
  
  var filter = "[regexp:text[<\\$(tiddlymap|tmap).*?view=."
               + this.getLabel()
               + "..*?>]]";
  return utils.getMatches(filter);
  
};

ViewAbstraction.prototype.rename = function(newLabel) {

  if(typeof newLabel !== "string") return false;
    
  if(utils.inArray("/", newLabel)) {
    $tm.notify("A view name must not contain any \"/\"");
    return false;
  }
  
  // keep a reference to the old label before we change it
  var oldLabel = this.getLabel();
  
  // start the renaming
  var newRoot = $tm.path.views + "/" + newLabel;
  var oldRoot = this.getRoot();
  var results = utils.mv(oldRoot, newRoot, true);
  
  // update references
  
  if($tm.config.sys.defaultView === oldLabel) {
     utils.setEntry($tm.ref.sysUserConf,
                    "defaultView",
                    newLabel);
  }
  
  if($tm.config.sys.liveTab.fallbackView === oldLabel) {
     utils.setEntry($tm.ref.sysUserConf,
                    "liveTab.fallbackView",
                    newLabel);
  }
  
  $tw.wiki.each(function(tObj, tRef) {
    
    if(tObj.fields["tmap.open-view"] === oldLabel) {
      
      // update global node data fields referencing this view
      utils.setField(tRef, "tmap.open-view", newLabel);
      
    } else if(utils.startsWith(tRef, $tm.path.views)) {
      
      // update all local node data referencing this view
      var view = new ViewAbstraction(tRef);
      var nodes = view.getNodeData();
      for(var id in nodes) {
        if(nodes[id]["open-view"] === oldLabel) {
          nodes[id]["open-view"] = newLabel;
        }
      }
      view.saveNodeData(nodes);
      
    }
    
  });
  
  this._registerPaths(newLabel);
  this.rebuildCache();
    
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
  
  if(!isRebuild && this.config) {
    
    var config = this.config;
    
  } else {
    
    var fields = $tw.wiki.getTiddler(this.comp.config).fields;
    var config = utils.getPropertiesByPrefix(fields, "config.");
    
  }
  
  // TODO use regex to add "config."
  return (name
          ? config[(utils.startsWith(name, "config.") ? name : "config." + name)]
          : config);
  
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
  
  var labels = utils.makeHashMap();
  for(var id in orderByEdges) {
    if(orderByEdges[id] === "true") {
      var tObj = utils.getTiddler($tm.indeces.tById[id]);
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
  
  var args = arguments;
  
  if(args[0] == null) return; // null or undefined
  
  if(args.length === 1 && typeof args[0] === "object") {
    
    for(var prop in args[0]) {
      this.setConfig(prop, args[0][prop]);
    }
    
  } else if(args.length === 2 && typeof args[0] === "string") {
    
    var prop = utils.getWithoutPrefix(args[0], "config.");
    var val = args[1];
    
    if(val === undefined) return;
    
    if(val === null) {
      
      $tm.logger("debug", "Removing config", prop);
      delete this.config["config."+prop]; // todo set this to null
      
    } else {
      
      if(prop === "edge_type_namespace") {
        var match = val.match(/[^:]+/);
        val = (match ? match[0] : "");
      }
      
    }
    
    $tm.logger("log", "Setting config", prop, val);
    this.config["config."+prop] = val;

    
  } else { // not allowed
    
    return;
    
  }
  
  // save
  $tw.wiki.addTiddler(new $tw.Tiddler(
    $tw.wiki.getTiddler(this.comp.config),
    this.config
  ));

  this._noNeedToRebuildCache = true;
  
};

/**
 * Whether the node is already explicitly contained in the filter,
 * i.e. whether it is explicitly referenced by its title.
 */
ViewAbstraction.prototype.isExplicitNode = function(node) {
  
  // @Todo: this way of testing is not 100% save as a node might
  // have been added to the filter explicitly AND via a group filter.
  var regex = $tw.utils.escapeRegExp(this._getAddNodeFilterPart(node));
  return this.getNodeFilter("raw").match(regex);
             
};

ViewAbstraction.prototype.isLiveView = function() {
  
  return (this.getLabel() === $tm.misc.liveViewLabel);
  
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
        
  expr = expr.replace(/[\n\r]/g, " ");
  
  if(this.getNodeFilter("raw") === expr) {
    // already up to date;
    // This check is critical to prevent recursion!
    return;
  }
  
  if(this.isLiveView() && !force) {
    var text = "You must not change the live view's node filter!";
    $tm.notify(text);
    return;
  }
      
  utils.setField(this.comp.nodeFilter, "filter", expr);
  
  $tm.logger("debug","Node filter set to", expr);

  // rebuild filter now and prevent another rebuild at refresh
  this.nodeFilter = this.getNodeFilter(null, true);
  
  this._noNeedToRebuildCache = true;
  
};

ViewAbstraction.prototype.setEdgeTypeFilter = function(expr) {
    
  expr = expr.replace(/[\n\r]/g, " ");
  
  if(this.getEdgeTypeFilter("raw") === expr) { // already up to date
    // This check is critical to prevent recursion!
    return;
  }
  
  utils.setField(this.comp.edgeTypeFilter, "filter", expr);
  
  $tm.logger("debug","Edge filter set to", expr);

  // rebuild filter now 
  this.edgeTypeFilter = this.getEdgeTypeFilter(null, true);
  
  // and prevent another unecessary rebuild at refresh
  this._noNeedToRebuildCache = true;
  
}; 

/**
 * Method to append a filter part to the current filter (*or*-style).
 * 
 * @param {string} A tiddlywiki filter expression.
 */
ViewAbstraction.prototype.addNode = function(node) {
   
  if(this.isExplicitNode(node)) return false;
  
  var part = this._getAddNodeFilterPart(node);
  this.setNodeFilter(this.getNodeFilter("raw") + " " + part);

  this.saveNodePosition(node);
  
};

/**
 * Removes a node from the the view filter that has been
 * explicitly added before.
 * 
 * ATTENTION: Never remove the node data (i.e. style and positions)
 * from the node-data store. This will be done by a garbage
 * collector. See Adapter.prototype._removeObsoleteViewData
 */
ViewAbstraction.prototype.removeNode = function(node) {
    
  if(!this.isExplicitNode(node)) return false;
  
  var part = this._getAddNodeFilterPart(node);
  var f = this.getNodeFilter("raw").replace(part, "");
                   
  this.setNodeFilter(f);
  return true;
  
};

/**
 * Method will return a tiddlywiki edge-type filter that is used to
 * decide which edge types are displayed by the graph.
 * 
 * @param {("raw"|"pretty"|"matches"|"whitelist")} [type]
 *     Use this param to control the output type.
 * @param {boolean} [isRebuild] - True if to rebuild the cache,
 *     false otherwise.
 * @result {*}
 *     Depends on the type param:
 *     - raw: the original filter string
 *     - pretty: the prettyfied filter string for usage in textareas
 *     - matches: {Array<string>} all matches
 *     - whitelist: A lookup table where all matches are true
 */
ViewAbstraction.prototype.getEdgeTypeFilter = function(type, isRebuild) {
  
  if(!isRebuild && this.edgeTypeFilter) {
    
    var f = this.edgeTypeFilter;
    
  } else {
    
    var f = utils.makeHashMap();
    var allETy = $tm.indeces.allETy;
    var src = Object.keys(allETy);    
    var tObj = $tw.wiki.getTiddler(this.comp.edgeTypeFilter);
    
    f.raw = (tObj && tObj.fields.filter || "");
    f.pretty = utils.getPrettyFilter(f.raw);
    f.matches = utils.getEdgeTypeMatches(f.raw, allETy);
    f.whitelist = utils.getLookupTable(f.matches);
    
  }
    
  return (type ? f[type] : f);
  
};

ViewAbstraction.prototype.isEdgeTypeVisible = function(type) {
  
  var options = {
    namespace: this.getConfig("edge_type_namespace")
  };
  
  var type = new EdgeType(type, null, options);
            
  return utils.isEdgeTypeMatch(type.id, this.edgeTypeFilter.raw);
  
};

/**
 * Method will return a tiddlywiki node filter that is used to
 * decide which nodes are displayed by the graph.
 * 
 * @param {("raw"|"pretty"|"compiled")} [type]
 *     Use this param to control the output type.
 * @param {boolean} [isRebuild] - True if to rebuild the cache,
 *     false otherwise.
 * @result {*}
 *     Depends on the type param:
 *     - raw: the original filter string
 *     - pretty: the prettyfied filter string for usage in textareas
 *     - compiled: {Array<string>} all matches
 */
ViewAbstraction.prototype.getNodeFilter = function(type, isRebuild) {

  if(!isRebuild && this.nodeFilter) {
    
    var f = this.nodeFilter;
    
  } else {
    
    var f = utils.makeHashMap();
    var tObj = $tw.wiki.getTiddler(this.comp.nodeFilter);
    
    f.raw = (tObj && tObj.fields.filter) || "";
    f.pretty = utils.getPrettyFilter(f.raw);
    f.compiled = $tw.wiki.compileFilter(f.raw);
    
  }

  return (type ? f[type] : f);

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
              : utils.parseFieldData(this.comp.map, "text", {}));
              
  return (id ? data[id] : data);
  
};

ViewAbstraction.prototype.equals = function(view) {
  
  if(view === this) return true;
  
  var view = new ViewAbstraction(view);
  return (view.exists() && this.getRoot() === view.getRoot());
  
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

  var args = arguments;
  var data = this.getNodeData();
  
  if(args.length === 2) {
    
    if(typeof args[1] === "object") {
      if(args[1] === null) {
        // remember – in js null is an object :D
        // we use null as a signal for deletion of the item
        data[args[0]] = undefined;
      } else {
        data[args[0]] = $tw.utils.extend(data[args[0]] || {}, args[1]);
      }
    }
    
  } else if(args.length === 1 && typeof args[0] === "object") {
    
    $tm.logger("log", "Storing data in", this.comp.map);
    
    $tw.utils.extend(data, args[0]);
        
  } else {
    return;
  }
  
  utils.writeFieldData(this.comp.map, "text", data);
  
  // cache new values and prevent rebuild at refresh
  this.nodeData = data;
  
  this._noNeedToRebuildCache = true;
 
};

ViewAbstraction.prototype.saveNodePosition = function(node) {
    
  if(node.id && node.x && node.y) {
    this.saveNodeData(node.id, { x: node.x, y: node.y });
  }
  
};

ViewAbstraction.prototype.saveNodeStyle = function(id, style) {
  
  // remove any previos style from store;
  // @TODO: optimize this only null in style var needs to be removed
  var data = this.getNodeData()[id];
  if(data) {
    // delete all previous properties, except positions
    for(var p in data) {
      if(p !== "x" && p !== "y") data[p] = undefined;
    }
  }
  
  // save new style
  this.saveNodeData(id, style);
 
};