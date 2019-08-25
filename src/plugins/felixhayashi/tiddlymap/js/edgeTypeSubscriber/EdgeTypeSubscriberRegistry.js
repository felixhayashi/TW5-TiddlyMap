/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/**
 * Registry to store and retrieve EdgeTypeSubcriber modules that are responsible
 * for handling the retrieval, insertion and deletion of EdgeType objects.
 */
class EdgeTypeSubscriberRegistry {

  /**
   * @param {AbstractEdgeTypeSubscriber[]} subscribers
   * @param {EdgeType[]} allEdgeTypes
   * @param {Tracker} tracker
   */
  constructor(subscribers, allEdgeTypes, tracker) {

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
  getAllForType(edgeType) {

    const allSubscribers = this.allSubscribers;
    const subscribersForType = [];

    for (let i = 0, l = allSubscribers.length; i < l; i++) {

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
  getAll() {

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
  updateIndex(allEdgeTypes) {

    const allSubscribers = [];

    // instantiate and register all active subscriber modules
    const subscriberClass = this.subscriberClasses;
    for (let moduleName in subscriberClass) {

      const subscriber = new (subscriberClass[moduleName])(allEdgeTypes);
      subscriber.setTracker(this.tracker);

      // ignore all subscribers that have their ignore flag set to false
      if (subscriber.ignore === true) {
        continue;
      }

      allSubscribers.push(subscriber);
    }

    // sort subscribers by priority
    allSubscribers.sort((s1, s2) => s2.priority - s1.priority);

    this.allSubscribers = allSubscribers;

  }
}

/*** Exports *******************************************************/

export default EdgeTypeSubscriberRegistry;
