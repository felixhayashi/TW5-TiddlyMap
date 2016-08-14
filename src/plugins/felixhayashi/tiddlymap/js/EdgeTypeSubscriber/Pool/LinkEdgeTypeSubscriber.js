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

var RefEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/RefEdgeTypeSubscriber");

/*** Code **********************************************************/

/**
 * @constructor
 */
function LinkEdgeTypeSubscriber() {

  RefEdgeTypeSubscriber.call(this);

}

// !! EXTENSION !!
LinkEdgeTypeSubscriber.prototype = Object.create(RefEdgeTypeSubscriber.prototype);
// !! EXTENSION !!

/**
 * @type EdgeTypeSubscriberInfo
 */
LinkEdgeTypeSubscriber.prototype.subscription = {
  namespace: "tw-body",
  name: "link"
};

/**
 * @override
 */
LinkEdgeTypeSubscriber.prototype.getReferences = function(tObj) {

  return $tw.wiki.getTiddlerLinks(tObj.fields.title);

};
