/*\

title: $:/plugins/felixhayashi/tiddlymap/widget/connections.js
type: application/javascript
module-type: widget

@module TiddlyMap
@preserve

\*/

// <$edges>{{!!title}}</$edges>
(/** @lends module:TiddlyMap*/function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;

var EdgeListWidget = function(parseTreeNode,options) {
  
  Widget.call(this, parseTreeNode, options);
    
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

  var nhood = $tw.tmap.adapter.getNeighbours(
                [ this.getVariable("currentTiddler") ],
                {
                  typeFilter: $tw.tmap.adapter.getEdgeTypeWhiteList("[!suffix[tw-body:link]]")
                }
              );

  // retrieve nodes
  this.neighbours = nhood.nodes;

  // retrieve edges
  this.edges = nhood.edges;
  
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
  var linkedNodeRole = (this.neighbours[edge.to] ? "To" : "From");
  var linkedNode = this.neighbours[edge[linkedNodeRole.toLowerCase()]];

  if(!linkedNode) return; // obsolete edge from old times;
  
  return {
    type: "tmap-edgelistitem",
    edge: edge,
    link: linkedNode,
    linkRole: linkedNodeRole,
    children: this.parseTreeNode.children
  };
  
};

EdgeListWidget.prototype.refresh = function(changedTiddlers) {

  for(var tRef in changedTiddlers) {
    if(!utils.isSystemOrDraft(tRef)) {
    
      //~ var isCurrentTiddler = (tRef === this.getVariable("currentTiddler"));
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

var EdgeListItemWidget = function(parseTreeNode,options) {
  Widget.call(this, parseTreeNode, options);
};

EdgeListItemWidget.prototype = Object.create(Widget.prototype);

EdgeListItemWidget.prototype.execute = function() {
  
  var item = this.parseTreeNode;
  var tRef = $tw.tmap.indeces.tById[item.link.id];
  
  var type = new EdgeType(item.edge.type);
  
  this.setVariable("currentTiddler", tRef);
  this.setVariable("edge.from", item.edge.from);
  this.setVariable("edge.id", item.edge.id);
  this.setVariable("edge.label", type.getLabel());
  this.setVariable("edge.type", type.getId());
  this.setVariable("neighbour", tRef);
  this.setVariable("role", item.linkRole);
  
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