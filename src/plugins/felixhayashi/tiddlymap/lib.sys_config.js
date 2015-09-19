/*\

title: $:/plugins/felixhayashi/tiddlymap/js/config/sys
type: application/javascript
module-type: library

@preserve

\*/

(function(){
    
/* jslint node: true, browser: true */
/* global $tw: false */
"use strict";

/***************************** CODE ******************************/

// Since TW field values are all strings, we are only allowed to
// use string values as property values (e.g. "true" instead of true)

exports.config = { 
  field: {
    nodeId: "tmap.id",
    nodeLabel: "caption",
    nodeIcon: "icon",
    nodeInfo: "description",
    viewMarker: "isview"
  },
  suppressedDialogs: {},
  edgeClickBehaviour: "manager",
  debug: "false",
  notifications: "true",
  editNodeOnCreate: "false",
  singleClickMode: "false",
  editorMenuBar: {
    showNeighScopeButton: "true",
    showScreenshotButton: "true"
  }
};

})();
