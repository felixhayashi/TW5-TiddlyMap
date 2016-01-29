/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/connections
type: application/javascript
module-type: widget

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports["tmap-edgelistitem"] = EdgeListItemWidget;
exports["tmap-connections"] = EdgeListWidget;

/*** Imports *******************************************************/

var Widget   = require("$:/core/modules/widgets/widget.js").widget;
var EdgeType = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;
var utils    = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;

/*** Code **********************************************************/

/**
 * @constructor
 */
function EdgeListWidget(parseTreeNode,options) {
  
  // call the parent constructor  
  Widget.call(this, parseTreeNode, options);
      
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
  var direction = this.getAttribute("direction", "both");
  var allETy = $tm.indeces.allETy;  
  
  var matches = utils.getEdgeTypeMatches(filter, allETy);
  
  var options = {
    typeWL: utils.getLookupTable(matches),
    direction: direction
  };

  var neighbourhood = $tm.adapter.getNeighbours(nodes, options);

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
  var hasChangedAttributes = Object.keys(changedAttributes).length;
  if(hasChangedAttributes) {
    this.refreshSelf();
    return true;
  }

  for(var tRef in changedTiddlers) {
    if(!utils.isSystemOrDraft(tRef)) {
      this.refreshSelf();
      return true;
    } 
  }
    
  // let children decide for themselves
  return this.refreshChildren(changedTiddlers);

};

/**
 * @constructor
 */
function EdgeListItemWidget(parseTreeNode, options) {
  
  Widget.call(this, parseTreeNode, options);
  
  this.arrows = $tm.misc.arrows;
    
};

// !! EXTENSION !!
EdgeListItemWidget.prototype = Object.create(Widget.prototype);
// !! EXTENSION !!

EdgeListItemWidget.prototype.execute = function() {
  
  var item = this.parseTreeNode;
  var tRef = $tm.indeces.tById[item.neighbour.id];
  
  // make edge properties available as variables
  var edge = utils.flatten(item.edge);
  for(var p in edge) {
    if(typeof edge[p] === "string") {
      this.setVariable("edge." + p, edge[p]);
    }
  }
  
  // Perspective: Neighbour
  this.setVariable("currentTiddler", tRef);
  this.setVariable("neighbour", tRef);
  
  var type = $tm.indeces.allETy[edge.type];
  
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
                                      ? this.arrows.bi
                                      : arrow === "from"
                                        ? this.arrows.in
                                        : this.arrows.out);
  
  // Construct the child widgets
  this.makeChildWidgets();
  
};

EdgeListItemWidget.prototype.refresh = function(changedTiddlers) {
  
  return this.refreshChildren(changedTiddlers);
  
};