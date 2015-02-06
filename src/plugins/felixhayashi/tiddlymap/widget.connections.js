/*\

title: $:/plugins/felixhayashi/tiddlymap/connections.js
type: application/javascript
module-type: widget

@preserve

\*/

// <$edges>{{!!title}}</$edges>
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;

var EdgeListWidget = function(parseTreeNode,options) {
  
  Widget.call(this, parseTreeNode, options);
  
  this.addEventListener("tm-remove-edge", function(event) {
    $tw.tiddlymap.adapter.deleteEdgeFromStore(event.paramObject);
  });
  
};

EdgeListWidget.prototype = Object.create(Widget.prototype);

EdgeListWidget.prototype.render = function(parent,nextSibling) {
  this.parentDomNode = parent;
  this.computeAttributes();
  this.execute();
  this.renderChildren(parent,nextSibling);
};

EdgeListWidget.prototype.execute = function() {
  var defaultFilter = "[field:title[" +
                      this.getVariable("currentTiddler") +
                      "]!has[draft.of]]";
  var filter = this.getAttribute("filter", defaultFilter);

  // retrieve nodes
  this.nodes = $tw.tiddlymap.adapter.selectNodesByFilter(filter, {
    outputType: "hashmap"
  });

  // retrieve edges
  this.edges = $tw.tiddlymap.adapter.selectEdgesByEndpoints(this.nodes, {
    outputType: "hashmap",
    endpointsInSet: ">=1"
  });
  
  // retrieve neighbours
  this.neighbours = $tw.tiddlymap.adapter.selectNeighbours(this.nodes, {
    edges: this.edges,
    outputType: "hashmap"
  });

  var entries = [];
  for(var id in this.edges) {
    var item = this.makeItemTemplate(this.edges[id]);
    if(item) {
      entries.push(item);
    }
  }

  this.makeChildWidgets(entries);
  
};

EdgeListWidget.prototype.makeItemTemplate = function(edge) {
  
  var text = "";
  var linkedNodeRole = (this.nodes[edge.to] ? "From" : "To");
  var linkedNode = this.neighbours[edge[linkedNodeRole.toLowerCase()]];

  if(!linkedNode) return; // obsolete edge from old times;
  
  return {
    type: "edgelistitem",
    edge: edge,
    link: linkedNode,
    linkRole: linkedNodeRole,
    children: this.parseTreeNode.children
  };
  
};

EdgeListWidget.prototype.refresh = function(changedTiddlers) {

  for(var tRef in changedTiddlers) {
    
    var isEdgeStore = utils.startsWith(tRef, $tw.tiddlymap.opt.path.edges);
    var isCurrentTiddler = (tRef === this.getVariable("currentTiddler"));
    
    if(isEdgeStore || isCurrentTiddler) {
      this.refreshSelf();
      return true;
    }
    
  }
    
  // let children decide for themselves
  return this.refreshChildren(changedTiddlers);

};

// !! EXPORT !!
exports["connections"] = EdgeListWidget;
// !! EXPORT !!

var EdgeListItemWidget = function(parseTreeNode,options) {
  Widget.call(this, parseTreeNode, options);
};

EdgeListItemWidget.prototype = Object.create(Widget.prototype);

EdgeListItemWidget.prototype.execute = function() {
  
  var item = this.parseTreeNode;
  
  this.setVariable("currentTiddler", item.link.ref);
  this.setVariable("edge.id", item.edge.id);
  this.setVariable("edge.label", item.edge.label);
  this.setVariable("neighbour", item.link.ref);
  this.setVariable("role", item.linkRole);
  
  // Construct the child widgets
  this.makeChildWidgets();
  
};

EdgeListItemWidget.prototype.refresh = function(changedTiddlers) {
  return this.refreshChildren(changedTiddlers);
};

// !! EXPORT !!
exports.edgelistitem = EdgeListItemWidget;
// !! EXPORT !!

})();