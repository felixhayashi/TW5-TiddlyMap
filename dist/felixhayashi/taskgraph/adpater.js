/*\
title: $:/plugins/felixhayashi/taskgraph/adapter.js
type: application/javascript
module-type: library

This library provides all the functions to interact with the TW as if
it was a simple database for nodes and edges. It may be understood as an abstraction
layer.

\*/

/**************************** IMPORTS ****************************/

  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
  var vis = require("$:/plugins/felixhayashi/vis/vis.js");
  
/***************************** CODE ******************************/

/**
 * Everything that is related to retrieving or inserting nodes and edges is
 * handled by the adapter. It decides which data to return and bases its
 * decision on the existance of an (optionally) set graph-view.
 * 
 * @wiki an optional wiki object
 */
var Adapter = function(wiki) {
  
  this.wiki = wiki ? wiki : $tw.wiki;
  
  // set the pointer to the end of the update queue because
  // if no update pointer exists yet, all update events up until
  // now can be ignored.
  // for further information see explanation in caretaker.js
  this.edgeChangePointer = $tw.taskgraph.edgeChanges.length;
};

/**
 * Like a normal database view it filters the results.
 * @view is a tw-filter string or compiled filter
 */
Adapter.prototype.setView = function(view) {
  
  // register view
  this.curView = view;
  
  // recompile filters
  this.nodeFilter = this.getCompiledNodeFilter(true);
  this.edgeFilter = this.getCompiledEdgeFilter(true);
  
};

/**
 * Create a new tiddler that gets a non-existant title and is opened
 * for edit. If a view is registered, the fields of the tiddler match
 * the current view. If arguments network and position are specified,
 * the node is also inserted directly into the graph at the given
 * position.
 * 
 * @position (optional) insert the node at position in network
 * @taskgraph a taskgraph instance of mode graph in which the node is inserted
 */
Adapter.prototype.createNode = function(position, taskgraph) {
    
  var fields = {
    title : this.wiki.generateNewTitle("New Node"),
    tags : this.curView ? this.curView.fields.tags : []
  };

  if($tw.taskgraph.opt.tw.fields.id != "title") {
    fields.id = vis.util.randomUUID();
  }

  this.wiki.addTiddler(new $tw.Tiddler(fields));

  if(position && taskgraph) {

    var node = {
      id : fields[$tw.taskgraph.opt.tw.fields.id],
      label : fields.title
    };
    
    this._addNodePosition(node, position);
    
    taskgraph.nodes.update(node);
  
  }
  
  taskgraph.dispatchEvent({
    type: "tm-edit-tiddler", param : fields.title
  });
        
  return fields.title;
  
};

/**
 * Store an edge with a given id in the TW.
 * @edge an edge an object that has at least a from, to and label property
 */
Adapter.prototype.insertEdgeIntoStore = function(edge) {
  
  var label = edge.label;
  var storeRef = $tw.taskgraph.opt.tw.prefix.edges + "/" + label;
    
  var records = this.wiki.getTiddlerData(storeRef, []);
  
  // make sure the edge has an id and its not empty or undefined
  // while from, to and type would sufficiently identify an edge, the
  // id is needed to interact with vis in a comfortable way because vis
  // ensures only that ids are unique in each dataset
  if(!("id" in edge) || !edge.id) edge.id = vis.util.randomUUID();

  // make sure the label is not stored as it is redundant
  // deleting it and adding it later to the object again is more conveniant than deep copying the object
  delete edge.label
  
  $tw.taskgraph.fn.console.info("the following edge of type \"" + label + "\" will be inserted into the store  \"" + storeRef + "\"");
  $tw.taskgraph.fn.console.log(JSON.stringify(edge));
    
  // add edge to to array of existing edges
  records.push(edge);
  
  var additionalFields = {}
  var storeTObj = this.wiki.getTiddler(storeRef);
  if(!storeTObj || !storeTObj.fields.id) {
    // give the edgestore an id to make it possible to trace name changes
    additionalFields.id = vis.util.randomUUID();
  }
  
  // uses JSON.stringify()
  this.wiki.setTiddlerData(storeRef, records, additionalFields);
  
  // REASSIGN the label to the object immediately after inserting it
  edge.label = label;
  
  $tw.taskgraph.edgeChanges.push({
    type : "insert", edge : edge
  });
};

