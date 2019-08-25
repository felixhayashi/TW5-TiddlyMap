/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Edge
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

/**
 * @constructor
 */
class Edge {

  constructor(from, to, type, id) {

    this.from = from;
    this.to = to;
    this.type = type;
    this.id = (id || utils.genUUID());

  }

}

/*** Exports *******************************************************/

export default Edge;
