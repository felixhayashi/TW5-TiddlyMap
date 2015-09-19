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
      background: "#97C2FC",
      highlight: {
        border: "#2B7CE9",
        background: "#D2E5FF"
        },
      hover: {
        border: "white",
        background: "white"
      }
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
      springLength: 200,
      centralGravity: 0,
      springConstant: 0.130
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