/**
 * A function that is called every currently running graph instance
 * during its refresh(). The function will tell the graph about the
 * changes that occured in the edge pool. It will only return information
 * on changes that match the graphs edge-view.
 * 
 * For further architectural explanation see the comment in caretaker.js
 */
Adapter.prototype.getEdgeChanges = function() {
   
  var edgeFilter = this.curView ? this.curView.fields.displayedRelation : undefined;
  
  $tw.taskgraph.fn.console.log("graph with edgeFilter " + edgeFilter + " requested to get informed about edge changes");
  
  var changes = [];
  for(; this.edgeChangePointer < $tw.taskgraph.edgeChanges.length; this.edgeChangePointer++) {
    var change = $tw.taskgraph.edgeChanges[this.edgeChangePointer];
    
    // either no filter is specified or "all" is specified or the filter matches the edges label
    var matchesEdgeFilter = !edgeFilter || edgeFilter == "all" || change.edge.label == edgeFilter;
    // if we are in a view and either the edge is non-exclusive or is exclusive to the current view
    var allowedInContext = this.curView && (!change.edge.view || change.edge.view == utils.getBasename(this.curView.fields.title))
    
    if(matchesEdgeFilter && allowedInContext) {
      
      $tw.taskgraph.fn.console.log("reading edge change");
      $tw.taskgraph.fn.console.log(change);
      
      changes.push(change);
    }
  }
  return changes;
};
  
/**
 * returns the edgesDataSet that corresponds to the given filter
 * @filter a filter (string or compiled)
 * @outputType optional, either "array" or "dataset" (default).
 */
Adapter.prototype.selectEdgesFromStore = function(filter, outputType) {

  if(!filter) filter = this.edgeFilter;

  if(typeof filter == "string") {
    var filter = this.wiki.compileFilter(filter);
  }
  
  var stores = filter.call(this.wiki);
  
  var result = [];

  for(var i = 0; i < stores.length; i++) {
    
    // could also use this.wiki.getTiddlerData(stores[i])
    var tObj = this.wiki.getTiddler(stores[i]);
    var edges = JSON.parse(tObj.fields.text);
    
    for(var j = 0; j < edges.length; j++) {
      
      if(this.curView) {
        var viewName = utils.getBasename(this.curView.fields.title);
        // do not consider edges that belong exclusively to one edge
        if(edges[j].view && edges[j].view != viewName) continue;
      }
      
      // get the label from the edge store and assign it on the fly
      edges[j].label = utils.getBasename(tObj.fields.title);
      result.push(edges[j]);
            
    }
  }
  
  return (outputType == "array" ? result : new vis.DataSet(result));
  
}

/**
 * This function will remove all tiddlers from the wiki that correspond
 * to this node in the graph. Drafts are also removed. The default
 * storylist is updated eventually.
 * 
 * @nodes is an array that contains node objects with their properties
 */
Adapter.prototype.deleteNodesFromStore = function(nodes) {
  
  if(!nodes || !nodes.length) return;
  
  // array of tiddlers in the default storyList
  var storyList = this.wiki.getTiddlerList("$:/StoryList");

  for(var i = 0; i < nodes.length; i++) {
    
    var tRef = nodes[i].label;
    var tDraftRef = this.wiki.findDraft(tRef);    
    
    utils.deleteTiddlers([ tRef, tDraftRef ]);
    
    if(storyList) {
      // remove elements from storyList
      storyList = storyList.filter(function(el) {
        return (el != tRef && el != tDraftRef);
      });
    }
  }
  
  if(storyList) {
    // save story list again
    var tObj = this.wiki.getTiddler("$:/StoryList");
    this.wiki.addTiddler(new $tw.Tiddler(tObj, { list: storyList }));
  }
  
}

/**
 * optimized function to remove multiple edges from several stores.
 * @edges is an array that contains edge objects with the properties
 * from, to, label.
 */
