/*\

title: $:/plugins/felixhayashi/taskgraph/taskgraph.js
type: application/javascript
module-type: widget

@preserve

\*/

(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  
  "use strict";
  
  /**************************** IMPORTS ****************************/
   
  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
  var vis = require("$:/plugins/felixhayashi/vis/vis.js");
  var ViewAbstraction = require("$:/plugins/felixhayashi/taskgraph/view_abstraction.js").ViewAbstraction;
  
  
  /***************************** CODE ******************************/
        
  /**
   * @constructor
   */
  var TaskGraphWidget = function(parseTreeNode, options) {
    
    // Main initialisation inherited from widget.js
    this.initialise(parseTreeNode, options);
        
    // create shortcuts and aliases
    this.adapter = $tw.taskgraph.adapter;
    this.opt = $tw.taskgraph.opt;
    
    // key (a tiddler) -> callback (called when tiddler changes)
    this.callbacks = utils.getEmptyMap();
        
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/widgets/widget.js#L211
    this.computeAttributes();
    
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
  TaskGraphWidget.prototype = new Widget();
  // !! EXTENSION !!
        
  /**
   * Add some classes to give the user a chance to apply some css
   * to different graph modes.
   */
  TaskGraphWidget.prototype.registerParentDomNode = function(parent) {
    this.parentDomNode = parent;
    if(!$tw.utils.hasClass(parent, "taskgraph")) {
      $tw.utils.addClass(parent, "taskgraph");
      if(this.getAttribute("click-to-use") !== "false") {
        $tw.utils.addClass(parent, "click-to-use");
      }
      if(this.getAttribute("class")) {
        $tw.utils.addClass(parent, this.getAttribute("class"));
      }
    }
  }
  
  /**
   * The callback mechanism allows to dynamically listen to tiddler
   * changes without hardcoding a change-check for a tiddler name
   * in the refresh function.
   * 
   * @param [TiddlerReference] tRef - A tiddler whose change triggers
   *     the callback.
   * @param {function} callback - A function that is called when the
   *     tiddler has changed.
   * @param {boolean} [deleteOnCall=true] - True if to delete the
   *     callback once it has been called, false otherwise.
   */
  TaskGraphWidget.prototype.registerCallback = function(tRef, callback, isDeleteOnCall) {
    this.logger("debug", "A callback was registered for changes of \"" + tRef + "\"");
    this.callbacks[tRef] = {
      execute : callback,
      isDeleteOnCall : (typeof isDeleteOnCall == "Boolean" ? isDeleteOnCall : true)
    }
  };
  
  /**
   * Removes the callback from the list of tiddler callbacks.
   * 
   * @see TaskGraphWidget#registerCallback
   */
  TaskGraphWidget.prototype.removeCallback = function(tRef) {
    if(this.callbacks[tRef]) {
      this.logger("debug", "A callback for \"" + tRef + "\" will be deleted");
      delete this.callbacks[tRef];
    }
  };
  
  /**
   * this method has to be implemented at the top of the refresh method.
   * It checks for changed tiddlers that have
   * registered callbacks. If `deleteOnCall` was specified during
   * registration of the callback, the callback will be deleted
   * automatically.
   * 
   * @see TaskGraphWidget#registerCallback
   */
  TaskGraphWidget.prototype.checkForCallbacks = function(changedTiddlers) {
    
    if(this.callbacks.length == 0) {
      this.logger("debug", "No registered callbacks exist at the moment");
      return;
    }
    
    for(var tRef in changedTiddlers) {
            
      if(!this.callbacks[tRef]) continue;
      
      if(this.wiki.getTiddler(tRef)) {
        
        this.logger("debug", "A callback for \"" + tRef + "\" will be executed");
        this.callbacks[tRef].execute(tRef);
        
        // a continue prevents deleting the callback
        if(!this.callbacks.isDeleteOnCall) continue;
        
      }
      
      this.removeCallback(tRef);
      
    }
  }
  
  /**
   * This handler will open a dialog in which the user specifies an
   * edgetype to use to create an edge between to nodes.
   * 
   * Before any result is displayed to the user on the graph, the
   * relationship needs to be persisted in the store for the according
   * edgetype. If that operation was successful, each graph will instantly
   * be aware of the change as it listens to tiddler changes.
   * 
   * @param {Edge} data - A javascript object that contains at least
   *    the properties "from", "to" and "label"
   * @param {function} [callback] - A function with the signature
   *    function(isConfirmed);
   */
  TaskGraphWidget.prototype.handleConnectionEvent = function(data, callback) {
       
    this.logger("info", "Opening a dialog for creating an edge");

    var edgeFilterExpr = this.getView().getAllEdgesFilterExpr(true);

    var vars = {
      edgeFilterExpr: edgeFilterExpr,
      fromLabel: this.adapter.selectNodeById(data.from).label,
      toLabel: this.adapter.selectNodeById(data.to).label
    };
    
    this.openDialog(this.opt.ref.edgeTypeDialog, vars, function(isConfirmed, outputTObj) {
    
      if(isConfirmed) {
        
        var text = utils.getText(outputTObj);
        
        data.label = (text && text !== this.opt.misc.unknownEdgeLabel
                      ? text
                      : this.opt.misc.unknownEdgeLabel);
        
        this.logger("debug", "The edgetype is set to: " + data.label);

        this.adapter.insertEdge(data, this.getView());  
        $tw.taskgraph.notify("edge added");
        
      }
      
      if(typeof callback == "function") {
        callback(isConfirmed);
      }
        
    });
    
  }
  
  /**
  * This function opens a dialog based on a skeleton and some fields and eventually
  * calls a callback once the dialog is closed. The callback contains an indicator
  * whether the dialog subject was confirmed or the operation cancelled. In any
  * case the output tiddler is passed to the callback. Each dialog may write its
  * changes to this tiddler in order to store the dialog result and make it available
  * to the callback.
  * 
  * How does it work?
  * 
  * The output of the dialog process is stored in a temporary tiddler that is only known
  * to the current instance of the dialog. This way it is ensured that only the dialog process
  * that created the temporary tiddler will retrieve the result. Now we are able to
  * provide unambigous and unique correspondance to dialog callbacks.
      
  * Any dialog output is stored in a unique output-tiddler. Once there is a result,
  * a new result tiddler is created with indicators how to interpret the output.
  * The result tiddler can be understood as exit code that is independent of the output.
  * It is the result tiddler that triggers the dialog callback that was registered before.
  * the output is then read immediately from the output-tiddler.
  * 
  * @param {$tw.Tiddler} skeleton - A skeleton tObj that is used as the dialog body
  * @param {Hashmap} [fields] - More fields that can be added.
  * @param {string} [fields.subtitle] - More fields that can be added. All
  *     properties of fields will be accessible as variables in the modal
  * @param {string} [fields.cancelButtonLabel] - The label of the cancel button.
  * @param {string} [fields.confirmButtonLabel] - The label of the confirm button.
  * @param {function} [callback] - A function with the signature
  *     function(isConfirmed, outputTObj). `outputTObj` contains data
  *     produced by the dialog (can be undefined even if confirmed!).
  *     Be careful: the tiddler that outputTObj represents is deleted immediately.
  */
  TaskGraphWidget.prototype.openDialog = function(skeleton, fields, callback) {
            
    skeleton = utils.getTiddler(skeleton);
    
    var path = this.opt.path.dialogs + "/" + utils.genUUID();
    var dialogFields = {
      title : path,
      output : path + "/output",
      result : path + "/result",
      footer : this.wiki.getTiddler(this.opt.ref.dialogStandardFooter).fields.text
    };
    
    if(!fields || !fields.confirmButtonLabel) {
      dialogFields.confirmButtonLabel = "Okay";
    }
    if(!fields || !fields.cancelButtonLabel) {
      dialogFields.cancelButtonLabel = "Cancel";
    }
 
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L761
    var dialogTiddler = new $tw.Tiddler(skeleton, fields, dialogFields);
    this.logger("debug", "A dialog will be opened based on the following tiddler:", dialogTiddler);
    
    // https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L841
    this.wiki.addTiddler(dialogTiddler);

    this.registerCallback(dialogFields.result, function(t) {

      var triggerTObj = this.wiki.getTiddler(t);
      var isConfirmed = triggerTObj.fields.text;
      
      if(isConfirmed) {
        var outputTObj = this.wiki.getTiddler(dialogFields.output);
      } else {
        var outputTObj = null;
        $tw.taskgraph.notify("operation cancelled");
      }
      
      if(typeof callback == "function") {
        callback.call(this, isConfirmed, outputTObj);
      }
      
      // close and remove the tiddlers
      utils.deleteTiddlers([dialogFields.title, dialogFields.output, dialogFields.result]);
      
    }.bind(this), true);
            
    this.dispatchEvent({
      type: "tm-modal", param : dialogTiddler.fields.title, paramObject: dialogTiddler.fields
    }); 
    
  }
  
  /**
   * Promts a dialog that will confront the user with making a tough choice :)
   * @param {function} [callback] - A function with the signature function(isConfirmed).
   * @param {string} [message] - An small optional message to display.
   */
  TaskGraphWidget.prototype.openStandardConfirmDialog = function(callback, message) {
  
    // TODO: option paths seriously need some refactoring!

    var vars = {
      message : message,
      confirmButtonLabel: "Yes mom, I know what I'm doing!",
      cancelButtonLabel: "Uuups, hell no!"
    };
    
    this.openDialog(this.opt.ref.confirmationDialog, vars, callback);
  };
    
  TaskGraphWidget.prototype.logger = function(type, message /*, more stuff*/) {
    
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift("@" + this.objectId.toUpperCase());
    args.unshift(type);
    $tw.taskgraph.logger.apply(this, args);
    
  };
  
  /**
   * Method to render this widget into the DOM.
   * Attention: BE CAREFUL WITH THE ORDER OF FUNCTION CALLS IN THIS FUNCTION.
   * 
   * @override
   */
  TaskGraphWidget.prototype.render = function(parent, nextSibling) {
    
    // remember our place in the dom
    this.registerParentDomNode(parent);
    
    // who am I?
    this.objectId = (this.getAttribute("object-id")
                     ? this.getAttribute("object-id")
                     : utils.genUUID());
    
    // get view and view holder
    this.viewHolderRef = this.getViewHolderRef();
    this.view = this.getView();
    
    // some views are system views with special meaning 
    this.handleSpecialViews();
    
    // register whether in editor mode or not
    this.editorMode = this.getAttribute("editor");
    
    // first append the bar if we are in editor mode
    if(this.editorMode === "advanced") {
      this.initAndRenderEditorBar(parent);
    }
        
    // now initialise graph variables and render the graph
    this.initAndRenderGraph(parent);
    
  };
  
  TaskGraphWidget.prototype.handleSpecialViews = function() {
    
    if(this.view.getLabel() === "quick_connect") { // TODO: should I use objectId or view label??
      var output = "$:/temp/felixhayashi/taskgraph/quick_connect_search";
      var filter = "[search{" + output + "}!is[system]limit[10]]"
                   //+ "[field:title[" + this.getVariable("currentTiddler") + "]]" // see getGraphData()
                   + "[field:title[" + output + "]]";
      this.view.setNodeFilter(filter);
    }
    
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
    
    if(this.editorMode === "vis") {
      return;
    }
    
    // register variables
    this.setVariable("var.viewLabel", this.getView().getLabel());
    this.setVariable("var.isViewBound", String(this.isViewBound()));
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
    var viewModifications = this.getView().refresh(changedTiddlers);
            
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
    
    if(this.editorMode) {
      // in any case give child widgets a chance to refresh
      this.refreshEditorBar(changedTiddlers, isViewSwitched, viewModifications);
    }

  };
  
  TaskGraphWidget.prototype.rebuildGraph = function() {
    
    this.logger("debug", "Rebuilding graph");
    
    // always reset to allow handling of stabilized-event!
    this.hasNetworkStabilized = false;
    
    this.graphData = this.getGraphData(true);
        
    this.network.setData(this.graphData, this.preventNextRepaint); // true => disableStart
        
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
    
    if(this.view.getLabel() === "quick_connect") { // special case
      var curNode = this.adapter.selectNodesByReference([ this.getVariable("currentTiddler") ], {
        outputType: "array",
        addProperties: {
          x: 0,
          y: 0,
          borderWidth: 1,
          color: {
            background: "#E6B293",
            border: "#FF6700"
          }
        }
      });
      nodes.update(curNode);
    }
      
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
  TaskGraphWidget.prototype.refreshEditorBar = function(changedTiddlers, isViewSwitched, viewModifications) {
    
    // @TODO viewModifications is actually really heavy. I could narrow this.
    if(isViewSwitched || viewModifications.length) {
      
      // full rebuild
      //this.logger("info", "The graphbar needs a full refresh");
      this.removeChildDomNodes();
      // update all variables and build the tree
      this.rebuildChildWidgets();
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
   */
  TaskGraphWidget.prototype.checkForGraphUpdates = function(changedTiddlers) {
            
    var nodeFilter = this.getView().getNodeFilter("compiled");
    
    var matchingChangedNodes = utils.getMatches(nodeFilter, Object.keys(changedTiddlers));
                                  
    // check for updated or modified nodes that match the filter
    if(matchingChangedNodes.length) {
      
      this.logger("info", "modified nodes", matchingChangedNodes);
      this.rebuildGraph();
      return;
      
    } else { // no node matches
      
      // check for nodes that do not match the filter anymore
      for(var tRef in changedTiddlers) {
        if(this.graphData.nodesByLabel[tRef]) {
          this.logger("info", "obsolete node", matchingChangedNodes);
          this.rebuildGraph();
          return;
          
        }
      }
    }
    
    var edgeFilter = this.getView().getEdgeFilter("compiled");
    var changedEdgestores = utils.getMatches(edgeFilter, Object.keys(changedTiddlers));
    
    if(changedEdgestores.length) {
      
      this.logger("info", "changed edge stores", changedEdgestores);
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
    
    window.addEventListener("click", this.handleClickEvent.bind(this), false);

    this.graphOptions = this.getGraphOptions();

    // init the graph with dummy data as events are not registered yet
    var dummyData = { nodes: [], edges: [] };
    this.network = new vis.Network(this.graphDomNode, dummyData, this.graphOptions);
                
    // repaint when sidebar is hidden
    if(!this.editorMode) {
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
  
  TaskGraphWidget.prototype.handleReconnectEdge = function(updatedEdge, callback) {

    var edge = this.graphData.edges.get(updatedEdge.id);
    $tw.utils.extend(edge, updatedEdge);
    
    this.adapter.deleteEdgesFromStore([
      { id: edge.id, label: edge.label }
    ], this.getView());
    
    this.adapter.insertEdge(edge, this.getView());
    
  };
  
  TaskGraphWidget.prototype.getGraphOptions = function() {
    
    // current vis options can be found at $tw.taskgraph.logger("log", this.network.constants);
    
    // get a copy of the options
    var options = this.wiki.getTiddlerData(this.opt.ref.visOptions);
    
    options.onDelete = this.handleRemoveElement.bind(this);
    options.onConnect = this.handleConnectionEvent.bind(this);
    options.onAdd = function(data, callback) { this.insertNode(data); }.bind(this);

    options.onEditEdge = this.handleReconnectEdge.bind(this);

    options.dataManipulation = {
        enabled : (this.editorMode ? true : false),
        initiallyVisible : (this.view.getLabel() !== "quick_connect"
                            && this.view.getLabel() !== "search_visualizer")
    };
        
    options.navigation = {
       enabled : true
    };
    
    options.clickToUse = (this.getAttribute("click-to-use") !== "false");
        
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
   * @param {vis.DataSet} nodes - The nodes for which to allow any
   *     movement (either by physics or by dragging).
   * @param {boolean} isEnabled - True, if the nodes are allowed to
   *     move or be moved.
   */    
  TaskGraphWidget.prototype.setNodesMoveable = function(ids, isMoveable) {

    //this.logger("log", "Nodes", ids, "can move:", isMoveable);

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

  TaskGraphWidget.prototype.insertNode = function(node) {
    this.preventNextRepaint = true;
    this.adapter.insertNode(node, {
      view: this.getView(),
      editNodeOnCreate: false
    });
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
      
      if(!this.editorMode) return;
      
      this.openDialog(this.opt.ref.nodeNameDialog, null, function(isConfirmed, outputTObj) {
        if(isConfirmed) {
          var node = properties.pointer.canvas;
          node.label = (outputTObj ? outputTObj.fields.text : "New Node");
          this.insertNode(node);
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
   * used to prevent nasty deletion as edges are not unselected when leaving vis
   */
  TaskGraphWidget.prototype.handleClickEvent = function(event) {

    if(!document.body.contains(this.parentDomNode)) {
      window.removeEventListener("click", this.handleClickEvent);
      return;
    }
    
    if(this.network) {
      var element = document.elementFromPoint(event.clientX, event.clientY);
      if(!this.parentDomNode.contains(element)) {
        this.network.selectNodes([]);
      }
    }

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
    
    //~ this.network.moveTo({
      //~ ...
    //~ });
    
  }
  
  TaskGraphWidget.prototype.maxEnlarge = function(container) {

    var windowHeight = window.innerHeight;
    var canvasOffset = utils.getDomNodePos(container).y;
    var distanceBottom = 10; // in pixel
    var calculatedHeight = windowHeight - canvasOffset - distanceBottom;
    container.style["height"] = calculatedHeight + "px";
    
  };
  
  // !! EXPORT !!
  exports.taskgraph = TaskGraphWidget;
  // !! EXPORT !!
  
})();

