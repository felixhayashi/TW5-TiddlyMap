/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import AbstractMagicEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber';
import Widget from "$:/core/modules/widgets/widget.js";

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
  getReferencesFromField(tObj, fieldName, toWL) {

    const filter = tObj.fields[fieldName];

    // Solves https://github.com/felixhayashi/TW5-TiddlyMap/issues/278
    const parentWidget = new Widget.widget({});
    parentWidget.setVariable("currentTiddler", tObj.fields.title);
    const widget = new Widget.widget({}, {"parentWidget": parentWidget});
    //noinspection UnnecessaryLocalVariableJS
    const toRefs = utils.getMatches(filter, toWL, widget);

    return toRefs;

  }

  /**
   * Stores and maybe overrides an edge in this tiddler
   */
  insertEdge(tObj, edge, type) {

    if (!edge.to) {
      return;
    }

    // get the name without the private marker or the namespace
    const name = type.name;
    const currentFilter = tObj.fields[name] || "";
    const toTRef = this.tracker.getTiddlerById(edge.to);
    // by treating the toTRef as a list of one, we can make
    // it safe to append to any filter.
    // "tiddler" -> "tiddler"
    // "tiddler with spaces" -> "[[tiddler with spaces]]"
    var safe_toTRef = $tw.utils.stringifyList([toTRef]);

    if (currentFilter.length > 0) {
      safe_toTRef = " " + safe_toTRef;
    }

    // save
    utils.setField(tObj, name, currentFilter + safe_toTRef);

    return edge;

  };
}

/*** Exports *******************************************************/

export { FilterEdgeTypeSubstriber };
