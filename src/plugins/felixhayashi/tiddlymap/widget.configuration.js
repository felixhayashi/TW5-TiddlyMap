/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/MapConfigWidget
type: application/javascript
module-type: widget

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";

/**************************** IMPORTS ****************************/
 
var Widget =          require("$:/core/modules/widgets/widget.js").widget;
var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction").ViewAbstraction;
var vis =             require("$:/plugins/felixhayashi/vis/vis.js");
var utils =           require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;

/***************************** CODE ******************************/

/**
 * @constructor
 * 
 * bli bla blub
 * 
 * ```
 * tmap-config
 *     inherited="FIELDNAME FIELDNAME …"
 *     extension="FIELDNAME"
 *     changes="FIELDNAME" (default: same field as extension)
 *     override="true|false" (default: false)
 *     mode="manage-*"
 *     refresh-trigger="tRef"
 * 
 * ```
 */
var MapConfigWidget = function(parseTreeNode, options) {
  
  // call the parent constructor
  Widget.call(this);
  
  // call initialise on prototype
  this.initialise(parseTreeNode, options);
  
  // create shortcuts for services and frequently used vars
  this.adapter = $tw.tmap.adapter;
  this.opt = $tw.tmap.opt;
  this.notify = $tw.tmap.notify;
      
  // make the html attributes available to this widget
  this.computeAttributes();
  
  utils.addListeners({
    "tmap:tm-clear-config": function() { alert("nice"); }
  }, this, this);
     
};

// !! EXTENSION !!
MapConfigWidget.prototype = Object.create(Widget.prototype);
// !! EXTENSION !!
  
/**
 * Method to render this widget into the DOM.
 * 
 * @override
 */
MapConfigWidget.prototype.render = function(parent, nextSibling) {
  
  if(!this.parentDomNode) {
  
    // remember our place in the dom
    this.parentDomNode = parent;
      
    // create this.wrapper
    this.wrapper = document.createElement("div");
    $tw.utils.addClass(this.wrapper, "tmap-config-widget");
    parent.appendChild(this.wrapper);
  
  }
  
  if(this.network) {
    
    // giving the parent a css height will prevent it from jumping
    // back when the network is destroyed and the network
    // container is removed.
    var height = this.parentDomNode.getBoundingClientRect().height;
    this.parentDomNode.style["height"] = height + "px";
    
    // destroy the previos instance
    this.network.destroy();
    
  }
  
  // create container for vis configurator; destroyed when vis is destroyed
  var networkContainer = document.createElement("div");
  this.wrapper.appendChild(networkContainer);
      
  // get environment
  this.refreshTrigger = this.getAttribute("refresh-trigger");
  this.pipeTRef = this.getVariable("currentTiddler");
  this.inheritedFields = $tw.utils.parseStringArray(this.getAttribute("inherited"));
  this.extensionTField = this.getAttribute("extension");
  this.mode = this.getAttribute("mode");
  
  // load inherited options
  for(var i = 0; i < this.inheritedFields.length; i++) {
    var fieldName = this.inheritedFields[i];
    var style = utils.parseFieldData(this.pipeTRef, fieldName, {});
    
    // maybe the inherited options also come without a top level property
    // so we do the same here to…
    // TODO looks clumsy; do it in a more generic way…
    if(this.mode === "manage-edge-types") {
      if(!style.edges) { style = { edges: style }; }
    } else if(this.mode === "manage-node-types") {
      if(!style.nodes) { style = { nodes: style }; }
    }
        
    this.inherited = utils.merge(this.inherited, style);
    
    //~ console.log("looking at", fieldName, "has style", style);
    //~ console.log("merged this.inherited", this.inherited);
  }
  
  //~ console.log("inheritedFields", this.inheritedFields, "this.inherited", this.inherited);
  
  // load extension to the inherited options; since we store vis config
  // for nodes and edges without the top level property, we may need to
  // append it again, if not done so already.
  this.extension = utils.parseFieldData(this.pipeTRef, this.extensionTField, {});
  // TODO looks clumsy; do it in a more generic way…
  if(this.mode === "manage-edge-types") {
    if(!this.extension.edges) {
      this.extension = { edges: this.extension };
    }
  } else if(this.mode === "manage-node-types") {
    if(!this.extension.nodes) {
      this.extension = { nodes: this.extension };
    }
  }
  
  // we record all changes in a separate variable
  this.changes = utils.isTrue(this.getAttribute("save-only-changes"))
                 ? {}
                 : this.extension;
                   
  var data = {
    nodes: new vis.DataSet([]),
    edges: new vis.DataSet([])
  };
  
  this.network = new vis.Network(networkContainer, data, {});
  this.reloadVisOptions();
  this.network.on("configChange", this.handleConfigChange.bind(this));
  
  // register this graph at the caretaker's graph registry
  $tw.tmap.registry.push(this);

};

