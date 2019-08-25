/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Adapter
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import ViewAbstraction              from '$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction';
import EdgeType                     from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import NodeType                     from '$:/plugins/felixhayashi/tiddlymap/js/NodeType';
import utils                        from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import Edge                         from '$:/plugins/felixhayashi/tiddlymap/js/Edge';
import vis                          from '$:/plugins/felixhayashi/vis/vis.js';
import * as env                     from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';
import { run as getContrastColour } from '$:/core/modules/macros/contrastcolour.js';

/***************************** CODE ********************************/

/**
 * This library acts as an abstraction layer above the tiddlywiki
 * system. All the provided methods give the api-user the chance
 * to interact with tiddlywiki as if it was a simple graph database.
 *
 * Everything that is related to retrieving or inserting nodes and
 * edges is handled by the adapter class.
 *
 * You don't need to create your own instance of this class.
 * The adapter service may be accessed from anywhere using
 * `$tm.apapter`.
 *
 * @constructor
 */
class Adapter {

  /**
   * @param {Tracker} tracker
   * @param {EdgeTypeSubscriberRegistry} edgeTypeSubscriberRegistry
   */
  constructor(tracker, edgeTypeSubscriberRegistry) {

    this.getTiddlerById = tracker.getTiddlerById.bind(tracker);
    this.getId = tracker.getIdByTiddler.bind(tracker);
    this.assignId = tracker.assignId.bind(tracker);

    this.edgeTypeSubscriberRegistry = edgeTypeSubscriberRegistry;

    this.indeces = $tm.indeces;
    this.wiki = $tw.wiki;

    this.visShapesWithTextInside = utils.getLookupTable([
      'ellipse', 'circle', 'database', 'box', 'text'
    ]);

  }

  /**
   * This function will delete the specified edge object from the system.
   *
   * @param {Edge} edge - The edge to be deleted. The edge necessarily
   *     needs to possess an `id` and a `from` property.
   * @return {Edge} The deleted edge is returned.
   */
  deleteEdge(edge) {

    return this._processEdge(edge, 'delete');

  }

  /**
   * Persists an edge by storing the vector (from, to, type).
   *
   * @param {Edge} edge - The edge to be saved. The edge necessarily
   *     needs to possess a `to` and a `from` property.
   * @return {Edge} The newly inserted edge.
   */
  insertEdge(edge) {

    return this._processEdge(edge, 'insert');

  }

  /**
   * Removes multiple edges from several stores.
   *
   * @param {EdgeCollection} edges - The edges to be deleted.
   */
  deleteEdges(edges) {

    edges = utils.convert(edges, 'array');
    for (let i = edges.length; i--;) {
      this.deleteEdge(edges[i]);
    }

  }

  /**
   * Private function to handle the insertion or deletion of an edge.
   * It prepares the process according to the action type and delegates
   * the task to more specific functions.
   *
   * @private
   * @return {Edge} The processed edge.
   */
  _processEdge(edge, action) {

    $tm.logger('debug', 'Edge', action, edge);

    // get from-node and corresponding tiddler
    const fromTRef = this.getTiddlerById(edge.from);

    if (!fromTRef || !utils.tiddlerExists(fromTRef)) {
      return;
    }

    const tObj = utils.getTiddler(fromTRef);
    const type = this.indeces.allETy[edge.type] || EdgeType.getInstance(edge.type);
    const handlers = this.edgeTypeSubscriberRegistry.getAllForType(type);
    const fn = `${action}Edge`;

    for (let i = handlers.length; i--;) {
      (handlers[i][fn])(tObj, edge, type);
    }

    // if type didn't exist yet, create it
    if (action === 'insert' && !type.exists()) {
      type.save();
    }

    return edge;

  }

