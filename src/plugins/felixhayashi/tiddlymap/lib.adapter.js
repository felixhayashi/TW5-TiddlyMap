/*\

title: $:/plugins/felixhayashi/tiddlymap/adapter.js
type: application/javascript
module-type: library

@preserve

\*/

(function(){

  /**************************** IMPORTS ****************************/

    var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
    var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/view_abstraction.js").ViewAbstraction;
    var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;
    var vis = require("$:/plugins/felixhayashi/vis/vis.js");
    
  /***************************** CODE ******************************/

  /**
   * This library provides all the functions to interact with the TW as if
   * it was a simple database for nodes and edges. It may be understood as an abstraction
   * layer.
   * 
   * Everything that is related to retrieving or inserting nodes and edges is
   * handled by the adapter.
   * 
   * @constructor
   * @param {object} wiki - An optional wiki object
   */
  var Adapter = function() {
    
    // create shortcuts and aliases
    this.wiki = $tw.wiki;
    this.opt = $tw.tmap.opt;
    this.logger = $tw.tmap.logger;
    
  };
    
  Adapter.prototype.deleteEdge = function(edge) {
        
    return this._processEdge(edge, "delete");
    
  };

  /**
   * Removes multiple edges from several stores.
   * 
   * @param {EdgeCollection} edges - The edges to be deleted
   */
  Adapter.prototype.deleteEdges = function(edges) {
    
    edges = utils.convert(edges, "array");
    for(var i = 0; i < edges.length; i++) {
      //~ if(utils.startsWith(edges[i].type, this.opt.misc.sysEdgeTypeNS));
      this.deleteEdge(edges[i]);
    }
    
  };
    
  /**
   * Persists an edge by storing the vector (from, to, type). This
   * vector is unique and may **not** exist multiple times.
   * 
   * @param {Edge} edge - The edge to be saved
   */  
  Adapter.prototype.insertEdge = function(edge) {
    
    return this._processEdge(edge, "insert");
    
  };
    
  Adapter.prototype._processEdge = function(edge, action) {
    
    this.logger("debug", "Edge", action, edge);

    if(typeof edge !== "object" || !action || !edge.from) return;
    if(action === "insert" && !edge.to) return;
    if(action === "delete" && !edge.id) return;
    
    // get from-node and corresponding tiddler
    
    var fromTObj = utils.getTiddler($tw.tmap.indeces.tById[edge.from]);
    if(!fromTObj) return;

    if(!edge.id) edge.id = utils.genUUID();
    
    var type = new EdgeType(edge.type);
    var connections = utils.parseFieldData(fromTObj.fields.title,
                                     this.opt.field.edges, {});
        
    if(action === "insert") { 
      
      connections[edge.id] = {
        to: edge.to,
        type: type.getId()
      };
      
      if(!type.exists()) {
        type.persist();
      }
      
    } else if(action === "delete") {
      
      delete connections[edge.id];
      
    }
    
    // save updated data
    utils.writeFieldData(fromTObj.fields.title, this.opt.field.edges, connections);

    return edge;
        
  };
    
  Adapter.prototype.getAdjacencyList = function(groupBy, opts) {
    
    $tw.tmap.start("Creating adjacency list");
    
    if(!opts) opts = {};
    
    if(!opts.edges) {
      var tRefs = utils.getMatches(this.opt.selector.allPotentialNodes);
      opts.edges = this.getAllOutgoingEdges(tRefs, opts);
    }
    var adjList = utils.groupByProperty(opts.edges, groupBy);
    
    $tw.tmap.stop("Creating adjacency list");
    
    return adjList;
    
  };
  
  Adapter.prototype.getNeighbours = function(tiddlers, opts) {
    
    $tw.tmap.start("Get neighbours");
    
    opts = opts || {};
    
    // clone array
    tiddlers = tiddlers.slice();
    
    var protoNode = opts.addProperties;
    var adjList = this.getAdjacencyList("to", opts);
    var neighEdges = utils.getDataMap();
    var neighNodes = utils.getDataMap();
    
    var maxSteps = (parseInt(opts.steps) > 0 ? opts.steps : 1);
        
    var discover = function() {
      
      var lookupTable = utils.getArrayValuesAsHashmapKeys(tiddlers);
      
      // backwards so we can add neighbours to the set for next run
      for(var i = tiddlers.length-1; i >= 0; i--) {
        
        if(utils.isSystemOrDraft(tiddlers[i])) continue;
        
        // only outgoing edges that point to tiddlers not included in the set
        // to-part = neighbour
        var outgoing = this.getEdges(tiddlers[i], opts);
        for(var id in outgoing) {
          var toTRef = $tw.tmap.indeces.tById[outgoing[id].to];
          if(lookupTable[toTRef]) continue; // included in original set
          if(!neighNodes[outgoing[id].to]) {
            var node = this.makeNode(toTRef, protoNode, opts.view);
            if(node) { // ATTENTION: edges may be obsolete
              neighNodes[outgoing[id].to] = node;
              tiddlers.push(toTRef);
            }
          }
        }
        $tw.utils.extend(neighEdges, outgoing);
        
        // from part = neighbour or part of original set
        var incoming = adjList[$tw.tmap.indeces.idByT[tiddlers[i]]];
        if(incoming) {
          for(var j = 0; j < incoming.length; j++) {
            var fromTRef = $tw.tmap.indeces.tById[incoming[j].from];
            if(lookupTable[fromTRef]) continue; // included in original set
            if(!neighNodes[incoming[j].from]) {              
              var node = this.makeNode(fromTRef, protoNode, opts.view);
              if(node) {
                neighNodes[incoming[j].from] = node; // ATTENTION: edges may be obsolete
                tiddlers.push(fromTRef);
              }
            }
            neighEdges[incoming[j].id] = incoming[j];
          }
        }
      }
    }.bind(this);
    
    for(var steps = 0; steps < maxSteps; steps++) {
      var beforeSize = tiddlers.length;
      discover();
      if(beforeSize === tiddlers.length) break;
    }
    
    if(opts.view) {
      this._restorePositions(neighNodes, opts.view);
    }
    
    var neighbourhood = { nodes: neighNodes, edges: neighEdges };
    
    this.logger("debug", "Retrieved neighbourhood", neighbourhood, "steps", steps);
    
    $tw.tmap.stop("Get neighbours");
    
    return neighbourhood;
    
  };
  
  Adapter.prototype.getGraph = function(filter, options) {
    
    $tw.tmap.start("Assembling Graph");
    
    options = options || {};

    var view = new ViewAbstraction(options.view);
    var matches = utils.getMatches(filter);
        
    var graph = {};
    graph.nodes = this.selectNodesByReferences(matches, {
      view: view,
      outputType: "hashmap",
      addProperties: {  group: "matches" }
    });
    
    graph.edges = this.getAllOutgoingEdges(matches, {
      toFilter: utils.getArrayValuesAsHashmapKeys(matches),
      toFilterStyle: "whitelist",
      typeFilter: view.getTypeWhiteList(),
      typeFilterStyle: "whitelist"
    });
    
    if(options.neighbourhoodScope) {
      var neighbours = this.getNeighbours(matches, {
        steps: options.neighbourhoodScope,
        view: view,
        typeFilter: view.getTypeWhiteList(),
        typeFilterStyle: "whitelist",
        addProperties: {
          group: "neighbours"
        }
      });
      $tw.utils.extend(graph.edges, neighbours.edges);
      $tw.utils.extend(graph.nodes, neighbours.nodes);
    }
        
    $tw.tmap.stop("Assembling Graph");
    
    this.logger("debug", "Assembled graph:", graph);
    
    return graph;
    
  };
  
  /**
   * Returns all outgoing edges of a given tiddler. This includes
   * virtual edges (links, tag-relations) and user created relations.
   * 
   * @param {Hashmap<TiddlerReference, *>} [opts.toFilter.filter]
   *     A hashmap on which basis it is decided, whether to include
   *     an edge with a certain to-value in the result or not.
   *     `toFilter` hashmap are included.
   * @param {string} [opts.toFilter.type="blacklist"]
   *       Either "blacklist" or "whitelist".
   * @param {Hashmap<string, *>} [opts.typeFilter.filter]
   *     A hashmap on which basis it is decided, whether to include
   *     an edge of a given type in the result or not.
   * @param {string} [opts.typeFilter.type="blacklist"]
   *       Either "blacklist" or "whitelist".
   * @return {Hashmap<Id, Edge>} An edge collection.
   */
  Adapter.prototype.getEdges = function(tiddler, opts) {

    if(!utils.tiddlerExists(tiddler) || utils.isSystemOrDraft(tiddler)) {
      return;
    }
    
    if(!opts) opts = {};
    var toFiltr = opts.toFilter || utils.getDataMap();
    var isWhitelistToFiltr = (opts.toFilterStyle === "whitelist");
    var tyFiltr = opts.typeFilter || utils.getDataMap();
    var isWhitelistTyFiltr = (opts.typeFilterStyle === "whitelist");
    
    var fromTRef = utils.getTiddlerRef(tiddler);
    var tObj = utils.getTiddler(fromTRef);
    var edges = utils.getDataMap();
    
    var connections = utils.parseFieldData(tObj, this.opt.field.edges, {});
    
    for(var conId in connections) {
      var con = connections[conId];
      var toTRef = $tw.tmap.indeces.tById[con.to];
      if(!toTRef) continue;
      if(isWhitelistToFiltr ? toFiltr[toTRef] : !toFiltr[toTRef]) { // TODO: create util function
        if(isWhitelistTyFiltr ? tyFiltr[con.type] : !tyFiltr[con.type]) {
          var edge = this.makeEdge(this.getId(fromTRef), con.to, con.type, conId);
          if(edge) {
            edges[conId] = edge;
          }
        }
      }
    }
    
    var buildAutoEdges = function(refsByType) {
      
      for(var type in refsByType) {
        
        var isDisplayed = (isWhitelistTyFiltr ? tyFiltr[type] : !tyFiltr[type]);
        if(!isDisplayed) continue;
        
        var toRefs = refsByType[type];
        type = new EdgeType(type);
        
        for(var i = 0; i < toRefs.length; i++) {
          
          var toTRef = toRefs[i];
          
          if(!$tw.wiki.tiddlerExists(toTRef)) continue;
          if(utils.isSystemOrDraft(toTRef)) continue;
          
          if(isWhitelistToFiltr ? toFiltr[toTRef] : !toFiltr[toTRef]) {
            // using a hash here has the advantage that ids are unique and
            // only change if the underlying link/tag changes
            var id = type.getId() + $tw.utils.hashString(fromTRef + toTRef); 
            var edge = this.makeEdge(this.getId(fromTRef), this.getId(toTRef), type, id);

            if(edge) {
              edges[edge.id] = edge;
            }
          }
        }
      }
    }.bind(this);
    
    buildAutoEdges({
      "tmap:tag": tObj.fields.tags || [],
      "tmap:link": this.wiki.getTiddlerLinks(fromTRef)
    });

    return edges;

  };
    
  /**
   * @param {Hashmap.<Id, Tiddler>} tiddlers
   * @param {Hashmap<string, *>} [typeFilter] - Only edges where
   *     the type is contained in the `typeFilter` are included.
   * @return {Hashmap<Id, Edge>} An edge collection.
   */
  Adapter.prototype.getAllOutgoingEdges = function(tiddlers, opts) {

    var edges = utils.getDataMap();

    for(var i = 0; i < tiddlers.length; i++) {
      $tw.utils.extend(edges, this.getEdges(tiddlers[i], opts));
    }
    
    return edges;

  };
  
  /**
   * Returns a set of edges where the edge labels match the labels
   * specified.
   *
   * @param {array<string>} typeList - An array of edge types (without any path prefix).
   * @param {Hashmap} [options] - An optional options object.
   * @param {CollectionTypeString} [options.outputType="dataset"] - The result type.
   * @param {View} [options.view] - A view that is used to filter private edges.
   * @return {EdgeCollection} A collection of a type specified in the options.
   */
  Adapter.prototype.selectEdgesByType = function(typeList, options) {

    //~ if(!options || typeof options !== "object") options = {};
//~ 
    //~ var whiteList = utils.getArrayValuesAsHashmapKeys(typeList);
    //~ var allTiddlersLT = utils.getMatches(this.opt.selector.allPotentialNodes, null, true);
    //~ var result = this.getEdges(allTiddlersLT, whiteList);
        //~ 
    //~ return utils.convert(result, options.outputType);
    
  };
  
  /**
   * 
   * 
   */
  Adapter.prototype._processEdgesWithType = function(type, task) {

    type = new EdgeType(type);

    
    this.logger("debug", "Processing edges", type, task);
    
    // get edges
    
    var typeWhiteList = utils.getDataMap();
    typeWhiteList[type.getId()] = true;
    
    var tRefs = utils.getMatches(this.opt.selector.allPotentialNodes);
    var edges = this.getAllOutgoingEdges(tRefs, {
      typeFilter: typeWhiteList,
      typeFilterStyle: "whitelist"
    });
    
    if(task.action === "rename") {
      
      // clone type first to prevent auto-creation
      
      var newType = new EdgeType(task.newName);
      newType.loadDataFromType(type);
      newType.persist();
        
    }
    
    // iterate over edges
    
    for(var id in edges) {
      
      if(task.action === "rename") {
        
        this._processEdge(edges[id], "delete");
        edges[id].type = task.newName;
        this._processEdge(edges[id], "insert");
        
      } else if(task.action === "delete") {

        this._processEdge(edges[id], "delete");
        
      }

    }
    

    
    // finally remove the type
    $tw.wiki.deleteTiddler(type.getPath());

  };

  /**
   * Returns a set of nodes that corresponds to the given filter.
   *
   * @param {TiddlyWikiFilter} filter - The filter to use.
   * @param {Hashmap} [options] - An optional options object.
   * @param {Hashmap} [options.!! INHERITED !!] - See {@link Adapter#selectNodesByReferences}.
   * @return {NodeCollection} A collection of a type specified in the options.
   */
  Adapter.prototype.selectNodesByFilter = function(filter, options) {
    
    var matches = utils.getMatches(filter);
    return this.selectNodesByReferences(matches, options);

  };

  /**
   * Returns a set of nodes that corresponds to a set of tiddlers.
   * 
   * @param {TiddlerCollection} tiddlers - A collection of tiddlers.
   * @param {Hashmap} [options] - An optional options object.
   * @param {CollectionTypeString} [options.outputType="dataset"] - The result type.
   * @param {View} [options.view] - A viewname used to retrieve positions
   * @param {Hashmap} [options.addProperties] - a hashmap
   *     containing properties to be added to each node.
   *     For example:
   * 
   *     {
   *       group: "g1",
   *       color: "red"
   *     }
   * 
   * @return {NodeCollection} A collection of a type specified in the options.
   */
  Adapter.prototype.selectNodesByReferences = function(tiddlers, options) {

    options = options || {};

    var protoNode = options.addProperties;
    var result = utils.getDataMap();
    var keys = Object.keys(tiddlers);
    for(var i = 0; i < keys.length; i++) {
      
      var node = this.makeNode(tiddlers[keys[i]], protoNode, options.view);
      if(node) { result[node.id] = node; }  // ATTENTION: edges may be obsolete
          
    }
    
    if(options.view) {
      this._restorePositions(result, options.view);
    }
      
    return utils.convert(result, options.outputType);
    
  };

  /**
   * Sets up an edge object that is ready to be consumed by vis.
   * 
   * @param {$tw.Tiddler|Id} from - A tiddler **object** or a node id
   *     representing the from part of the relationship.
   * @param {Object} connection - The connection object having
   *     the properties *to*, *id*, *type*.
   * @param {string|EdgeType} [type] - An optional edge type that
   *     overrides the type possibly specified by the connection object.
   * @return {Edge} An edge object.
   */
  Adapter.prototype.makeEdge = function(from, to, type, id) {
    
    if(!from || !to) return;
    
    if(from instanceof $tw.Tiddler) {
      from = from.fields[this.opt.field.nodeId];
    } else if(typeof from === "object") { // expect node
      from = from.id;
    } // else use from value as id
    
    type = new EdgeType(type);
        
    var edge = {
      id: (id ? id : utils.genUUID()),
      from: from,
      to: to,
      type: type.getId()
    };
    
    edge.label = (utils.isTrue(type.getData("show-label"), true)
                  ? type.getLabel()
                  : null); // needs to be set expliceitly to null

    edge = $tw.utils.extend(edge, type.getData("style"));
    
    return edge;
    
  };
    
  Adapter.prototype.makeNode = function(tiddler, protoNode, view) {

    // ALWAYS reload from store to avoid setting wrong ids on tiddler
    // being in the role of from and to at the same time.  
    // Therefore, do not use utils.getTiddler(tiddler)!
    var tObj = utils.getTiddler(tiddler, true);

    if(!tObj || tObj.isDraft() || this.wiki.isSystemTiddler(tObj.fields.title)) {
      return; // silently ignore
    }
        
    // create node object 
    var node = {} // vis requires child of object
        
    // determine shape
    
    var iconRef = tObj.fields[this.opt.field.nodeIcon];
    if(iconRef) {
      var imgTObj = utils.getTiddler(iconRef);
      if(imgTObj && imgTObj.fields.text) {
        var type = (imgTObj.fields.type ? imgTObj.fields.type : "image/svg+xml");
        var body = imgTObj.fields.text;
        node.shape = "image";
        if(type === "image/svg+xml") {
          // see http://stackoverflow.com/questions/10768451/inline-svg-in-css
          body = body.replace(/\r?\n|\r/g, " ");
          if(!utils.inArray("xmlns", body)) { // it's a bad habit of tiddlywiki...
            body = body.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
          }
        }
        

        var encodedBody = ($tw.config.contentTypeInfo[type].encoding === "base64"
                           ? body
                           : window.btoa(body));

        node.image = "data:" + type + ";base64," + encodedBody;
        
      }
    }
    
    // assign label

    var label = tObj.fields[this.opt.field.nodeLabel];
    node.label = (label && this.opt.field.nodeLabel !== "title"
                  ? this.wiki.renderText("text/plain", "text/vnd-tiddlywiki", label)
                  : tObj.fields.title);

    // add tooltip
    
    // WARNING: Feature disabled due to vis bug: https://github.com/almende/vis/issues/731
    // TODO: Enable this when Bug is fixed by vis
    
    //~ var info = tObj.fields[this.opt.field.nodeInfo];
    //~ node.title = (info && this.opt.field.nodeInfo !== "text"
                  //~ ? this.wiki.renderText("text/html", "text/vnd-tiddlywiki", info)
                  //~ : tObj.fields.title);
    
    // use the tiddler's color field as node color
    if(tObj.fields.color) {
      node.color = tObj.fields.color;
    }
    
    // allow override
    if(typeof protoNode === "object") {
      node = $tw.utils.extend(node, protoNode);
    }
    
    // force these fields
    node.id = this.assignId(tObj);


    if(view) {
      var view = new ViewAbstraction(view);
      if(view.isEnabled("physics_mode")) {
        node.allowedToMoveX = true; 
        node.allowedToMoveY = true;
      }
    }
    
    return node;
    
  };

  /**
   * Retrieve nodes based on the a list of ids that corrspond to tiddlers
   * id fields.
   * 
   * @param {Array.<Id>|Hashmap.<Id, *>|vis.DataSet} nodeIds - The ids of the tiddlers
   *     that represent the nodes.
   * @param {Hashmap} [options.!! INHERITED !!] - See {@link Adapter#selectNodesByReferences}.
   * @return {NodeCollection} A collection of a type specified in the options.
   */
  Adapter.prototype.selectNodesByIds = function(nodeIds, options) {
    
    var tRefs = this.getTiddlersById(nodeIds);
    return this.selectNodesByReferences(tRefs, options);
    
  };
  
  /**
   * Select a single node by id.
   * 
   * @param {Id} id - A node's id
   * @param {Hashmap} [options] - An optional options object.
   * @param {Hashmap} [options.!! PARTLY INHERITED !!]
   *     Except from the outputType option, all options
   *     are inherited from {@link Adapter#selectNodesByIds}.
   * @return {Node|undefined} A node or nothing.
   */
  Adapter.prototype.selectNodeById = function(id, options) {
    
    options = utils.merge(options, { outputType: "hashmap" });
    var result = this.selectNodesByIds([ id ], options);
    return result[id];
    
  };
  
  
  /**
   * Retrieve tiddlers based on the a list of corresponding ids.
   * 
   * @param {Array.<Id>|Hashmap.<Id, *>|vis.DataSet} nodeIds - The ids.
   * @return {Array<TiddlerReference>} The resulting tiddlers.
   */
  Adapter.prototype.getTiddlersById = function(nodeIds) {

    // transform into a hashmap with all values being true
    if(Array.isArray(nodeIds)) {
      nodeIds = utils.getArrayValuesAsHashmapKeys(nodeIds);
    } else if(nodeIds instanceof vis.DataSet) {
      nodeIds = utils.getLookupTable(nodeIds, "id"); // use id field as key
    }
    
    var result = [];
    for(var id in nodeIds) {
      var ref = $tw.tmap.indeces.tById[id];
      if(ref) result.push(ref);
    }
    
    return result;
    
  };
  
  Adapter.prototype.getId = function(tiddler) {
    return $tw.tmap.indeces.idByT[utils.getTiddlerRef(tiddler)];
    //return utils.getField(tiddler, this.opt.field.nodeId);
  };
  
  //~ Adapter.prototype.getSubGraphById = function(nodeIds, options) {
  
  /**
   * This function will remove all tiddlers from the wiki that correspond
   * to a node in the collection. Drafts are also removed. The default
   * storylist is updated eventually.
   * call deleteNode which does the following
   * 1. get id using IdByT
   * 2. remove id using adapter.deleteEdgesByTo(idByT[tRef])
   * 3. remove from all indeces
   *
   * @see: https://github.com/Jermolene/TiddlyWiki5/issues/1550
   * 
   * @param {NodeCollection} nodes - A collection of nodes.
   */
  Adapter.prototype.deleteNode = function(node) {

    if(!node) return;
    
    var id = (typeof node === "object" ? node.id : node);
    var tRef = $tw.tmap.indeces.tById[id];
    
    if(!utils.tiddlerExists(tRef)) return;
    
    var idField = this.opt.field.nodeId;
    
    var storyList = this.wiki.getTiddlerList("$:/StoryList");
    var index = storyList.indexOf(tRef);
    if(index !== -1) {
      storyList.splice(index, 1);
      var tObj = this.wiki.getTiddler("$:/StoryList");
      utils.setField(tObj, "list", storyList);
    }
        
    // remove connected edges
    
    //~ var edges = this.selectEdgesByEndpoints([ node ], {
      //~ outputType: "array"
    //~ });
    //~ 
    //~ this.deleteEdges(edges);
    
    // NEVER DELETE AN INDEX THAT ALREADY EXISTED!
    //~ delete $tw.tmap.indeces.tById[id];
    //~ delete $tw.tmap.indeces.idByT[tRef];
    
    // delete tiddlers
    this.wiki.deleteTiddler(tRef);
    
  };

  /**
   * Function to create or abstract a view from outside.
   * 
   * @param {View} view - The view.
   * @result {ViewAbstraction}
   */
  Adapter.prototype.getView = function(view, isCreate) {
    
    return new ViewAbstraction(view, isCreate);
    
  };

  /**
   * Create a view with a given label (name).
   * 
   * @param {string} [label="My View"] - The name of the view (__not__ a TiddlerReference).
   * @return {ViewAbstraction} The newly created view.
   */
  Adapter.prototype.createView = function(label) {
      
      if(typeof label !== "string" || label === "") {
        label = "My view";
      }
      var tRef = this.wiki.generateNewTitle(this.opt.path.views + "/" + label);
          
      return new ViewAbstraction(tRef, true);

  };
    
  /**
   * This method will load the current view's map values into the nodes
   * 
   * @param {object} nodes A hashmap of node-objects.
   */
  Adapter.prototype._restorePositions = function(nodes, view) {

    view = new ViewAbstraction(view);
    
    if(!view.exists()) return;
    
    var positions = view.getPositions();
    for(var id in nodes) {
      // hOP needs to be called here since tw created the object and we
      // cannot anticipate the names.
      if(utils.hasOwnProp(positions, id)) {
        nodes[id].x = positions[id].x;
        nodes[id].y = positions[id].y;
      }
    }
    
  };

  /**
   * This function will store the positions into the sprecified view.
   * 
   * @param {object} positions A hashmap ids as keys and x, y properties as values
   * @param {ViewAbstraction|Tiddler|string} 
   */
  Adapter.prototype.storePositions = function(positions, view) {
    
    view = new ViewAbstraction(view);
    view.setPositions(positions);
      
  }

  /**
   * This method will assign an id to an *existing* tiddler that does
   * not already possess and id. Any assigned id will be registered
   * at the id->tiddler index.
   * 
   * @param {Tiddler} tiddler - The tiddler to assign the id to.
   * @param {boolean} isForce - True if the id should be overridden,
   *     false otherwise. Only works if the id field is not set to title.
   * @return {Id} The assigned or retrieved id.
   */
  Adapter.prototype.assignId = function(tiddler, isForce) {

    // ALWAYS reload from store to avoid setting wrong ids on tiddler
    // being in the role of from and to at the same time.  
    // Therefore, do not use utils.getTiddler(tiddler)!
    var tObj = utils.getTiddler(tiddler, true);

    if(!tObj) return;
    
    var idField = this.opt.field.nodeId;
    var id = tObj.fields[idField];
    
    // note: when idField is "title" it is always defined
    if(!id || (isForce && idField !== "title")) {
      id = utils.genUUID();
      utils.setField(tObj, idField, id);
      this.logger("info", "Assigning new id to", tObj.fields.title);
    }
    
    // blindly update the index IN ANY CASE because tiddler may have
    // an id but it is not indexed yet (e.g. because of renaming operation)
    $tw.tmap.indeces.tById[id] = tObj.fields.title;
    $tw.tmap.indeces.idByT[tObj.fields.title] = id;
    
    return id;
    
  };

  /**
   * Create a new tiddler that gets a non-existant title and is opened
   * for edit. If a view is registered, the fields of the tiddler match
   * the current view. If arguments network and position are specified,
   * the node is also inserted directly into the graph at the given
   * position.
   * 
   * @param {object} node A node object to be inserted
   * @param {object|null} options An optional options object.
   *     Options include:
   *       - editNodeOnCreate: True, if the node should be opened in edit
   *         mode after it was created, false otherwise. Overwrites the
   *         global default
   *       - view: a viewname used to set positions and register the node to
   */
  Adapter.prototype.insertNode = function(node, options) {
    
    if(!options || typeof options !== "object") options = {};
    
    if(typeof node !== "object") {
      node = utils.getDataMap();
    }
    
    var fields = utils.getDataMap();
    fields.title = this.wiki.generateNewTitle((node.label ? node.label : "New node"));
    // title might has changed after generateNewTitle()
    node.label = fields.title;
    
    // always override any incoming id 
    
    if(this.opt.field.nodeId === "title") {
      node.id = fields.title;
    } else {
      node.id = utils.genUUID();
      fields[this.opt.field.nodeId] = node.id;
    }
    
    if(options.view) {
      var view = new ViewAbstraction(options.view);
      view.addNodeToView(node);
    }
    
    this.wiki.addTiddler(new $tw.Tiddler(
      fields,
      this.wiki.getModificationFields(),
      this.wiki.getCreationFields())
    );
            
    return node;
    
  };

  // export
  exports.Adapter = Adapter

})();