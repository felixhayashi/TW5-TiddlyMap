/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeTypeSubscriberRegistry
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

module.exports = EdgeTypeSubscriberRegistry;

/*** Imports *******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils");
var MagicEdgeTypeSubscriber = require("$:/plugins/felixhayashi/tiddlymap/js/MagicEdgeTypeSubscriber");
  
/***************************** CODE ********************************/

/**
 * @constructor
 */
function EdgeTypeSubscriberRegistry(subscribers) {
  
  this.allSubscribers = [];
  this.namespaceSubscribers = utils.makeHashMap();
  this.fullTypeSubscribers = utils.makeHashMap();
  this.magicNamespaceSubscribers = utils.makeHashMap();

  for (var id in subscribers) {
    
    var subscriber = new (subscribers[id])();
    var subscription = subscriber.subscription;
        
    // ignore all subscribers that have their ignore flag set to false
    if (subscription.ignore === true) continue;
    
    this.allSubscribers.push(subscriber);
    
    // a subscriber without a subscription is regarded as default subscriber
    if (subscription.fallback) {
      this.defaultSubscriber = subscriber;
    }
    
    if (subscription.type) {
        this.fullTypeSubscribers[subscription.type] = subscriber;
        continue;
    }
      
    if (subscription.namespace) {
      
      this.namespaceSubscribers[subscription.namespace] = subscriber;
      
      if (subscription.magic) {
        this.magicNamespaceSubscribers[subscription.namespace] = subscriber;
      }
      
    }
  }
}

EdgeTypeSubscriberRegistry.prototype.getAll = function() {
  
  return this.allSubscribers;
  
};

EdgeTypeSubscriberRegistry.prototype.getFullTypeSubscribers = function() {
  
  return this.fullTypeSubscribers;
  
};

EdgeTypeSubscriberRegistry.prototype.getNamespaceSubscribers = function() {

  return this.namespaceSubscribers;

};

EdgeTypeSubscriberRegistry.prototype.getMagicNamespaceSubscribers = function() {

  return this.magicNamespaceSubscribers;

};

/**
 * Gets a subscriber that matches the namespace or returns the default subscriber
 * @param namespace
 * @returns {*}
 */
EdgeTypeSubscriberRegistry.prototype.get = function(type) {
  
  return this.fullTypeSubscribers[type.id]
         || this.namespaceSubscribers[type.namespace]
         || this.defaultSubscriber;
  
};