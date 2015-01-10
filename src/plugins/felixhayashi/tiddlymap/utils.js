/*\

title: $:/plugins/felixhayashi/tiddlymap/utils.js
type: application/javascript
module-type: library

ATTENTION: THIS CLASS MUST NOT REQUIRE ANY OTHER TIDDLYMAP FILE
IN ORDER TO AVOID ACYCLIC DEPENDENCIES!

@preserve

\*/

/**************************** IMPORTS ****************************/
 
var vis = require("$:/plugins/felixhayashi/vis/vis.js");

/***************************** CODE ******************************/

/**
 * A utilities class that contains universally used helper functions
 * to abbreviate code and make my life easier.
 * 
 * @see Dom utilities {@link https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/*}
 * 
 * @namespace
 */
var utils = {};

/**
 * Pendant to tw native {@code addTiddlers()}.
 * 
 * @param {TiddlerCollection} tiddlers - A collection of tiddlers to be removed.
 */
utils.deleteTiddlers = function(tiddlers) {
  
  var keys = Object.keys(tiddlers);
  for(var i = 0; i < keys.length; i++) {
    if(utils.tiddlerExists(tiddlers[keys[i]])) {
      var tRef = utils.getTiddlerReference(tiddlers[keys[i]]);
      $tw.wiki.deleteTiddler(tRef);
    }
  }
  
};

/**
 * Creates an array of ids based on a given set of tiddlers.
 * 
 * @param {TiddlerCollection} tiddlers - A collection of tiddlers from
 *     which to retrieve the ids.
 * @param {string} idFieldName - The field that identifies the tiddler
 * @return {array.<Id>} - An array of ids.
 */
utils.getTiddlerIds = function(tiddlers, idFieldName) {
  
  var ids = [];
  var keys = Object.keys(tiddlers);
  for(var i = 0; i < keys.length; i++) {
    if(utils.tiddlerExists(tiddlers[keys[i]])) {
      var id = utils.getTiddler(tiddlers[keys[i]]).fields[idFieldName];
      ids.push(id);
    }
  }
  return ids;
  
};

utils.getTiddlerById = function(id, idField) {
  
  if(!idField) idField = "id";
  
  var allTiddlers = $tw.wiki.allTitles();
  for(var i = 0; i < allTiddlers.length; i++) {
    var tObj = utils.getTiddler(allTiddlers[i]);
    if(tObj.fields[idField] === id) {
      return tObj;
    }
  }
  
};

/**
 * @param {Tiddler} tiddler
 * @param {string} aliasField - A tiddler field that contains an
 *     alternative title (e.g. "caption").
 * @return {string|undefined} If the `aliasField` exists and is not
 *     empty, the value of the `aliasField` otherwise the tiddler's
 *     title or undefined if the tiddler doesn't exist.
 */
utils.getLabel = function(tiddler, aliasField) {
  var tObj = utils.getTiddler(tiddler);
  return (tObj && tObj.fields[aliasField]
          ? tObj.fields[aliasField]
          : tObj.fields.title);
};

/**
 * Transforms a collection of a certain type into a collection of
 * another type.
 * 
 * **Attention**: When trying to convert an array into a object, the
 * array will be simply bounced back. Let's hope no one added enumerable
 * properties to Array.prototype :)
 * 
 * @param {Collection} col - The collection to convert.
 * @param {CollectionTypeString} [outputType="dataset"] - The output type.
 * @return {Collection} A collection of type `outputType`.
 */
utils.convert = function(col, outputType) {
  
  if(typeof col !== "object") return;
  
  switch(outputType) {
    
    case "array":
      return utils.getValues(col);
    case "hashmap": // fall through alias
    case "object":
      if(col instanceof vis.DataSet) { // a dataset
        return vis.get({ returnType: "Object" }); // careful has proto
      } else { // object (array is an object itself)
        return col; // bounce back
      }
      
    case "dataset":
    default:
      if(col instanceof vis.DataSet) {
        return col; // bounce back
      }
      if(!Array.isArray(col)) {
        col = utils.getValues(col);
      }
            
      return new vis.DataSet(col);

  }
  
};

/**
 * Injects the values of setA into setB. Note that setB will only
 * contain distinct values.
 * 
 * **Note**: Properties are not cloned.
 * 
 * @param {Collection} setA - Collection from which values are read.
 * @param {Collection} setB - Collection into which values are merged.
 * @return {Collection} setB
 */