  /**
   * This function will return an adjacency list for the nodes
   * present in the current system. The list may be restricted by
   * optional filters.
   *
   * @param {string} [groupBy='to'] - Specifies by which property the
   *     adjacency list is indexed. May be either 'from' or 'to'.
   * @param {Hashmap} [opts] - An optional options object.
   * @param {Hashmap} [opts.typeWL] - A whitelist lookup-table
   *    that restricts which edge-types are included.
   * @param {Hashmap} [opts.edges] - A set of edges on which basis
   *     the adjacency list is build. If not provided,
   *     all edges in the system are considered.
   * @return {Object<Id, Array<Edge>>} For each key (a node id) an
   *     array of edges pointing 'from' (or 'to'; depends on `groupBy`)
   *     is supplied as value.
   */
  getAdjacencyList(groupBy, opts = {}) {

    $tm.start('Creating adjacency list');

    if (!opts.edges) {
      const tRefs = utils.getMatches(env.selector.allPotentialNodes);
      opts.edges = this.getEdgesForSet(tRefs, opts.toWL, opts.typeWL);
    }

    const adjList = utils.groupByProperty(opts.edges, groupBy || 'to');

    $tm.stop('Creating adjacency list');

    return adjList;

  }

  /**
   * This function will return all neighbours of a graph denoted by
   * a set of tiddlers.
   *
   * @todo parts of this code may be outsourced into a function to
   * prevent repeating code.
   *
   * @param {Array<TiddlerReference>} matches - The original set that
   *     defines the starting point for the neighbourhood discovery
   * @param {Hashmap} [opts] - An optional options object.
   * @param {Hashmap} [opts.typeWL] - A whitelist lookup-table
   *    that restricts which edges are travelled to reach a neighbour.
   * @param {Hashmap} [opts.edges] - An initial set of edges that is
   *    used in the first step to reach immediate neighbours, if no
   *    set of edges is specified, all exsisting edges will be considered.
   * @param {number} [opts.steps] - An integer value that specifies
   *    the scope of the neighbourhood. A node is considered a neighbour
   *    if it can be reached within the given number of steps starting
   *    from original set of tiddlers returned by the node filter.
   * @param {Hashmap} [opts.addProperties] - a hashmap
   *     containing properties to be added to each node.
   *     For example:
   *     {
   *       group: 'g1',
   *       color: 'red'
   *     }
   * @return {Object} An object of the form:
   *     {
   *       nodes: { *all neighbouring nodes* },
   *       edges: { *all edges connected to neighbours* },
   *     }
   */
  getNeighbours(matches, opts = {}) {

    $tm.start('Get neighbours');

    const { addProperties, toWL, typeWL, steps } = opts;
    const { allETy } = this.indeces;

    // index of all tiddlers have already are been visited, either by
    // having been included in the original set, or by having been
    // recorded as neighbour during the discovery.
    const visited = utils.getArrayValuesAsHashmapKeys(matches);
    const view = ViewAbstraction.exists(opts.view) ? new ViewAbstraction(opts.view) : null;
    const allEdgesLeadingToNeighbours = utils.makeHashMap();
    const allNeighbours = utils.makeHashMap();
    const maxSteps = (parseInt(steps) > 0 ? steps : 1);
    const direction = (opts.direction || (view && view.getConfig('neighbourhood_directions')));
    const isWalkBoth = (!direction || direction === 'both');
    const isWalkIn = (isWalkBoth || direction === 'in');
    const isWalkOut = (isWalkBoth || direction === 'out');

    // in order to apply the node-filter also to neighbours we need to make it
    // include all tiddlers in the filter's source (e.g. a tiddler and a few neighbours)
    // and then apply the filter – which now has the chance to take away tiddlers
    // a few filters from the set
    const neighFilter = view && `[all[]] ${view.getNodeFilter('raw')}`;

    // adjacency receives whitelists through opts
    const adjList = this.getAdjacencyList('to', opts);

    const addAsNeighbour = (edge, role, neighboursOfThisStep) => {
      allEdgesLeadingToNeighbours[edge.id] = edge;
      const tRef = this.getTiddlerById(edge[role]);

      if (
        view
        && utils.isTrue($tm.config.sys.nodeFilterNeighbours)
        && !utils.isMatch(tRef, neighFilter)) {
        return;
      }

      if (!visited[tRef]) {
        visited[tRef] = true;
        const node = this.makeNode(tRef, addProperties);
        if (node) { // saveguard against obsolete edges or other problems
          // record node
          allNeighbours[node.id] = node;
          neighboursOfThisStep.push(tRef);
        }
      }
    };

    // needed later
    let step;

    // loop if still steps to be taken and we have a non-empty starting set
    for (step = 0; step < maxSteps && matches.length; step++) {

      // neighbours that are discovered in the current step;
      // starting off from the current set of matches;
      const neighboursOfThisStep = [];

      // loop over all nodes in the original set
      for (let i = matches.length; i--;) {

        if (utils.isSystemOrDraft(matches[i])) {
          // = this might happen if the user manually created edges
          // that link to a system/draft tiddler or if the original
          // set contained system/draft tiddlers.
          continue;
        }

        // get all outgoing edges
        // = edges originating from the starting set and point outwards
        const outgoing = this.getEdges(matches[i], toWL, typeWL);
        for (let id in outgoing) {

          const t = allETy[outgoing[id].type];
          if (isWalkBoth || isWalkOut && t.toArrow || isWalkIn && t.invertedArrow) {

            addAsNeighbour(outgoing[id], 'to', neighboursOfThisStep);
          }
        }

        // get all incoming edges
        // = edges originating from outside pointing to the starting set
        const incoming = adjList[this.getId(matches[i])];
        if (!incoming) {
          continue;
        }

        for (let j = incoming.length; j--;) {
          const t = allETy[incoming[j].type];
          if (isWalkBoth || isWalkIn && t.toArrow || isWalkOut && t.invertedArrow) {
            addAsNeighbour(incoming[j], 'from', neighboursOfThisStep);
          }
        }
      }

      // the current set of newly discovered neighbours forms the
      // starting point for the next discovery
      matches = neighboursOfThisStep;

    }

    const neighbourhood = {
      nodes: allNeighbours,
      edges: allEdgesLeadingToNeighbours
    };

    $tm.logger('debug', 'Retrieved neighbourhood', neighbourhood, 'steps', step);

    $tm.stop('Get neighbours');

    return neighbourhood;

  }

