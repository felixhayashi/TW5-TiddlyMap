/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/connections
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
var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;

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
  var filter = this.getAttribute("filter", "");
  var options = {
    typeWL: $tw.tmap.adapter.getEdgeTypeWhiteList(filter)
  };

  var neighbourhood = $tw.tmap.adapter.getNeighbours(nodes, options);

  // retrieve nodes and edges
  var neighbours = neighbourhood.nodes;
  var edges = neighbourhood.edges;
  
  var entries = [];
  for(var id in edges) {
    var edge = edges[id];
    var neighbour = neighbours[edge.to] || neighbours[edge.from];
    
    if(!neighbour) continue; // obsolete edge from old times;
    
    // make item template
    entries.push({
      type: "tmap-edgelistitem",
      edge: edge,
      typeWL: options.typeWL,
      neighbour: neighbour,
      // the children of this widget (=what is wrapped inside the
      // widget-element's body) is used as template for the list items
      children: this.parseTreeNode.children
    });
  }
  
  if(!entries.length) {
    this.wasEmpty = true;
    entries = this.getEmptyMessage();
  } else if(this.wasEmpty) {
    // we need to remove the empty message
    this.removeChildDomNodes();
  }

  this.makeChildWidgets(entries);
  
};

EdgeListWidget.prototype.getEmptyMessage = function() {
  
  var parser = this.wiki.parseText(
                  "text/vnd.tiddlywiki",
                  this.getAttribute("emptyMessage", ""),
                  {parseAsInline: true});
    
  return parser ? parser.tree : [];
  
};

EdgeListWidget.prototype.refresh = function(changedTiddlers) {
  
  var changedAttributes = this.computeAttributes();

  if(changedAttributes.filter || changedAttributes.emptyMessage) {
    this.refreshSelf();
    return true;
  }

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
  
  var type = $tw.tmap.indeces.allETy[edge.type];
  
  var indexedAs = (edge.to === item.neighbour.id ? "to" : "from");
  var arrow = indexedAs;
  
  if(type.biArrow) {
    arrow = "bi";  
  } else {
    if(indexedAs === "to" && type.invertedArrow) {
      arrow = "from";
    } else if(indexedAs === "from" && type.invertedArrow) {
      arrow = "to";
    }
  }

  this.setVariable("direction", arrow);
  this.setVariable("directionSymbol", arrow === "bi"
                                      ? "⬄"
                                      : arrow === "from"
                                        ? "⇦"
                                        : "⇨");
  
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