utils.inject = function(setA, setB) {

  if(setB instanceof vis.DataSet) { // output is a dataset
    setB.update(utils.convert(setA, "array"));
  } else if(Array.isArray(setB)) { // output is an array
    setA = utils.convert(setA, "object");
    for(var p in setA) {
      if(setB.indexOf(setA[p]) == -1) { // does not exist exists
        setB.push(setA[p]);
      }
    }
  } else { // assume normal object
    $tw.utils.extend(setB, utils.convert(setA, "object"));
  }
  
  return setB;
  
};

/**
 * Extract all the values from a collection. If `col` is an object,
 * only properties are considered that are its own and iterable.
 * 
 * @param {Collection} col
 * @return {Array} An array
 */
utils.getValues = function(col) {
  
  if(Array.isArray(col)) {
    return col; // bounce back.
  } if(col instanceof vis.DataSet) { // a dataset
    return col.get({ returnType: "Array" });
  }
  
  var result = [];
  var keys = Object.keys(col);
  for(var i = 0; i < keys.length; i++) {
    result.push(col[keys[i]]);
  }
  
  return result;
  
};

/**
 * I use this method on all objects that I didn't create myself.
 * 
 * Why this? Well,
 * 
 * 1. How do I know if the object was created via {} or utils.getEmptyMap()?
 *    If the latter is the case, `hasOwnProperty()` doesn't exist.
 * 2. When the object is used as hashtable, hasOwnProperty could be overridden.
 *    
 * @see http://www.2ality.com/2012/01/objects-as-maps.html
 * 
 * Hope ECMA6 is out soon with dedicated datastructures.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
 * 
 * @param {Object} obj - The object.
 * @param {*} key - The key.
 * @result {boolean} True if key is the own property of obj.
 */ 
utils.hasOwnProp = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Factory function to return a prototypeless object that is used as
 * map. It only has the property hasOwnProperty in order to to be
 * exchangeble with other framworks that depend on this method like 
 * e.g. visjs.
 */
utils.getEmptyMap = function() {
  
  var map = Object.create(null);
  Object.defineProperty(map, "hasOwnProperty", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: Object.prototype.hasOwnProperty.bind(map)
  });
  
  return map;
  
};

/**
 * This function facilitates to check whether a list of tiddlers
 * matches a certain filter. If the tiddler does not exist, it is not
 * returned as match. If no list is specified, all tiddlers in
 * the wiki are considered.
 * 
 * @param {TiddlyWikiFilter} filter - The filter to use.
 * @param {TiddlerCollection} [tiddlers] - A set of tiddlers used as source.
 * @param {boolean} [isReturnObjects=false] - True if the result is a hashmap.
 * @return {Array.<TiddlerReference>|Hashmap.<Id, $tw.Tiddler>}
 */
utils.getMatches = function(filter, tiddlers, isReturnObjects) {
  
  // use wiki as default source
  var source = undefined;
  
  if(typeof tiddlers === "object") {
    var keys = Object.keys(tiddlers);
    source = function(iterator) {
      for(var i = 0; i < keys.length; i++) {
        var tObj = utils.getTiddler(tiddlers[keys[i]]);
        if(tObj) {
          iterator(tObj, tObj.fields.title);
        }
      }
    };
  }
  
  if(typeof filter === "string") {
    filter = $tw.wiki.compileFilter(filter);
  }
  
  var tRefsArray = filter.call($tw.wiki, source);
  
  //~ if(isReturnObjects) {
    //~ var tObjHashmap = utils.getEmptyMap();
    //~ for(var i = 0; i < tRefsArray.length; i++) {
      //~ tObjHashmap[tRefsArray[i]] = $tw.wiki.getTiddler(tRefsArray[i]);
    //~ }
    //~ return tObjHashmap;
  //~ }
  
  return tRefsArray;
      
};

/**
 * Tries to match a single tiddler object against a filter.
 * Returns a boolean value.
 * 
 * @param {Tiddler} tiddler - The object to apply the filter to.
 * @param {TiddlyWikiFilter} filter - The filter to use.
 * @return {boolean} True if the tiddler matches the filter, false otherwise.
 */
utils.isMatch = function(tiddler, filter) {
  
  var tRef = utils.getTiddlerReference(tiddler);
  return (utils.getMatches(filter, [ tRef ]).length > 0);
  
};

/**
 * Gets a tiddler reference from a tRef or tObj
 * 
 * @param {Tiddler} tiddler - A tiddler reference or object.
 * @return {TiddlerReference|undefined} A tiddler reference (title)
 */
utils.getTiddlerReference = function(tiddler) {
  
  if(tiddler instanceof $tw.Tiddler) {
    return tiddler.fields.title;
  } else if(typeof tiddler === "string") {
    return tiddler;
  }
  
};