  /**
   * This function will assemble a graph object based on the supplied
   * node and edge filters. Optionally, a neighbourhood may be
   * merged into the graph neighbourhood.
   *
   * @param {string|ViewAbstraction} [view] - The view in which
   *     the graph will be displayed.
   * @param {string|ViewAbstraction} [filter] - If supplied,
   *     this will act as node filter that defines which nodes
   *     are to be displayed in the graph; a possible view node filter
   *     would be ignored.
   * @param {Hashmap} [edgeTypeWL] - A whitelist lookup-table
   *     that restricts which edges are travelled to reach a neighbour.
   * @param {number} [neighbourhoodScope] - An integer value that
   *     specifies the scope of the neighbourhood in steps.
   *     See {@link Adapter#getNeighbours}
   * @return {Object} An object of the form:
   *     {
   *       nodes: { *all nodes in the graph* },
   *       edges: { *all edges in the graph* },
   *     }
   *     Neighbours will be receive the 'tmap:neighbour' type.
   */
  getGraph({ view, filter, edgeTypeWL, neighbourhoodScope } = {}) {

    $tm.start('Assembling Graph');

    view = ViewAbstraction.exists(view) ? new ViewAbstraction(view) : null;
    const matches = utils.getMatches(filter || (view && view.getNodeFilter('compiled')));
    const neighScope = parseInt(neighbourhoodScope || (view && view.getConfig('neighbourhood_scope')));
    const typeWL = (edgeTypeWL || (view && view.getEdgeTypeFilter('whitelist')));
    const toWL = utils.getArrayValuesAsHashmapKeys(matches);

    const graph = {
      edges: this.getEdgesForSet(matches, toWL, typeWL),
      nodes: this.selectNodesByReferences(matches, {
        view: view,
        outputType: 'hashmap'
      })
    };

    if (neighScope) {
      const neighbours = this.getNeighbours(matches, {
        steps: neighScope,
        view: view,
        typeWL: typeWL,
        addProperties: {
          group: 'tmap:neighbour'
        }
      });

      // add neighbours (nodes and edges) to graph
      Object.assign(graph.nodes, neighbours.nodes);
      Object.assign(graph.edges, neighbours.edges);

      if (view && view.isEnabled('show_inter_neighbour_edges')) {
        const nodeTRefs = this.getTiddlersByIds(neighbours.nodes);
        // this time we need a whitelist based on the nodeTRefs
        const toWL = utils.getArrayValuesAsHashmapKeys(nodeTRefs);
        Object.assign(graph.edges, this.getEdgesForSet(nodeTRefs, toWL));
      }
    }

    // this is pure maintainance!
    removeObsoleteViewData(graph.nodes, view);

    // add styles to nodes
    this.attachStylesToNodes(graph.nodes, view);

    $tm.stop('Assembling Graph');

    $tm.logger('debug', 'Assembled graph:', graph);

    return graph;

  }

