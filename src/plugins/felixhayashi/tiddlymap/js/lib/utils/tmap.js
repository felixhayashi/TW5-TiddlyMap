/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/utils/tmap
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import vis                  from '$:/plugins/felixhayashi/vis/vis.js';
import {
  EnvironmentError,
  InvalidArgumentException,
}                           from '$:/plugins/felixhayashi/tiddlymap/js/exception';
import * as basicUtils      from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/basic';
import * as wikiUtils       from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/wiki';

/**
 * TODO: this method does not seem to be used!
 * @param {Tiddler} tiddler
 * @param {string} aliasField - A tiddler field that contains an
 *     alternative title (e.g. "caption").
 * @return {string|undefined} If the `aliasField` exists and is not
 *     empty, the value of the `aliasField` otherwise the tiddler's
 *     title or undefined if the tiddler doesn't exist.
 */
export const getLabel = (tiddler, aliasField) => {
  const tObj = wikiUtils.getTiddler(tiddler);
  return (
    tObj &&
    tObj.fields[aliasField]
      ? tObj.fields[aliasField]
      : tObj.fields.title
  ).replace('\\n', '\n');
};

/**
 * This function will return a collection object whose data can be
 * via `Object.keys(col)` in a loop.
 *
 * @param {Collection} col - A collection
 * @return {Hashmap} The iterable object.
 */
export const getIterableCollection = col => col instanceof vis.DataSet ? col.get() : col;

/**
 * Extract all the values from a collection. If `col` is an object,
 * only properties are considered that are its own and iterable.
 *
 * @param {Collection} col
 * @return {Array} An array
 */
export const getValues = col => {

  if (Array.isArray(col)) {

    return col; // bounce back.

  } else if (col instanceof vis.DataSet) { // a dataset

    return col.get({ returnType: 'Array' });

  }

  const result = [];
  const keys = Object.keys(col);
  for (let i = keys.length; i--;) {
    result.push(col[keys[i]]);
  }

  return result;

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
export const convert = (col, outputType) => {

  if (typeof col !== 'object') {
    throw new InvalidArgumentException(col, outputType);
  }

  if (outputType === 'object') {
    outputType = 'hashmap';
  }

  const mapper = {
    array: col => getValues(col),
    hashmap: col =>
      col instanceof vis.DataSet ? col.get({ returnType: 'Object' }) : col,
    dataset: col =>
      col instanceof vis.DataSet ? col : (!Array.isArray(col) ? getValues(col) : new vis.DataSet(col))
  };

  return mapper[outputType](col);

};

/**
 * @param {Tiddler} tiddler
 * @param {string} [type]
 * @param {boolean} [isForceBase64]
 * @return {string}
 */
export const getDataUri = (tiddler, type, isForceBase64) => {

  const imgTObj = wikiUtils.getTiddler(tiddler);
  type = type || imgTObj.fields.type || 'image/svg+xml';
  let body = imgTObj.fields.text;
  let encoding = $tw.config.contentTypeInfo[type].encoding;

  if (type === 'image/svg+xml') {

    // see http://stackoverflow.com/questions/10768451/inline-svg-in-css
    body = body.replace(/\r?\n|\r/g, ' ');

    if (!basicUtils.hasSubString('xmlns', body)) {
      // @tiddlywiki it is bad to remove the xmlns attribute!

      body = body.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

  }

  if (isForceBase64 && encoding !== 'base64') {
    encoding = 'base64';
    body = basicUtils.base64(body);
  }

  return `data:${type};${encoding},${body}`;

};

// @todo move this to environment
const eTyFiltAutoPrefix = '[all[]] ';

/**
 *
 * @param filter
 * @param titles
 * @return {*}
 */
export const getEdgeTypeMatches = (filter = '', titles) => {

  if (!titles) {
    titles = wikiUtils.getTiddlersByPrefix(`${$tm.path.edgeTypes}/`, {
      iterator: 'eachTiddlerPlusShadows',
      removePrefix: true
    });
  }

  if (titles != null && !Array.isArray(titles)) {
    titles = Object.keys(titles);
  }

  return wikiUtils.getMatches(eTyFiltAutoPrefix + filter, titles);

};

export const isEdgeTypeMatch = (title, filter = '') =>
  wikiUtils.isMatch(title, eTyFiltAutoPrefix + filter);

/**
 *
 */
export const groupByProperty = (col, prop) => {

  col = getIterableCollection(col);

  const result = basicUtils.makeHashMap();
  const keys = Object.keys(col);

  for (let i in keys) {

    const item = col[keys[i]];
    const val = item[prop];

    if (val == null) { // null or undefined

      // @todo use exception class
      throw 'Cannot group by property ' + prop;

    } else {

      if (!Array.isArray(result[val])) {
        result[val] = [];
      }
      result[val].push(item);

    }
  }

  return result;

};

/**
 * Turns the filter expression in a nicely formatted (but unusable)
 * text, making it easier to edit long filter expressions.
 *
 * @param {string} expr - A valid filter expression.
 * @result {string} A formatted (unusable) filter expression.
 */
export const getPrettyFilter = expr => {

  // remove outer spaces and separate operands
  expr = expr.trim().replace('][', '] [');

  // regex to identify operands
  const re = /[+-]?\[.+?[\]\}\>]\]/g;

  // get operands
  const operands = expr.match(re);

  // replace operands with dummies and trim again to avoid trailing spaces
  expr = expr.replace(re, ' [] ').trim();

  // turn it into an array
  const stringsPlusDummies = expr.split(/\s+/);

  let operandIndex = 0;
  const parts = [];
  for (let i = 0, l = stringsPlusDummies.length; i < l; i++) {
    parts[i] = (stringsPlusDummies[i] === '[]' ? operands[operandIndex++] : stringsPlusDummies[i]);
  }

  return parts.join('\n');

};

