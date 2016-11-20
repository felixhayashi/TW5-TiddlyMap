/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/body/link
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tw-body-link"] = LinkEdgeTypeSubscriber;

/*** Imports *******************************************************/

var AbstractRefEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber");
var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");

/*** Code **********************************************************/

/**
 * The LinkEdgeTypeSubscriber deals with connections that are stored inside
 * a tiddler' text field.
 *
 * Note: This subscriber only retrieves edges, however doesn't store or delete them.
 *
 * @see http://tiddlymap.org/#tw-body
 * @constructor
 */
function LinkEdgeTypeSubscriber(allEdgeTypes) {

  AbstractRefEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
LinkEdgeTypeSubscriber.prototype = Object.create(AbstractRefEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @inheritDoc
 */
LinkEdgeTypeSubscriber.prototype.priority = 20;

/**
 * @inheritDoc
 */
LinkEdgeTypeSubscriber.prototype.getReferences = function(tObj, toWL, typeWL) {

  if (typeWL && !typeWL['tw-body:link']) {
    return;
  }

  var toRefs = $tw.wiki.getTiddlerLinks(tObj.fields.title);

  if (!toRefs || !toRefs.length) {
    return;
  }

  return utils.makeHashMap({ 'tw-body:link': toRefs });

};

/**
 * @inheritDoc
 */
LinkEdgeTypeSubscriber.prototype.canHandle = function(edgeType) {

  return edgeType.id === 'tw-body:link';

};