/**
 * Similar to {@code wiki.getTiddler()} but also accepts a tObj as
 * argument, thus, making it unnecessary to always differentiate or remember
 * if we are dealing with an object or a reference.
 * 
 * @see https://github.com/Jermolene/TiddlyWiki5/blob/master/boot/boot.js#L866
 * @param {Tiddler} tiddler - A tiddler reference or object.
 * @return {Tiddler} A tiddler object.
 */
utils.getTiddler = function(tiddler) {
  return (tiddler instanceof $tw.Tiddler
         ? tiddler
         : $tw.wiki.getTiddler(tiddler));
};

/**
 * Returns the basename of a path. A path is a string with slashes.
 * 
 * @param {string} path - The path
 * @return {string} The basename
 */
utils.getBasename = function(path) {
  
  return path.substring(path.lastIndexOf('/') + 1);
  
};

/**
 * This function uses the tw-notification mechanism to display a
 * temporary message.
 * 
 * @see https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/dom/notifier.js
 * @param {string} message - A short message to display.
 */
utils.notify = function(message) {
  
  var tRef = "$:/temp/tiddlymap/notify";
  $tw.wiki.addTiddler(new $tw.Tiddler({
    title : tRef, text : message
  }));
  $tw.notifier.display(tRef);
  
};

/**
 * Checks if tiddlers (including shadow tiddlers) exist.
 * 
 * @param {Tiddler} tiddler
 * @return {boolean} True if the tiddler exists, false otherwise
 */
utils.tiddlerExists = function(tiddler) {
  
  var tRef = utils.getTiddlerReference(tiddler);
  return tRef && ($tw.wiki.tiddlerExists(tRef) || $tw.wiki.isShadowTiddler(tRef));
  
};

/**
 * Returns a new object that contains only properties that start with
 * a certain prefix. The prefix is optionally removed from the result.
 * 
 * @param {Object} obj
 * @param {string} prefix - The start sequence
 * @param {boolean} [removePrefix=false] - True if the prefix shall be removed
 *     from the resulting property name, false otherwise.
 * @result {object}
 */
utils.getPropertiesByPrefix = function(obj, prefix, removePrefix) {
  
    var r = utils.getEmptyMap();
    for(var p in obj) {
      if(utils.startsWith(p, prefix)) {
        r[(removePrefix ? p.substr(prefix.length) : p)] = obj[p];
      }
    }
  
  return r;
  
};

/**
 * Helper to increase the code semantics.
 * @param {string} str - The string to work with.
 * @param {string} prefix - The sequence to test.
 * @result {boolean} True if `str` starts with `prefix`, false otherwise.
 */
utils.startsWith = function(str, prefix) {
  
  return (typeof str === "string" && str.indexOf(prefix) === 0);
  
};

/**
 * Function to find out whether an object has any enumerable properties
 * or, in case of an array, elements.
 * 
 * @param {Object} obj
 * @return {boolean} True if at least one enumerable property exists,
 *     false otherwise.
 */
utils.hasElements = function(obj) {
  
  return (Object.keys(obj).length > 0);
  
};

/**
 * Searches the dom for elements that possess a certain class
 * and removes this class from each element.
 * 
 * @param {Array<string>} classNames - The class names to remove.
 */
utils.findAndRemoveClassNames = function(classNames) {
  
  for(var i = 0; i < classNames.length; i++) {
    var elements = document.getElementsByClassName(classNames[i]);
    for(var j = 0; j < elements.length; j++) {
      console.log(elements[j], classNames[i]);
      $tw.utils.removeClass(elements[j], classNames[i]);
    }
  }

};

utils.isDraft = function(tiddler) {

  return (utils.getTiddler(tiddler) && utils.getTiddler(tiddler).isDraft());

};

utils.getText = function(tiddler, defaultText) {
  
  if(!defaultText) {
    defaultText = "";
  }
  var tObj = utils.getTiddler(tiddler);
  return (tObj ? tObj.fields.text : defaultText);
  
};

/**
 * Function that searches an array containing objects for an object
 * with a property having certain value. 
 * 
 * Attention: Not the item itself but the item's key is returned.
 * 
 * @param {Collection} col - The collection to search in.
 * @param {string} key - The property name to look for.
 * @param {*} [val] - An optional value that the object's property must have
 *     in order to match.
 * @param {number} [limit] - An optional result limit (>0) to stop the search.
 * @return {Array<Id>} An array containing the indeces of matching items.
 */
