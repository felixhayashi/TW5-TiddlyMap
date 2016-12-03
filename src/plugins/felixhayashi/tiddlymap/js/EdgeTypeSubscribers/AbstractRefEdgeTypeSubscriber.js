/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

/*** Exports *******************************************************/

module.exports = AbstractRefEdgeTypeSubscriber;

/*** Imports *******************************************************/

var utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');
var Edge  = require('$:/plugins/felixhayashi/tiddlymap/js/Edge');
var AbstractEdgeTypeSubscriber  = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber');

/*** Code **********************************************************/

/**
 * Parent class for all subscribers that retrieve or store
 * non-TiddlyMap edges ({@see TmapEdgeTypeSubscriber) from a tiddler,
 * for example tag or list references.
 *
 * @constructor
 * @inheritDoc
 */
function AbstractRefEdgeTypeSubscriber(allEdgeTypes) {

  AbstractEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
AbstractRefEdgeTypeSubscriber.prototype = Object.create(AbstractEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @inheritDoc
 */
AbstractRefEdgeTypeSubscriber.prototype.loadEdges = function(tObj, toWL, typeWL) {

  // references to other tiddlers grouped by their edge type
  var refsByType = this.getReferences(tObj, toWL, typeWL);

  if (!refsByType || !utils.hasElements(refsByType)) return;

  var fromId = tObj.fields['tmap.id'];
  var idByT = $tm.indeces.idByT;
  var allETy = this.allEdgeTypes;
  var fromTRef = utils.getTiddlerRef(tObj);

  var edges = utils.makeHashMap();

  for(var typeId in refsByType) {
    var toRefs = refsByType[typeId];

    if(!toRefs) continue;

    var type = allETy[typeId];
    for(var i = toRefs.length; i--;) {
      var toTRef = toRefs[i];

      if(!toTRef
         || !$tw.wiki.tiddlerExists(toTRef)
         || utils.isSystemOrDraft(toTRef)
         || (toWL && !toWL[toTRef])) continue;

      var id = type.id + $tw.utils.hashString(fromTRef + toTRef);
      edges[id] = new Edge(fromId, idByT[toTRef], type.id, id);
    }
  }

  return edges;

};

/**
 * Returns a list of tiddlers (= tiddler names) that are targeted by the specified tiddler.
 * Note: All referenced tiddlers have to be grouped by their edge type.
 *
 * @param {Tiddler} tObj - the tiddler that holds the references.
 * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
 *     be included in the result.
 * @param {Object<id, EdgeType>} typeWL - a whitelist that defines that only Tiddlers that are linked
 *     via a type specified in the list may be included in the result.
 * @return {Object<string, TiddlerReference[]>|null} a list of referenced tiddlers grouped by their edge type.
 */
AbstractRefEdgeTypeSubscriber.prototype.getReferences = function(tObj, toWL, typeWL) {

  throw new utils.exception.MissingOverrideError(this, 'getReferencesFromField');

};
