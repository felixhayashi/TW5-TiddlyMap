/*\
title: $:/plugins/felixhayashi/taskgraph/caretaker.js
type: application/javascript
module-type: startup

This module is responsible for registering a global namespace under $tw
and loading (and refreshing) the configuration.

Since changes in configuration tiddlers are instantly acknowledged,
the user does not need to refresh its browser (in theory :)).

Like a caretaker in real life, nobody can communicate with him. He does
all his work in the background without being ever seen. What I want to
say here is: do not require the caretaker!

\*/

(function(){
  
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";
  
  // Export name and synchronous status
  exports.name = "taskgraph-setup";
  exports.after = ["startup"];
  exports.before = ["rootwidget"];
  exports.synchronous = true;
  
  /**************************** IMPORTS ****************************/
   
  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;

  /***************************** CODE ******************************/

  
  /**
   * This method will read the options from the option tiddlers and
   * add some more configurations and constants.
   * 
   * options read from $:/plugins/felixhayashi/taskgraph/options/tw are
   * flat (not nested) as tw-textReferences cannot access them otherwise
   * (see http://tiddlywiki.com/#DataTiddlers).
   * 
   * ATTENTION: No trailing or double slashes on paths! This is NOT unix
   * where // is interpreted as /.
   * 
   * @see 
   *   - [TW5] Is there a designated place for TW plugins to store stuff in the dom? 
   *     https://groups.google.com/forum/#!topic/tiddlywikidev/MZZ37XiVcvY
   * 
   */
  var getOptions = function() {
            
    var opt = {};
    
    // these options are outsourced to allow user-customization 
    opt.vis = $tw.wiki.getTiddlerData("$:/plugins/felixhayashi/taskgraph/options/vis");
    opt.tw = $tw.wiki.getTiddlerData("$:/plugins/felixhayashi/taskgraph/options/tw");
        
      opt.tw.dialogPrefix = "$:/temp/dialog-";
      opt.tw.dialogOutputPrefix = opt.tw.dialogPrefix + "output-";
      opt.tw.dialogResultPrefix = opt.tw.dialogPrefix + "result-";
      opt.tw.dialogStandardFooter = "$:/plugins/felixhayashi/taskgraph/dialog/standardFooter";
      
      // if no edge label is specified, this is used as label
      if(!opt.tw.unknownEdgeLabel) { opt.tw.unknownEdgeLabel = "?"; }
      
      // templates used e.g. for dialogs
      // TODO only use prefix and append dialog name
      opt.tw.template = {};
        opt.tw.template.dialog = {};
          opt.tw.template.dialog.getEdgeType = "$:/plugins/felixhayashi/taskgraph/dialog/getEdgeType";
          opt.tw.template.dialog.getViewName = "$:/plugins/felixhayashi/taskgraph/dialog/getViewName";
          opt.tw.template.dialog.getConfirmation = "$:/plugins/felixhayashi/taskgraph/dialog/getConfirmation";
          opt.tw.template.dialog.notAllowedToDeleteView = "$:/plugins/felixhayashi/taskgraph/dialog/notAllowedToDeleteView";
          
          
      
      // be careful! these prefixes are also used as paths!
      // !!! NO TRAILING SLASH EVER !!!
      opt.tw.prefix = {}
        opt.tw.prefix.edges = "$:/plugins/felixhayashi/taskgraph/graph/edges";
        opt.tw.prefix.views = "$:/plugins/felixhayashi/taskgraph/graph/views";
        opt.tw.prefix.localHolders = "$:/temp/taskgraph/holders"
      
      
      opt.tw.defaultGraphViewHolder = "$:/plugins/felixhayashi/taskgraph/defaultGraphViewHolder";
      
      
      opt.tw.graphBar = "$:/plugins/felixhayashi/taskgraph/ui/graphBar";
      
      // all field (attribute names) that have special meanings for taskgraph are registered here
      opt.tw.fields = {};
        // used to identify a tiddler as view.
        opt.tw.fields.viewMarker = "isview";
        opt.tw.fields.id = (opt.tw.field_nodeId ? opt.tw.field_nodeId : "id");

      // filters are mostly retrived from withing tiddlers via the taskgraph macro
      opt.tw.filters = {};
        opt.tw.filters.allEdgesByLabel = "[prefix[" + opt.tw.prefix.edges + "]removeprefix[" + opt.tw.prefix.edges + "/]]";
        opt.tw.filters.allViews = "[all[tiddlers+shadows]has[" + opt.tw.fields.viewMarker + "]]";
        opt.tw.filters.allViewsByLabel = "[all[tiddlers+shadows]has[" + opt.tw.fields.viewMarker + "]removeprefix[" + opt.tw.prefix.views + "/]]";
        
    return opt;
    
  };
  
  /**
   * singletons like logger
   */
  var getFunctions = function(opt) {
    
    var fn = {};
    
    var nirvana = function() { /* /dev/null */ }; 

    if(opt.tw.debug && console) {
      
      fn.logger = function(type, message, id) {
        if(!message) return;
        type = type.toLowerCase(), (type in console ? type : "debug");
        if(id) {
          console[type](id, message)
        }
        else {
          console[type](message);
        }
      };
      
    } else { fn.logger = nirvana }

    fn.notify = (opt.tw.notifications ? utils.notify : nirvana);
    
    return fn;
    
  };
  
  var getChangeFilter = function() {
    
    var filter = (function() {
      var filterComponents = [];
      // also shadow tiddlers
      filterComponents.push("all[tiddlers+shadows]");
      // only tiddlers with this prefix
      filterComponents.push("prefix[$:/plugins/felixhayashi/taskgraph/options]");
      // no drafts
      filterComponents.push("!has[draft.of]");
      return "[" + filterComponents.join('') + "]";
    }).call(this);
    
    $tw.taskgraph.fn.logger("log", "Caretaker's filter: \"" + filter + "\"");
    
    return $tw.wiki.compileFilter(filter);

  };

  exports.startup = function() {
    
    // create namespace
    $tw.taskgraph = {};
    // register options
    $tw.taskgraph.opt = getOptions();
    // used for global functions
    $tw.taskgraph.fn = getFunctions($tw.taskgraph.opt);
    
    $tw.taskgraph.fn.logger("warn", "Taskgraph's caretaker was started");
    $tw.taskgraph.fn.logger("log", "Registered namespace and options");
    
    // Create an array to insert edge changes.
    //
    // This may need a more thoroughly explanation:
    // Tiddler changes are propagated to each graph via the refresh
    // mechanism. Thus, a graph may update its nodes by checking during
    // widget.refresh() if a node got added, updated or removed.
    // However, because edges do not correspond to tiddlers, a graph
    // can only be aware of edgestore changes during refresh. However,
    // calculating the delta between an edgestore's former and current
    // state to reflect the changes in the graph is way too cumbersome.
    // therefore, each adapter.insertEdge() operation registers any change
    // at this global object. Once a graphs refresh() sees an edgestore
    // has changed, it looks here to trace the latest changes.
    //
    // Each registered change is an object has two properties
    // 1) "type" which is either "insert", "update" or "delete"
    // 2) "edge" which is a copy of the edge object this update is concerned with
    //
    $tw.taskgraph.edgeChanges = [];
    
    var filter = getChangeFilter();
    
    $tw.wiki.addEventListener("change", function(changedTiddlers) {
      
      // disabled for now
      return;
      
      var matches = utils.getMatches(filter, changedTiddlers);
      if(!matches.length) return;
      
      
      $tw.taskgraph.fn.logger("warn", "@CARETAKER: These tiddlers changed");
      $tw.taskgraph.fn.logger("debug", changedTiddlers);
      $tw.taskgraph.fn.logger("warn", "@CARETAKER: These tiddlers trigger an option rebuild");
      $tw.taskgraph.fn.logger("debug", matches);
      
      // rebuild
      $tw.taskgraph.opt = getOptions();
      $tw.taskgraph.fn = getFunctions($tw.taskgraph.opt);
      
    });
        
  };

})();
