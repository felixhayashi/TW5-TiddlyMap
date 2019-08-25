/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/config/vis
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

const visConfig = {

  locale: 'en_EN',
  clickToUse: false,
  autoResize: false,
  height: '100%',
  width: '100%',
  configure: {
    enabled: false
  },
  interaction: {
    dragNodes:true,
    dragView: true,
    hideEdgesOnDrag: false,
    hideNodesOnDrag: false,
    hover: true,
    navigationButtons: true,
    multiselect: true,
    selectable: true,
    selectConnectedEdges: true,
    tooltipDelay: 600,
    zoomView: false,
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
    shape: 'box',
    shadow: {
      enabled: false
    },
    color: {
      border: '#2B7CE9',
      background: '#97C2FC'
    }
  },
  edges: {
    smooth: {
      enabled: true
    },
    color: {
      color: '#848484',
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
      springLength: 0, // default: 100
      // <- less stiff edges - 0 - stiffer edges ->
      springConstant: 0.2, // default: 0.08
      // pulls the entire network back to the center.
      centralGravity: 0.015, // default: 0.01
      // kinetic energy reduction
      damping: 0.4
    },
    solver: 'forceAtlas2Based',
    stabilization: {
      enabled: true,
      iterations: 1000,
      updateInterval: 10,
      onlyDynamicEdges: false,
      fit: false
    }
  }
};

export default visConfig;
