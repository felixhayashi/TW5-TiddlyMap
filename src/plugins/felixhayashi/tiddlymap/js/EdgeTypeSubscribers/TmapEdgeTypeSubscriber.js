/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/tmap
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tmap"] = TmapEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var Edge  = require("$:/plugins/felixhayashi/tiddlymap/js/Edge");
var AbstractEdgeTypeSubscriber  = require("$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * TiddlyMap's original EdgeTypeSubscriber. It will store and retrieve edges by relying on
 * json stored in a tiddler field.
 *
 * @constructor
 */
function TmapEdgeTypeSubscriber(allEdgeTypes) {

  AbstractEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
TmapEdgeTypeSubscriber.prototype = Object.create(AbstractEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @inheritDoc
 */
TmapEdgeTypeSubscriber.prototype.priority = 0;

/**
 * @inheritDoc
 */
TmapEdgeTypeSubscriber.prototype.loadEdges = function(tObj, toWL, typeWL) {

  var connections = utils.parseFieldData(tObj, 'tmap.edges');
  if(!connections) return;

  var tById = $tm.indeces.tById;
  var fromId = tObj.fields['tmap.id'];

  var edges = utils.makeHashMap();

  for(var conId in connections) {
    var con = connections[conId];
    var toTRef = tById[con.to];
    if(toTRef && (!toWL || toWL[toTRef]) && (!typeWL || typeWL[con.type])) {
      edges[conId] = new Edge(fromId, con.to, con.type, conId);
    }
  }

  return edges;

};

/**
 * @inheritDoc
 */
TmapEdgeTypeSubscriber.prototype.insertEdge = function(tObj, edge, type) {

  // load existing connections
  var connections = utils.parseFieldData(tObj, 'tmap.edges', {});

  // assign new id if not present yet
  edge.id = edge.id || utils.genUUID();
  // add to connections object
  connections[edge.id] = { to: edge.to, type: type.id };

  // save
  utils.writeFieldData(tObj, 'tmap.edges', connections, $tm.config.sys.jsonIndentation);

  return edge;

};

/**
 * @inheritDoc
 */
TmapEdgeTypeSubscriber.prototype.deleteEdge = function(tObj, edge, type) {

  if(!edge.id) return;

  // load
  var connections = utils.parseFieldData(tObj, 'tmap.edges', {});

  // delete
  delete connections[edge.id];

  // save
  utils.writeFieldData(tObj, 'tmap.edges', connections, $tm.config.sys.jsonIndentation);

  return edge;

};

/**
 * @inheritDoc
 */
TmapEdgeTypeSubscriber.prototype.canHandle = function(edgeType) {

  return true;

};