MapConfigWidget.prototype.reloadVisOptions = function() {
  
  // merge the inherited config with the extension and store it in a new var
  var options = utils.merge({}, this.inherited, this.extension);
  
  // finally add configuration interface option
  $tw.utils.extend(options, {
    configure: {
      enabled: true,
      showButton: false,
      filter: this.getOptionFilter(this.mode)
    }
  });
  
  this.network.setOptions(options);
  
}


/**
 * I only receive the option that has actually changed
 */
MapConfigWidget.prototype.handleConfigChange = function(change) {
  
  this.changes = utils.merge(this.changes, change);
  
  // when storing edge- or node-styles we strip the root property
  var options = utils.merge({}, this.changes);
  if(this.mode === "manage-node-types") { options = options["nodes"]; }
  if(this.mode === "manage-edge-types") { options = options["edges"]; }
  
  // save changes
  utils.writeFieldData(this.pipeTRef, this.extensionTField, options);
  
};

/**
 * 
 *
 */
MapConfigWidget.prototype.getOptionFilter = function(mode) {
  
  var whitelist = {
    nodes: {
      borderWidth: true, 
      borderWidthSelected: true,
      color: {
        background: true
      },
      font: true,
      icon: true,
      labelHighlightBold: true,
      shadow: true,
      shape: true,
      shapeProperties: true,
      size: true
    },
    edges: {
      arrows: true,
      color: true,
      dashes: true,
      font: true,
      labelHighlightBold: true,
      length: true,
      selfReferenceSize: true,
      shadow: true,
      smooth: true,
      width: true
    },
    interaction: {
      hideEdgesOnDrag: true,
      hideNodesOnDrag: true,
      tooltipDelay: true,
      labelHighlightBold: true,
      shadow: true,
      shape: true,
      shapeProperties: true,
      size: true
    },
    layout: {
      hierarchical: false
    },
    manipulation: {
      initiallyActive: true
    },
    physics: {
      forceAtlas2Based: {
        gravitationalConstant: true,
        springLength: true,
        springConstant: true,
        damping: true        
      }
    }
  };  
  
  if(mode === "manage-edge-types") {
    whitelist = { edges: whitelist.edges };
  } else if(mode === "manage-node-types") {
    whitelist = { nodes: whitelist.nodes };
  }
    
  return function(option, path) {
    
    // operate on a clone; add option as element
    path = path.concat([ option ]);
    
    var wlObj = whitelist;
    for(var i = 0, l = path.length; i < l; i++) {
      if(wlObj[path[i]] === true) {
        return true;
      } else if(wlObj[path[i]] == null) {
        return false;
      } // else assume object
      wlObj = wlObj[path[i]];
    }
    
    return false;
  
  };
  
};

/**
 * A zombie widget is a widget that is removed from the dom tree
 * but still referenced or still partly executed -- I mean
 * otherwise you couldn't call this function, right?
 * 
 * @TODO Outsource this as interface or common super class
 */
MapConfigWidget.prototype.isZombieWidget = function() {
  
  return !document.body.contains(this.parentDomNode);
  
};
 
/**
 * called from outside.
 * 
 * @TODO Outsource this as interface or common super class
 */
MapConfigWidget.prototype.destruct = function() {
    
  if(this.network) { this.network.destroy(); }
  
};

/**
 * This function is called by the system to notify the widget about
 * tiddler changes.
 * 
 * @override
 */
MapConfigWidget.prototype.refresh = function(changedTiddlers) {
  
  if(this.isZombieWidget() || !this.network) return;
  
  if(changedTiddlers[this.refreshTrigger]) {
    
    this.refreshSelf();
    return true;
  
  }
  
};

MapConfigWidget.prototype.setNull = function(obj) {
  
  for (var p in obj) {
    if(typeof obj[p] == "object") {
      this.setNull(obj[p]);
    } else {
      obj[p] = undefined;
    }
  }
  
};

/**************************** EXPORTS ****************************/

exports["tmap-config"] = MapConfigWidget;

})();

