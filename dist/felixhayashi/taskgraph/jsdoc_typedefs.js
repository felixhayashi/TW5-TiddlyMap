/**
 * @typedef {string} TiddlerReference
 * 
 * A reference (title) that identifies a tiddler.
 */

/**
 * @typedef {$tw.Tiddler|TiddlerReference} Tiddler
 * 
 * Either a reference (title) that identifies the tiddler or an object
 * representation.
 */
 
/**
 * @typedef {string|number} Id
 * 
 * An id used to identify a node or tiddler. Ids may only contain characters
 * that are valid when used as tiddlywiki field values.
 */
 
/**
 * @typedef {Object} Edge
 * 
 * @property {Id} id - The id of the edge.
 * @property {Id} from - An id that refers to a {@link Node} and denotes the
 *     from part of an edge.
 * @property {Id} to - An id that refers to a {@link Node} and denotes the
 *     to part of an edge.
 * @property {string} label - The label of the edge that will be displayed
 *     in the rendered graph.
 * @property {string} [view] - An optional viewname to which the edge is
 *     bound to.
 * 
 * An edge connects nodes in a vis.Dataset.
 */
 
/**
 * @typedef {Object} Node
 * 
 * @property {Id} id - The id of the node.
 * @property {string} label - The label of the node that will be displayed
 *     in the rendered graph.
 * 
 * This object is used by the vis.Dataset.
 */
 
/**
 * @typedef {Object} Hashmap
 * 
 * Sometimes it makes semantically more sense to call an object a hashmap.
 * Then it becomes clear that we are talking about a simple key-value store.
 */

/**
 * @typedef {Array.<*>|Hashmap.<Id, *>|vis.DataSet} Collection
 * 
 * A collection contains a group of elements, usually nodes
 * (see {@link NodeCollection}) or edges (see {@link EdgeCollection}).
 * 
 * A collection object corresponds to a {@link CollectionTypeString}.
 */

/**
 * @typedef {Array.<Edge>|Hashmap.<Id, Edge>|vis.DataSet} EdgeCollection
 * 
 * A collection of edges.
 */
 
/**
 * @typedef {Array.<Node>|Hashmap.<Id, Node>|vis.DataSet} NodeCollection
 * 
 * A collection of nodes.
 */

/**
 * @typedef {Array.<Tiddler>|Hashmap.<Id, Tiddler>} TiddlerCollection
 * 
 * A collection of tiddlers.
 */

/** 
 * @typedef {string|function} TiddlyWikiFilter
 * 
 * A tiddlywiki filter expression or a compiled filter. 
 */

/** 
 * @typedef {Tiddler|string|ViewAbstraction} View
 * 
 * A view is identified either by a tiddler reference (title),
 * a Tiddler instance or a label. Moreover, a ViewAbstraction
 * may be used as view representation.
 */
 
/** 
 * @typedef {array|hashmap|dataset} CollectionTypeString
 * 
 * Most of taskgraph's select statements allow the user to choose one
 * of the specified output types, depending on what is most suitable.
 * 
 * The output types relate to the different types of
 * {@link EdgeCollection} and {@link NodeCollection}.
 */
 
/**
 * @typedef {Object} Position
 * 
 * @property {number} x - The x coordinate.
 * @property {number} y - The y coordinate.
 * 
 * An object containing x, y properties.
 */
