/*\

title: $:/plugins/felixhayashi/tiddlymap/js/utils
type: application/javascript
module-type: library

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports.utils = {};

/*** Imports *******************************************************/
 
var vis       = require("$:/plugins/felixhayashi/vis/vis.js");
var exception = require("$:/plugins/felixhayashi/tiddlymap/js/exception").exception;
var URL       = require("$:/plugins/felixhayashi/tiddlymap/js/URL").URL;

/*** Code **********************************************************/

/**
 * A utilities class that contains universally used helper functions
 * to abbreviate code and make my life easier.
 * 
 * ATTENTION: This module must not require any other tiddlymap file
 * in order to avoid cyclic dependencies. For the same reason,
 * it must also not access the `$tm.*` object.
 * 
 * Exceptions to this restriction:
 *   - The utils module may access all `$tm.*` properties
 *     defined in startup.environment.
 *   - The utils module may require vendor libs or tiddlymap libs
 *     that only require vendor libs themselves.
 * 
 * @see Dom utilities {@link https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/*}
 * @namespace utils
 */
var utils = exports.utils;

/**
 * Pendant to tw native {@code addTiddlers()}.
 * 
 * Also removes tiddlers from the river.
 * 
 * @param {TiddlerCollection} tiddlers - A collection of tiddlers
 * to be removed.
 */
utils.deleteTiddlers = function(tiddlers) {
  
  var keys = Object.keys(tiddlers);
  var storyList = $tw.wiki.getTiddlerList("$:/StoryList");
  
  for(var i = keys.length; i--;) {
    var tRef = utils.getTiddlerRef(tiddlers[keys[i]]);
    if(!$tw.wiki.tiddlerExists(tiddlers[keys[i]])) {
      // this check is important!
      // see https://github.com/Jermolene/TiddlyWiki5/issues/1919
      continue;
    }
    
    var index = storyList.indexOf(tRef);
    if(index !== -1) { // tiddler is displayed in river
      storyList.splice(index, 1);
      utils.setField("$:/StoryList", "list", storyList);
    }
    
    // finally delete the tiddler;
    
    
    $tw.wiki.deleteTiddler(tRef);

  }
  
};

