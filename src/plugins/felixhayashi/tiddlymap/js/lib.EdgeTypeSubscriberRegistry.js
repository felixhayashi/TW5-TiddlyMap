/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry
type: application/javascript
module-type: library

@preserve

\*/

/*** Exports *******************************************************/

module.exports = EdgeTypeSubscriberRegistry;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");

/***************************** CODE ********************************/

/**
 * Registry to store and retrieve EdgeTypeSubcriber modules that are responsible
 * for handling the retrieval, insertion and deletion of EdgeType objects.
 *
 * @constructor
 *
 * @param {AbstractEdgeTypeSubscriber[]} subscribers
 * @param {EdgeType[]} allEdgeTypes
 */
function EdgeTypeSubscriberRegistry(subscribers, allEdgeTypes) {

  this.subscriberClasses = subscribers;
  this.updateIndex(allEdgeTypes);

}

/**
 * Gets all matching subscribers for a type.
 *
 * @param {EdgeType} edgeType
 * @returns AbstractEdgeTypeSubscriber[]
 */
EdgeTypeSubscriberRegistry.prototype.getAllForType = function(edgeType) {

  var allSubscribers = this.allSubscribers;
  var subscribersForType = [];
  for (var i = 0, l = allSubscribers.length; i < l; i++) {
    if (allSubscribers[i].canHandle(edgeType)) {
      subscribersForType.push(allSubscribers[i]);
      if (allSubscribers[i].skipOthers) {
        break;
      }
    }
  }

  return subscribersForType;

};

/**
 * Gets all subscribers.
 *
 * @returns AbstractEdgeTypeSubscriber[]
 */
EdgeTypeSubscriberRegistry.prototype.getAll = function() {

  return this.allSubscribers;

};

/**
 * Indexes all subscribers. Moreover, subscribers get linked to the edge
 * types that currently exist in the wiki.
 *
 * This method should be called everytime after an edge type is added or
 * removed in the system.
 *
 * @param {EdgeType[]} allEdgeTypes
 */
EdgeTypeSubscriberRegistry.prototype.updateIndex = function(allEdgeTypes) {

  var allSubscribers = [];

  // instantiate and register all active subscriber modules
  var subscriberClass = this.subscriberClasses;
  for (var moduleName in subscriberClass) {
    var subscriber = new (subscriberClass[moduleName])(allEdgeTypes);

    // ignore all subscribers that have their ignore flag set to false
    if (subscriber.ignore === true) continue;

    allSubscribers.push(subscriber);
  }

  // sort subscribers by priority
  allSubscribers.sort(function(s1, s2) { return s2.priority - s1.priority; } );

  this.allSubscribers = allSubscribers;

};