/**
 * This function will draw a raster on the network canvas that will
 * adjust to the network's current scaling factor and viewport offset.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas's context passed by vis.
 * @param {number} scaleFactor - The current scale factor of the network.
 * @param {Object} viewCenter - Virtual center point of the view.
 * @param {number} rasterSize - The size of the squares that are drawn.
 * @param {string} color - A string parsed as CSS color value.
 */
export const drawRaster = (ctx, scaleFactor, viewCenter, rasterSize, color = '#D9D9D9') => {

  // from now on the most central raster point
  const { x: centerX, y: centerY } = basicUtils.getNearestRasterPosition(viewCenter, rasterSize);

  const scaledWidth = ctx.canvas.width / scaleFactor;
  const scaledHeight = ctx.canvas.height / scaleFactor;

  // some extra lines to ensure the canvas is completely filled with lines
  const extraLines = rasterSize * 2;

  // calculate the space that is required to draw the rasters
  const hSpace = Math.ceil((scaledWidth / rasterSize) / 2) * rasterSize + extraLines;
  const vSpace = Math.ceil((scaledHeight / rasterSize) / 2) * rasterSize + extraLines;

  // align the space to the center points and calculate the offsets
  const left = centerX - hSpace;
  const right = centerX + hSpace;
  const top = centerY - vSpace ;
  const bottom = centerY + vSpace;

  ctx.beginPath();

  // draw vertical lines
  for (let x = left; x < right; x += rasterSize) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }

  // draw horizontal lines
  for (let y = top; y <= bottom; y += rasterSize) {
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.stroke();

};

/**
 * Updates a dataset.
 *
 * Note: never use the dataset's update() method, it does not properly remove
 * obsolete properties! – use remove and add instead.
 *
 * @param {vis.DataSet} [ds] - The dataset to be updated
 * @param {Hashmap<id, Node>} ltNew - Lookup table that contains the *new* set of nodes.
 */
