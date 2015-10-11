/*\

title: $:/plugins/felixhayashi/tiddlymap/js/config/vis
type: application/javascript
module-type: library

@preserve

\*/

(function(){
    
/* jslint node: true, browser: true */
/* global $tw: false */
"use strict";

/***************************** CODE ******************************/

exports.config = {
  locale: "en_EN",
  clickToUse: true,
  autoResize: false,
  height: "100%",
  width: "100%",
  configure: {
    enabled: false
  },
  interaction: {
    dragNodes:true,
    dragView: true,
    hideEdgesOnDrag: false,
    hideNodesOnDrag: false,
    hover: false,
    navigationButtons: true,
    multiselect: true,
    selectable: true,
    selectConnectedEdges: true,
    tooltipDelay: 300,
    zoomView: true,
    keyboard: {
      enabled: false,
      speed: {
        x: 10,
        y: 10,
        zoom: 0.02
      },
      bindToWindow: false
    }
  },
  manipulation: {
    initiallyActive: true
  },
  nodes: {
    shape: "box",
    color: {
      border: "#2B7CE9",
      background: "#97C2FC"
    }
  },
  edges: {
    smooth: {
      enabled: true
    },
    color: {
      color: "#848484",
      inherit: false
    },
    arrows: {
      to: {
        enabled: true
      }
    }
  },
  physics: {
    forceAtlas2Based: {
      // <- more repulsion between nodes - 0 - more attraction between nodes ->
      gravitationalConstant: -300, // default: -50
      // edge length
      springLength: 100, // default: 100
      // stiffness of the edges
      springConstant: 0.095, // default: 0.08
      // pulls the entire network back to the center.
      centralGravity: 0.015, // default: 0.01
      // kinetic energy reduction
      damping: 0.4
    },
    solver: "forceAtlas2Based",
    stabilization: {
      enabled: true,
      iterations: 1000,
      updateInterval: 100,
      onlyDynamicEdges: false,
      fit: false
    }
  }
};

})();
