/*\

title: $:/plugins/felixhayashi/tiddlymap/widget/connections.js
type: application/javascript
module-type: widget

@module TiddlyMap
@preserve

\*/
(function(){"use strict";var e=require("$:/core/modules/widgets/widget.js").widget;var t=require("$:/plugins/felixhayashi/tiddlymap/edgetype.js").EdgeType;var r=function(t,r){e.call(this,t,r);this.utils=$tw.tmap.utils};r.prototype=Object.create(e.prototype);r.prototype.render=function(e,t){this.parentDomNode=e;this.computeAttributes();this.execute();this.renderChildren(e,t)};r.prototype.execute=function(){var e=[this.getVariable("currentTiddler")];var t={typeWL:$tw.tmap.adapter.getEdgeTypeWhiteList("[!suffix[tw-body:link]]")};var r=$tw.tmap.adapter.getNeighbours(e,t);var i=r.nodes;var s=r.edges;var a=[];for(var o in s){var n=s[o];var d=i[n.to]?"To":"From";var p=i[n[d.toLowerCase()]];if(!p)continue;a.push({type:"tmap-edgelistitem",edge:n,neighbour:p,direction:d,children:this.parseTreeNode.children})}this.makeChildWidgets(a)};r.prototype.refresh=function(e){for(var t in e){if(!this.utils.isSystemOrDraft(t)){this.refreshSelf();return true}}return this.refreshChildren(e)};exports["tmap-connections"]=r;var i=function(t,r){e.call(this,t,r);this.utils=$tw.tmap.utils};i.prototype=Object.create(e.prototype);i.prototype.execute=function(){var e=this.parseTreeNode;var t=$tw.tmap.indeces.tById[e.neighbour.id];var r=this.utils.flatten(e.edge);for(var i in r){if(typeof r[i]==="string"){this.setVariable("edge."+i,r[i])}}this.setVariable("currentTiddler",t);this.setVariable("neighbour",t);this.setVariable("direction",e.direction);this.makeChildWidgets()};i.prototype.refresh=function(e){return this.refreshChildren(e)};exports["tmap-edgelistitem"]=i})();