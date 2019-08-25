/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import MapElementType from '$:/plugins/felixhayashi/tiddlymap/js/MapElementType';
import utils          from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

/**
 * Used to define the type of a node.
 *
 * Note: NodeType instances are immutable (frozen).
 */
class NodeType extends MapElementType {

  constructor(id, data) {

    id = (typeof id === 'string'
      ? utils.getWithoutPrefix(id, $tm.path.nodeTypes + '/')
      : 'tmap:unknown');

    // call the parent constructor
    super(id, $tm.path.nodeTypes, NodeType.fieldMeta, data);

    Object.freeze(this);

  }

  /**
   * Get all tiddlers that inherit this type.
   *
   * @param {Array<TiddlerReference>} [src=$tw.wiki.allTitles()] - A list
   *     of tiddlers that is searched for inheritors.
   * @return {Array<TiddlerReference>} The inheritors.
   */
  getInheritors(src) {

    return (this.scope ? utils.getMatches(this.scope, src || $tw.wiki.allTitles()) : []);

  }

}

/**
 * @see https://github.com/babel/babel/issues/4854
 * @param {string} id - Either the edge type id (name)
 *     or a tiddler reference denoting the type or an
 *     `EdgeType` object (that is directly bounced back). If the
 *     id can be translated into a tiddler object that resides in
 *     the edge type path, then its data is retrieved automatically.
 */
NodeType.getInstance = id => id instanceof NodeType ? id : new NodeType(id);

NodeType.fieldMeta = {
  ...MapElementType.fieldMeta,
  'view': {},
  'priority': {
    parse: raw => isNaN(raw) ? 1 : parseInt(raw),
    stringify: num => utils.isInteger(num) ? num.toString() : '1',
  },
  'scope': {
    stringify: utils.getWithoutNewLines
  },
  'fa-icon': {},
  'tw-icon': {},
};

/*** Exports *******************************************************/

export default NodeType;
