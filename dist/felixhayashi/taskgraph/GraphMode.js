/*\

title: $:/plugins/felixhayashi/taskgraph/taskgraph_graph.js
type: application/javascript
module-type: library

\*/

/**************************** IMPORTS ****************************/

var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
var vis = require("$:/plugins/felixhayashi/vis/vis.js");
var ViewAbstraction = require("$:/plugins/felixhayashi/taskgraph/view_abstraction.js").ViewAbstraction;

  
/***************************** CODE ******************************/
  
exports.getClass = function(constrObj) {
    
  /**
   * @constructor
   */
  var TaskGraphWidget = function(parseTreeNode, options) {
            
    // addEventListeners automatically binds "this" object to handler, thus, no need for .bind(this)
    this.addEventListeners([
      {type: "tm-create-view", handler: function() { this.handleCreateView(null); }},
      {type: "tm-rename-view", handler: this.handleRenameView },
      {type: "tm-delete-view", handler: this.handleDeleteView },
      {type: "tm-store-position", handler: this.handleStorePositions },
      {type: "tm-edit-node-filter", handler: this.handleEditNodeFilter }
    ]);
    
  };
  
  // !! EXTENSION !!
  TaskGraphWidget.prototype = constrObj;
  // !! EXTENSION !!
  
  /**
   * Method to render this widget into the DOM.
   * Attention: BE CAREFUL WITH THE ORDER OF FUNCTION CALLS IN THIS FUNCTION.
   * 
   * @override
   */
  TaskGraphWidget.prototype.render = function(parent, nextSibling) {
    
    // remember our place in the dom
    this.registerParentDomNode(parent);
    
    // get view and view holder
    this.viewHolderRef = this.getViewHolderRef();
    this.view = this.getView();
    
    // register whether in editor mode or not
    this.isEditorMode = this.getAttribute("editor");
    
    // first append the bar if we are in editor mode
    if(this.isEditorMode) {
      this.initAndRenderEditorBar(parent);
    }
        
    // now initialise graph variables and render the graph
    this.initAndRenderGraph(parent);
    
  };
  
  /**
   * The editor bar contains a bunch of widgets that allow the user
   * to manipulate the current view.
   * 
   * @param {Element} parent The dom node in which the editor bar will
   *     be injected in.
   */
  TaskGraphWidget.prototype.initAndRenderEditorBar = function(parent) {
    
    this.graphBarDomNode = document.createElement("div");
    $tw.utils.addClass(this.graphBarDomNode, "filterbar");
    parent.appendChild(this.graphBarDomNode);
    
    this.rebuildChildWidgets();
    this.renderChildren(this.graphBarDomNode);
  };

  /**
   * Creates this widget's child-widgets.
   * 
   * @see https://groups.google.com/forum/#!topic/tiddlywikidev/sJrblP4A0o4
   */
  TaskGraphWidget.prototype.rebuildChildWidgets = function() {
    
    // register variables
    this.setVariable("var.viewLabel", this.getView().getLabel());
    this.setVariable("var.ref.view", this.getView().getRoot());
    this.setVariable("var.ref.viewHolder", this.getViewHolderRef());
    this.setVariable("var.ref.edgeFilter", this.getView().getPaths().edgeFilter);
    this.setVariable("var.edgeFilterExpr", this.view.getAllEdgesFilterExpr());
    
    // Construct the child widget tree
    var body = {
      type : "tiddler",
      attributes : {
        tiddler : { type : "string", value : this.getView().getRoot() }
      },
      children : [{
        type : "transclude",
        attributes : {
          tiddler : { type : "string", value : this.opt.ref.graphBar }
        }
      }]
    };
        
    this.makeChildWidgets([body]);
    
  };
      
  /**
   * This function is called by the system to notify the widget about
   * tiddler changes.
   * 
   * The changes are analyzed by several functions.
   * 
   * 1. checking for callbacks: some processes decided at runtime to 
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
   * @override Widget.refresh();
   * @see https://groups.google.com/d/msg/tiddlywikidev/hwtX59tKsIk/EWSG9glqCnsJ
   */
  TaskGraphWidget.prototype.refresh = function(changedTiddlers) {
        
    // in any case, check for callbacks triggered by tiddlers
    this.checkForCallbacks(changedTiddlers);
    
    var isViewSwitched = this.isViewSwitched(changedTiddlers);
    var viewModifications = this.getView().rebuildCache(changedTiddlers);
        
    if(isViewSwitched) {
    
      this.logger("warn", "View switched");
      this.view = this.getView(true);
      this.rebuildGraph();
    
    } else if(viewModifications.length) {
      
      this.logger("warn", "View modified");
      this.rebuildGraph();
      
    } else {
      
      // check for changes that effect the graph on an element level
      this.checkForGraphUpdates(changedTiddlers);
            
    }
    
    if(this.isEditorMode) {
      // in any case give child widgets a chance to refresh
      this.refreshEditorBar(changedTiddlers, viewModifications);
    }
    
    this.logger("debug", "Done with refresh");

  };
  
  TaskGraphWidget.prototype.rebuildGraph = function() {
    
    this.logger("debug", "Rebuilding graph");
    
    // always reset to allow handling of stabilized-event!
    this.hasNetworkStabilized = false;
    
    this.graphData = this.getGraphData(true);
    this.network.setData(this.graphData);
    
  };
  
  // changes global state
  TaskGraphWidget.prototype.getGraphData = function(isRebuild) {
      
    if(!isRebuild && this.graphData) return this.graphData;
      
    var nodeFilter = this.getView().getNodeFilter("expression");
    var nodes = this.adapter.selectNodesByFilter(nodeFilter, {
      view: this.getView()
    });
    
    var edges = this.adapter.selectEdgesByEndpoints(nodes, {
      view: this.getView(),
      endpointsInSet: ">=1" // ">=1" used to calculate neighbours
    });
      
    if(this.getView().isConfEnabled("display_neighbours")) {
      var neighbours = this.adapter.selectNeighbours(nodes, {
        edges: edges,
        outputType: "array",
        view: this.getView(),
        addProperties: {
          group: "neighbours"
        }
      });
      utils.inject(neighbours, nodes);
    }
    
    // create data and lookup tables
    var graphData = {
      edges: edges,
      nodes: nodes,
      nodesByLabel: utils.getLookupTable(nodes, "label")
    };
    
    return graphData;
        
  };

  TaskGraphWidget.prototype.isViewBound = function() {
    
    return utils.startsWith(this.getViewHolderRef(),
                            this.opt.path.localHolders);  
    
  };  
  
  TaskGraphWidget.prototype.isViewSwitched = function(changedTiddlers) {
  
    if(this.isViewBound()) {
      return false; // bound views can never be switched!
    } else {
      return utils.hasOwnProp(changedTiddlers, this.getViewHolderRef());
    }
    
  };
  
  /**
   * This method will ckeck if any tw-widget needs a refresh.
   */
  TaskGraphWidget.prototype.refreshEditorBar = function(changedTiddlers, viewModifications) {
    
    // @TODO viewModifications is actually really heavy. I could narrow this.
    if(this.isViewSwitched(changedTiddlers) || viewModifications.length) {
      
      // full rebuild
      this.logger("info", "The graphbar needs a full refresh");
      this.removeChildDomNodes();
      this.rebuildChildWidgets();
      this.renderChildren(this.graphBarDomNode);
      return true;
      
    } else {
      
      // let children decide for themselves
      this.logger("info", "Propagate refresh to childwidgets");
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
   */
  TaskGraphWidget.prototype.checkForGraphUpdates = function(changedTiddlers) {
            
    var nodeFilter = this.getView().getNodeFilter("compiled");
    var matchingChangedNodes = utils.getMatches(nodeFilter, Object.keys(changedTiddlers));
                                  
    // check for updated or modified nodes that match the filter
    if(matchingChangedNodes.length) {
      
      this.rebuildGraph();
      return;
      
    } else { // no node matches
      
      // check for nodes that do not match the filter anymore
      for(var tRef in changedTiddlers) {
        if(this.graphData.nodesByLabel[tRef]) {
          
          this.rebuildGraph();
          return;
          
        }
      }
    }
    
    var edgeFilter = this.getView().getEdgeFilter("compiled");
    var changedEdgestores = utils.getMatches(edgeFilter, Object.keys(changedTiddlers));
    
    if(changedEdgestores.length) {
          
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
  TaskGraphWidget.prototype.initAndRenderGraph = function(parent) {
    
    this.logger("info", "Initializing and rendering the graph");
    
    // create a div for the graph and register it
    this.graphDomNode = document.createElement("div");
    $tw.utils.addClass(this.graphDomNode, "vis-graph");
    parent.appendChild(this.graphDomNode);
    
    // graph size issues
    if(this.getAttribute("height")) {
      this.graphDomNode.style["height"] = this.getAttribute("height");
    } else {
      // the listener removes itself if parentDomNode becomes an orphan
      window.addEventListener("resize", this.handleResizeEvent.bind(this), false);
      this.maxEnlarge(this.graphDomNode);
    }

    this.graphOptions = this.getGraphOptions();

    // init the graph with dummy data as events are not registered yet
    var dummyData = { nodes: [], edges: [] };
    this.network = new vis.Network(this.graphDomNode, dummyData, this.graphOptions);
                
    // repaint when sidebar is hidden
    if(!this.isEditorMode) {
      this.registerCallback("$:/state/sidebar", this.repaintGraph.bind(this), false);
    }
    
    // register events
    
    this.network.on("doubleClick", this.handleDoubleClickEvent.bind(this));
    
    this.network.on("stabilized", this.handleStabilizedEvent.bind(this));
    
    this.network.on('dragStart', function(properties) {
      if(properties.nodeIds.length) {
        this.setNodesMoveable([ properties.nodeIds[0] ], true);
      }
    }.bind(this));
    
    this.network.on("dragEnd", function(properties) {
      if(properties.nodeIds.length) {
        var mode = this.getView().isConfEnabled("physics_mode");
        this.setNodesMoveable([ properties.nodeIds[0] ], mode);
        this.handleStorePositions();
      }
    }.bind(this));
        
    // finally create and register the data and rebuild the graph
    this.rebuildGraph();
        
  };
  
  TaskGraphWidget.prototype.getGraphOptions = function() {
    
    // current vis options can be found at $tw.taskgraph.logger("log", this.network.constants);
    
    // get a copy of the options
    var options = this.wiki.getTiddlerData(this.opt.ref.visOptions);
    
    options.onDelete = this.handleRemoveElement.bind(this);
    options.onConnect = function(edge, callback) {
      // we do not call the callback of the network as we handle it ourselves
      this.handleConnectionEvent(edge);
    }.bind(this);
    
    options.onAdd = function(node, callback) {
      this.adapter.insertNode(node, {
        view: this.getView(),
        editNodeOnCreate: false
      });
    }.bind(this);

    options.onEditEdge = function(updatedEdge, callback) {

      var edge = this.graphData.edges.get(updatedEdge.id);
      $tw.utils.extend(edge, updatedEdge);
      
      this.adapter.deleteEdgesFromStore([
        { id: edge.id, label: edge.label }
      ], this.getView());
      
      this.adapter.insertEdge(edge, this.getView());
      
    }.bind(this);

    options.dataManipulation = {
        enabled : (this.isEditorMode ? true : false),
        initiallyVisible : true
    };
        
    options.navigation = {
       enabled : true
    };
    
    return options;
    
  };
    
  /**
   * Create an empty view. A dialog is opened that asks the user how to
   * name the view. The view is then registered as current view.
   */
  TaskGraphWidget.prototype.handleCreateView = function() {
    
    this.openDialog(this.opt.ref.viewNameDialog, null, function(isConfirmed, outputTObj) {
    
      if(isConfirmed) {
        var view = this.adapter.createView(utils.getText(outputTObj));
        this.setView(view.getRoot());
      }
      
    });
    
  };

  TaskGraphWidget.prototype.handleRenameView = function() {
    
    if(this.getView().getLabel() === "default") {
      $tw.taskgraph.notify("Thou shalt not rename the default view!");
      return;
    }
    
    this.openDialog(this.opt.ref.viewNameDialog, null, function(isConfirmed, outputTObj) {
    
      if(isConfirmed) {
        this.view.rename(utils.getText(outputTObj));
        this.setView(this.view.getRoot());
      }

    });
    
  };

  TaskGraphWidget.prototype.handleDeleteView = function() {
    
    var viewname = this.getView().getLabel();
    
    if(viewname === "default") {
      $tw.taskgraph.notify("Thou shalt not kill the default view!");
      return;
    }
    
    // regex is non-greedy
    var filter = "[regexp:text[<\\$taskgraph.*?view=." + viewname + "..*?>]]";
    var matches = utils.getMatches(filter);
    
    if(matches.length) {
      
      var fields = {
        count : matches.length.toString(),
        filter : filter
      };

      this.openDialog(this.opt.ref.notAllowedToDeleteViewDialog, fields, null);

      return;
      
    }

    var message = "You are about to delete the view " + 
                  "''" + viewname + "'' (no tiddler currently references this view).";
                  
    this.openStandardConfirmDialog(function(isConfirmed) {
      
      if(isConfirmed) {
        this.getView().destroy();
        this.setView(this.opt.path.views + "/default");
        $tw.taskgraph.notify("view \"" + viewname + "\" deleted ");
      }

    }, message);
    
  };
  
  /**
   * Called by vis when the user tries to delete a node or an edge.
   * @data { nodes: [selectedNodeIds], edges: [selectedEdgeIds] }
   */
  TaskGraphWidget.prototype.handleRemoveElement = function(data, callback) {
    
    if(data.edges.length && !data.nodes.length) { // only deleting edges
      this.adapter.deleteEdgesFromStore(this.graphData.edges.get(data.edges), this.getView());
      callback(data);
      $tw.taskgraph.notify("edge" + (data.edges.length > 1 ? "s" : "") + " removed");
    }
                        
    if(data.nodes.length) {
      
      var fields = {
        subtitle : "Please confirm your choice",
        text: "By deleting a node you are also deleting the " +
              "corresponding tiddler __and__ any edges connected " +
              "to that node. Really proceed?"
      };
      
      this.openDialog(null, fields, function(isConfirmed) {
        
        if(!isConfirmed) return; // callback({}) ?
          
          // get objects with labels and ids
          var nodes = this.graphData.nodes.get(data.nodes);
          var edges = this.graphData.edges.get(data.edges);
          
          this.adapter.deleteNodesFromStore(nodes);
          this.adapter.deleteEdgesFromStore(edges, this.getView());
          
          $tw.taskgraph.notify("node" + (data.nodes.length > 1 ? "s" : "") + " removed");
        
      });
    }     
  }
  
  TaskGraphWidget.prototype.handleStorePositions = function() {
    this.adapter.storePositions(this.network.getPositions(), this.getView());
    $tw.taskgraph.notify("positions stored");
  };
  
  TaskGraphWidget.prototype.handleEditNodeFilter = function() {

    var fields = {
      view: this.getView().getLabel,
      prettyFilter: this.getView().getPrettyNodeFilterExpr()
    };
    
    this.openDialog(this.opt.ref.editNodeFilter, fields, function(isConfirmed, outputTObj) {
      if(isConfirmed) {
        this.getView().setNodeFilter(utils.getText(outputTObj));
      }
    });
      
  };

  /**
   * Called by vis when the graph has stabilized itself.
   * 
   * ATTENTION: never store positions in a views map during stabilize
   * as this will affect other graphs positions and will cause recursion!
   * Storing positions inside vis' nodes is fine though
   */
  TaskGraphWidget.prototype.handleStabilizedEvent = function(properties) {
    
    if(this.hasNetworkStabilized) {
      return;
    } else {
      this.hasNetworkStabilized = true;
    }
    
    this.logger("log", "Network stabilized after " + properties.iterations + " iterations");

    this.network.storePositions(); // does it matter if we put this before setter? yes, I guess.
    this.setNodesMoveable(this.graphData.nodes.getIds(),
                          this.getView().isConfEnabled("physics_mode"));
    
  };
  
  /**
   * Allow the given nodes to be moveable.
   * 
   * @param {vis.Dataset} nodes - The nodes for which to allow any
   *     movement (either by physics or by dragging).
   * @param {boolean} isEnabled - True, if the nodes are allowed to
   *     move or be moved.
   */    
  TaskGraphWidget.prototype.setNodesMoveable = function(ids, isMoveable) {

    this.logger("log", "Nodes", ids, "can move:", isMoveable);

    var updates = [];
    for(var i = 0; i < ids.length; i++) {
      
      updates.push({
        id: ids[i],
        allowedToMoveX: isMoveable,
        allowedToMoveY: isMoveable
      });
      
    }
    
    this.graphData.nodes.update(updates);

  };
    
  /**
   * This handler is registered at and called by the vis network event
   * system
   * 
   * @see
   *   - Coordinates not passed on click/tap events within the properties object
   *     https://github.com/almende/vis/issues/440
   * 
   * @properties a list of nodes and/or edges that correspond to the
   * click event.
   */
  TaskGraphWidget.prototype.handleDoubleClickEvent = function(properties) {
    
    if(!properties.nodes.length && !properties.edges.length) { // clicked on an empty spot
      
      if(!this.isEditorMode) return;
      
      this.openDialog(this.opt.ref.nodeNameDialog, null, function(isConfirmed, outputTObj) {
        if(isConfirmed) {
          var node = properties.pointer.canvas;
          node.label = (outputTObj ? outputTObj.fields.text : "New Node");
          this.adapter.insertNode(node, {
            view: this.getView(),
            editNodeOnCreate: false
          });
        }
      });
      
    } else {
      
       if(properties.nodes.length) { // clicked on a node

        this.logger("debug", "Doubleclicked on a node");

        var id = properties.nodes[0];
        var targetTitle = this.graphData.nodes.get(id).label;
        //this.network.focusOnNode(properties.nodes[0], {});
        
      } else if(properties.edges.length) { // clicked on an edge
        
        this.logger("debug", "Doubleclicked on an Edge");
        
        // TODO: open option menu
        var edge = this.graphData.edges.get(properties.edges[0]);
        var label = (edge.label
                     ? edge.label
                     : this.opt.misc.unknownEdgeLabel);
        var targetTitle = this.getView().getEdgeStoreLocation() + "/" + label;
      
      }
      
      // window.location.hash = node.label; is not the right way to do it
      this.dispatchEvent({
        type: "tm-navigate", navigateTo: targetTitle
      }); 
            
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
  TaskGraphWidget.prototype.handleResizeEvent = function(event) {

    if(!document.body.contains(this.parentDomNode)) {
      window.removeEventListener("resize", this.handleResizeEvent);
      return;
    }
    
    if(!this.network) { // has not been initialized yet!
      return;
    }
    
    this.maxEnlarge(this.graphDomNode);

    this.repaintGraph();
    
  };
   
  /**
   * The view holder is a tiddler that stores a references to the current
   * view. If the graph is not bound to a view by the user via an
   * attribute, the default view holder is used. Otherwise, a temporary
   * holder is created whose value is set to the view specified by the user.
   * This way, the graph is independent from view changes made in a
   * taskgraph editor.
   * 
   * This function will only calculate a new reference to the holder
   * on first call (that is when no view holder is registered to "this".
   * 
   */
  TaskGraphWidget.prototype.getViewHolderRef = function() {
    
    // the viewholder is never recalculated once it exists
    if(this.viewHolderRef) {
      return this.viewHolderRef;
    }
    
    this.logger("info", "Retrieving or generating the view holder reference");
    
    // if given, try to retrieve the viewHolderRef by specified attribute
    var viewName = this.getAttribute("view");
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
      var holderRef =  this.opt.ref.defaultGraphViewHolder;
    }
    
    return holderRef;
    
  };
  
  /**
   * This function will switch the current view reference of the
   * view holder. If no viewRef is specified, the current view is
   * simply updated.
   * 
   * @viewRef (optional) a reference (tiddler title) to a view
   * @viewHolderRef (optional) a reference to the view holder that should be updated
   */
  TaskGraphWidget.prototype.setView = function(viewRef, viewHolderRef) {
    
    if(viewRef) {
      if(!viewHolderRef) {
        viewHolderRef = this.viewHolderRef;
      }
      this.logger("info", "Inserting view \"" + viewRef + "\" into holder \"" + viewHolderRef + "\"");
      this.wiki.addTiddler(new $tw.Tiddler({ 
        title : viewHolderRef,
        text : viewRef
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
  TaskGraphWidget.prototype.getView = function(isRebuild) {
    
    if(!isRebuild && this.view) {
      return this.view;
    }
    
    var viewHolderRef = this.getViewHolderRef();
    var curViewRef = this.wiki.getTiddler(viewHolderRef).fields.text;
    this.logger("info", "Retrieved view \"" + curViewRef + "\" from holder \"" + viewHolderRef + "\"");
    
    if(utils.tiddlerExists(curViewRef)) {
      return new ViewAbstraction(curViewRef);
    } else {
      this.logger("log", "Warning: View \"" + curViewRef + "\" doesn't exist. Default is used instead.");
      return new ViewAbstraction("default");
    }
    
  };
    
  TaskGraphWidget.prototype.repaintGraph = function() {
    
    this.logger("info", "Repainting the whole graph");
    
    this.network.redraw();
    this.network.zoomExtent();
    
  }
  
  TaskGraphWidget.prototype.maxEnlarge = function(container) {

    var windowHeight = window.innerHeight;
    var canvasOffset = utils.getDomNodePos(container).y;
    var distanceBottom = 15; // in pixel
    var calculatedHeight = windowHeight - canvasOffset - distanceBottom;
    container.style["height"] = calculatedHeight + "px";
    
  };
  
  return TaskGraphWidget;

}