utils.keysOfItemsWithProperty = function(col, key, val, limit) {
  
  col = utils.getIterableCollection(col);
  
  var keys = Object.keys(col);
  var result = [];
  var limit = (typeof limit === "number" ? limit : keys.length);
  for(var i = 0; i < keys.length; i++) {
    var index = keys[i];
    if(typeof col[index] === "object" && col[index][key]) {
      if(!val || col[index][key] === val) {
        result.push(index);
        if(result.length === limit) {
          break;
        }
      }
    }
  }
  
  return result;
  
};

utils.keyOfItemWithProperty = function(col, key, val) {
  var keys = utils.keysOfItemsWithProperty(col, key, val, 1)
  return (keys.length ? keys[0] : undefined);
}

/**
 * This function will return a collection object whose data can be
 * via `Object.keys(col)` in a loop.
 * 
 * @param {Collection} col - A collection
 * @return {Hashmap} The iterable object.
 */
utils.getIterableCollection = function(col) {
  
  return (col instanceof vis.DataSet ? col.get() : col);

};

/**
 * In a collection where all elements have a **distinct** property `x`,
 * use the value of each properties `x` as key to identify the object.
 * If no property `x` is specified via `lookupKey`, the collection's
 * values are used as keys.
 * 
 * @param {Collection} col - The collection for which to create a lookup table.
 * @param {string} [lookupKey] - The property name to use as index in
 *     the lookup table. If not specified, the collection values are tried
 *     to be used as indeces.
 * @return {Hashmap} The lookup table.
 */
utils.getLookupTable = function(col, lookupKey) {
  
  col = utils.getIterableCollection(col);
  
  var lookupTable = utils.getEmptyMap();
  
  var keys = Object.keys(col);
  for(var i = 0; i < keys.length; i++) {
    
    var key = keys[i];
    
    // value to be used as the lookup table's index
    var ltIndex = (lookupKey ? col[key][lookupKey] : col[key]);
    
    if((typeof ltIndex === "string" && ltIndex != "") || typeof ltIndex === "number") {
      if(!lookupTable[ltIndex]) { // doesn't exist yet!
        lookupTable[ltIndex] = col[key];
        continue;
      }
    }

    // in any other case
    throw "TiddlyMap: Cannot use \"" + ltIndex + "\" as lookup table index";
    
  }
  
  return lookupTable;
    
};
  
/**
 * Wrapper for {@link utils.getLookupTable}
 */
utils.getArrayValuesAsHashmapKeys = function(arr) {
  
  return utils.getLookupTable(arr);
  
};

/**
 * Returns all tiddlers that possess a property with a certain value.
 * 
 * @param {string} fieldName - The property name to look for.
 * @param {string} value - The value that the field must have in order to match.
 * @param {Hashmap} [options] - An optional options object.
 * @param {TiddlerCollection} [options.tiddlers=$tw.wiki.allTitles()] - A collection
 *     of tiddlers to perform the search on.
 * @param {boolean} [options.isReturnRef=false] - True if the a {@link TiddlerReference}
 *     should be returned, false if a {@link $tw.Tiddler} object should be returned.
 * @param {boolean} [options.isIncludeDrafts=false] - True if drafts of the found
 *     tiddlers are also included in the result set.
 * @return {Array.<Tiddler>} Result
 */
utils.getTiddlersWithProperty = function(fieldName, value, options) {
  
  if(typeof options !== "object") options = utils.getEmptyMap();
  if(!options.tiddlers) {
    options.tiddlers = $tw.wiki.allTitles();
  }
  
  var result = [];
  var isReturnRef = options.isReturnRef;
  var keys = Object.keys(options.tiddlers);
  for(var i = 0; i < keys.length; i++) {
    var tObj = utils.getTiddler(options.tiddlers[keys[i]]);
    if(tObj.fields[fieldName] === value) {
      result.push(isReturnRef ? tObj.fields.title : tObj);
      if(options.isIncludeDrafts) {
        var draftTRef = $tw.wiki.findDraft(tObj.fields.title);
        if(draftTRef) {
          result.push(isReturnRef ? draftTRef : $tw.wiki.getTiddler(draftTRef));
        }
      }
    }
  }
      
  return result;
  
};

/************************* 3rd-party code **************************/

/**
 * TW-Code
 * @deprecated delete this in one year and use $tw.utils.getFullScreenApis instead
 */
