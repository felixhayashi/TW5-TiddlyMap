'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSnapshotTitle = exports.getArrayValuesAsHashmapKeys = exports.getLookupTable = exports.keyOfItemWithProperty = exports.keysOfItemsWithProperty = exports.getDublicates = exports.getId = exports.refreshDataSet = exports.drawRaster = exports.getPrettyFilter = exports.groupByProperty = exports.isEdgeTypeMatch = exports.getEdgeTypeMatches = exports.getDataUri = exports.convert = exports.getValues = exports.getIterableCollection = exports.getLabel = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/utils/tmap
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

var _vis = require('$:/plugins/felixhayashi/vis/vis.js');

var _vis2 = _interopRequireDefault(_vis);

var _exception = require('$:/plugins/felixhayashi/tiddlymap/js/exception');

var _basic = require('$:/plugins/felixhayashi/tiddlymap/js/lib/utils/basic');

var basicUtils = _interopRequireWildcard(_basic);

var _wiki = require('$:/plugins/felixhayashi/tiddlymap/js/lib/utils/wiki');

var wikiUtils = _interopRequireWildcard(_wiki);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {Tiddler} tiddler
 * @param {string} aliasField - A tiddler field that contains an
 *     alternative title (e.g. "caption").
 * @return {string|undefined} If the `aliasField` exists and is not
 *     empty, the value of the `aliasField` otherwise the tiddler's
 *     title or undefined if the tiddler doesn't exist.
 */
var getLabel = exports.getLabel = function getLabel(tiddler, aliasField) {
  var tObj = wikiUtils.getTiddler(tiddler);
  return tObj && tObj.fields[aliasField] ? tObj.fields[aliasField] : tObj.fields.title;
};

/**
 * This function will return a collection object whose data can be
 * via `Object.keys(col)` in a loop.
 *
 * @param {Collection} col - A collection
 * @return {Hashmap} The iterable object.
 */
var getIterableCollection = exports.getIterableCollection = function getIterableCollection(col) {
  return col instanceof _vis2.default.DataSet ? col.get() : col;
};

/**
 * Extract all the values from a collection. If `col` is an object,
 * only properties are considered that are its own and iterable.
 *
 * @param {Collection} col
 * @return {Array} An array
 */
