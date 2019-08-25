/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/utils/wiki
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import {
  EnvironmentError,
  InvalidArgumentException,
}                           from '$:/plugins/felixhayashi/tiddlymap/js/exception';
import * as basicUtils      from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/basic';

/**
 * Gets a tiddler reference from a tRef or tObj
 *
 * @param {Tiddler|string} tiddler - A tiddler reference or object.
 * @return {TiddlerReference|null} A tiddler reference (title)
 */
export const getTiddlerRef = tiddler => {

  if (tiddler instanceof $tw.Tiddler) {

    return tiddler.fields.title;

  } else if (typeof tiddler === 'string') {

    return tiddler;

  } else {

    throw new InvalidArgumentException(tiddler);

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
export const getTiddler = tiddler =>
  $tw.wiki.getTiddler(tiddler instanceof $tw.Tiddler ? tiddler.fields.title : tiddler);

/**
 * Get a tiddler's field value. If the field does not exist or
 * its value is an empty string, return the default or an empty
 * string.
 */
export const getField = (tiddler, field, defValue = '') => {

  const tObj = getTiddler(tiddler);
  return (!tObj ? defValue : tObj.fields[field] || defValue);

};

/**
 * Checks if tiddlers (including shadow tiddlers) exist.
 *
 * @param {Tiddler} tiddler
 * @return {boolean} True if the tiddler exists, false otherwise
 */
export const tiddlerExists = tiddler => {

  if (!tiddler) {
    return false;
  }

  const tRef = getTiddlerRef(tiddler);

  return Boolean(tRef && ($tw.wiki.tiddlerExists(tRef) || $tw.wiki.isShadowTiddler(tRef)));

};

export const setSidebarTab = tRef => {

  setText(getTiddlersByPrefix('$:/state/tab/sidebar-')[0], tRef);

};

/**
 * Set a tiddler field to a given value.
 *
 * Setting the title field to another value will clone the tiddler.
 * In this case, better use @link{clone} as this is
 * semantically stronger.
 *
 * This method is guarded against
 * https://github.com/Jermolene/TiddlyWiki5/issues/2025
 *
 * @return {$tw.Tiddler|undefined} The tiddler object containing
 *     the field with the assigned value.
 */
export const setField = (tiddler, field, value) => {

  if (!tiddler || !field) {
    return;
  }

  const tRef = getTiddlerRef(tiddler);
  const fields = {
    title: tRef,
    [field]: value
  };

  // do not use any tObj provided, it may result in a lost update!
  let tObj = $tw.wiki.getTiddler(tRef, true);

  if (field !== 'text' && tObj && !tObj.fields.text) {
    fields.text = '';
  }

  tObj = new $tw.Tiddler(tObj, fields);
  $tw.wiki.addTiddler(tObj);

  return tObj;

};

/**
 * Pendant to tw native {@code addTiddlers()}.
 *
 * Also removes tiddlers from the river.
 *
 * @param {TiddlerCollection} tiddlers - A collection of tiddlers
 * to be removed.
 */
export const deleteTiddlers = tiddlers => {

  const keys = Object.keys(tiddlers);
  const storyList = $tw.wiki.getTiddlerList('$:/StoryList');

  for (let i = keys.length; i--;) {
    let tRef = getTiddlerRef(tiddlers[keys[i]]);
    if (!$tw.wiki.tiddlerExists(tiddlers[keys[i]])) {
      // this check is important!
      // see https://github.com/Jermolene/TiddlyWiki5/issues/1919
      continue;
    }

    const index = storyList.indexOf(tRef);
    if (index !== -1) { // tiddler is displayed in river
      storyList.splice(index, 1);
      setField('$:/StoryList', 'list', storyList);
    }

    // finally delete the tiddler;


    $tw.wiki.deleteTiddler(tRef);

  }

};

export const moveFieldValues = (oldName, newName, isRemoveOldField, isIncludeSystemTiddlers, tiddlers) => {

  if (oldName === newName) return;

  const allTiddlers = tiddlers || $tw.wiki.allTitles();

  for (let i = allTiddlers.length; i--;) {

    const tObj = getTiddler(allTiddlers[i]);

    if (tObj.isDraft() || !tObj.fields[oldName]) {
      continue;
    }

    if (!isIncludeSystemTiddlers && $tw.wiki.isSystemTiddler(allTiddlers[i])) {
      continue;
    }

    const fields = {
      [newName]: tObj.fields[oldName]
    };

    if (isRemoveOldField) {
      fields[oldName] = undefined;
    }
    $tw.wiki.addTiddler(new $tw.Tiddler(tObj, fields));

  }

};

/**
 * This function returns all tiddlers that match the filter.
 *
 * @Todo: skip drafts! Or not?
 *
 * @param {TiddlyWikiFilter} filter - The filter to use.
 * @param {TiddlerCollection} [tiddlers] - A set of tiddlers used as
 *     source. If not defined, all tiddlers and system tiddlers are
 *     selected. Shadows are *not* included.
 * @return {Array.<TiddlerReference>}
 */
export const getMatches = (filter, tiddlers, widget) => {

  // use wiki as default source
  let source = undefined;

  // shortcuts for performance
  const wiki = $tw.wiki;

  if (typeof filter === 'string') {
    filter = wiki.compileFilter(filter);
  }

  // if a source is provided, create an iterator callback
  if (tiddlers != null && typeof tiddlers === 'object') {

    if (!Array.isArray(tiddlers)) {
      tiddlers = Object.keys(tiddlers);
    }

    source = callback => {
      for (let i = tiddlers.length; i--;) {
        const tObj = wiki.getTiddler(tiddlers[i]);
        callback(tObj, tiddlers[i]);
      }
    };

  }

  return filter.call(wiki, source, widget);

};

/**
 * Tries to match a single tiddler object against a filter.
 * Returns a boolean value.
 *
 * @param {Tiddler} tiddler - The object to apply the filter to.
 * @param {TiddlyWikiFilter} filter - The filter to use.
 * @return {boolean} True if the tiddler matches the filter, false otherwise.
 */
export const isMatch = (tiddler, filter) =>
  getTiddlerRef(tiddler) === getMatches(filter, [ getTiddlerRef(tiddler) ])[0];


/**
 *
 * @param {Tiddler} tiddler
 * @param {boolean} isBlock
 */
export const getTranscludeNode = (tiddler, isBlock) =>
  ({
    type: 'transclude',
    attributes: {
      tiddler: {
        type: 'string',
        value: getTiddlerRef(tiddler) }},
    children: [],
    isBlock: !!isBlock
  });

/**
 *
 * @param {Tiddler} tiddler
 */
export const getTiddlerNode = tiddler =>
  ({
    type: 'tiddler',
    attributes: {
      tiddler: {
        type: 'string', value: getTiddlerRef(tiddler) }},
    children: []
  });

/**
 *
 * @param type
 * @param className
 * @param text
 */
export const getElementNode = (type, className, text) =>
  ({
    type: 'element',
    tag: type,
    attributes: {
      class: {
        type: 'string',
        value: className }},
    children: text ? [ {type: 'text', text: text } ] : []
  });

/**
 *
 * @param {Widget} widget
 * @param {string} name
 * @param {Tiddler} tiddler
 * @return {*}
 */
export const registerTransclude = (widget, name, tiddler) => {

  // if an instance exists, remove it
  basicUtils.removeArrayElement(widget.children, widget[name]);

  widget[name] = widget.makeChildWidget(getTranscludeNode(tiddler, true));
  widget.children.push(widget[name]);

  return widget[name];

};

/**
 * This function uses the tw-notification mechanism to display a
 * temporary message.
 *
 * @see https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/dom/notifier.js
 * @param {string} message - A short message to display.
 */
export const notify = message => {

  // @todo add to environment
  const notifyTiddlerRef = '$:/temp/tiddlymap/notify';

  $tw.wiki.addTiddler(new $tw.Tiddler({
    title : notifyTiddlerRef,
    text : message
  }));

  $tw.notifier.display(notifyTiddlerRef);

};

/**
 * The function allows to detect whether a widget is displayed
 * in preview or not.
 */
export const isPreviewed = widget => {
  if (!widget) {
    return false;
  }

  // TODO: in the wiki utils we should not know about TiddlyMap domNode property!
  if (widget.domNode.isTiddlyWikiFakeDom) {
    return true;
  }

  if (widget.getVariable('tv-tiddler-preview')) {
    return true;
  } else { // fallback for < v5.1.9
    const cls = 'tc-tiddler-preview-preview';
    // TODO: in the wiki utils we should not know about TiddlyMap domNode property!
    return !!basicUtils.getAncestorWithClass(widget.parentDomNode, cls);
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
export const parseFieldData = (tiddler, field = 'text', data) => {

  const tObj = getTiddler(tiddler);

  if (!tObj) {
    return data;
  }

  return basicUtils.parseJSON(tObj.fields[field], data);

};

/**
 * Serialize json data and store it in a tiddler's field.
 *
 * @param {Tiddler} tiddler - The tiddler to store the json in.
 * @param {string} field - The field that will store the json.
 * @param {Object} data - The json data.
 * @param {int} [indent = 0] - the indentation
 */
export const writeFieldData = (tiddler, field, data, indent) => {

  if (typeof data !== 'object') {
    return;
  }

  indent = parseInt(indent);
  indent = (indent > 0 && field === 'text' ? indent : 0);

  setField(tiddler, field, JSON.stringify(data, null, indent));

};

/**
 * Clone a tiddler and give it another title.
 * This means the tiddlers are equal except from their titles.
 */
export const clone = (src, dest) => {

  setField(src, 'title', dest);

};

/**
 * Set the value of a data tiddler entry (index) to a given value
 */
export const setEntry = (tiddler, prop, value) => {

  $tw.wiki.setText(getTiddlerRef(tiddler), null, prop, value);

};

/**
 * Get the value of a data tiddler entry (index)
 */
export const getEntry = (tiddler, prop, defValue) => {

  const data = $tw.wiki.getTiddlerData(getTiddlerRef(tiddler), {});
  return (data[prop] == null ? defValue : data[prop]);

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
 * Compare versions.
 * @return {boolean} Unlike `$tw.utils.checkVersions`, this function
 * only returns true if the left argument is greater than the right
 * argument.
 */
export const isLeftVersionGreater = (v1, v2) => v1 !== v2 && $tw.utils.checkVersions(v1, v2);

/**
 *
 * @param tiddler
 * @param defValue
 */
export const getText = (tiddler, defValue) => getField(tiddler, 'text', defValue);

/**
 *
 * @param tiddler
 * @param value
 */
export const setText = (tiddler, value) => {

  setField(tiddler, 'text', value);

};

/**
 * Checks whether a tiddler is a draft or not.
 *
 * @param {Tiddler} tiddler - The tiddler to check on.
 */
export const isDraft = tiddler => {

  const tObj = getTiddler(tiddler);
  return (tObj && tObj.isDraft());

};


/**
 * Get a tiddler's text or otherwise return a default text.
 */
export const isSystemOrDraft = tiddler =>
  $tw.wiki.isSystemTiddler(getTiddlerRef(tiddler)) || isDraft(tiddler);

/**
 * Function to merge an array of tiddlers into a single tiddler.
 *
 * @param {Array<TiddlerReference|Tiddler>} tiddlers - The
 *     tiddlers to merge.
 * @param {string} [title=null] - The title where the result is
 *     written to. If not specified, the first array item is used
 *     as output title.
 */
export const getMergedTiddlers = (tiddlers, title) => {

  if (!Array.isArray(tiddlers)) {
    return;
  }

  // turn all array elements into tiddler objects
  for (let i = tiddlers.length; i--;) {
    tiddlers[i] = getTiddler(tiddlers[i]);
  }

  if (!tiddlers.length) {
    return;
  }

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
export const getChildWidgetByProperty = (widget, prop, val) => {

  const children = widget.children;
  for (let i = children.length; i--;) {
    let child = children[i];
    if (child[prop] === val) {
      return child;
    } else {
      child = getChildWidgetByProperty(child, prop, val);
      if (child) {
        return child;
      }
    }
  }

};

/**
 * Register listeners to widget using a hashmap.
 *
 * @param {Hashmap<Key, Function>} listeners - The listeners to attach.
 * @param {Widget} widget - the widget to attach the listeners to.
 * @param {Object} context - The context to bind the listeners to.
 */
export const addTWlisteners = (listeners, widget, context) => {

  for (let id in listeners) {
    widget.addEventListener(id, listeners[id].bind(context));
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
export const mv = (oldPrefix, newPrefix, isForce, isDelete) => {

  if (oldPrefix === newPrefix || !oldPrefix || !newPrefix) {
    return;
  }

  isForce = (typeof isForce === 'boolean' ? isForce : false);
  isDelete = (typeof isDelete === 'boolean' ? isDelete : true);

  // prepare
  const targets = getTiddlersByPrefix(oldPrefix);
  const fromToMapper = basicUtils.makeHashMap();

  for (let i = targets.length; i--;) {

    const oldTRef = targets[i];
    const newTRef = oldTRef.replace(oldPrefix, newPrefix);
    if ($tw.wiki.tiddlerExists(newTRef) && !isForce) {
      return; // undefined
    }
    fromToMapper[oldTRef] = newTRef;

  }

  for (let oldTRef in fromToMapper) {

    setField(oldTRef, 'title', fromToMapper[oldTRef]);
    if (isDelete) {
      $tw.wiki.deleteTiddler(oldTRef);
    }
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
export const cp = (oldPrefix, newPrefix, isForce) =>
  mv(oldPrefix, newPrefix, isForce, false);

/**
 * Delete all tiddlers with a given prefix.
 *
 * @param {string} prefix - The prefix
 */
export const deleteByPrefix = (prefix, tiddlers) => {

  if (!prefix) {
    return;
  }

  tiddlers = tiddlers || $tw.wiki.allTitles();

  const deletedTiddlers = [];
  for (let i = tiddlers.length; i--;) {
    if (basicUtils.startsWith(tiddlers[i], prefix)) {
      $tw.wiki.deleteTiddler(tiddlers[i]);
      deletedTiddlers.push(deletedTiddlers[i]);
    }
  }

  return deletedTiddlers;

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
export const getTiddlersWithField = (fieldName, value, options = {}) => {

  const tiddlers = options.tiddlers || $tw.wiki.allTitles();
  const isIncludeDrafts = (options.isIncludeDrafts === true);
  const result = basicUtils.makeHashMap();
  const keys = Object.keys(tiddlers);
  const hasOwnProp = $tw.utils.hop;
  let limit = options.limit || 0;

  for (let i = keys.length; i--;) {

    const tObj = getTiddler(tiddlers[keys[i]]);
    const fields = tObj.fields;
    if (hasOwnProp(fields, fieldName) && (!hasOwnProp(fields, 'draft.of') || isIncludeDrafts)) {
      if (!value || fields[fieldName] === value ) {
        result[fields.title] = tObj;
        if (--limit === 0) {
          break;
        }
      }
    }

  }

  return result;

};

/**
 *
 * @param name
 * @param value
 */
export const getTiddlerWithField = (name, value) =>
  Object.keys(getTiddlersWithField(name, value, { limit: 1 }))[0];

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
export const getTiddlersByPrefix = (prefix, options = {}) => {

  const removePrefix = (options.removePrefix === true);
  const result = [];
  const iterator = $tw.wiki[options.iterator || 'each'];

  iterator((tObj, tRef) => {
    if (basicUtils.startsWith(tRef, prefix)) {
      result.push(removePrefix ? basicUtils.getWithoutPrefix(tRef, prefix) : tRef);
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
export const addTiddler = (tiddler, isForce) => {

  let tObj = getTiddler(tiddler);

  if (!isForce && tObj) {
    return tObj;
  }

  tObj = new $tw.Tiddler(
    {
      title: tiddler,
      text: ''
    },
    $tw.wiki.getModificationFields(),
    $tw.wiki.getCreationFields()
  );

  $tw.wiki.addTiddler(tObj);

  return tObj;

};

export const touch = tiddler => {
  if (!tiddler) {
    return;
  }

  const tObj = new $tw.Tiddler(
    getTiddler(tiddler),
    $tw.wiki.getModificationFields()
  );

  $tw.wiki.addTiddler(tObj);
};