Adapter.prototype.deleteEdgesFromStore = function(edges) {

  if(!edges || !edges.length) return;
  
  $tw.taskgraph.fn.console.info("the following edges will be deleted from store");
  $tw.taskgraph.fn.console.debug(edges);
      
  // prep object holds (1) the parsed JSON extracted from the store
  // and (2) the edges that are to be deleted
  var prep = {};
  
  // first step: prepare
  for(var i = 0; i < edges.length; i++) {
    
    // protect against null array-elements passed by vis
    if(typeof edges[i] != "object") continue;
    
    var label = edges[i].label;
    var storeRef = $tw.taskgraph.opt.tw.prefix.edges + "/" + label;
    
    if(!(storeRef in prep)) {
      prep[storeRef] = {
        edges : this.wiki.getTiddlerData(storeRef, []),
        deleteCandidates : []
      }
    }
    
    prep[storeRef].deleteCandidates.push(edges[i]);
    
    // also register each edge as delete
    $tw.taskgraph.edgeChanges.push({
      type : "delete",  edge : edges[i]
    });
    
  }
  
  // second step: delete edges
  
  for(var storeRef in prep) {
    
    var dcs = prep[storeRef].deleteCandidates; 
    
    var filter = function(edge) {
      for(var i = 0; i < dcs.length; i++) {
        return edge.id != dcs[i].id;
      }
    };
    
    var updatedStore = prep[storeRef].edges.filter(filter);
    
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/wiki.js#L654
    this.wiki.setTiddlerData(storeRef, updatedStore);

  }    
}

// TODO: this function
Adapter.prototype.removeObseleteEdges = function() {
  var edgesDataSet = this.selectEdgesFromStore();
  // an edge is obsolete if its id refers to a tiddler that does not exist anymore
  
}

/**
 * This compiled filter is based on the current view, and other
 * considerations. The graph makes a decision, which nodes to display,
 * according to this filter.
 * 
 * see https://github.com/Jermolene/TiddlyWiki5/blob/master/editions/test/tiddlers/tests/test-filters.js
 * 
 * TODO: maybe also include a "limit" filterOperator?
 */
Adapter.prototype.getCompiledNodeFilter = function(doRecompile) {
  
  if(!doRecompile && this.nodeFilter) return this.nodeFilter;
  
  var filter = (function() {
    var filterComponents = [];
    // no system tiddlers
    filterComponents.push("!is[system]");
    // no drafts
    filterComponents.push("!has[draft.of]");
    if(this.curView) {
      // if a view exists, allow only tiddlers with tags specified in the view
      var tags = this.curView.fields.tags;
      var consideredTags = tags ? tags : [];
      for(var i = 0; i < consideredTags.length; i++) {
        filterComponents.push("tag[" + consideredTags[i] + "]");
      }
    }
    return "[" + filterComponents.join('') + "]";
  }).call(this);
  
  $tw.taskgraph.fn.console.debug("node-filter \"" + filter + "\" created" );
  
  return this.wiki.compileFilter(filter);

};
  
/**
 * This compiled filter is based on the current view, and other
 * considerations. The graph makes a decision, which edges to display,
 * according to this filter.
 * 
 * @see
 *   - [TW5] compiled filter with titles doesn't work?
 *     https://groups.google.com/forum/#!topic/tiddlywikidev/WGR0hTRpZCA
 * 
 * TODO: At the moment only one or all edges may be filtered. Change this so more edges may be filtered at the same time.
 */
Adapter.prototype.getCompiledEdgeFilter = function(doRecompile) {
  
  if(!doRecompile && this.edgeFilter) return this.edgeFilter;
  
  var filter = (function() {
    var filterComponents = [];
    // only tiddlers with this prefix
    filterComponents.push("prefix[" + $tw.taskgraph.opt.tw.prefix.edges + "]");
    // no drafts
    filterComponents.push("!has[draft.of]");
    if(this.curView) {
      // if a view exists, allow only edges specified as to be displayed
      var tRef = this.curView.fields.title + "/filter/edges";
      if(this.wiki.tiddlerExists(tRef)) {
        var tObj = this.wiki.getTiddler(tRef);
        var tags = tObj.fields.tags;
        var consideredTags = tags ? tags : [];
        for(var i = 0; i < consideredTags.length; i++) {
          filterComponents.push("!prefix[" + $tw.taskgraph.opt.tw.prefix.edges + "/" + consideredTags[i] + "]"); // TODO: once jeremy added inverted features, turn this into the opposite
        }
      }
    }
    return "[" + filterComponents.join('') + "]";
  }).call(this);
  
  $tw.taskgraph.fn.console.debug("edge-filter \"" + filter + "\"" );
  
  return this.wiki.compileFilter(filter);

};
  