utils.moveFieldValues = function(oldName,
                                 newName,
                                 isRemoveOldField,
                                 isIncludeSystemTiddlers,
                                 tiddlers) {
                                   
  if(oldName === newName) return;
        
  var allTiddlers = tiddlers || $tw.wiki.allTitles();
  for(var i = allTiddlers.length; i--;) {
    var tObj = utils.getTiddler(allTiddlers[i]);
    if(tObj.isDraft()
       || !tObj.fields[oldName]
       || (!isIncludeSystemTiddlers
           && $tw.wiki.isSystemTiddler(allTiddlers[i]))) {
             continue;
    }
    
    var fields = {};
    fields[newName] = tObj.fields[oldName];
    if(isRemoveOldField) {
      fields[oldName] = undefined;
    }
    $tw.wiki.addTiddler(new $tw.Tiddler(tObj, fields));
    
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
 * Uppercase the first letter of a string.
 */
utils.ucFirst = function(string) {
  return string && string[0].toUpperCase() + string.slice(1);
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
 * @return {Collection} A **new** collection of type `outputType`.
 */
utils.convert = function(col, outputType) {
  
  if(typeof col !== "object") return;
  
  switch(outputType) {
    
    case "array":
      return utils.getValues(col);
    case "hashmap": // fall through alias
    case "object":
      if(col instanceof vis.DataSet) { // a dataset
        return col.get({ returnType: "Object" }); // careful has proto
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
 * Extract all the values from a collection. If `col` is an object,
 * only properties are considered that are its own and iterable.
 * 
 * @param {Collection} col
 * @return {Array} An array
 */
utils.getValues = function(col) {
  
  if(Array.isArray(col)) {
    return col; // bounce back.
  } else if(col instanceof vis.DataSet) { // a dataset
    return col.get({ returnType: "Array" });
  }
  
  var result = [];
  var keys = Object.keys(col);
  for(var i = keys.length; i--;) {
    result.push(col[keys[i]]);
  }
  
  return result;
  
};

/**
 * @deprecated Use $tw.utils.hop instead
 * 
 * I use this method on all objects that I didn't create myself.
 * 
 * Why this? Well,
 * 
 * 1. How do I know if the object was created via {} or
 *    utils.makeHashMap()? If the latter is the case,
 *    `hasOwnProperty()` doesn't exist.
 * 2. When the object is used as hashtable, hasOwnProperty
 *    could be overridden.
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
utils.makeHashMap = function() {
  
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
 * @Todo: skip drafts! Or not?
 * 
 * @param {TiddlyWikiFilter} filter - The filter to use.
 * @param {TiddlerCollection} [tiddlers] - A set of tiddlers used as
 *     source. If not defined, all tiddlers and system tiddlers are
 *     selected. Shadows are *not* included.
 * @return {Array.<TiddlerReference>}
 */
utils.getMatches = function(filter, tiddlers) {
      
  // use wiki as default source
  var source = undefined;
  
  if(typeof filter === "string") {
    filter = $tw.wiki.compileFilter(filter);
  }
  
  // if a source is provided, create an iterator callback
  if(tiddlers != null && typeof tiddlers === "object") {
  
    // shortcuts for performance
    var wiki = $tw.wiki;
  
    if(!Array.isArray(tiddlers)) {
      tiddlers = Object.keys(tiddlers);
    }
    
    source = function(callback) {
      for(var i = tiddlers.length; i--;) {
        var tObj = wiki.getTiddler(tiddlers[i]);
        callback(tObj, tiddlers[i]);
      }
    };
    
  }

  return filter.call($tw.wiki, source);
        
};

// @todo move this to environment
var eTyFiltAutoPrefix = "[all[]] ";

utils.getEdgeTypeMatches = function(filter, titles) {
      
  if(!titles) {
    var prefix = $tm.path.edgeTypes + "/";
    titles = utils.getTiddlersByPrefix(prefix, {
      iterator: "eachTiddlerPlusShadows",
      removePrefix: true
    })
  }
  
  if(titles != null && !Array.isArray(titles)) {
    titles = Object.keys(titles);
  }
  
  return utils.getMatches(eTyFiltAutoPrefix + (filter || ""), titles);
  
};

utils.isEdgeTypeMatch = function(title, filter) {
    
  return utils.isMatch(title, eTyFiltAutoPrefix + (filter || ""));
  
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
  
  var tRef = utils.getTiddlerRef(tiddler);
  return (utils.getMatches(filter, [ tRef ]).length > 0);
  
};

/**
 * Polyfill until `isInteger` has become official. If the target
 * value is an integer, return true, otherwise return false.
 * If the value is NaN or infinite, return false.
 * 
 * @param {*} value - The value to be tested for being an integer.
 * @return {boolean} True if the value is an integer, false otherwise.
 */
utils.isInteger = Number.isInteger || function(value) {
  return typeof value === "number" && 
         isFinite(value) && 
         Math.floor(value) === value;
};

/**
 * When we do not know the string, we need to escape it.
 * @deprecated use tw's escapeRegExp instead
 */
utils.escapeRegex = function(str) {
  
  return str.replace(/[-$^?.+*[\]\\(){}|]/g, "\\$&");
  
};

utils.replaceAll = function(str, defaultReplacement, subStrings) {
  
  defaultReplacement = defaultReplacement || "";
  
  for(var i = subStrings.length; i--;) {
    
    var subString = subStrings[i];
    var replacement = defaultReplacement;
    
    if(Array.isArray(subString)) {
      replacement = subString[1];
      subString = subString[0];
    }
    
    str = str.replace(subString, replacement);
  }
  
  return str;
  
};

/**
 * Sadly, setting fields with tw means that we lose the type information
 * since field values are persisted as strings and the type is not
 * included.
 * 
 * To ensure that flags are always interpreted correctly, the following
 * function exists.
 * 
 * We regard the following values as `true` (order matters):
 * 
 * # Any string that can be translated into a number unequal `0`
 * # `"true"`
 * # Any number unequal `0`
 * # Boolean `true`
 * 
 * The following as false (order matters):
 * 
 * # Any string that can be translated into number `0`
 * # Every string unequal `"true"`
 * # The number `0`
 * # Boolean `false`
 * 
 */
utils.isTrue = function(confVal, defVal) {
  
  if(confVal == null) {
    return !!defVal;
  } else if(typeof confVal === "string") {
    var n = parseInt(confVal);
    return (isNaN(n) ? (confVal === "true") : (n !== 0));
  } else if(typeof confVal === "boolean") {
    return confVal;
  } else if(typeof confVal === "number") {
    return (n !== 0);
  }
  
  return false;
  
};

/**
 * Gets a tiddler reference from a tRef or tObj
 * 
 * @param {Tiddler} tiddler - A tiddler reference or object.
 * @return {TiddlerReference|undefined} A tiddler reference (title)
 */
utils.getTiddlerRef = function(tiddler) {
  
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
 * @param {boolean} isReload - If set to true the tiddler freshly reloaded
 *     from the db and any potentially passed tiddler object is ignored.
 * @return {Tiddler} A tiddler object.
 */
utils.getTiddler = function(tiddler, isReload) {
  
  if(tiddler instanceof $tw.Tiddler) {
    if(!isReload) {
      return tiddler;
    }
    tiddler = tiddler.fields.title;
  }
  
  return $tw.wiki.getTiddler(tiddler);
  
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
    title : tRef,
    text : message
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
  
  var tRef = utils.getTiddlerRef(tiddler);
  return tRef && ($tw.wiki.tiddlerExists(tRef) || $tw.wiki.isShadowTiddler(tRef));
  
};

/**
 * The function allows to detect whether a widget is displayed
 * in preview or not.
 */
utils.isPreviewed = function(widget) {
  
  if(widget) {
    if(widget.getVariable("tv-tiddler-preview")) {
      return true;
    } else { // fallback for < v5.1.9
      var cls = "tc-tiddler-preview-preview";
      return !!utils.getAncestorWithClass(widget.parentDomNode, cls);
    }
  }
  
  return false;
  
};

/**
 * If an ancestor that possesses a specified class exists the the
 * element will be returned, otherwise undefined is returned.
 */
utils.getAncestorWithClass = function(el, cls) {

  if(typeof el !== "object" || typeof cls !== "string") return;

  while(el.parentNode) {
    el = el.parentNode;
    if($tw.utils.hasClass(el, cls)) { return el; }
  }
  
}

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
  
    var r = utils.makeHashMap();
    for(var p in obj) {
      if(utils.startsWith(p, prefix)) {
        r[(removePrefix ? p.substr(prefix.length) : p)] = obj[p];
      }
    }
  
  return r;
  
};

/**
 * Function to remove the prefix of a string
 */
utils.getWithoutPrefix = function(str, prefix) {

  return utils.startsWith(str, prefix)
         ? str.substr(prefix.length)
         : str;

};

/**
 * 
 */
utils.hasKeyWithPrefix = function(obj, prefix) {
  
  for(var p in obj) {
    if(utils.startsWith(p, prefix)) {
      return true;
    }
  }
  return false;
  
}



/**
 * Helper to increase the code semantics.
 * 
 * @param {string} str - The string to work with.
 * @param {string} prefix - The sequence to test.
 * @result {boolean} True if `str` starts with `prefix`, false otherwise.
 */
utils.startsWith = function(str, prefix) {

  return (str.substring(0, prefix.length) === prefix);
  
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
 * 
 */
utils.groupByProperty = function(col, prop) {
  
  col = utils.getIterableCollection(col);
  
  var result = utils.makeHashMap();
  var keys = Object.keys(col);
  for(var i in keys) {
    var item = col[keys[i]];
    var val = item[prop];
    if(val == null) { // null or undefined
      throw "Cannot group by property " + prop;
    } else {
      if(!Array.isArray(result[val])) {
        result[val] = [];
      }
      result[val].push(item);
    }
  }
  
  return result;
  
};

/**
 * Searches the dom for elements that possess a certain class
 * and removes this class from each element.
 * 
 * @param {Array<string>} classNames - The class names to remove.
 */
utils.findAndRemoveClassNames = function(classNames) {
  
  for(var i = classNames.length; i--;) {
    var elements = document.getElementsByClassName(classNames[i]);
    for(var j = elements.length; j--;) {
      $tw.utils.removeClass(elements[j], classNames[i]);
    }
  }

};

/**
 * Parse json from field or return default value on error.
 * 
 * @param {Tiddler} tiddler - The tiddler containing the json.
 * @param {string} field - The field with the json data.
 * @param {Object} [data] - An optional default value.
 * @return {*} Either the parsed data or the default data.
 */
utils.parseFieldData = function(tiddler, field, data) {
  
  var tObj = utils.getTiddler(tiddler);
  if(!tObj) return data;
  
  if(!field) field = "text";
  
  return utils.parseJSON(tObj.fields[field], data);
  
};

/**
 * Loads the image from web and passes it to the callback as
 * object url.
 */
utils.getImgFromWeb = function(imgUri, callback) {
  
  if(!imgUri || typeof callback !== "function") return;
  
  var xhr = new XMLHttpRequest();
  xhr.open("GET", imgUri, true);
  xhr.responseType = "blob";
  xhr.onerror = function(e) { console.log(e); };
  xhr.onload = function(e) {
    if(this.readyState === 4 && this.status === 200) {
      var blob = this.response;
      callback(window.URL.createObjectURL(blob));
    }
  };
  
  try { xhr.send();  } catch(e) { console.log(e); }
  
};

/**
 * Try to turn the string into a javascript object. If the
 * transformation fails, return the optionally provided `data` object.
 * 
 * @param {string} str - The string to parse.
 * @param {*} data - The default value if the operation fails.
 * @return {*} Either the object resulting from the parsing operation
 *     or `undefined` or `data` if the operation failed.
 */
utils.parseJSON = function(str, data) {

  try {
    return JSON.parse(str);
  } catch(Error) {
    return data;
  }
  
};

/**
 * Serialize json data and store it in a tiddler's field.
 * 
 * @param {Tiddler} tiddler - The tiddler to store the json in.
 * @param {string} field - The field that will store the json.
 * @param {Object} data - The json data.
 */
utils.writeFieldData = function(tiddler, field, data) {

  if(typeof data === "object") {
    utils.setField(tiddler, field, JSON.stringify(data));
  }
  
};

/**
 * Turns the filter expression in a nicely formatted (but unusable)
 * text, making it easier to edit long filter expressions.
 * 
 * @param {string} expr - A valid filter expression.
 * @result {string} A formatted (unusable) filter expression.
 */
utils.getPrettyFilter = function(expr) {
    
  // remove outer spaces and separate operands
  expr = expr.trim().replace("][", "] [");
  
  // regex to identify operands 
  var re = /[\+\-]?\[.+?[\]\}\>]\]/g;
  
  // get operands
  var operands = expr.match(re);
  
  // replace operands with dummies and trim again to avoid trailing spaces
  expr = expr.replace(re, " [] ").trim();
  
  // turn it into an array
  var stringsPlusDummies = expr.split(/\s+/);

  var operandIndex = 0;
  var parts = [];
  for(var i = 0; i < stringsPlusDummies.length; i++) {
    parts[i] = (stringsPlusDummies[i] === "[]"
              ? operands[operandIndex++]
              : stringsPlusDummies[i]);
  }
    
  return parts.join("\n");

};

/**
 * Set a tiddler field to a given value.
 * 
 * Setting the title field to another value will clone the tiddler.
 * In this case, better use @link{utils.clone} as this is
 * semantically stronger.
 * 
 * This method is guarded against
 * https://github.com/Jermolene/TiddlyWiki5/issues/2025
 * 
 * @return {$tw.Tiddler|undefined} The tiddler object containing
 *     the field with the assigned value.
 */
utils.setField = function(tiddler, field, value) {

  if(!tiddler || !field) return;

  var tRef = utils.getTiddlerRef(tiddler);
  var fields = { title: tRef };
  fields[field] = value;
  
  // do not use any tObj provided, it may result in a lost update!
  var tObj = $tw.wiki.getTiddler(tRef, true);
  
  if(field !== "text" && tObj && !tObj.fields.text) {
    fields.text = "";
  }
  
  var tObj = new $tw.Tiddler(tObj, fields);
  $tw.wiki.addTiddler(tObj);
  
  return tObj;

};

/**
 * Clone a tiddler and give it another title.
 * This means the tiddlers are equal except from their titles.
 */
utils.clone = function(src, dest) {

  utils.setField(src, "title", dest);

};

/**
 * Set the value of a data tiddler entry (index) to a given value
 */
utils.setEntry = function(tiddler, prop, value) {

  $tw.wiki.setText(utils.getTiddlerRef(tiddler), null, prop, value);

};

/**
 * Get the value of a data tiddler entry (index)
 */
utils.getEntry = function(tiddler, prop, defValue) {

  var data = $tw.wiki.getTiddlerData(utils.getTiddlerRef(tiddler), {});
  return (data[prop] == null ? defValue : data[prop]);
  
};

//~ utils.getNestedProperty = function(obj, propPath) {
//~ 
  //~ propPath = propPath.split(".");
  //~ for(var i = propPath.length; i--;) {
    //~ if(obj !== null && typeof obj === "object") {
      //~ obj = obj[propPath[i]];
  //~ }
  //~ 
//~ };

/**
 * Compare versions.
 * @return {boolean} Unlike `$tw.utils.checkVersions`, this function
 * only returns true if the left argument is greater than the right
 * argument.
 */
utils.isLeftVersionGreater = function(v1, v2) {

  return v1 !== v2 && $tw.utils.checkVersions(v1, v2);
  
};




/**
 * Get a tiddler's field value. If the field does not exist or
 * its value is an empty string, return the default or an empty
 * string.
 */
utils.getField = function(tiddler, field, defValue) {
    
  var tObj = utils.getTiddler(tiddler);
  return (!tObj
          ? defValue || ""
          : tObj.fields[field] || defValue || "");
  
};

utils.getText = function(tiddler, defValue) {
  
  return utils.getField(tiddler, "text", defValue);
  
};

utils.setText = function(tiddler, value) {

  utils.setField(tiddler, "text", value);
  
};

/**
 * Works like get `getElementById()` but is based on a class name.
 * It will return the first element inside an optional parent (root)
 * that has a class of this name.
 * 
 * @param {string} cls - The class name to search for.
 * @param {DOMElement} [root=document] - The context to search in.
 * @param {boolean} [isRequired=true] - If true, an exception will be
 *     thrown if no element can be retrieved. This is important
 *     when depending on third party modules and class names change!
 * @throws {utils.exception.EnvironmentError} - May be thrown if
 *    `isRequired` is set to true.
 * @return {DOMElement} Either a dom element or null is returned.
 */
utils.getFirstElementByClassName = function(cls, root, isRequired) {
      
  var el = (root || document).getElementsByClassName(cls)[0];
  if(!el && (typeof isRequired === "boolean" ? isRequired : true)) {
    var text = "Missing element with class " + cls + " inside " + root;
    throw new utils.exception.EnvironmentError(text);
  }
  
  return el;
  
};
    
/**
 * Checks whether a tiddler is a draft or not.
 * 
 * @param {Tiddler} tiddler - The tiddler to check on.
 */
utils.isDraft = function(tiddler) {

  var tObj = utils.getTiddler(tiddler);
  return (tObj && tObj.isDraft());

};

utils.getRandomInt = function(min, max) {
  
  return Math.floor(Math.random() * (max - min) + min);
  
};

utils.pickRandom = function(arr) {
  
  return arr[utils.getRandomInt(0, arr.length-1)];
  
};

utils.getRandomLabel = function(options) {
  
  options = options || {};
  
  var adjective = [
    "exciting", "notable", "epic", "new", "fancy",
    "great", "cool", "fresh", "funky", "clever"
  ];
  
  var noun = [
    "concept", "idea", "thought", "topic", "subject"
  ];
  
  return "My" 
         + " " + utils.pickRandom(adjective) + " "
         + (options.object || utils.pickRandom(noun))
         + (options.plural ? "s" : "");
  
};

/**
 * Merges `src` into `dest` which means that the merge transforms
 * the `dest` object itself. If src and dest both have the same
 * property path, src does only replace the primitive data type
 * at the end of the path.
 * 
 * @param {Object} dest - The destination object.
 * @param {...Object} src - At least one object to merge into `dest`.
 * @return {Object} The original `dest` object.
 */
utils.merge = (function() {
  
  var _merge = function(dest, src) {
    
    if(typeof dest !== "object") { dest = {}; }
    
    for(var p in src) {
      if(src.hasOwnProperty(p)) {
        if(src[p] != null) { // skip null or undefined
          dest[p] = (typeof src[p] === "object"
                     ? _merge(dest[p], src[p])
                     : src[p]); // primitive type, stop recursion
        }
      }
    }
      
    return dest;
  };

  return function(dest /*[,src], src*/) {
    
    // start the merging; i = 1 since first argument is the destination
    for(var i = 1, l = arguments.length; i < l; i++) {
      var src = arguments[i];
      if(src != null && typeof src === "object") {
        dest = _merge(dest, src);
      }
    }
    
    return dest;

  };

})();

/**
 * This function will draw a raster on the network canvas that will
 * adjust to the network's current scaling factor and viewport offset.
 * 
 * @param {CanvasRenderingContext2D} context - The canvas's context
 *     passed by vis.
 * @param {number} scaleFactor - The current scale factor of the network.
 * @param {Object} viewPosition - Object with x and y that represent the
 *     current central focus point of the view.
 * @param {number} rasterSize - The size of the squares that are drawn.
 * @param {string} color - A string parsed as CSS color value.
 */
utils.drawRaster = function(context, scaleFactor, viewPosition, rasterSize, color) {
  
  var rasterSize = parseInt(rasterSize) || 10;
  var canvas = context.canvas;
  var width = canvas.width / scaleFactor;
  var height = canvas.width / scaleFactor;
  var offsetLeft = viewPosition.x - (width / 2);
  var offsetTop = viewPosition.y - (height / 2);
      
  // draw vertical lines
  for(var x = offsetLeft; x < width; x += rasterSize) {
    context.moveTo(x, offsetTop);
    context.lineTo(x, height);
  }
      
  // draw horizontal lines
  for(var y = offsetTop; y < height; y += rasterSize) {
    context.moveTo(offsetLeft, y);
    context.lineTo(width, y);
  }

  context.strokeStyle = color || "#D9D9D9";
  context.stroke();

};

/**
 * Get a tiddler's text or otherwise return a default text.
 */
utils.isSystemOrDraft = function(tiddler) {

  if($tw.wiki.isSystemTiddler(utils.getTiddlerRef(tiddler))) {
    return true;
  }

  var tObj = utils.getTiddler(tiddler);
  return tObj && tObj.isDraft();
  
};

/**
 * Function to merge an array of tiddlers into a single tiddler.
 * 
 * @param {Array<TiddlerReference|TiddlerObject>} tiddlers - The
 *     tiddlers to merge.
 * @param {string} [title=null] - The title where the result is
 *     written to. If not specified, the first array item is used
 *     as output title.
 */
utils.getMergedTiddlers = function(tiddlers, title) {
  
  if(!Array.isArray(tiddlers)) return;
  
  // turn all array elements into tiddler objects
  for(var i = tiddlers.length; i--;) {
    tiddlers[i] = utils.getTiddler(tiddlers[i]);
  }
  
  if(!tiddlers.length) return;
  
  tiddlers.push(
    { title: (title || tiddlers[0].fields.title) },
    $tw.wiki.getModificationFields(),
    $tw.wiki.getCreationFields()
  );
  
  // add context for `apply()` function
  tiddlers.unshift(null);

  return new (Function.prototype.bind.apply($tw.Tiddler, tiddlers));
  
};

/**
 * Depth first search
 */
utils.getChildWidgetByProperty = function(widget, prop, val) {
  
  var children = widget.children;
  for(var i = children.length; i--;) {
    var child = children[i];
    if(child[prop] === val) {
      return child;
    } else {
      child = utils.getChildWidgetByProperty(child, prop, val);
      if(child) {
        return child;
      }
    }
  }
    
};

/**
 * Adds or removes listeners from the target in capture or
 * non-capture (bubbling) mode.
 * 
 * @param {string} task - Either "add" or "remove". Make sure to
 *     always call add and remove with *excatly* the same listeners
 *     Note: if you use bind, you change the function object.
 * @param {Element} target - The element to attach or remove the
 *     listener to or from.
 * @param {Object<string, (Function|Array)>} listeners - The key is
 *     the event name and the value is either a handler function
 *     or an array where the first index is the handler function and
 *     the second is a boolean that specifies whether to use capture
 *     or not.
 * @param {boolean} [isCapt=false] - Whether to run the handler in
 *     bubbling or capturing phase.
 */
utils.setDomListeners = function(task, target, listeners, isCapt) {
  
  isCapt = (typeof isCapt === "boolean" ? isCapt : false);
  task = task + "EventListener";
  
  for(var event in listeners) {
    
    var l = listeners[event];
    
    if(typeof l === "function") {
      target[task](event, l, isCapt);
    } else { // expect Array
      target[task](event, l[0], (typeof l[1] === "boolean" ? l[1] : isCapt));
    }
        
  }
  
};

/**
 * If the array contains the element, the element is removed from
 * the array in-place and the removed element.
 */
utils.removeArrayElement = function(arr, el) {
  
  var index = arr.indexOf(el);
  if(index > -1) {
    return arr.splice(index, 1)[0];
  }
  
};

/**
 * Removes all child nodes of a DOM element. This includes element
 * and non-element objects.
 */
utils.removeDOMChildNodes = function(el) {
  
  for(var i = el.childNodes.length; i--;) {
    el.removeChild(el.childNodes[i]);
  }
  
};

/**
 * Register listeners to widget using a hashmap.
 * 
 * @param {Hashmap<Key, Function>} listeners - The listeners to attach.
 * @param {Widget} widget - the widget to attach the listeners to.
 * @param {Object} context - The context to bind the listeners to.
 */
utils.addTWlisteners = function(listeners, widget, context) {
  for(var id in listeners) {
    widget.addEventListener(id, listeners[id].bind(context));
  }
};

/**
 * Force early binding of functions to this context.
 * 
 * @param {Array<string>|string} fnNames - The prototype function names
 *     to bind to this context.
 */
utils.bind = function(context, fnNames) {
  
  if(typeof fnNames === "string") {
    
    fnNames = [ fnNames ];
    
  } else {
    
    for(var i = fnNames.length; i--;) {
      var fn = context[fnNames[i]];
      if(typeof fn === "function") {
        context[fnNames[i]] = fn.bind(context);
      }
    }
    
  }
  
};

/**
 * Renames all tiddler titles that are prefixed with `oldPrefix`
 * into titles that are prefixed with `newPrefix` by replacing
 * `oldPrefix` with `newPrefix`.
 * 
 * The force option somewhat ensures atomicity.
 * 
 * @param {string} oldPrefix - Moves all tiddlers with this prefix.
 * @param {string} newPrefix - All tiddlers moved tiddlers will
 *     receive this new prefix.
 * @param {boolean} [isForce=false] - If a new title would override
 *     an existing title, and `force` is not set, then nothing will
 *     happen and undefined is returned by the function.
 * @param {boolean} [isDelete=true] - True, if the tiddlers with the
 *     old prefix should be deleted or false, if they should be kept.
 * @returns {Object<string, string>} - A hashmap that maps the old
 *     and the new path.
 */
utils.mv = function(oldPrefix, newPrefix, isForce, isDelete) {

  if(oldPrefix === newPrefix || !oldPrefix || !newPrefix) return;
  
  isForce = (typeof isForce === "boolean" ? isForce : false);
  isDelete = (typeof isDelete === "boolean" ? isDelete : true);
  
  // prepare
  var targets = utils.getTiddlersByPrefix(oldPrefix);
  var fromToMapper = utils.makeHashMap();
  for(var i = targets.length; i--;) {    
    var oldTRef = targets[i];
    var newTRef = oldTRef.replace(oldPrefix, newPrefix);
    if($tw.wiki.tiddlerExists(newTRef) && !isForce) {
      return; // undefined
    }
    fromToMapper[oldTRef] = newTRef;
  }
  
  for(var oldTRef in fromToMapper) { 
    utils.setField(oldTRef, "title", fromToMapper[oldTRef]);
    if(isDelete) $tw.wiki.deleteTiddler(oldTRef);
  }
  
  return fromToMapper;
  
};

/**
 * Clones all tiddler titles that are prefixed with `oldPrefix`
 * into titles that are instead prefixed with `newPrefix`.
 * 
 * The force option somewhat ensures atomicity.
 * 
 * @param {string} oldPrefix - Moves all tiddlers with this prefix.
 * @param {string} newPrefix - All tiddlers moved tiddlers will
 *     receive this new prefix.
 * @param {boolean} [isForce=false] - If a new title would override
 *     an existing title, and `force` is not set, then nothing will
 *     happen and undefined is returned by the function.
 * @returns {Object<string, string>} - A hashmap that maps the old
 *     and the new path.
 */
utils.cp = function(oldPrefix, newPrefix, isForce) {
  
  return utils.mv(oldPrefix, newPrefix, isForce, false);
  
};

/**
 * Checks if a value exists in an array. A strict search is used
 * which means that also the type of the needle in the haystack
 * is checked.
 * 
 * @param {*} needle - The searched value.
 * @param {Array} - The array.
 * @return Returns true if needle is found in the array, false otherwise. 
 */
utils.inArray = function(needle, haystack) {
  
  return (haystack.indexOf(needle) !== -1);
  
};

/**
 * Checks if a string exists in a string.
 */
utils.hasSubString = function(str, sub) {
  
  return (str.indexOf(sub) !== -1);
  
};

/**
 * Joins all elements of an array into a string where all elements
 * are wrapped between `left` and `right`.
 * 
 * @param {Array} arr - The array to perform the join on.
 * @param {string} left - The wrapping string for the left side.
 * @param {string} right - The wrapping string for the right side.
 * @param {string} [separator] - The separator between a wrapped element
 *     and the next one. Defaults to space.
 * @return {string} The wrapped string, e.g. `[[hello]] [[world]]`.
 */
utils.joinAndWrap = function(arr, left, right, separator) {
      
  if(!separator) separator = " ";
  return left + arr.join(right + separator + left) + right;
  
};

/**
 * Function that searches an array for an object with a property
 * having a certain value. 
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
  for(var i = 0, l = keys.length; i < l; i++) {
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

/**
 * 
 * 
 */
utils.keyOfItemWithProperty = function(col, key, val) {
  var keys = utils.keysOfItemsWithProperty(col, key, val, 1)
  return (keys.length ? keys[0] : undefined);
};

/**
 * Delete all tiddlers with a given prefix.
 * 
 * @param {string} prefix - The prefix
 */
utils.deleteByPrefix = function(prefix, tiddlers) {
  
  if(!prefix) return;
  
  tiddlers = tiddlers || $tw.wiki.allTitles();
  
  var deletedTiddlers = [];
  for(var i = tiddlers.length; i--;) {
    if(utils.startsWith(tiddlers[i], prefix)) {
      $tw.wiki.deleteTiddler(tiddlers[i]);
      deletedTiddlers.push(deletedTiddlers[i]);
    }
  }
  
  return deletedTiddlers;
  
};

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
 * In a collection where all elements have a **distinct** property
 * `lookupKey`, use the value of each element's `lookupKey` as key
 * to identify the object. If no property `lookupKey` is specified,
 * the collection's values are used as keys and `true` is used as value,
 * however, if the used keys are not strings, an error is thrown.
 * 
 * @param {Collection} col - The collection for which to create a lookup table.
 * @param {string} [lookupKey] - The property name to use as index in
 *     the lookup table. If not specified, the collection values are tried
 *     to be used as indeces.
 * @return {Hashmap} The lookup table.
 */
utils.getLookupTable = function(col, lookupKey) {
  
  col = utils.getIterableCollection(col);
  
  var lookupTable = utils.makeHashMap();
  
  var keys = Object.keys(col);
  for(var i = 0, l = keys.length; i < l; i++) {
    
    var key = keys[i];
    
    // value to be used as the lookup table's index
    var idx = (lookupKey ? col[key][lookupKey] : col[key]);
    
    var type = typeof idx;
    if((type === "string" && idx !== "") || type === "number") {
      if(!lookupTable[idx]) { // doesn't exist yet!
        lookupTable[idx] = (lookupKey ? col[key] : true);
        continue;
      }
    }

    // in any other case
    throw "TiddlyMap: Cannot use \"" + ltIndex + "\" as lookup table index";
    
  }
  
  return lookupTable;
    
};
  
/**
 * Remove any newline from a string
 */
utils.getWithoutNewLines = function(str) {
  if(typeof str === "string") {
    return str.replace(/[\n\r]/g, " ");
  }
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
 * @param {string} [value] - If provided, the field's value must
 *     equal this value in order to match.
 * @param {Hashmap} [options] - Further options.
 * @param {TiddlerCollection} [options.tiddlers=$tw.wiki.allTitles()] - A collection
 *     of tiddlers to perform the search on.
 * @param {boolean} [options.isIncludeDrafts=false] - True if drafts of the found
 *     tiddlers are also included in the result set.
 * @param {number} [options.limit] - A positive number delimiting the maximum
 *     number of results.
 *     tiddlers are also included in the result set.
 * @return {Hashmap.<TiddlerReference, Tiddler>} Result
 */
utils.getTiddlersWithField = function(fieldName, value, options) {
  
  if(!options || typeof options !== "object") options = {};
      
  var tiddlers = options.tiddlers || $tw.wiki.allTitles();
  var limit = options.limit || 0;
  var isIncludeDrafts = (options.isIncludeDrafts === true);
  var result = utils.makeHashMap();
  var keys = Object.keys(tiddlers);
  var hasOwnProp = $tw.utils.hop;
  for(var i = keys.length; i--;) {
    var tObj = utils.getTiddler(tiddlers[keys[i]]);
    var fields = tObj.fields;
    if(hasOwnProp(fields, fieldName)
       && (!hasOwnProp(fields, "draft.of") || isIncludeDrafts)) {
      if(!value || fields[fieldName] === value ) {
        result[fields.title] = tObj;
        if(--limit === 0) break;
      }
    }
  }
      
  return result;
  
};

utils.getTiddlerWithField = function(name, value) {
  
  var result = utils.getTiddlersWithField(name, value, { limit: 1 });
  return Object.keys(result)[0];
  
};

/**
 * Iterates over all tiddlers in a given way and returns tiddlers
 * whose title matches the prefix string.
 * 
 * @param {string} prefix - The prefix to match
 * @param {Hashmap} [options] - An options object.
 * @param {string} [options.iterator="each"] - A tw store iterator
 *    function, e.g. "eachShadow" or "ShadowPlusTiddlers".
 * @param {boolean} [options.removePrefix= false] - Whether to remove
 *     the prefix or to leave it.
 * @return {Array<string>} The matches with or without the prefix.
 */
utils.getTiddlersByPrefix = function(prefix, options) {
  
  options = options || {};

  var removePrefix = (options.removePrefix === true);                
  var result = [];
  $tw.wiki[options.iterator || "each"](function(tObj, tRef) {
    if(utils.startsWith(tRef, prefix)) {
      result.push(removePrefix
                  ? utils.getWithoutPrefix(tRef, prefix)
                  : tRef);
    }
  });
      
  return result;
  
};

/**
 * Advanced addTiddler method.
 * 
 * It adds timestamps and only adds the tiddler if it doesn't exist
 * yet or the force option is used.
 * 
 * This method is guarded against
 * https://github.com/Jermolene/TiddlyWiki5/issues/2025
 */
utils.addTiddler = function(tiddler, isForce) {
  
  var tObj = utils.getTiddler(tiddler);
  if(!isForce && tObj) return tObj;
  
  tObj = new $tw.Tiddler({
                           title: tiddler,
                           text: ""
                         },
                         $tw.wiki.getModificationFields(),
                         $tw.wiki.getCreationFields());
  
  $tw.wiki.addTiddler(tObj);
  
  return tObj;
  
};

utils.getSnapshotTitle = function(viewLabel, type) {
    
  return "Snapshot – "
         + viewLabel
         + " (" + new Date().toDateString() + ")"
         + "." + (type || "png");
  
};
  
/**
 * Contains all TiddlyMap exceptions
 */
utils.exception = exception;

/**
 * URL parsing
 */
utils.URL = URL;

/************************* 3rd-party code **************************/

/**
 * Modified TW-Code from Navigator widget
 * https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/widgets/navigator.js
 */
utils.makeDraftTiddler = function(targetTitle) {
  
  // See if there is already a draft tiddler for this tiddler
  var draftTitle = $tw.wiki.findDraft(targetTitle);
  if(draftTitle) {
    return $tw.wiki.getTiddler(draftTitle);
  }
  // Get the current value of the tiddler we're editing
  var tiddler = $tw.wiki.getTiddler(targetTitle);
  // Save the initial value of the draft tiddler
  draftTitle = utils.generateDraftTitle(targetTitle);
  var draftTiddler = new $tw.Tiddler(
      tiddler,
      {
        title: draftTitle,
        "draft.title": targetTitle,
        "draft.of": targetTitle
      },
      $tw.wiki.getModificationFields()
  );
  $tw.wiki.addTiddler(draftTiddler);
  return draftTiddler;
  
};

/**
 * Modified TW-Code from Navigator widget
 * https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/widgets/navigator.js
 */
utils.generateDraftTitle = function(title) {
  
  var c = 0,
    draftTitle;
  do {
    draftTitle = "Draft " + (c ? (c + 1) + " " : "") + "of '" + title + "'";
    c++;
  } while($tw.wiki.tiddlerExists(draftTitle));
  return draftTitle;
  
};

utils.touch = function(tRef) {
  
  utils.setField(tRef, "modified", new Date());
  
};

/**
 * TW-Code
 * @deprecated delete this in 2016 and use $tw.utils.getFullScreenApis instead
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
  var prefix = opts.prefix || ''
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
        : prefix + key

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
    recipient[key1] = utils.unflatten(target[key], opts)
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