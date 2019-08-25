/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/utils/basic
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

import {
  EnvironmentError
} from '$:/plugins/felixhayashi/tiddlymap/js/exception';

/**
 * Uppercase the first letter of a string.
 */
export const ucFirst = string => string && string[0].toUpperCase() + string.slice(1);

/**
 * Function to find out whether an object has any enumerable properties
 * or, in case of an array, elements.
 *
 * @param {Object} obj
 * @return {boolean} True if at least one enumerable property exists,
 *     false otherwise.
 */
export const hasElements = obj => Object.keys(obj).length > 0;

/**
 * When we do not know the string, we need to escape it.
 * @deprecated use tw's escapeRegExp instead
 */
export const escapeRegex = str => str.replace(/[-$^?.+*[\]\\(){}|]/g, '\\$&');

/**
 * Returns the basename of a path.
 * A path is a string with slashes (or another separator).
 *
 * @param {string} path - The path
 * @param {string} [separator='/']
 * @return {string} The basename
 */
export const getBasename = (path, separator = '/') => path.substring(path.lastIndexOf(separator) + 1);

/**
 * Helper to increase the code semantics.
 *
 * @param {string} str - The string to work with.
 * @param {string} prefix - The sequence to test.
 * @result {boolean} True if `str` starts with `prefix`, false otherwise.
 */
export const startsWith = (str, prefix) => str.substring(0, prefix.length) === prefix;

/**
 * Converts a string to base64 encoding.
 *
 * To do so, we either choose the native btoa browser function or the Buffer class
 * received via scope.
 *
 * @param {string} str
 */
export const base64 = typeof window === 'undefined'
  ? (str => (new Buffer(str)).toString('base64'))
  : window.btoa.bind(window);

/**
 * If two objects have the same properties, with the same values
 * then identity identity(obj) === identity(obj2) will return true.
 *
 * @param obj
 * @return string
 */
export const identity = obj =>
  (typeof obj === 'object' && obj !== null
    ?  JSON.stringify(Object.keys(obj).sort().map(key => [ key, obj[key] ]))
    : null);

/**
 * Returns true if both objects have the same properties
 * @param obj1
 * @param obj2
 */
export const isEqual = (obj1, obj2) => identity(obj1) === identity(obj2);

/**
 *
 * @param min
 * @param max
 */
export const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min) + min);

/**
 * Checks if a value exists in an array. A strict search is used
 * which means that also the type of the needle in the haystack
 * is checked.
 *
 * @param {*} needle - The searched value.
 * @param {Array} haystack - The array.
 * @return Returns true if needle is found in the array, false otherwise.
 */
export const inArray = (needle, haystack) => haystack.indexOf(needle) !== -1;

/**
 * Checks if a string exists in a string.
 */
export const hasSubString = (str, sub) => str.indexOf(sub) !== -1;

/**
 * Try to turn the string into a javascript object. If the
 * transformation fails, return the optionally provided `data` object.
 *
 * @param {string} str - The string to parse.
 * @param {*} data - The default value if the operation fails.
 * @return {*} Either the object resulting from the parsing operation
 *     or `undefined` or `data` if the operation failed.
 */
export const parseJSON = (str, data) => {

  try {

    return JSON.parse(str);

  } catch (Error) {

    return data;

  }

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
export const joinAndWrap = (arr, left, right, separator = ' ') =>
  left + arr.join(right + separator + left) + right;

/**
 * Remove any newline from a string
 */
export const getWithoutNewLines = str =>
  (typeof str === 'string') ? str.replace(/[\n\r]/g, ' ') : str;


/**
 * Factory function to return a prototypeless object that is used as
 * map. It only has the property hasOwnProperty in order to to be
 * exchangeble with other framworks that depend on this method like
 * e.g. visjs.
 *
 * @param {Object} [initialValues] - an object whose own properties will be
 *     used to initialize the map.
 */
export const makeHashMap = initialValues => {

  const map = Object.create(null);
  Object.defineProperty(map, 'hasOwnProperty', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: Object.prototype.hasOwnProperty.bind(map)
  });

  if (initialValues) {
    for (let key in initialValues) {
      if (initialValues.hasOwnProperty(key)) {
        map[key] = initialValues[key];
      }
    }
  }

  return map;

};

/**
 * If an ancestor that possesses a specified class exists the the
 * element will be returned, otherwise undefined is returned.
 *
 * @param {Element} el
 * @param {string} className
 */
