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

var RefEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/RefEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function TranscludeEdgeTypeSubscriber() {

  RefEdgeTypeSubscriber.call(this);

}

// !! EXTENSION !!
TranscludeEdgeTypeSubscriber.prototype = Object.create(RefEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @type EdgeTypeSubscriberInfo
 */
TranscludeEdgeTypeSubscriber.prototype.subscription = {

  namespace: "tw-body",
  name: "transclude",
  ignore: (typeof $tw.wiki.getTiddlerTranscludes !== "function")

};

/**
 * @override
 */
TranscludeEdgeTypeSubscriber.prototype.getReferences = function(tObj) {

  return $tw.wiki.getTiddlerTranscludes(tObj.fields.title);

};
