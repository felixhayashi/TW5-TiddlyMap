// tw-module
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import Edge from '$:/plugins/felixhayashi/tiddlymap/js/Edge';
import { MissingOverrideError } from '$:/plugins/felixhayashi/tiddlymap/js/exception';
import AbstractRefEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber';

/**
 * @constructor
 */
class AbstractMagicEdgeTypeSubscriber extends AbstractRefEdgeTypeSubscriber {

  /**
   * @inheritDoc
   */
  constructor(allEdgeTypes, options) {

    super(allEdgeTypes, options);

    // later used for edge retrieval to identify those fields that hold connections
    this.edgeTypesByFieldName = utils.makeHashMap();

    for (var id in allEdgeTypes) {
      var edgeType = allEdgeTypes[id];
      if (this.canHandle(edgeType)) {
        this.edgeTypesByFieldName[edgeType.name] = edgeType;
      }
    }

  }

  /**
   * Returns all references to other tiddlers stored in the specified tiddler.
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
  getReferencesFromField(tObj, toWL, typeWL) {

    throw new MissingOverrideError(this, 'getReferencesFromField');

  };

  /**
   * @inheritDoc
   */
  getReferences(tObj, toWL, typeWL) {

    var refsGroupedByType = utils.makeHashMap();
    var fieldNames = tObj.fields;

    for (var fieldName in fieldNames) {

      var type = this.edgeTypesByFieldName[fieldName];

      if (!type || (typeWL && !typeWL[type.id])) continue;

      var toRefs = this.getReferencesFromField(tObj, fieldName, toWL);

      if (toRefs && toRefs.length) {
        refsGroupedByType[type.id] = toRefs;
      }

    }

    return refsGroupedByType;

  }
}

/*** Exports *******************************************************/

export default AbstractMagicEdgeTypeSubscriber;
