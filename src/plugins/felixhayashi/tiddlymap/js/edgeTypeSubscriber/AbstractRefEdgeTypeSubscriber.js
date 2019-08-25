/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import Edge from '$:/plugins/felixhayashi/tiddlymap/js/Edge';
import { MissingOverrideError } from '$:/plugins/felixhayashi/tiddlymap/js/exception';
import AbstractEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber';

/*** Code **********************************************************/

/**
 * Parent class for all subscribers that retrieve or store
 * non-TiddlyMap edges ({@see TmapEdgeTypeSubscriber) from a tiddler,
 * for example tag or list references.
 */
class AbstractRefEdgeTypeSubscriber extends AbstractEdgeTypeSubscriber {

  /**
   * @inheritDoc
   */
  loadEdges(tObj, toWL, typeWL) {

    // references to other tiddlers grouped by their edge type
    const refsByType = this.getReferences(tObj, toWL, typeWL);

    if (!refsByType || !utils.hasElements(refsByType)) return;

    const fromId = tObj.fields['tmap.id'];
    const idByT = $tm.tracker.getIdsByTiddlers();
    const allETy = this.allEdgeTypes;
    const fromTRef = utils.getTiddlerRef(tObj);

    const edges = utils.makeHashMap();

    for (let typeId in refsByType) {

      const toRefs = refsByType[typeId];

      if (!toRefs) {
        continue;
      }

      const type = allETy[typeId];
      for (let i = toRefs.length; i--;) {
        const toTRef = toRefs[i];

        if (!toTRef
          || !$tw.wiki.tiddlerExists(toTRef)
          || utils.isSystemOrDraft(toTRef)
          || (toWL && !toWL[toTRef])) {
          continue;
        }

        const id = type.id + $tw.utils.hashString(fromTRef + toTRef);
        edges[id] = new Edge(fromId, idByT[toTRef], type.id, id);
      }
    }

    return edges;

  }

  /**
   * Returns a list of tiddlers (= tiddler names) that are targeted by the specified tiddler.
   * Note: All referenced tiddlers have to be grouped by their edge type.
   *
   * @interface
   * @param {Tiddler} tObj - the tiddler that holds the references.
   * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
   *     be included in the result.
   * @param {Object<id, EdgeType>} typeWL - a whitelist that defines that only Tiddlers that are linked
   *     via a type specified in the list may be included in the result.
   * @return {Object<string, TiddlerReference[]>|null} a list of referenced tiddlers grouped by their edge type.
   */
  getReferences(tObj, toWL, typeWL) {

    throw new MissingOverrideError(this, 'getReferences');

  }
}

/*** Exports *******************************************************/

export default AbstractRefEdgeTypeSubscriber;
