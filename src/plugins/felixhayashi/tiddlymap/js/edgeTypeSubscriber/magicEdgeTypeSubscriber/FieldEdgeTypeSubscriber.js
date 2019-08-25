/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/field
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import AbstractMagicEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber';

/**
 * The FieldEdgeTypeSubscriber deals with connections that are stored in form of tiddler fields.
 * In this case one field can only hold one connection.
 *
 * If an EdgeType with a "tw-field" namespace is inserted or deleted, the type's name
 * is interpreted as field name and the connection is stored or removed in a tiddler
 * field with of that name.
 *
 * E.g. creating an edge between the tiddlers "Betsy" and "Dave" with the type
 * tw-field:husband will create a field "husband" inside the "Betsy" tiddler and set
 * "Dave" as value.

 * Note: A single field can only hold one connection.
 *
 * @see http://tiddlymap.org/#tw-field
 *
 * @inheritDoc
 * @constructor
 */
class FieldEdgeTypeSubscriber extends AbstractMagicEdgeTypeSubscriber {

  /**
   * @inheritDoc
   */
  constructor(allEdgeTypes, options = {}) {
    super(allEdgeTypes, { priority: 10, ...options });
  }

  /**
   * @inheritDoc
   */
  canHandle(edgeType) {

    return edgeType.namespace === 'tw-field';

  }

  /**
   * @override
   */
  getReferencesFromField(tObj, fieldName, toWL) {

    // wrap in array
    return [ tObj.fields[fieldName] ];

  }

  /**
   * Stores and maybe overrides an edge in this tiddler
   */
  insertEdge(tObj, edge, type) {

    const toTRef = this.tracker.getTiddlerById(edge.to);
    if (toTRef == null) { // null or undefined
      return;
    }

    // only use the name without the private marker or the namespace
    utils.setField(tObj, type.name, toTRef);

    return edge;

  };

  /**
   * Deletes an edge in this tiddler
   */
  deleteEdge(tObj, edge, type) {

    const toTRef = this.tracker.getTiddlerById(edge.to);

    if (toTRef == null) { // null or undefined
      return;
    }

    // only use the name without the private marker or the namespace
    utils.setField(tObj, type.name, undefined);

    return edge;

  }
}

/*** Exports *******************************************************/

export { FieldEdgeTypeSubscriber };
