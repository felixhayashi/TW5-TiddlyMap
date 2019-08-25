/* @preserve TW-Guard *//* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */
/* @preserve TW-Guard */

import EdgeType from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import { MissingOverrideError } from '$:/plugins/felixhayashi/tiddlymap/js/exception';

/**
 * Super class for all edge type subscribers.
 */
class AbstractEdgeTypeSubscriber {

  /**
   * @param {Object.<id, EdgeType>} allEdgeTypes - A list of all EdgeType instances that
   *     are currently in the system. Each subscriber may use this list to build up an
   *     index or perform mappings etc. Note that this list does not include types that are
   *     just about to be inserted. Therefore, this list should only be used, if needed,
   *     in the context of edge retrieval via loadEdges.
   * @param {number} [priority} - Subscribers with a higher priority get executed earlier
   * @param {boolean} [skipOthers] - In case of insert and delete operations: Whether or
   *     not to skip any subsequent subscribers that also can handle the edge type
   *     but have a lower priority assigned.
   * @param {boolean} [ignore] - Whether or not to completely ignore this subscriber.
   *     This flag is useful if you want to dynamically at runtime whether or not to
   *     include the subscriber.
   */
  constructor(allEdgeTypes, { priority = 0, skipOthers = true, ignore = false } = {}) {

    this.allEdgeTypes = allEdgeTypes;
    this.priority = priority;
    this.skipOthers = skipOthers;
    this.ignore = ignore;

  }

  /**
   * DI
   * @param {Tracker} tracker
   */
  setTracker(tracker) {
    this.tracker = tracker;
  }

  /**
   * Returns all edges stored in the specified tiddler.
   *
   * @interface
   * @param {Tiddler} tObj - the tiddler that holds the references.
   * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
   *     be included in the result.
   * @param {Object<id, EdgeType>} [typeWL] - a whitelist that defines that only Tiddlers that are linked
   *     via a type specified in the list may be included in the result. If typeWL is not passed it means
   *     all types are included.
   * @return {Object<Id, Edge>|null}
   */
  loadEdges(tObj, toWL, typeWL) {

    throw new MissingOverrideError(this, 'loadEdges');

  }

  /**
   * Whether or not this subscriber instance can handle an edge of the given type.
   *
   * @interface
   * @param {EdgeType} edgeType
   * @return boolean
   */
  canHandle(edgeType) {

    throw new MissingOverrideError(this, 'canHandle');

  }

  /**
   * Called by the Adapter whenever a type is inserted
   *
   * @param {Tiddler} tObj - the tiddler that holds the references.
   * @param {Edge} edge - the edge to be deleted
   * @param {EdgeType} type
   */
  insertEdge(tObj, edge, type) {

    // optional

  }

  /**
   * Called by the Adapter whenever a type is deleted
   *
   * @param {Tiddler} tObj - the tiddler that holds the references.
   * @param {Edge} edge - the edge to be deleted
   * @param {EdgeType} type
   */
  deleteEdge(tObj, edge, type) {

    // optional

  }
}

/*** Exports *******************************************************/

export default AbstractEdgeTypeSubscriber;
