/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/body/transclude
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tw-body-transclude"] = TranscludeEdgeTypeSubscriber;

/*** Imports *******************************************************/

var AbstractRefEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * The TranscludeEdgeTypeSubscriber retrieves connections that result tiddler transclusions.
 *
 * Note: This subscriber only retrieves edges, however doesn't store or delete them. It only
 * works if the `$tw.wiki.getTiddlerTranscludes` method is present in the wiki.
 *
 * @inheritDoc
 * @constructor
 */
function TranscludeEdgeTypeSubscriber(allEdgeTypes) {
  AbstractRefEdgeTypeSubscriber.call(this, allEdgeTypes);

}

// !! EXTENSION !!
TranscludeEdgeTypeSubscriber.prototype = Object.create(AbstractRefEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @inheritDoc
 */
TranscludeEdgeTypeSubscriber.prototype.priority = 20;

/**
 * @inheritDoc
 */
TranscludeEdgeTypeSubscriber.prototype.ignore = (typeof $tw.wiki.getTiddlerTranscludes !== "function");

/**
 * @override
 */
TranscludeEdgeTypeSubscriber.prototype.getReferences = function(tObj, toWL, typeWL) {

  if (typeWL && !typeWL['tw-body:transclude']) {
    return;
  }

  var toRefs = $tw.wiki.getTiddlerTranscludes(tObj.fields.title);

  if (!toRefs || !toRefs.length) {
    return;
  }

  return { 'tw-body:transclude': toRefs };

};
