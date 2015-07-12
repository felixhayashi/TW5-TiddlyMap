/*\

title: $:/plugins/felixhayashi/tiddlymap/widget/connections.js
type: application/javascript
module-type: widget

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// import classes
var Widget = require("$:/core/modules/widgets/widget.js").widget;
var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;

/**
 * @constructor
 */
var EdgeListWidget = function(parseTreeNode,options) {
  
  // call the parent constructor  
  Widget.call(this, parseTreeNode, options);
  
  // import services
  this.utils = $tw.tmap.utils;
    
};

// !! EXTENSION !!
EdgeListWidget.prototype = Object.create(Widget.prototype);
// !! EXTENSION !!

EdgeListWidget.prototype.render = function(parent,nextSibling) {
  
  this.parentDomNode = parent;
  this.computeAttributes();
  this.execute();
  this.renderChildren(parent,nextSibling);
  
};

EdgeListWidget.prototype.execute = function() {
  
  var nodes = [ this.getVariable("currentTiddler") ];
  var options = {
    typeWL: $tw.tmap.adapter.getEdgeTypeWhiteList("[!suffix[tw-body:link]]")
  };

  var neighbourhood = $tw.tmap.adapter.getNeighbours(nodes, options);

  // retrieve nodes and edges
  var neighbours = neighbourhood.nodes;
  var edges = neighbourhood.edges;
  
  var entries = [];
  for(var id in edges) {
    var edge = edges[id];
    var direction = (neighbours[edge.to] ? "To" : "From");
    var neighbour = neighbours[edge[direction.toLowerCase()]];
    
    if(!neighbour) continue; // obsolete edge from old times;
    
    // make item template
    entries.push({
      type: "tmap-edgelistitem",
      edge: edge,
      neighbour: neighbour,
      direction: direction,
      // the children of this widget (=what is wrapped inside the
      // widget-element's body) is used as template for the list items
      children: this.parseTreeNode.children
    });
  }

  this.makeChildWidgets(entries);
  
};

EdgeListWidget.prototype.refresh = function(changedTiddlers) {

  for(var tRef in changedTiddlers) {
    if(!this.utils.isSystemOrDraft(tRef)) {
    
      this.refreshSelf();
      return true;
    
    } 
  }
    
  // let children decide for themselves
  return this.refreshChildren(changedTiddlers);

};

// !! EXPORT !!
exports["tmap-connections"] = EdgeListWidget;
// !! EXPORT !!

/**
 * @constructor
 */
var EdgeListItemWidget = function(parseTreeNode, options) {
  
  Widget.call(this, parseTreeNode, options);
  
  // import services
  this.utils = $tw.tmap.utils;
  
};

// !! EXTENSION !!
EdgeListItemWidget.prototype = Object.create(Widget.prototype);
// !! EXTENSION !!

EdgeListItemWidget.prototype.execute = function() {
  
  var item = this.parseTreeNode;
  var tRef = $tw.tmap.indeces.tById[item.neighbour.id];
  
  // make edge properties available as variables
  var edge = this.utils.flatten(item.edge);
  for(var p in edge) {
    if(typeof edge[p] === "string") {
      this.setVariable("edge." + p, edge[p]);
    }
  }
    
  this.setVariable("currentTiddler", tRef);
  this.setVariable("neighbour", tRef);
  this.setVariable("direction", item.direction);
  
  // Construct the child widgets
  this.makeChildWidgets();
  
};

EdgeListItemWidget.prototype.refresh = function(changedTiddlers) {
  
  return this.refreshChildren(changedTiddlers);
  
};

// !! EXPORT !!
exports["tmap-edgelistitem"] = EdgeListItemWidget;
// !! EXPORT !!

})();