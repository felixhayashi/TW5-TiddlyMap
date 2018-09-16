"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry
type: application/javascript
module-type: library

@preserve

\*/

/**
 * Registry to store and retrieve EdgeTypeSubcriber modules that are responsible
 * for handling the retrieval, insertion and deletion of EdgeType objects.
 */
var EdgeTypeSubscriberRegistry = function () {

  /**
   * @param {AbstractEdgeTypeSubscriber[]} subscribers
   * @param {EdgeType[]} allEdgeTypes
   * @param {Tracker} tracker
   */
  function EdgeTypeSubscriberRegistry(subscribers, allEdgeTypes, tracker) {
    _classCallCheck(this, EdgeTypeSubscriberRegistry);

    this.subscriberClasses = subscribers;
    this.tracker = tracker;

    this.updateIndex(allEdgeTypes);
  }

  /**
   * Gets all matching subscribers for a type.
   *
   * @param {EdgeType} edgeType
   * @returns AbstractEdgeTypeSubscriber[]
   */


  _createClass(EdgeTypeSubscriberRegistry, [{
    key: "getAllForType",
    value: function getAllForType(edgeType) {

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
    }

    /**
     * Gets all subscribers.
     *
     * @returns AbstractEdgeTypeSubscriber[]
     */

  }, {
    key: "getAll",
    value: function getAll() {

      return this.allSubscribers;
    }

    /**
     * Indexes all subscribers. Moreover, subscribers get linked to the edge
     * types that currently exist in the wiki.
     *
     * This method should be called everytime after an edge type is added or
     * removed in the system.
     *
     * @param {EdgeType[]} allEdgeTypes
     */

  }, {
    key: "updateIndex",
    value: function updateIndex(allEdgeTypes) {

      var allSubscribers = [];

      // instantiate and register all active subscriber modules
      var subscriberClass = this.subscriberClasses;
      for (var moduleName in subscriberClass) {

        var subscriber = new subscriberClass[moduleName](allEdgeTypes);
        subscriber.setTracker(this.tracker);

        // ignore all subscribers that have their ignore flag set to false
        if (subscriber.ignore === true) {
          continue;
        }

        allSubscribers.push(subscriber);
      }

      // sort subscribers by priority
      allSubscribers.sort(function (s1, s2) {
        return s2.priority - s1.priority;
      });

      this.allSubscribers = allSubscribers;
    }
  }]);

  return EdgeTypeSubscriberRegistry;
}();

/*** Exports *******************************************************/

exports.default = EdgeTypeSubscriberRegistry;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/EdgeTypeSubscriberRegistry.js.map