  /**
   * Returns all edges stored in a given tiddler. Any edge stored in a
   * tiddler is orginally an outgoing edge. Depending on how the user
   * changes the arrow head (by manipulating the Visjs edge-type style),
   * the edge may change its orientation and become an incoming edge or
   * bi-directional. Therefore, the edges retrieved may be incoming,
   * outgoing or both!
   *
   * Returned edges may be of the following type:
   *
   * - Edges stored in the tiddler text (=links).
   * - Edges stored in fields denoted by magic edge-types.
   * - TiddlyMap edges stored in a json format
   *
   * @param {Tiddler} tiddler - A tiddler reference or object from
   *     which to retrieve the edges.
   * @param {Hashmap<TiddlerReference, boolean>} [toWL]
   *     A hashmap on which basis it is decided, whether to include
   *     an edge that leads to a certain tiddler in the result or not.
   *     In this case, all edges stored in the tiddler are treated as
   *     outgoing and the arrow head is ignored. If not specified,
   *     all edges are included.
   * @param {Hashmap<string, boolean>} [typeWL]
   *     A hashmap on which basis it is decided, whether to include
   *     an edge of a given type in the result or not. If not
   *     specified, all edges are included.
   */
  getEdges(tiddler, toWL, typeWL) {

    const tObj = utils.getTiddler(tiddler);

    if (!tObj || utils.isSystemOrDraft(tObj)) {
      return;
    }

    const { allETy } = this.indeces;
    const edges = utils.makeHashMap();
    const eTySubscribers = this.edgeTypeSubscriberRegistry.getAll();

    for (let i = 0, l = eTySubscribers.length; i < l; i++) {
      Object.assign(edges, (eTySubscribers[i]).loadEdges(tObj, toWL, typeWL));
    }

    for (let id in edges) {

      const edge = edges[id];

      // check exists for historical reasons...
      if (!edge.from || !edge.to) {
        continue;
      }

      const type = allETy[edge.type] || EdgeType.getInstance(edge.type);
      addStyleToEdge(edges[id], type);

      edges[id] = edge;
    }

    return edges;

  }

  /**
   * The method will return all outgoing edges for a subset of tiddlers.
   *
   * @param {Array<Tiddler>} tiddlers - The set of tiddlers to consider.
   * @param toWL
   * @param typeWL
   * @return {Hashmap<Id, Edge>} An edge collection.
   */
  getEdgesForSet(tiddlers, toWL, typeWL) {

    const edges = utils.makeHashMap();
    for (let i = tiddlers.length; i--;) {
      Object.assign(edges, this.getEdges(tiddlers[i], toWL, typeWL));
    }

    return edges;

  }

