/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import MapElementType from '$:/plugins/felixhayashi/tiddlymap/js/MapElementType';
import utils          from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import * as env       from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';

/*** Code **********************************************************/

/**
 * This class is used to abstract edge types. It facilitates the parsing
 * of style information, the translation of type names into actual type data
 * or the persistance of edge type data.
 *
 * Note: EdgeType instances are immutable (frozen).
 */
class EdgeType extends MapElementType {

  /**
   * @param {EdgeTypeId} id
   * @param {Object} [data] @see http://visjs.org/docs/network/edges.html
   */
  constructor(id, data) {

    // we do not simply use the provided id but disassemble and
    // reassemble it again to ensure the id is well formatted.
    const { marker, namespace, name } = EdgeType.getIdParts(id);
    id = EdgeType.getId(marker, namespace, name);

    // call the parent constructor
    super(id, env.path.edgeTypes, EdgeType.fieldMeta, data);

    this.id = id;
    this.marker = marker;
    this.name = name;
    this.namespace = namespace;

    const arrows = (this.style || {}).arrows;

    if (arrows) {

      this.invertedArrow = isArrowEnabled(arrows, 'from');
      this.toArrow = isArrowEnabled(arrows, 'to') || isArrowEnabled(arrows, 'middle');
      // determine if bi arrows (either from+to or no arrows)
      this.biArrow = (this.invertedArrow === this.toArrow);

      if (this.biArrow) {
        this.toArrow = true;
        this.invertedArrow = true;
      }

    } else {

      this.toArrow = true;
    }

    Object.freeze(this);

  }

  /**
   * Returns an object holding the parts that make up the edge type id.
   *
   * @param {EdgeTypeId} id
   * @return {{marker: (*|string), namespace: (*|string), name: (*|string)}}
   */
  static getIdParts(id = '') {

    id = utils.getWithoutPrefix(id, `${env.path.edgeTypes}/`);
    const match = id.match(edgeTypeRegex) || [];

    return {
      marker: match[1] || '',
      namespace: (match[3] && match[2]) || '',
      name: (match[3] || match[2]) || ''
    };

  };

  /**
   * Creates an {@link EdgeTypeId} from a set of parts that make up the id.
   * If it is not possible to create the id from the parts, the default
   * edge type 'tmap:unknown' is returned.
   *
   * @param {string} marker
   * @param {string} namespace
   * @param {string} name
   * @return {EdgeTypeId}
   */
  static getId(marker = '', namespace = '', name) {

    return name
      ? marker + (namespace && `${namespace}:`) + name
      : 'tmap:unknown';

  }

  getLabel() {

    return this.label || this.name;

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
EdgeType.getInstance = id => id instanceof EdgeType ? id : new EdgeType(id);

EdgeType.fieldMeta = {
  ...MapElementType.fieldMeta,
  'label': {},
  'show-label': {},
};

/**
 *
 * @param {Object} arrows
 * @param {('from'|'to'|'middle')} direction
 * @return {boolean}
 */
const isArrowEnabled = (arrows, direction) => {

  const arrow = arrows[direction];

  if (arrow == null && direction === 'to') {
    // if the arrow is not further specified and its direction is to
    // we regard it as enabled.
    return true;
  }

  return typeof arrow === 'object' ? arrow.enabled !== false : arrow === true;

};

/**
 * An edge-type id consists of the following parts of which the
 * first two are optional: `[marker][namespace:]name`
 *
 * The colon is not considered to be part of the namespace.
 */
const edgeTypeRegex = new RegExp('^(_?)([^:_][^:]*):?([^:]*)');

/*** Exports *******************************************************/

export default EdgeType;
