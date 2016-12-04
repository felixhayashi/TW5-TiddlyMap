// tw-module
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import AbstractMagicEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber';

/*** Code **********************************************************/

/**
 * The FilterEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields via a dynamic filter.
 *
 * @see http://tiddlymap.org/#tw-filter
 * @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/206
 */
class FilterEdgeTypeSubstriber extends AbstractMagicEdgeTypeSubscriber {

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

    return edgeType.namespace === 'tw-filter';

  }

  /**
   * @override
   */
  getReferencesFromField(tObj, fieldName) {

    var filter = tObj.fields[fieldName];
    var toRefs = utils.getMatches(filter, toWL);

    return toRefs;

  }
}

/*** Exports *******************************************************/

export { FilterEdgeTypeSubstriber };
