/*\
title: $:/plugins/felixhayashi/taskgraph/taskgraph_graph.js
type: application/javascript
module-type: library
\*/

/**************************** IMPORTS ****************************/

var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;
var vis = require("$:/plugins/felixhayashi/vis/vis.js");
  
/***************************** CODE ******************************/
  
exports.getClass = function(constrObj) {
    
  /**
   * Class TaskGraphWidget
   */
  var TaskGraphWidget = function(parseTreeNode, options) {
    
    // addEventListeners automatically binds "this" object to handler, thus, no need for .bind(this)
    this.addEventListeners([
    
      {type: "tw-clone-view", handler: function() {
        var templateTObj = this.getCurView();
        this.handleCreateView(templateTObj);
      }},
      {type: "tw-create-view", handler: function() {
        this.handleCreateView(null);
      }},
      {type: "tw-delete-view", handler: this.handleDeleteView },
      {type: "tw-store-position", handler: this.handleStorePositions }
      
    ]);
    
  };
  
  // !! EXTENSION !!
  TaskGraphWidget.prototype = constrObj;
  // !! EXTENSION !!
  
  /**
   * BE VERY CAREFUL WITH THE ORDER OF THE FUNCTION CALLS IN THIS FUNCTION
   * @Override Widget.render():
   * Method to render this widget into the DOM
   */
  TaskGraphWidget.prototype.render = function(parent, nextSibling) {
    
    // remember the parent and add some classes
    this.registerParentDomNode(parent);
    
    // get the view-holder (contains the view-ref) and the current view
    this.curViewHolderRef = this.getCurViewHolderRef(this.getAttribute("view"));
    this.curView = this.getCurView(true, this.curViewHolderRef);
    
    // make sure the adapter is aware of the currently used view
    this.adapter.setView(this.curView);
    
    // rehister the current widget filter
    this.refreshWidgetFilter = this.getRefreshWidgetFilter();
        
    // create this object after the nodeFilter has been initialized
    this.nodes = this.adapter.selectNodesFromStore();
    this.edges = this.adapter.selectEdgesFromStore();
    
    // first append the bar if we are in editor mode
    if(this.getAttribute("editor")) {
      this.initAndRenderGraphBar(parent);
    }
    
    // now initialise graph variables and render the graph
    this.initAndRenderGraph(parent);
    
  };
  
  /**
   * The graph bar is also called the filterbar or graphview. It contains
   * several widgets that form a gui that allows the user to interact
   * with the current graphview.
   * @parent the dom node to be injected in.
   */
  TaskGraphWidget.prototype.initAndRenderGraphBar = function(parent) {
    
    this.graphBarDomNode = document.createElement("div");
    $tw.utils.addClass(this.graphBarDomNode, "filterbar");
    parent.appendChild(this.graphBarDomNode);
    
    this.rebuildChildWidgets();
    this.renderChildren(this.graphBarDomNode);
  };

  /**
   * Creates the widget tree and registers them
   * @see
   *   - [TW5] How to render widgets programmatically?
   *     https://groups.google.com/forum/#!topic/tiddlywikidev/sJrblP4A0o4
   */
  TaskGraphWidget.prototype.rebuildChildWidgets = function() {
    
    // Construct the child widgets
    
    var body = {
        type : "tiddler",
        attributes : {
          tiddler : { type : "string", value : this.getCurView().fields.title }
        },
        children : [{
          type : "transclude",
          attributes : {
            tiddler : { type : "string", value : "$:/plugins/felixhayashi/taskgraph/ui/graphBar" }
            //tiddler : { type : "string", value : "$:/core/ui/EditTemplate/tags" }
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
   * 1) checking for callbacks: some processes decided at runtime to 
   * listen to changes of single tiddlers (for example dialogs waiting
   * for results). So at first it is checked if a callback is triggered.
   * 
   * 2) checking for view changes: a view may be replaced (switched)
   * or modified. This will result in recalculation of the graph.
   * 
   * 3) checking for graph refresh: does the graph need an update
   * because nodes/edges have been modified, added or removed or the
   * view has changed?
   * 
   * 4) checking for graphbar refresh: Did some widgets need a rerendering
   * due to changes that affect the topbar (view switched or modified)?
   * 
   * @override Widget.refresh();
   * @see
   *   - [TW5] Plugin does not listen to changes
   *     https://groups.google.com/d/msg/tiddlywikidev/hwtX59tKsIk/EWSG9glqCnsJ
   * 
   * TODO: return true, false to allow wrapper widgets
   * 
   */
  TaskGraphWidget.prototype.refresh = function(changedTiddlers) {
    
    $tw.taskgraph.fn.console.log(changedTiddlers);
        
    // in any case, check for callbacks triggered by tiddlers
    this.checkForCallbacks(changedTiddlers);
    
    // might alter the filter and trigger a rebuild
    this.checkForViewChanges(changedTiddlers);

    this.refreshGraph(changedTiddlers);
    
    if(this.getAttribute("editor")) {
      this.refreshGraphBar(changedTiddlers);
    }

  };
  
  /**
   * Function that has to be called before the graph or the childwidgets
   * check for a refresh. It checks whether the view has been switched
   * to another view or any changes have been made to the current view.
   */
  TaskGraphWidget.prototype.checkForViewChanges = function(changedTiddlers) {
    
    // TODO: turn all this stuff into a compiled filter!!
    var isViewSwitched = (this.getCurViewHolderRef() in changedTiddlers);
    var isViewModified = (this.getCurView().fields.title in changedTiddlers);
    var isEdgeFilterModified = ((this.getCurView().fields.title + "/filter/edges") in changedTiddlers);
    
    // was the map modified from outside?
    var isMapModified = ((this.getCurView().fields.title + "/map") in changedTiddlers);
    var isMapModifiedFromOutside = (isMapModified && !this.isResponsibleForMapModification);
    
    if(isViewSwitched || isViewModified || isMapModifiedFromOutside) {
            
      $tw.taskgraph.fn.console.info("view switched or modified!");
      this.curView = this.getCurView(true);
      
      // recreate the widget filter
      this.refreshWidgetFilter = this.getRefreshWidgetFilter();
      
      // rebuild the graph
      $tw.taskgraph.fn.console.debug("reload graph data");
      
      this.reloadGraphData();
      
    } else if(isEdgeFilterModified) {
      
      var reloadOnlyEdges = true;
      this.reloadGraphData(reloadOnlyEdges);
      
    }
    
    // in anycase reset isResponsibleForMapModification
    this.isResponsibleForMapModification = false;
    
  };
  
  /**
   * This method will ckeck if any tw-widget needs a refresh.
   * The decision whether or not to refresh is based on the 
   * current refreshWidgetFilter.
   */
  TaskGraphWidget.prototype.refreshGraphBar = function(changedTiddlers) {
       
    var result = utils.getMatches(this.refreshWidgetFilter, changedTiddlers);
    
    if(result.length) {
      
      //~ console.log(result);
      //~ 
      //~ if(result.indexOf("$:/temp/NewTagName") != -1) {
        //~ 
        //~ var tagInput = this.parentDomNode.getElementsByClassName("tc-edit-tags")[0]
                           //~ .getElementsByTagName("input")[0];
                           //~ 
        //~ console.log("active Element");
        //~ console.log(document.activeElement);
        //~ console.log("has focus?");
        //~ console.log(document.hasFocus());
        //~ console.log("are the same?");
        //~ console.log(tagInput == document.activeElement);
                           //~ 
        //~ if(tagInput == document.activeElement) {
          //~ return false;
        //~ }
        //~ 
      //~ }
      
      $tw.taskgraph.fn.console.info("the graphbar needs to refresh its widgets");
      
      // rebuild
      this.removeChildDomNodes();
      this.rebuildChildWidgets();
      this.renderChildren(this.graphBarDomNode);
      
      return true;
    }
    
    // all good
    return true;
    
  };
  
  /**
   * Function to check if the graph needs a refresh.
   * Nodes and edges may have been removed, added or modified.
   * Every decision is based on the current view.
   */
  TaskGraphWidget.prototype.refreshGraph = function(changedTiddlers) {

    // this array holds references to graphnodes that shall be removed
    // because (1) the corresponding tiddlers do not match the view anymore
    // or (2) the tiddlers cannot be traced anymore (either due to a
    // delete of the tiddler or a rename while using non-id mode)
    var deleteCandidates = [];
    
    for(var tRef in changedTiddlers) {
      
      if(this.wiki.isSystemTiddler(tRef)) {
      
        // did any change occur to an edgestore that is relevant for this view?
        
        var existEdgeChanges = utils.isMatch(tRef, this.adapter.getCompiledEdgeFilter());
                
        if(existEdgeChanges) {
          // indeed. then get a list of changes
          var changes = this.adapter.getEdgeChanges();
          for(var i = 0; i < changes.length; i++) {
            if(changes[i].type == "insert" || changes[i].type == "update") {
              this.edges.update(changes[i].edge);
            } else { // must be a delete then
              this.edges.remove(changes[i].edge.id);
            }
          }
        }
        
        continue;
        
      }
      
      // try to turn the tRef into a tObj
      var tObj = this.wiki.getTiddler(tRef);
      
      if(!tObj) {

        // no reference available: tiddler got deleted or renamed!
        // We don't know if the tiddler was relevant for the graph or
        // not, as we do not have access to its metadata.

        // nodes will be deleted unless it is discovered that the
        // corresponding tiddler only got renamed. Finding out
        // whether a tiddler got renamed or not is only only possible,
        // if the tiddler title is not used as id field.
        
        // extracting the label from the path to trace the node
        var label = utils.getBasename(tRef);
        // search dataset for nodes with the same **label**
        var filter = function(node) { return node.label == label; }
        var ids = this.nodes.getIds({ filter: filter });
        deleteCandidates = deleteCandidates.concat(ids);
        
        continue;
      }
      
      // Tiddler exists
      
      // we don't care about drafts
      if(tObj.isDraft()) { continue; }

      // check if tiddler is relevant for this graph
      if(!utils.isMatch(tObj, this.adapter.getCompiledNodeFilter())) {
        
        // search the dataset for nodes with the same **id**
        // because maybe was in the view before and isn't anymore
        var id = tObj.fields[$tw.taskgraph.opt.tw.fields.id];
        var filter = function(node) { return node.id == id; };
        var ids = this.nodes.getIds({ filter: filter });
        deleteCandidates = deleteCandidates.concat(ids);
        
        continue;
      }
      
      // before adding the tiddler, make sure it has a proper id
      tObj = this.adapter.setupTiddler(tObj);
      
      var data = {
          id : tObj.fields[$tw.taskgraph.opt.tw.fields.id],
          label : tObj.fields.label || tObj.fields.title,
          name: tObj.fields.title
      };
                
      // if id is in deleteCandidate, remove it from the list, as it only got renamed!
      var index = deleteCandidates.indexOf(data.id);
      if(index != -1) deleteCandidates.splice(index, 1);
      
      this.nodes.update(data);
       
    }
    
    // all remaining ids need to be removed
    if(deleteCandidates.length > 0) {
      this.nodes.remove(deleteCandidates);
    }
  }
  
  /**
   * Rebuild the graph
   * 
   * @see
   *   - http://visjs.org/docs/network.html
   *   - http://visjs.org/docs/dataset.html
   */
  TaskGraphWidget.prototype.initAndRenderGraph = function(parent) {
    
    $tw.taskgraph.fn.console.info("initializing and rendering the graph");
    
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
    
    var graphData = {
      nodes : this.nodes,
      edges : this.edges
    }
    
    // render the graph
    this.network = new vis.Network(this.graphDomNode, graphData, this.graphOptions);
    
    // register events
    this.network.on("doubleClick", this.handleDoubleClickEvent.bind(this));
    
    this.network.on("stabilized", this.handleStabilizedEvent.bind(this));
        
    // repaint when sidebar is hidden
    this.registerCallback("$:/state/sidebar", this.repaintGraph.bind(this), false);
    
    this.network.on("dragEnd", function(properties) {
      if(properties.nodeIds.length) {
        this.nodes.update({
          id: properties.nodeIds[0],
          allowedToMoveX: false,
          allowedToMoveY: false
        });
        this.handleStorePositions();
      }
    }.bind(this));
    
    this.network.on('dragStart', function(properties) {
      this.nodes.update({
        id: properties.nodeIds[0],
        allowedToMoveX: true,
        allowedToMoveY: true
      });
    }.bind(this));
    
    // position the graph
    this.repaintGraph();
    
  }
  
  /**
   * Replace the current set of nodes and edges of the graph with
   * a fresh select.
   * 
   * ATTENTION: Always be sure the adapter's setView is called
   * before the select is made. Otherwise the old view is used as
   * a basis for the select.
   * 
   * @see
   *   - It is possible that the position of network stay the same after I call network.setData(newData);
   *     https://github.com/almende/vis/issues/376
   * 
   */
  TaskGraphWidget.prototype.reloadGraphData = function(reloadOnlyEdges) {
    
    $tw.taskgraph.fn.console.log("reload graph data");
    
    // update adapter
    this.adapter.setView(this.curView);
    
    // update the this-properties which are also accessed at some other places
    if(!reloadOnlyEdges) { this.nodes = this.adapter.selectNodesFromStore(); }
    this.edges = this.adapter.selectEdgesFromStore();
    
    // has to be set to disable allowMoveX and Y after stabilized event
    this.hasNetworkStabilized = false;
    
    this.network.setData({
      nodes : this.nodes,
      edges : this.edges
    });
        
  };
    
  /**
   * If a template is specified, create a snapshot from the given
   * view (= a clone), otherwise, create an empty view. In any case
   * a dialog is opened that asks the user how to name the view.
   * The view is then registered as current view.
   */
  TaskGraphWidget.prototype.handleCreateView = function(templateTObj) {

    // TODO: option paths seriously need some refactoring!
    var dialogSkeleton = this.wiki.getTiddler($tw.taskgraph.opt.tw.template.dialog.getViewName);
    
    // used inside dialog and for the notification
    var verb = (templateTObj ? "clone" : "create");
    
    this.openDialog(dialogSkeleton, { verb : verb }, function(isConfirmed, outputTObj) {
    
      var isSuccess = isConfirmed && outputTObj && outputTObj.fields.text;
    
      if(isSuccess) {
        
        var viewname = utils.getBasename(outputTObj.fields.text);
                
        var fields = {};
        fields.title =  $tw.taskgraph.opt.tw.prefix.views + "/" + viewname;
        fields[$tw.taskgraph.opt.tw.fields.viewMarker] = true;
        
        if(!templateTObj) {
          // simply copy the body to get a transclude of graphBar
          fields.text = this.curView.fields.text;
        }
        
        this.wiki.addTiddler(new $tw.Tiddler(templateTObj, fields));
        
        this.setCurView(fields.title);
        
        // past tense :)
        $tw.taskgraph.fn.notify("view " + verb + "d");
        
      }

    }.bind(this));
  };

  TaskGraphWidget.prototype.handleDeleteView = function() {
    
    var tRef = this.getCurView().fields.title;
    var viewname = utils.getBasename(tRef);
    
    if(viewname == "default") {
      $tw.taskgraph.fn.notify("Thou shalt not kill the default view!");
      return;
    }
    $tw.taskgraph.fn.console.log("bla");
    // regex is non-greedy
    var filter = "[regexp:text[<\\$taskgraph.*?view=." + viewname + "..*?>]]";
    $tw.taskgraph.fn.console.log(filter);
    var matches = utils.getMatches(filter);
    $tw.taskgraph.fn.console.log(matches);
    if(matches.length) {
      
      var fields = {
        count : matches.length.toString(),
        filter : filter
      };
      var tRef = $tw.taskgraph.opt.tw.template.dialog.notAllowedToDeleteView;
      var dialogSkeleton = this.wiki.getTiddler(tRef);
      this.openDialog(dialogSkeleton, fields, null);

      return;
      
    }

    var message = "You are about to delete the view " + 
                  "''" + viewname + "'' (no tiddler currently references this view).";
                  
    this.openStandardConfirmDialog(function(isConfirmed) {
      if(!isConfirmed) return;
      
      var defaultViewTRef = $tw.taskgraph.opt.tw.prefix.views + "/default";
      
      // first, switch the view to the ever-existing default view
      this.setCurView(defaultViewTRef);

      // now delete the view and all tiddlers stored in its path (map, edge-filter etc.)
      var filter = "[prefix[" + $tw.taskgraph.opt.tw.prefix.views + "/" + viewname + "]]";
      utils.deleteTiddlers(utils.getMatches(filter));

      // notify the user
      $tw.taskgraph.fn.notify("view \"" + viewname + "\" deleted ");

    }.bind(this), message);
    
  };
  
  /**
   * Called by vis when the user tries to delete a node or an edge.
   * @data { nodes: [selectedNodeIds], edges: [selectedEdgeIds] }
   */
  TaskGraphWidget.prototype.handleNetworkDeleteEvent = function(data, callback) {
    
    if(data.edges.length && !data.nodes.length) { // only deleting edges
      this.adapter.deleteEdgesFromStore(this.edges.get(data.edges));
      callback(data);
      $tw.taskgraph.fn.notify("edge" + (data.edges.length > 1 ? "s" : "") + " removed");
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
          var nodes = this.nodes.get(data.nodes);
          var edges = this.edges.get(data.edges);
          
          this.adapter.deleteNodesFromStore(nodes);
          this.adapter.deleteEdgesFromStore(edges);
          
          $tw.taskgraph.fn.notify("node" + (data.nodes.length > 1 ? "s" : "") + " removed");
        
      }.bind(this));
    }     
  }
  
  TaskGraphWidget.prototype.handleStorePositions = function() {
    // this is a flag to tell the current graph not to update itself
    this.isResponsibleForMapModification = true;
    this.adapter.storePositions(this.network.getPositions());
    //this.network.storePositions();
    $tw.taskgraph.fn.notify("positions stored");
  }

  /**
   * Called by vis when the graph has stabilized itself.
   * 
   * ATTENTION: never store positions in a views map during stabilize
   * as this will affect other graphs positions and will cause recursion!
   * Storing positions inside vis' nodes is fine though
   */
  TaskGraphWidget.prototype.handleStabilizedEvent = function(properties) {
    
    if(!this.hasNetworkStabilized) {
      
      var ids = this.nodes.getIds();
      var updates = [];
      for(var i = 0; i < ids.length; i++) {
        updates.push({
          id: ids[i],
          allowedToMoveX: false,
          allowedToMoveY: false
        });
      }
      
      this.nodes.update(updates);
      
      this.hasNetworkStabilized = true;
    }
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
        
    // doubleclicked on an empty spot
    if(!properties.nodes.length && !properties.edges.length) {
            
      this.adapter.createNode(properties.pointer.canvas, this);
      
    } else {
      
       if(properties.nodes.length) { // clicked on a node

        $tw.taskgraph.fn.console.info("doubleclicked on a node");
        $tw.taskgraph.fn.console.debug(properties);

        var id = properties.nodes[0];
        var targetTitle = this.nodes.get(id).name || this.nodes.get(id).label;
        //this.network.focusOnNode(properties.nodes[0], {});
        
      } else if(properties.edges.length) { // clicked on an edge
        
        $tw.taskgraph.fn.console.info("doubleclicked on an edge");
        $tw.taskgraph.fn.console.debug(properties);
        // TODO: use returnType option!
        var label = this.edges.get(properties.edges[0]).label;
        var targetTitle = $tw.taskgraph.opt.tw.prefix.edges + "/" + label;
      
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
    
    if(!this.network) {
      $tw.taskgraph.fn.console.warn("graph has not been initialized yet");
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
   * @viewName the value of the view attribute specified in the widget
   *     tags.
   */
  TaskGraphWidget.prototype.getCurViewHolderRef = function(viewName) {
    
    // the viewholder is never recalculated once it exists
    if(this.curViewHolderRef) return this.curViewHolderRef;
    
    $tw.taskgraph.fn.console.info("retrieving or generating the view holder reference");
    
    // if given, try to retrieve the viewHolderRef by specified attribute
    if(viewName) {
      
      $tw.taskgraph.fn.console.log("user wants to bind " + viewName + " to graph");
      
      // create a view holder that is exclusive for this graph
      
      var viewRef = $tw.taskgraph.opt.tw.prefix.views + "/" + viewName;
      if(this.wiki.tiddlerExists(viewRef)) {
        var viewHolderRef = $tw.taskgraph.opt.tw.prefix.localHolders + "/" + vis.util.randomUUID();
        $tw.taskgraph.fn.console.debug("using an independent temporary view holder: \"" + viewHolderRef + "\"");
        
        this.wiki.addTiddler(new $tw.Tiddler({ 
          title : viewHolderRef,
          text : viewRef
        }));
        
        return viewHolderRef;
      }
      
    }
    
    // if nothing has been returned yet, return the default
    $tw.taskgraph.fn.console.debug("setting view holder to the global default");
    return $tw.taskgraph.opt.tw["defaultGraphViewHolder"];
    
  };
  
  /**
   * This function will switch the current view reference of the
   * view holder. If no viewRef is specified, the current view is
   * simply updated.
   * 
   * @viewRef (optional) a reference (tiddler title) to a view
   * @viewHolderRef (optional) a reference to the view holder that should be updated
   */
  TaskGraphWidget.prototype.setCurView = function(viewRef, viewHolderRef) {
    
    if(viewRef) {
      if(!viewHolderRef) viewHolderRef = this.curViewHolderRef;
      $tw.taskgraph.fn.console.info("setting the value of view holder \"" + viewHolderRef + " to \"" + viewRef + "\"");
      this.wiki.addTiddler(new $tw.Tiddler({ 
        title : viewHolderRef,
        text : viewRef
      }));
    }
    
    // register the new value; no need to update the adapter as this is done during refresh
    this.curView = this.getCurView(true);
  };
  
  TaskGraphWidget.prototype.getCurView = function(isReextract, viewHolderRef) {
    
    // if already exists and not asked to reextract, use cached object...
    if(this.curView && !isReextract) return this.curView;
    
    // otherwise reextract it
    if(!viewHolderRef) viewHolderRef = this.getCurViewHolderRef();
    $tw.taskgraph.fn.console.info("reextracting current view from \"" + viewHolderRef + "\"");
    
    var curViewRef = this.wiki.getTiddler(viewHolderRef).fields.text;
    
    $tw.taskgraph.fn.console.log("the extracted view is");
    $tw.taskgraph.fn.console.log(curViewRef);
    
    if(!this.wiki.tiddlerExists(curViewRef)) {
      $tw.taskgraph.fn.console.log("Warning: View \"" + curViewRef + "\" doesn't exist. Default is used instead.");
      //$tw.taskgraph.fn.notify("Warning: View \"" + curViewRef + "\" doesn't exist. Default is used instead.");
      curViewRef = $tw.taskgraph.opt.tw.prefix.views + "/default";
    }
    
    this.wiki.getTiddler(curViewRef)
    
    return this.wiki.getTiddler(curViewRef);
    
  };
  
  TaskGraphWidget.prototype.getGraphOptions = function() {
    
    // current vis options can be found at $tw.taskgraph.fn.console.log(this.network.constants);
    
    // get a copy of the options
    var options = this.wiki.getTiddlerData("$:/plugins/felixhayashi/taskgraph/options/vis");
    
    options.onDelete = this.handleNetworkDeleteEvent.bind(this);
    options.onConnect = function(data, callback) {
      // we do not call the callback of the network as we handle it ourselves
      this.handleConnectionEvent(data);
    }.bind(this);
    
    options.onAdd = function(data,callback) {
      this.adapter.createNode(data, this);
    }.bind(this);

    options.dataManipulation = {
        enabled : (this.getAttribute("editor") ? true : false),
        initiallyVisible : true
    };
        
    options.navigation = {
       enabled : true
    };
    
    return options;
    
  };
  
  TaskGraphWidget.prototype.getRefreshWidgetFilter = function() {

    var filter = 
          // tag was added
          "[field:title[$:/temp/NewTagName]] " +
          // whole view was changed
          "[field:title[" + this.getCurViewHolderRef() + "]] " +
          // maybe a new edgetype was created
          "[prefix[" + $tw.taskgraph.opt.tw.prefix.edges + "]] " +
          // view property was changed
          "[field:title[" + this.getCurView().fields.title + "]] " +
          // everything that has to do with the editor
          "[prefix[$:/temp/taskgraph/editor/]] " +
          // autocomplete while entering tag
          "[prefix[$:/state/popup/tags-auto-complete]]";
    
    $tw.taskgraph.fn.console.debug("whether to refresh childwidgets is determined by this filter: " + filter);

    var compiledFilter = this.wiki.compileFilter(filter);
    
    return compiledFilter;

  };
  
  
  TaskGraphWidget.prototype.repaintGraph = function() {
    
    $tw.taskgraph.fn.console.info("repainting the whole graph");
    
    this.network.redraw();
    this.network.zoomExtent();
    
  }
  
  TaskGraphWidget.prototype.maxEnlarge = function(container) {

    var windowHeight = window.innerHeight;
    // https://developer.mozilla.org/en-US/docs/Web/API/element.getBoundingClientRect
    var canvasOffset = container.getBoundingClientRect().y;
    var distanceBottom = 15; // in pixel
    var calculatedHeight = windowHeight - canvasOffset - distanceBottom;
    
    container.style["height"] = calculatedHeight + "px";
    
  };
  
  return TaskGraphWidget;

}