export const refreshDataSet = (ds, ltNew) => {

  const ltOld = ds.get({ returnType: 'Object' });

  const inserted = [];
  const updated = [];
  const withoutPosition = [];
  const removed = [];

  for (let id in ltNew) {

    if (ltOld[id]) { // element already exists in graph

      if (basicUtils.isEqual(ltOld[id], ltNew[id])) {
        // simply keep element
        continue;
      }

      updated.push(id);
      ds.remove(id);

    } else {

      inserted.push(id);

    }

    if (ltNew[id].x === undefined) {
      withoutPosition.push(id);
    }

    ds.add(ltNew[id]);
  }

  for (let id in ltOld) {
    if (!ltNew[id]) {
      removed.push(id);
      ds.remove(id);
    }
  }

  return {
    withoutPosition,
    inserted,
    updated,
    removed,
  };

};

/**
 * Returns the tmap id that is stored in a designated field in the tiddler.
 *
 * @param tiddler
 * @return {string} the tmap id of this tiddler
 */
export const getId = tiddler => wikiUtils.getTiddler(tiddler).fields['tmap.id'];

/**
 * Returns all other tiddlers that have the same tmap.id field entry.
 *
 * Note: typically tiddlers don't have the same id assigned, however,
 * this can happen when tiddlers are imported or cloned.
 *
 * @param {Tiddler} tiddler
 * @return {array<TiddlerReference>} a list of tiddlers with the same id as the
 *    provided tiddler (excluding the provided tiddler itself).
 */
export const getDublicates = tiddler => {

  const id = getId(tiddler);

  if (!id) {

    return [];

  }

  const tiddlers = wikiUtils.getTiddlersWithField('tmap.id', id, {limit: 2});
  delete tiddlers[wikiUtils.getTiddlerRef(tiddler)];

  return Object.keys(tiddlers);

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
export const keysOfItemsWithProperty = (col, key, val, limit) => {

  col = getIterableCollection(col);

  const keys = Object.keys(col);
  const result = [];

  limit = (typeof limit === 'number' ? limit : keys.length);

  for (let i = 0, l = keys.length; i < l; i++) {
    const index = keys[i];
    if (typeof col[index] === 'object' && col[index][key]) {
      if (!val || col[index][key] === val) {
        result.push(index);
        if (result.length === limit) {
          break;
        }
      }
    }
  }

  return result;

};

/**
 *
 * @param col
 * @param key
 * @param val
 * @return {*}
 */
export const keyOfItemWithProperty = (col, key, val) =>
  keysOfItemsWithProperty(col, key, val, 1)[0];

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
export const getLookupTable = (col, lookupKey) => {

  col = getIterableCollection(col);

  const lookupTable = basicUtils.makeHashMap();
  const keys = Object.keys(col);

  for (let i = 0, l = keys.length; i < l; i++) {

    const key = keys[i];
    const idx = (lookupKey ? col[key][lookupKey] : col[key]);
    const type = typeof idx;

    if ((type === 'string' && idx !== '') || type === 'number') {
      if (!lookupTable[idx]) { // doesn't exist yet!
        lookupTable[idx] = (lookupKey ? col[key] : true);
        continue;
      }
    }

    // only throw if lookupKey is set to avoid crash if duplicates exist in col
    // Solves: https://github.com/felixhayashi/TW5-TiddlyMap/issues/327
    if (lookupKey) {
      // @todo use exception class
      throw new Error(`Cannot use "${idx}" as lookup table index`);
    }

  }

  return lookupTable;

};

/**
 * Alias for {@link getLookupTable}
 */
export const getArrayValuesAsHashmapKeys = getLookupTable;

/**
 *
 * @param viewLabel
 * @param type
 */
export const getSnapshotTitle = (viewLabel, type) =>
  `Snapshot – ${viewLabel} (${new Date().toDateString()}).${type || 'png'}`;