var getValues = exports.getValues = function getValues(col) {

  if (Array.isArray(col)) {

    return col; // bounce back.
  } else if (col instanceof _vis2.default.DataSet) {
    // a dataset

    return col.get({ returnType: 'Array' });
  }

  var result = [];
  var keys = Object.keys(col);
  for (var i = keys.length; i--;) {
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
var convert = exports.convert = function convert(col, outputType) {

  if ((typeof col === 'undefined' ? 'undefined' : _typeof(col)) !== 'object') {
    throw new _exception.InvalidArgumentException(col, outputType);
  }

  if (outputType === 'object') {
    outputType = 'hashmap';
  }

  var mapper = {
    array: function array(col) {
      return getValues(col);
    },
    hashmap: function hashmap(col) {
      return col instanceof _vis2.default.DataSet ? col.get({ returnType: 'Object' }) : col;
    },
    dataset: function dataset(col) {
      return col instanceof _vis2.default.DataSet ? col : !Array.isArray(col) ? getValues(col) : new _vis2.default.DataSet(col);
    }
  };

  return mapper[outputType](col);
};

/**
 * @param {Tiddler} tiddler
 * @param {string} [type]
 * @param {boolean} [isForceBase64]
 * @return {string}
 */
var getDataUri = exports.getDataUri = function getDataUri(tiddler, type, isForceBase64) {

  var imgTObj = wikiUtils.getTiddler(tiddler);
  type = type || imgTObj.fields.type || 'image/svg+xml';
  var body = imgTObj.fields.text;
  var encoding = $tw.config.contentTypeInfo[type].encoding;

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

  return 'data:' + type + ';' + encoding + ',' + body;
};

// @todo move this to environment
var eTyFiltAutoPrefix = '[all[]] ';

/**
 *
 * @param filter
 * @param titles
 * @return {*}
 */
var getEdgeTypeMatches = exports.getEdgeTypeMatches = function getEdgeTypeMatches() {
  var filter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var titles = arguments[1];


  if (!titles) {
    titles = wikiUtils.getTiddlersByPrefix($tm.path.edgeTypes + '/', {
      iterator: 'eachTiddlerPlusShadows',
      removePrefix: true
    });
  }

  if (titles != null && !Array.isArray(titles)) {
    titles = Object.keys(titles);
  }

  return wikiUtils.getMatches(eTyFiltAutoPrefix + filter, titles);
};

var isEdgeTypeMatch = exports.isEdgeTypeMatch = function isEdgeTypeMatch(title) {
  var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  return wikiUtils.isMatch(title, eTyFiltAutoPrefix + filter);
};

/**
 *
 */
var groupByProperty = exports.groupByProperty = function groupByProperty(col, prop) {

  col = getIterableCollection(col);

  var result = basicUtils.makeHashMap();
  var keys = Object.keys(col);

  for (var i in keys) {

    var item = col[keys[i]];
    var val = item[prop];

    if (val == null) {
      // null or undefined

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
var getPrettyFilter = exports.getPrettyFilter = function getPrettyFilter(expr) {

  // remove outer spaces and separate operands
  expr = expr.trim().replace('][', '] [');

  // regex to identify operands
  var re = /[+-]?\[.+?[\]\}\>]\]/g;

  // get operands
  var operands = expr.match(re);

  // replace operands with dummies and trim again to avoid trailing spaces
  expr = expr.replace(re, ' [] ').trim();

  // turn it into an array
  var stringsPlusDummies = expr.split(/\s+/);

  var operandIndex = 0;
  var parts = [];
  for (var i = 0, l = stringsPlusDummies.length; i < l; i++) {
    parts[i] = stringsPlusDummies[i] === '[]' ? operands[operandIndex++] : stringsPlusDummies[i];
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
var drawRaster = exports.drawRaster = function drawRaster(ctx, scaleFactor, viewCenter, rasterSize) {
  var color = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '#D9D9D9';

  // from now on the most central raster point
  var _basicUtils$getNeares = basicUtils.getNearestRasterPosition(viewCenter, rasterSize),
      centerX = _basicUtils$getNeares.x,
      centerY = _basicUtils$getNeares.y;

  var scaledWidth = ctx.canvas.width / scaleFactor;
  var scaledHeight = ctx.canvas.height / scaleFactor;

  // some extra lines to ensure the canvas is completely filled with lines
  var extraLines = rasterSize * 2;

  // calculate the space that is required to draw the rasters
  var hSpace = Math.ceil(scaledWidth / rasterSize / 2) * rasterSize + extraLines;
  var vSpace = Math.ceil(scaledHeight / rasterSize / 2) * rasterSize + extraLines;

  // align the space to the center points and calculate the offsets
  var left = centerX - hSpace;
  var right = centerX + hSpace;
  var top = centerY - vSpace;
  var bottom = centerY + vSpace;

  ctx.beginPath();

  // draw vertical lines
  for (var x = left; x < right; x += rasterSize) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }

  // draw horizontal lines
  for (var y = top; y <= bottom; y += rasterSize) {
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
var refreshDataSet = exports.refreshDataSet = function refreshDataSet(ds, ltNew) {

  var ltOld = ds.get({ returnType: 'Object' });

  var inserted = [];
  var updated = [];
  var withoutPosition = [];
  var removed = [];

  for (var id in ltNew) {

    if (ltOld[id]) {
      // element already exists in graph

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

  for (var _id in ltOld) {
    if (!ltNew[_id]) {
      removed.push(_id);
      ds.remove(_id);
    }
  }

  return {
    withoutPosition: withoutPosition,
    inserted: inserted,
    updated: updated,
    removed: removed
  };
};

/**
 * Returns the tmap id that is stored in a designated field in the tiddler.
 *
 * @param tiddler
 * @return {string} the tmap id of this tiddler
 */
var getId = exports.getId = function getId(tiddler) {
  return wikiUtils.getTiddler(tiddler).fields['tmap.id'];
};

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
var getDublicates = exports.getDublicates = function getDublicates(tiddler) {

  var id = getId(tiddler);

  if (!id) {

    return [];
  }

  var tiddlers = wikiUtils.getTiddlersWithField('tmap.id', id, { limit: 2 });
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
var keysOfItemsWithProperty = exports.keysOfItemsWithProperty = function keysOfItemsWithProperty(col, key, val, limit) {

  col = getIterableCollection(col);

  var keys = Object.keys(col);
  var result = [];

  limit = typeof limit === 'number' ? limit : keys.length;

  for (var i = 0, l = keys.length; i < l; i++) {
    var index = keys[i];
    if (_typeof(col[index]) === 'object' && col[index][key]) {
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
var keyOfItemWithProperty = exports.keyOfItemWithProperty = function keyOfItemWithProperty(col, key, val) {
  return keysOfItemsWithProperty(col, key, val, 1)[0];
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
var getLookupTable = exports.getLookupTable = function getLookupTable(col, lookupKey) {

  col = getIterableCollection(col);

  var lookupTable = basicUtils.makeHashMap();
  var keys = Object.keys(col);

  for (var i = 0, l = keys.length; i < l; i++) {

    var key = keys[i];
    var idx = lookupKey ? col[key][lookupKey] : col[key];
    var type = typeof idx === 'undefined' ? 'undefined' : _typeof(idx);

    if (type === 'string' && idx !== '' || type === 'number') {
      if (!lookupTable[idx]) {
        // doesn't exist yet!
        lookupTable[idx] = lookupKey ? col[key] : true;
        continue;
      }
    }

    // @todo use exception class
    throw new Error('Cannot use "' + idx + '" as lookup table index');
  }

  return lookupTable;
};

/**
 * Alias for {@link getLookupTable}
 */
var getArrayValuesAsHashmapKeys = exports.getArrayValuesAsHashmapKeys = getLookupTable;

/**
 *
 * @param viewLabel
 * @param type
 */
var getSnapshotTitle = exports.getSnapshotTitle = function getSnapshotTitle(viewLabel, type) {
  return 'Snapshot \u2013 ' + viewLabel + ' (' + new Date().toDateString() + ').' + (type || 'png');
};
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/lib/utils/tmap.js.map
