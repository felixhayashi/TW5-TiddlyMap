/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = AbstractEdgeTypeSubscriber;

/*** Imports *******************************************************/

var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType");
var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");

/*** Code **********************************************************/

/**
 * Super class for all edge type subscribers.
 *
 * @constructor
 * @param {Object.<id, EdgeType>} allEdgeTypes - A list of all EdgeType instances that
 *     are currently in the system. Each subscriber may use this list to build up an
 *     index or perform mappings etc. Note that this list does not include types that are
 *     just about to be inserted. Therefore, this list should only be used, if needed,
 *     in the context of edge retrieval via loadEdges.
 */
function AbstractEdgeTypeSubscriber(allEdgeTypes) {

  this.allEdgeTypes = allEdgeTypes;

}

/**
 * Subscribers with a higher priority get executed earlier (...that sounds brutal)
 * @type {number}
 */
AbstractEdgeTypeSubscriber.prototype.priority = 0;

/**
 * In case of insert and delete operations: Whether or not to skip any subsequent
 * subscribers that also can handle the edge type but have a lower priority assigned.
 *
 * @type {boolean}
 */
AbstractEdgeTypeSubscriber.prototype.skipOthers = true;

/**
 * Whether or not to completely ignore this subscriber. This flag is useful if you
 * want to dynamically at runtime whether or not to include the subscriber.
 *
 * @param {boolean}
 */
AbstractEdgeTypeSubscriber.prototype.ignore = false;

/**
 * Returns all edges stored in the specified tiddler.
 *
 * @param {Tiddler} tObj - the tiddler that holds the references.
 * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
 *     be included in the result.
 * @param {Object<id, EdgeType>} [typeWL] - a whitelist that defines that only Tiddlers that are linked
 *     via a type specified in the list may be included in the result. If typeWL is not passed it means
 *     all types are included.
 * @return {Object<Id, Edge>|null}
 */
AbstractEdgeTypeSubscriber.prototype.loadEdges = function(tObj, toWL, typeWL) {

  throw new utils.exception.MissingOverrideError(this, 'loadEdges');

};

/**
 * Called by the Adapter whenever a type is inserted
 *
 * @param {Tiddler} tObj - the tiddler that holds the references.
 * @param {Edge} edge - the edge to be deleted
 * @param {EdgeType} type
 */
AbstractEdgeTypeSubscriber.prototype.insertEdge = function(tObj, edge, type) {
  // optional
};

/**
 * Called by the Adapter whenever a type is deleted
 *
 * @param {Tiddler} tObj - the tiddler that holds the references.
 * @param {Edge} edge - the edge to be deleted
 * @param {EdgeType} type
 */
AbstractEdgeTypeSubscriber.prototype.deleteEdge = function(tObj, edge, type) {
  // optional
};

/**
 * Whether or not this subscriber instance can handle an edge of the given type.
 *
 * @param {EdgeType} edgeType
 * @return boolean
 */
AbstractEdgeTypeSubscriber.prototype.canHandle = function(edgeType) {

  throw new utils.exception.MissingOverrideError(this, 'canHandle');

};
