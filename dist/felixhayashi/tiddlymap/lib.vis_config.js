/*\

title: $:/plugins/felixhayashi/tiddlymap/js/config/vis
type: application/javascript
module-type: library

@preserve

\*/
(function(){"use strict";exports.config={locale:"en_EN",clickToUse:true,autoResize:false,height:"100%",width:"100%",configure:{enabled:false},interaction:{dragNodes:true,dragView:true,hideEdgesOnDrag:false,hideNodesOnDrag:false,hover:false,navigationButtons:true,multiselect:true,selectable:true,selectConnectedEdges:true,tooltipDelay:300,zoomView:true,keyboard:{enabled:false,speed:{x:10,y:10,zoom:.02},bindToWindow:false}},manipulation:{initiallyActive:true},nodes:{shape:"box",color:{border:"#2B7CE9",background:"#97C2FC"}},edges:{smooth:{enabled:true},color:{color:"#848484",inherit:false},arrows:{to:{enabled:true}}},physics:{forceAtlas2Based:{gravitationalConstant:-300,springLength:100,springConstant:.095,centralGravity:.015,damping:.4},solver:"forceAtlas2Based",stabilization:{enabled:true,iterations:1e3,updateInterval:10,onlyDynamicEdges:false,fit:false}}}})();