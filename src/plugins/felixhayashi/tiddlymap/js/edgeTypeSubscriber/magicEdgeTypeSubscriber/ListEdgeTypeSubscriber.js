/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/list
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import AbstractMagicEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber';

/*** Code **********************************************************/

/**
 * The ListEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields in a tiddler-list format.
 *
 * If an EdgeType with a 'tw-list" namespace is inserted or deleted, the type's name
 * is interpreted as field name and the list of connections is stored or removed in a tiddler
 * field with of that name. Each outgoing connection to a tiddler is stored by
 * inserting the title the edge is pointing to into a list.
 *
 * Say you the user creates a connection between tiddler "Dawna Dozal" and
 * tiddler "Toney Thacker" and names the connection "tw-list:friends". Then a field
 * named "friends" will be created in tiddler "Dawna Dozal" and "Toney Thacker" will be
 * added to this field.
 *
 * @see http://tiddlymap.org/#tw-list
 */
class ListEdgeTypeSubscriber extends AbstractMagicEdgeTypeSubscriber {

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

    return edgeType.namespace === 'tw-list';

  }

  /**
   * @override
   */
  getReferencesFromField(tObj, fieldName, toWL) {

    return $tw.utils.parseStringArray(tObj.fields[fieldName]);

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

    let list = $tw.utils.parseStringArray(tObj.fields[name]);
    // we need to clone the array since tiddlywiki might directly
    // returned the auto-parsed field value (as in case of tags, or list)
    // and this array would be read only!
    list = (list || []).slice();

    // transform
    const toTRef = this.tracker.getTiddlerById(edge.to);

    list.push(toTRef);

    // save
    utils.setField(tObj, name, $tw.utils.stringifyList(list));

    return edge;

  };

  /**
   * Deletes an edge in this tiddler
   */
  deleteEdge(tObj, edge, type) {

    let list = $tw.utils.parseStringArray(tObj.fields[type.name]);
    // we need to clone the array since tiddlywiki might directly
    // returned the auto-parsed field value (as in case of tags, or list)
    // and this array would be read only!
    list = (list || []).slice();

    // transform
    const toTRef = this.tracker.getTiddlerById(edge.to);

    const index = list.indexOf(toTRef);
    if (index > -1) {
      list.splice(index, 1);
    }

    // @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/288
    let stringList;
    if (list.length > 0) {
      stringList = $tw.utils.stringifyList(list);
    }
    // save
    utils.setField(tObj, type.name, stringList);

    return edge;

  }
}

/*** Exports *******************************************************/

export { ListEdgeTypeSubscriber };
