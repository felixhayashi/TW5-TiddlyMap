/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/tmap
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import Edge from '$:/plugins/felixhayashi/tiddlymap/js/Edge';
import AbstractEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber';

/*** Code **********************************************************/

/**
 * TiddlyMap's original EdgeTypeSubscriber. It will store and retrieve edges by relying on
 * json stored in a tiddler field.
 *
 * @constructor
 */
class TmapEdgeTypeSubscriber extends AbstractEdgeTypeSubscriber {

  constructor(allEdgeTypes, options = {}) {
    super(allEdgeTypes, { priority: 0, ...options });
  }

  /**
   * @inheritDoc
   */
  loadEdges(tObj, toWL, typeWL) {

    const connections = utils.parseFieldData(tObj, 'tmap.edges');
    if (!connections) {
      return;
    }

    const tById = this.tracker.getTiddlersByIds();
    const fromId = tObj.fields['tmap.id'];

    const edges = utils.makeHashMap();

    for (let conId in connections) {

      const con = connections[conId];
      const toTRef = tById[con.to];
      if (toTRef && (!toWL || toWL[toTRef]) && (!typeWL || typeWL[con.type])) {

        edges[conId] = new Edge(fromId, con.to, con.type, conId);
      }
    }

    return edges;

  }

  /**
   * @inheritDoc
   */
  insertEdge(tObj, edge, type) {

    // load existing connections
    var connections = utils.parseFieldData(tObj, 'tmap.edges', {});

    // assign new id if not present yet
    edge.id = edge.id || utils.genUUID();
    // add to connections object
    connections[edge.id] = {to: edge.to, type: type.id};

    // save
    utils.writeFieldData(tObj, 'tmap.edges', connections, $tm.config.sys.jsonIndentation);

    return edge;

  }

  /**
   * @inheritDoc
   */
  deleteEdge (tObj, edge, type) {

    if (!edge.id) return;

    // load
    var connections = utils.parseFieldData(tObj, 'tmap.edges', {});

    // delete
    delete connections[edge.id];

    // save
    utils.writeFieldData(tObj, 'tmap.edges', connections, $tm.config.sys.jsonIndentation);

    return edge;

  }

  /**
   * @inheritDoc
   */
  canHandle(edgeType) {

    return true;

  }
}

/*** Exports *******************************************************/

export { TmapEdgeTypeSubscriber };
