// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

import MapElementType from '$:/plugins/felixhayashi/tiddlymap/js/MapElementType';
import utils          from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import * as env       from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';

/*** Code **********************************************************/

/**
 * This class is used to abstract edge types. It facilitates inter
 * alia the parsing of style information, the translation of type
 * names into actual type data or the persistance of edge type data.
 *
 * @todo Make certain properties immutable, especially the id attribute and its parts!
 */
class EdgeType extends MapElementType {

  /**
   * @param {string} id - Either the edge type id (name)
   * @param {Object} [data]
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

    const arrow = this.style && this.style.arrows;

    if (arrow) {

      this.invertedArrow = isArrow(arrow, 'from');
      this.toArrow = isArrow(arrow, 'to') || isArrow(arrow, 'middle');
      // determine if bi arrows (either from+to or no arrows)
      this.biArrow = (this.invertedArrow === this.toArrow);

      if (this.biArrow) {
        this.toArrow = this.invertedArrow = true;
      }

    } else {

      this.toArrow = true;
    }

  }

  /**
   * @param {string} id
   * @return {{marker: (*|string), namespace: (*|string), name: (*|string)}}
   */
  static getIdParts(id = '') {

    id = utils.getWithoutPrefix(id, `${env.path.edgeTypes}/`);
    const match = id.match(EdgeType.edgeTypeRegex) || [];

    return {
      marker: match[1] || '',
      namespace: (match[3] && match[2]) || '',
      name: (match[3] || match[2]) || ''
    };

  };

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

const isArrow = (arrowObj, pos) => {

  const type = arrowObj[pos];

  return (pos === 'to' && type == null
  || type === true
  || typeof type === 'object' && type.enabled !== false);

};

/**
 * An edge-type id consists of the following parts of which the
 * first two are optional: `[marker][namespace:]name`
 *
 * The colon is not considered to be part of the namespace.
 */
EdgeType.edgeTypeRegex = new RegExp('^(_?)([^:_][^:]*):?([^:]*)');

/*** Exports *******************************************************/

export default EdgeType;
