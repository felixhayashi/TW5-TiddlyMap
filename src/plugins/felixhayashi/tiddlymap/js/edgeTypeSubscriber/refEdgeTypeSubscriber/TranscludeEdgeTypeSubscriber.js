/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/body/transclude
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

import AbstractRefEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber';

/**
 * The TranscludeEdgeTypeSubscriber retrieves connections that result tiddler transclusions.
 *
 * Note: This subscriber only retrieves edges, however doesn't store or delete them. It only
 * works if the `$tw.wiki.getTiddlerTranscludes` method is present in the wiki.
 */
class TranscludeEdgeTypeSubscriber extends AbstractRefEdgeTypeSubscriber {

  /**
   * @inheritDoc
   */
  constructor(allEdgeTypes, options = {}) {
    super(allEdgeTypes, {
      priority: 20,
      ignore: (typeof $tw.wiki.getTiddlerTranscludes !== 'function'),
      ...options,
    });
  }

  /**
   * @inheritDoc
   */
  canHandle(edgeType) {

    return edgeType.id === 'tw-body:transclude';

  }

  /**
   * @inheritDoc
   */
  getReferences(tObj, toWL, typeWL) {

    if (typeWL && !typeWL['tw-body:transclude']) {
      return;
    }

    var toRefs = $tw.wiki.getTiddlerTranscludes(tObj.fields.title);

    if (!toRefs || !toRefs.length) {
      return;
    }

    return { 'tw-body:transclude': toRefs };

  }
}

/*** Exports *******************************************************/

export { TranscludeEdgeTypeSubscriber };
