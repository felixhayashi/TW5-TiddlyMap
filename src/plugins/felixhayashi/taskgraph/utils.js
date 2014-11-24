/*\
title: $:/plugins/felixhayashi/taskgraph/utils.js
type: application/javascript
module-type: library

Shortcut-methods that make my life easier

see also https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/utils.js

\*/

var utils = {};

/**
 * Pendant to addTiddlers. maybe merge into core?
 */
utils.deleteTiddlers = function(tiddlers) {
  for(var i = 0; i < tiddlers.length; i++) {
    if(!$tw.wiki.getTiddler(tiddlers[i])) { // doesn't exist
      continue;
    }
    $tw.wiki.deleteTiddler(tiddlers[i]);
  }
} 

/**
 * This function facilitates to check whether a list (tRefs) of tiddlers
 * matches a certain filter. if no list is specified, all tiddlers in
 * the wiki are considered
 * 
 * @filter a filter expression or a compiled filter
 * @tRefs (optional) a hashmap or an array of tiddler references (titles)
 */
utils.getMatches = function(filter, tRefs) {
  
  // use wiki as default source
  var source = undefined;
  
  if(Array.isArray(tRefs)) {
    source = function(iterator) {
      for(var i = 0; i < tRefs.length; i++) {
        var tObj = $tw.wiki.getTiddler(tRefs[i]);
        iterator(tObj, tRefs[i]);
      }
    };
  } else if(typeof tRefs == "object") {
    source = function(iterator) {
      for(t in tRefs) {
        var tObj = $tw.wiki.getTiddler(t);
        iterator(tObj, t);
      }
    };
  }
  
  if(typeof filter == "string") {
    filter = $tw.wiki.compileFilter(filter);
  }
  
  return filter.call($tw.wiki, source);
      
};

/**
 * Tries to match a single tiddler object against a filter.
 * Returns a boolean value.
 * @tiddler a tiddler reference or object
 */
utils.isMatch = function(tiddler, filter) {
  tRef = (typeof tiddler == "string") ? tiddler : tiddler.fields.title;
  return (utils.getMatches(filter, [ tRef ]).length > 0);
}

utils.getBasename = function(path) {
  return path.substring(path.lastIndexOf('/') + 1);
}

/**
 * @see
 *   - https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/dom/notifier.js
 */
utils.notify = function(message) {
  var tRef = "$:/temp/taskgraph/notify";
  $tw.wiki.addTiddler(new $tw.Tiddler({
    title : tRef, text : message
  }));
  $tw.notifier.display(tRef);
}

exports.utils = utils