  /**
   * Select all edges of a given type.
   *
   * @param {string|EdgeType} type - Either the edge type id (name) or an EdgeType object.
   */
  selectEdgesByType(type) {

    const typeWL = utils.makeHashMap({
      [EdgeType.getInstance(type).id]: true,
    });

    return this.getEdgesForSet(this.getAllPotentialNodes(), null, typeWL);

  }

  /**
   *
   * @return {*}
   */
  getAllPotentialNodes() {

    return utils.getMatches($tm.selector.allPotentialNodes);

  };

  /**
   * Deletes or renames all edges of a given type.
   *
   * @param {string|EdgeType} type - Either the edge type id (name) or an EdgeType object.
   * @param {('rename'|'delete')} [action='delete']
   * @param {string} [newName]
   */
  _processEdgesWithType(type, { action, newName }) {

    type = EdgeType.getInstance(type);

    $tm.logger('debug', 'Processing edges', type, action);

    // get edges
    const edges = this.selectEdgesByType(type);

    if (action === 'rename') {

      // clone type first to prevent auto-creation
      (new EdgeType(newName, type)).save();

    }

    for (let id in edges) {

      this._processEdge(edges[id], 'delete');

      if (action === 'rename') {
        edges[id].type = newName;
        this._processEdge(edges[id], 'insert');
      }
    }

    // finally remove the old type
    this.wiki.deleteTiddler(type.fullPath);

  }

  /**
   * Returns a set of nodes that corresponds to a set of tiddlers.
   *
   * @param {TiddlerCollection} tiddlers - A collection of tiddlers.
   * @param {Hashmap} [addProperties] - a hashmap
   * @param {CollectionTypeString} [outputType='dataset'] - The result type.
   *
   * @return {NodeCollection} A collection of a type specified in the options.
   */
  selectNodesByReferences(tiddlers, { addProperties, outputType } = {}) {

    const result = utils.makeHashMap();
    const keys = Object.keys(tiddlers);

    for (let i = keys.length; i--;) {

      const node = this.makeNode(tiddlers[keys[i]], addProperties);
      if (node) {
        result[node.id] = node;
      }

    }

    return utils.convert(result, outputType);

  }

  /**
   * Retrieve nodes based on the a list of ids that corrspond to tiddlers
   * id fields.
   *
   * @param {Array.<Id>|Hashmap.<Id, *>|vis.DataSet} nodeIds - The ids of the tiddlers
   *     that represent the nodes.
   * @param {Hashmap} [options] - See {@link Adapter#selectNodesByReferences}.
   * @return {NodeCollection} A collection of a type specified in the options.
   */
  selectNodesByIds(nodeIds, options) {

    const tRefs = this.getTiddlersByIds(nodeIds);

    return this.selectNodesByReferences(tRefs, options);

  }

  /**
   * Select a single node by id.
   *
   * @param {Id} id - A node's id
   * @param {Hashmap} [options]
   *     Except from the outputType option, all options
   *     are inherited from {@link Adapter#selectNodesByIds}.
   * @return {Node|undefined} A node or nothing.
   */
  selectNodeById(id, options) {

    options = Object.assign({}, options, { outputType: 'hashmap' });
    const result = this.selectNodesByIds([ id ], options);

    return result[id];

  }

  /**
   * Deletes a node type from the system.
   * @param {NodeType|string} type - the node type id or the actual NodeType
   */
  removeNodeType(type) {

    type = NodeType.getInstance(type);
    this.wiki.deleteTiddler(type.fullPath);

  }