export const getAncestorWithClass = (el, className) => {

  if (typeof el !== 'object' || typeof className !== 'string') {
    return;
  }

  while (el.parentNode && el.parentNode !== document) {
    el = el.parentNode;
    if (el.classList.contains(className)) {
      return el;
    }
  }

};

/**
 * Searches the dom for elements that possess a certain class
 * and removes this class from each element.
 *
 * @param {Array<string>} classNames - The class names to remove.
 */
export const findAndRemoveClassNames = function(classNames) {

  for (let i = classNames.length; i--;) {
    const elements = document.getElementsByClassName(classNames[i]);
    for (let j = elements.length; j--;) {
      elements[j].classList.remove(classNames[i]);
    }
  }

};

/**
 * Polyfill until `isInteger` has become official. If the target
 * value is an integer, return true, otherwise return false.
 * If the value is NaN or infinite, return false.
 *
 * @param {*} value - The value to be tested for being an integer.
 * @return {boolean} True if the value is an integer, false otherwise.
 */
export const isInteger = Number.isInteger || function(value) {
  return typeof value === 'number' &&
         isFinite(value) &&
         Math.floor(value) === value;
};

/**
 *
 * @param {string} str
 * @param defaultReplacement
 * @param subStrings
 * @return {*}
 */
export const replaceAll = (str, defaultReplacement = '', subStrings) => {

  for (let i = subStrings.length; i--;) {

    let subString = subStrings[i];
    let replacement = defaultReplacement;

    if (Array.isArray(subString)) {
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
export const isTrue = (confVal, defVal) => {

  if (confVal == null) {
    return !!defVal;
  } else if (typeof confVal === 'string') {
    var n = parseInt(confVal);
    return (isNaN(n) ? (confVal === 'true') : (n !== 0));
  } else if (typeof confVal === 'boolean') {
    return confVal;
  } else if (typeof confVal === 'number') {
    return (n !== 0);
  }

  return false;

};

/**
 * If the array contains the element, the element is removed from
 * the array in-place and the removed element.
 */
export const removeArrayElement = (arr, el) => {

  const index = arr.indexOf(el);
  if (index > -1) {
    return arr.splice(index, 1)[0];
  }

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
export const getPropertiesByPrefix = (obj, prefix, removePrefix) => {

  const r = makeHashMap();
  for (let p in obj) {
    if (startsWith(p, prefix)) {
      r[(removePrefix ? p.substr(prefix.length) : p)] = obj[p];
    }
  }

  return r;

};

/**
 * Function to remove the prefix of a string
 */
export const getWithoutPrefix =
  (str, prefix) => startsWith(str, prefix) ? str.substr(prefix.length) : str;


/**
 *
 */
export const hasKeyWithPrefix = (obj, prefix) => {

  for (let p in obj) {
    if (startsWith(p, prefix)) {
      return true;
    }
  }

  return false;

};

/**
 *
 * @param arr
 */
export const pickRandom = arr => arr[getRandomInt(0, arr.length-1)];

/**
 * Loads the image from web and passes it to the callback as
 * object url.
 */
export const getImgFromWeb = (imgUri, callback) => {

  if (!imgUri || typeof callback !== 'function') return;

  const xhr = new XMLHttpRequest();
  xhr.open('GET', imgUri, true);
  xhr.responseType = 'blob';
  xhr.onerror = function(e) { console.log(e); };
  xhr.onload = function(e) {
    if (this.readyState === 4 && (this.status===200 || (this.status === 0 && this.response.size > 0))) {
      const blob = this.response;
      callback(window.URL.createObjectURL(blob));
    }
  };

  try { xhr.send();  } catch (e) { console.log(e); }

};

//~ utils.getNestedProperty = function(obj, propPath) {
//~
  //~ propPath = propPath.split(".");
  //~ for (var i = propPath.length; i--;) {
    //~ if (obj !== null && typeof obj === "object") {
      //~ obj = obj[propPath[i]];
  //~ }
  //~
//~ };

/**
 * Works like get `getElementById()` but is based on a class name.
 * It will return the first element inside an optional parent (root)
 * that has a class of this name.
 *
 * @param {string} cls - The class name to search for.
 * @param {Element} [root=document] - The context to search in.
 * @param {boolean} [isRequired=true] - If true, an exception will be
 *     thrown if no element can be retrieved. This is important
 *     when depending on third party modules and class names change!
 * @throws {EnvironmentError} - May be thrown if
 *    `isRequired` is set to true.
 * @return {Element} Either a dom element or null is returned.
 */
export const getFirstElementByClassName = (cls, root, isRequired) => {

  const el = (root || document).getElementsByClassName(cls)[0];
  if (!el && (typeof isRequired === 'boolean' ? isRequired : true)) {
    const text = `Missing element with class "${cls}" inside ${root}`;
    throw new EnvironmentError(text);
  }

  return el;

};

export const getRandomLabel = (options = {}) => {

  const adjective = pickRandom([
    'exciting', 'notable', 'epic', 'new', 'fancy',
    'great', 'cool', 'fresh', 'funky', 'clever'
  ]);

  const noun = (options.object || pickRandom([
    'concept', 'idea', 'thought', 'topic', 'subject'
  ])) + (options.plural ? 's' : '');

  return `My ${adjective} ${noun}`;

};

const _merge = (dest, src) => {

  if (typeof dest !== 'object') {
    dest = {};
  }

  for (let p in src) {
    if (src.hasOwnProperty(p)) {
      if (src[p] != null) { // skip null or undefined
        dest[p] = (typeof src[p] === 'object'
          ? _merge(dest[p], src[p])
          : src[p]); // primitive type, stop recursion
      }
    }
  }

  return dest;

};

/**
 * Merges `src` into `dest` which means that the merge transforms
 * the `dest` object itself. If src and dest both have the same
 * property path, src does only replace the primitive data type
 * at the end of the path.
 *
 * @todo Should null really be skipped or treated as value?
 *
 * @param {Object} dest - The destination object.
 * @param {...Object} sources - At least one object to merge into `dest`.
 * @return {Object} The original `dest` object.
 */
export const merge = (dest, ...sources) => {

  // start the merging; i = 1 since first argument is the destination
  for (let i = 0, l = sources.length; i < l; i++) {
    const src = sources[i];
    if (src != null && typeof src === 'object') {
      dest = _merge(dest, src);
    }
  }

  return dest;

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
export const setDomListeners = (task, target, listeners, isCapt) => {

  isCapt = (typeof isCapt === 'boolean' ? isCapt : false);
  task = task + 'EventListener';

  for (let event in listeners) {

    const l = listeners[event];

    if (typeof l === 'function') {

      target[task](event, l, isCapt);
    } else { // expect Array

      target[task](event, l[0], (typeof l[1] === 'boolean' ? l[1] : isCapt));
    }

  }

};

/**
 * Removes all child nodes of a DOM element. This includes element
 * and non-element objects.
 */
export const removeDOMChildNodes = el => {

  for (let i = el.childNodes.length; i--;) {
    el.removeChild(el.childNodes[i]);
  }

};

/**
 * Implementation of the algebraic modulus operation.
 *
 * In javascript '%' is really a remainder operator, not a modulus.
 * Algebraically speaking, a modulus operation always yields
 * positive results, while '%' in js can yield negative results.
 *
 * Note: divident mod divisor
 *
 * @param {number} divident
 * @param {number} divisor
 * @return {number}
 */
export const mod = (divident, divisor) => {

  const remainder = divident % divisor;

  return Math.floor(remainder >= 0 ? remainder : remainder + divisor);

};

/**
 * Maps a coordinate to the nearest raster coordinate.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} raster
 * @return {{x: number, y: number}}
 */
export const getNearestRasterPosition = ({ x, y }, raster) => {

  const rasterHalf = raster / 2;

  // calculate distances to previous raster lines
  const distPrevX = mod(x, raster);
  const distPrevY = mod(y, raster);

  return {
    x: distPrevX < rasterHalf ? x - distPrevX : x - distPrevX + raster,
    y: distPrevY < rasterHalf ? y - distPrevY : y - distPrevY + raster
  };

};

/**
 * Force early binding of functions to this context.
 *
 * @param context the context to bind this function to (typically `this`)
 * @param {Array<string>} fnNames - The prototype function names
 *     to bind to this context.
 */
export const bindTo = (context, fnNames) => {

  for (let i = fnNames.length; i--;) {
    const fn = context[fnNames[i]];
    context[fnNames[i]] = fn.bind(context);
  }

};