utils.getFullScreenApis = function() {
  var d = document,
    db = d.body,
    result = {
    "_requestFullscreen": db.webkitRequestFullscreen !== undefined ? "webkitRequestFullscreen" :
              db.mozRequestFullScreen !== undefined ? "mozRequestFullScreen" :
              db.msRequestFullscreen !== undefined ? "msRequestFullscreen" :
              db.requestFullscreen !== undefined ? "requestFullscreen" : "",
    "_exitFullscreen": d.webkitExitFullscreen !== undefined ? "webkitExitFullscreen" :
              d.mozCancelFullScreen !== undefined ? "mozCancelFullScreen" :
              d.msExitFullscreen !== undefined ? "msExitFullscreen" :
              d.exitFullscreen !== undefined ? "exitFullscreen" : "",
    "_fullscreenElement": d.webkitFullscreenElement !== undefined ? "webkitFullscreenElement" :
              d.mozFullScreenElement !== undefined ? "mozFullScreenElement" :
              d.msFullscreenElement !== undefined ? "msFullscreenElement" :
              d.fullscreenElement !== undefined ? "fullscreenElement" : "",
    "_fullscreenChange": d.webkitFullscreenElement !== undefined ? "webkitfullscreenchange" :
              d.mozFullScreenElement !== undefined ? "mozfullscreenchange" :
              d.msFullscreenElement !== undefined ? "MSFullscreenChange" :
              d.fullscreenElement !== undefined ? "fullscreenchange" : ""
  };
  if(!result._requestFullscreen || !result._exitFullscreen || !result._fullscreenElement) {
    return null;
  } else {
    return result;
  }
};

/**
 * 
 * Slightly modified by me to allow an optional prefix.
 * 
 * For the original code:
 * 
 * Copyright (c) 2014, Hugh Kennedy, All rights reserved.
 * Code published under the BSD 3-Clause License
 * 
 * @see oringal repo https://github.com/hughsk/flat
 * @see snapshot https://github.com/felixhayashi/flat
 * @see http://opensource.org/licenses/BSD-3-Clause
 */
utils.flatten = function(target, opts) {
  
  opts = opts || {}

  var delimiter = opts.delimiter || '.'
  var output = {}

  function step(object, prev) {
    Object.keys(object).forEach(function(key) {
      var value = object[key]
      var isarray = opts.safe && Array.isArray(value)
      var type = Object.prototype.toString.call(value)
      var isobject = (
        type === "[object Object]" ||
        type === "[object Array]"
      )

      var newKey = prev
        ? prev + delimiter + key
        : opts.prefix + key

      if (!isarray && isobject) {
        return step(value, newKey)
      }

      output[newKey] = value
    })
  }

  step(target)

  return output;
  
};


/**
 * Copyright (c) 2014, Hugh Kennedy, All rights reserved.
 * Code published under the BSD 3-Clause License
 * 
 * @see oringal repo https://github.com/hughsk/flat
 * @see snapshot https://github.com/felixhayashi/flat
 * @see http://opensource.org/licenses/BSD-3-Clause
 */
utils.unflatten = function(target, opts) {
  
  opts = opts || {}

  var delimiter = opts.delimiter || '.'
  var result = {}

  if (Object.prototype.toString.call(target) !== '[object Object]') {
    return target
  }

  // safely ensure that the key is
  // an integer.
  function getkey(key) {
    var parsedKey = Number(key)

    return (
      isNaN(parsedKey) ||
      key.indexOf('.') !== -1
    ) ? key
      : parsedKey
  }

  Object.keys(target).forEach(function(key) {
    var split = key.split(delimiter)
    var key1 = getkey(split.shift())
    var key2 = getkey(split[0])
    var recipient = result

    while (key2 !== undefined) {
      if (recipient[key1] === undefined) {
        recipient[key1] = (
          typeof key2 === 'number' &&
          !opts.object ? [] : {}
        )
      }

      recipient = recipient[key1]
      if (split.length > 0) {
        key1 = getkey(split.shift())
        key2 = getkey(split[0])
      }
    }

    // unflatten again for 'messy objects'
    recipient[key1] = unflatten(target[key], opts)
  })

  return result;

};


/**
 * An adopted version of pmario's version to create
 * uuids of type RFC4122, version 4 ID.
 * 
 * Shortened version:
 * pmario (1.0 - 2011.05.22):
 * http://chat-plugins.tiddlyspace.com/#UUIDPlugin
 * 
 * Original version:
 * Math.uuid.js (v1.4)
 * http://www.broofa.com
 * mailto:robert@broofa.com
 * 
 * Copyright (c) 2010 Robert Kieffer
 * Dual licensed under the MIT and GPL licenses.
 * 
 * ---
 * @see https://github.com/almende/vis/issues/432
*/
utils.genUUID = (function() {
  
  // Private array of chars to use
  var CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'.split(''); 

  return function () {
    var chars = CHARS, uuid = new Array(36);

    var rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    } 
    
    return uuid.join('');
  };

})();

exports.utils = utils;