  /**
   * Gets a Node representation for a tiddler.
   *
   * @param {Tiddler} tiddler - the tiddler to represent as node
   * @param {Object} protoNode - default node properties
   *
   * @return {Node|void}
   */
  makeNode(tiddler, protoNode) {

    const tObj = utils.getTiddler(tiddler);

    if (!tObj || utils.isSystemOrDraft(tObj)) return;

    // merge(!) so later node manipulations do not affect other nodes
    const node = utils.merge({}, protoNode);

    // note: assignId() will not assign an id if the tiddler already has one
    node.id = this.assignId(tObj);

    // backreference to tiddler;
    // https://github.com/felixhayashi/TW5-TiddlyMap/issues/304
    node.tRef = tObj.fields.title;

    // add label
    const label = tObj.fields[$tm.field.nodeLabel];
    node.label = (
      label && $tm.field.nodeLabel !== 'title'
        ? this.wiki.renderText('text/plain', 'text/vnd-tiddlywiki', label)
        : tObj.fields.title
    ).replace('\\n', '\n');

    return node;

  }

  /**
   * Return node styles that are inherited from system styles or node types.
   *
   * @param nodes
   * @return {Object<TiddlerReference, Object>}
   */
  getInheritedNodeStyles(nodes) {

    const src = this.getTiddlersByIds(nodes);
    const protoByTRef = {};
    const glNTy = this.indeces.glNTy;

    for (let i = glNTy.length; i--;) {
      const type = glNTy[i];

      let inheritors = [];
      if (type.id === 'tmap:neighbour') { // special case
        for (let id in nodes) {

          if (nodes[id].group === 'tmap:neighbour') {

            inheritors.push(this.getTiddlerById(id));
          }
        }
      } else {
        inheritors = type.getInheritors(src);
      }

      for (let j = inheritors.length; j--;) {
        const tRef = inheritors[j];
        const proto = protoByTRef[tRef] = (protoByTRef[tRef] || {});
        proto.style = utils.merge(
          proto.style || {},
          type.style
        );

        // ATTENTION: only override proto icons when the type provides
        // an icon since otherwise we might erase previously
        // inherited icons.
        if (type['fa-icon']) {
          proto['fa-icon'] = type['fa-icon'];
        } else if (type['tw-icon']) {
          proto['tw-icon'] = type['tw-icon'];
        }

      }
    }

    return protoByTRef;

  }