/**
 * returns the nodesDataSet that corresponds to the given filter.
 * 
 * @outputType optional, either "array" or "dataset" (default).
 */
Adapter.prototype.selectNodesFromStore = function(filter, outputType) {
  
  if(!filter) filter = this.nodeFilter;
  
  if(typeof filter == "string") {
    var filter = this.wiki.compileFilter(filter);
  }
  
  var tiddlers = filter.call(this.wiki);
    
  var nodes = [];
  
  for(var i = 0; i < tiddlers.length; i++) {
    
    // TODO: make function accept a tRef
    var curTiddler = this.setupTiddler(this.wiki.getTiddler(tiddlers[i]));
    
    nodes.push({
      id : curTiddler.fields[$tw.taskgraph.opt.tw.fields.id],
      label : curTiddler.fields.title
    });
  }
  
  this.restorePositions(nodes);
          
  return (outputType == "array" ? nodes : new vis.DataSet(nodes));
  
};

Adapter.prototype.selectNodeFromStoreById = function(id) {
  var filter = "[field:" +
                $tw.taskgraph.opt.tw.fields.id +
                "[" + id + "]]"
  return this.selectNodesFromStore(filter, "array")[0];
};

/**
 * This method will load the current view's map values into the nodes
 * @nodes an array of node-objects.
 */
Adapter.prototype.restorePositions = function(nodes) {
  
  if(!this.curView) return;
  
  var ref = this.curView.fields.title + "/map";    
  var map = this.wiki.getTiddlerData(ref, {});
  
  for(var i = 0; i < nodes.length; i++) {
    if(nodes[i].id in map) {
      this._addNodePosition(nodes[i], map[nodes[i].id]);
    }
  }
}

/**
 * This function will store the current positions into the views map.
 * @positions a hashmap with a nodes id as identifier and x, y properties
 */
Adapter.prototype.storePositions = function(positions) {
  
  if(!this.curView) {
    $tw.taskgraph.fn.console.warn("no view specified. will not store positions");
    return;
  }
  
  $tw.taskgraph.fn.console.log("storing positions of \"" + this.curView.fields.title + "\"");
  
  var title = this.curView.fields.title + "/map";
  this.wiki.setTiddlerData(title, positions);
    
}

/**
 * This method makes sure a Tiddler has all the necessary fields
 * that the plugin needs to work with it. This means particularly
 * that a Tiddler has a proper value in its designated id field.
 * The idField may be changed by the user and can also be the title
 * field. If the id field does not exist or doesn't have a value,
 * it will be created.
 */
Adapter.prototype.setupTiddler = function(tObj) {
  
  var modFields = undefined;
  
  var idField = $tw.taskgraph.opt.tw.fields.id; 
  if(!(idField in tObj.fields) || !tObj.fields[idField]) {
    modFields = modFields ? modFields : {};
    modFields[idField] = vis.util.randomUUID();
  }
  
  if(modFields) {
    var updatedTObj = new $tw.Tiddler(tObj, modFields);
    $tw.wiki.addTiddler(updatedTObj);
    return updatedTObj;
  } else  {
    return tObj;
  }
  
};

/**
 * This will set the position of the node and prevent the node from moving
 * 
 * @node an array representing a node
 * @pos x,y coordinates
 */
Adapter.prototype._addNodePosition = function(node, pos) {

  node.x = pos.x;
  node.y = pos.y;
  node.allowedToMoveX = false;
  node.allowedToMoveY = false;
  
  return node;
      
};

// export
exports.Adapter = Adapter
