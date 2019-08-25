/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/body/link
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

import AbstractRefEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber';

/**
 * The LinkEdgeTypeSubscriber deals with connections that are stored inside
 * a tiddler' text field.
 *
 * Note: This subscriber only retrieves edges, however doesn't store or delete them.
 *
 * @see http://tiddlymap.org/#tw-body
 */
class LinkEdgeTypeSubscriber extends AbstractRefEdgeTypeSubscriber {

  /**
   * @inheritDoc
   */
  constructor(allEdgeTypes, options = {}) {
    super(allEdgeTypes, { priority: 20, ...options });
  }

  /**
   * @inheritDoc
   */
  canHandle(edgeType) {

    return edgeType.id === 'tw-body:link';

  }

  /**
   * @inheritDoc
   */
  getReferences(tObj, toWL, typeWL) {

    if (typeWL && !typeWL['tw-body:link']) {
      return;
    }

    var toRefs = $tw.wiki.getTiddlerLinks(tObj.fields.title);

    if (!toRefs || !toRefs.length) {
      return;
    }

    return { 'tw-body:link': toRefs };

  }
}

/*** Exports *******************************************************/

export { LinkEdgeTypeSubscriber };