  /**
   * Adds styles to nodes.
   *
   * @param {Object<string, Node>} nodes
   * @param {ViewAbstraction|string} view
   */
  attachStylesToNodes(nodes, view) {

    view = ViewAbstraction.exists(view) ? new ViewAbstraction(view) : null;

    const inheritedStyles = this.getInheritedNodeStyles(nodes);
    const viewNodeData = view ? view.getNodeData() : utils.makeHashMap();
    const isStaticMode = view && !view.isEnabled('physics_mode');

    for (let id in nodes) {

      const tRef = this.getTiddlerById(id);
      const tObj = this.wiki.getTiddler(tRef);
      const fields = tObj.fields;
      const node = nodes[id];
      let icon;

      // == group styles ==

      const inheritedStyle = inheritedStyles[tRef];

      if (inheritedStyle) {

        utils.merge(node, inheritedStyle.style);
        icon = getIcon(inheritedStyle['fa-icon'], inheritedStyle['tw-icon']);
      }

      // == global node styles ==

      // background color
      if (fields.color) {
        node.color = fields.color;
      }

      // global node style from vis editor
      if (fields['tmap.style']) {
        utils.merge(node, utils.parseJSON(fields['tmap.style']));
      }

      icon = getIcon(fields['tmap.fa-icon'], fields['icon']) || icon;

      // == local node styles ==

      // local node style and positions

      const nodeData = viewNodeData[id];

      if (nodeData) {

        utils.merge(node, nodeData);
        if (isStaticMode) {
          // fix x if x-position is set; same for y
          node.fixed = {
            x: (node.x != null),
            y: (node.y != null)
          };
        }

        icon = getIcon(nodeData['fa-icon'], nodeData['tw-icon']) || icon;
      }

      // == tweaks ==

      const isColorObject = (node.color !== null && typeof node.color === 'object');
      // color/border-color may be undefined
      const color = (isColorObject ? node.color.background : node.color);

      node.color = {
        background: color,
        border: (isColorObject ? node.color.border : undefined)
      };

      // ATTENTION: this function needs to be called after color is assigned
      addNodeIcon(node, icon);

      // determine font color if not defined via a group- or node-style;
      // in case of global and local default styles, the user is responsible
      // him- or herself to adjust the font
      node.font = node.font || {};

      if (node.shape && !this.visShapesWithTextInside[node.shape]) {
        node.font.color = 'black'; // force a black color
      } else if (!node.font.color && color) {
        node.font.color = getContrastColour(color, color, 'black', 'white');
      }

      if (node.shape === 'icon' && typeof node.icon === 'object') {
        node.icon.color = color;
      }

    }

    if (view) {
      const node = nodes[view.getConfig('central-topic')];
      if (node) {
        utils.merge(node, this.indeces.glNTyById['tmap:central-topic'].style);
      }
    }

  }

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
   * @param {Node|string} node.
   */
  deleteNode(node) {

    if (!node) {
      return;
    }

    const id = (typeof node === 'object' ? node.id : node);
    const tRef = this.getTiddlerById(id);

    // delete tiddler and remove it from the river; this will
    // automatically remove the global node style and the outgoing edges

    if (tRef) {
      // checking for tRef is needed;
      // see: https://github.com/Jermolene/TiddlyWiki5/issues/1919
      utils.deleteTiddlers([ tRef ]);
    }

    // delete local node-data in views containing the node

    const viewRefs = utils.getMatches(env.selector.allViews);
    for (let i = viewRefs.length; i--;) {
      const view = new ViewAbstraction(viewRefs[i]);
      view.removeNode(id);
    }

    // remove obsolete connected edges

    const neighbours = this.getNeighbours([ tRef ]);
    this.deleteEdges(neighbours.edges);

    // -------------------------------------------
    // NEVER DELETE AN INDEX THAT ALREADY EXISTED!
    // -------------------------------------------
    // Some instances may have cached the index and get confused!
    // It does not do harm to leave indeces as is since we do not
    // iterate over them(!) and when a tiddler has the same title or
    // id as a deleted tiddler, which is highly unlikely, then it will
    // simply override the index, which is totally fine. The indeces
    // are refreshed on every boot anyway so it is not a big deal.
    //
    // THEREFORE:
    //
    // DO NOT DO delete this.tById[id];
    // DO NOT DO delete this.idByT[tRef];

  }

  /**
   * Delete all nodes from the system.
   *
   * @param {string[]} ids ids
   */
  deleteNodes(ids) {

    for (let i = ids.length; i--;) {
      this.deleteNode(ids[i]);
    }

  }

  /**
   * Create a new tiddler that gets a non-existant title and is opened
   * for edit. If a view is registered, the fields of the tiddler match
   * the current view. If arguments network and position are specified,
   * the node is also inserted directly into the graph at the given
   * position.
   *
   * @TODO: Description is obsolete!
   *
   * @param {object} node A node object to be inserted
   * @param {ViewAbstraction|string} view - used to set positions and register the node to
   * @param {Tiddler} protoTiddler
   */
  insertNode(node = {}, view, protoTiddler) {

    // title might has changed after generateNewTitle()
    node.label = this.wiki.generateNewTitle(node.label || utils.getRandomLabel());

    // add to tiddler store
    const tObj = new $tw.Tiddler(
      { text: '' }, // https://github.com/Jermolene/TiddlyWiki5/issues/2025
      protoTiddler,
      {
        title: node.label, // force title
        'tmap.id': null // force empty id (generated later)
      },
      this.wiki.getModificationFields(),
      this.wiki.getCreationFields()
    );

    this.wiki.addTiddler(tObj);

    node = this.makeNode(tObj, node);

    if (ViewAbstraction.exists(view)) {
      (new ViewAbstraction(view)).addNode(node);
    }

    return node;

  }

