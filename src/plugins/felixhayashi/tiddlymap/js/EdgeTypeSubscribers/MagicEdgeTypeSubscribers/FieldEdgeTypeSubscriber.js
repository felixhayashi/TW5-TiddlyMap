/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/field
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*** Exports *******************************************************/

exports['tw-field'] = FieldEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');
var AbstractMagicEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber');

/*** Code **********************************************************/

/**
 * The FieldEdgeTypeSubscriber deals with connections that are stored in form of tiddler fields.
 * In this case one field can only hold one connection.
 *
 * If an EdgeType with a "tw-field" namespace is inserted or deleted, the type's name
 * is interpreted as field name and the connection is stored or removed in a tiddler
 * field with of that name.
 *
 * E.g. creating an edge between the tiddlers "Betsy" and "Dave" with the type
 * tw-field:husband will create a field "husband" inside the "Betsy" tiddler and set
 * "Dave" as value.

 * Note: A single field can only hold one connection.
 *
 * @see http://tiddlymap.org/#tw-field
 *
 * @inheritDoc
 * @constructor
 */
function FieldEdgeTypeSubscriber(allEdgeTypes) {

  AbstractMagicEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
FieldEdgeTypeSubscriber.prototype = Object.create(AbstractMagicEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @inheritDoc
 */
FieldEdgeTypeSubscriber.prototype.priority = 10;

/**
 * @inheritDoc
 */
FieldEdgeTypeSubscriber.prototype.canHandle = function(edgeType) {

  return edgeType.namespace === 'tw-field';

};

/**
 * @override
 */
FieldEdgeTypeSubscriber.prototype.getReferencesFromField = function(tObj, fieldName) {

  // wrap in array
  return [ tObj.fields[fieldName] ];

};

/**
 * Stores and maybe overrides an edge in this tiddler
 */
FieldEdgeTypeSubscriber.prototype.insertEdge = function(tObj, edge, type) {

  var toTRef = $tm.indeces.tById[edge.to];
  if (toTRef == null) { // null or undefined
    return;
  }

  // only use the name without the private marker or the namespace
  utils.setField(tObj, type.name, toTRef);

  return edge;

};

/**
 * Deletes an edge in this tiddler
 */
FieldEdgeTypeSubscriber.prototype.deleteEdge = function(tObj, edge, type) {

  var toTRef = $tm.indeces.tById[edge.to];
  if (toTRef == null) return; // null or undefined

  // only use the name without the private marker or the namespace
  utils.setField(tObj, type.name, '');

  return edge;

};