  /**
   * Retrieve tiddlers based on the a list of corresponding ids.
   *
   * @param {Array.<Id>|Hashmap.<Id, *>|vis.DataSet} nodeIds - The ids.
   * @return {Array<TiddlerReference>} The resulting tiddlers.
   */
  getTiddlersByIds(nodeIds) {

    // transform into a hashmap with all values being true
    if (Array.isArray(nodeIds)) {
      nodeIds = utils.getArrayValuesAsHashmapKeys(nodeIds);
    } else if (nodeIds instanceof vis.DataSet) {
      nodeIds = utils.getLookupTable(nodeIds, 'id'); // use id field as key
    }

    const result = [];
    for (let id in nodeIds) {
      const tRef = this.getTiddlerById(id);
      if (tRef) {
        result.push(tRef);
      }
    }

    return result;

  }
}

/**** Helper *******************************************************/

/**
 * Returns the short symbol identifier (`&#xf2bc;` → `f206`).
 *
 * @param str FontAwesome id
 * @return {string}
 */
const getFAdigits = (str) => (str.length === 4 ? str : str.substr(3, 4));

/**
 * Adds an icon to the specified node.
 *
 * @param {Node} node
 * @param {Object} icon
 */
const addNodeIcon = (node, icon) => {

  if (!icon) {
    return;
  }

  // Font Awesome style

  if (icon.fa) {

    node.shape = 'icon';
    node.icon = {
      shape: 'icon',
      face: 'FontAwesome',
      color: node.color,
      code: String.fromCharCode('0x' + getFAdigits(icon.fa)),
    };

    if (node.size) {
      node.icon.size = node.size;
    }

    return;
  }

  // TiddlyWiki stored icons

  if (icon.tw) {

    const imgTObj = utils.getTiddler(icon.tw);

    if (!imgTObj) {
      return;
    }

    if (imgTObj.fields['_canonical_uri']) { // image is a url address

      node.image = imgTObj.fields['_canonical_uri'];
      node.shape = 'image';

    } else if (imgTObj.fields.text) {

      node.image = utils.getDataUri(imgTObj);
      node.shape = 'image';
    }
  }

};

/**
 * Garbage collector for obsolete node data.
 *
 * @param {Object<string, Node>} nodes
 * @param {ViewAbstraction|string} view
 */
const removeObsoleteViewData = (nodes, view) => {

  if (!ViewAbstraction.exists(view) || !nodes) {
    return;
  }

  view = new ViewAbstraction(view);

  const data = view.getNodeData();

  let obsoleteDataItems = 0;
  for (let id in data) {
    if (nodes[id] === undefined && data[id] != null) {
      // we only set this to undefined as deletion would
      // slow down V8, however, this necessarily requires
      // a safeguard agains recursion: data[id] != null

      data[id] = undefined;
      obsoleteDataItems++;
    }
  }

  if (obsoleteDataItems) {
    $tm.logger('debug', '[Cleanup]',
      'Removed obsolete node data:',
      view.getLabel(), obsoleteDataItems);
    view.saveNodeData(data);
  }

};

/**
 * Sets up an edge object that is ready to be consumed by vis.
 *
 * @param {Edge} edge
 * @param {EdgeType} type
 */
const addStyleToEdge = (edge, type) => {

  edge = Object.assign(edge, type.style);

  if (utils.isTrue(type['show-label'], true)) {
    edge.label = type.getLabel();
  }

};

const getIcon = (faIcon, twIcon) => faIcon && { fa: faIcon } || twIcon && { tw: twIcon };

/*** Exports *******************************************************/

export default Adapter;
