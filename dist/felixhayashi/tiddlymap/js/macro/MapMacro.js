'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.params = exports.name = exports.run = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; // @preserve
/*\
title: $:/plugins/felixhayashi/tiddlymap/js/macro/tmap
type: application/javascript
module-type: macro

@preserve

\*/

/*** Imports *******************************************************/

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _ViewAbstraction = require('$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction');

var _ViewAbstraction2 = _interopRequireDefault(_ViewAbstraction);

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*** Code **********************************************************/

var name = 'tmap';
var params = getParamSlots(5);

/**
 * @this MacroCallWidget
 * @return {string} the result of the operation or an empty string.
 * @private
 */
function run() {

  this.substVarRefs = this.substituteVariableReferences;

  var fn = command[arguments[0]];
  var result = null;

  if (typeof fn === 'function') {
    var args = Array.prototype.slice.call(arguments, 1);
    result = fn.apply(this, args);
  }

  return typeof result === 'string' ? result : '';
}

/**
 * unfortunately tw forces us to specify params in advance so I
 * will reserve some argument slots here.
 * @private
 */
function getParamSlots(maxArgs) {

  var arr = [];
  for (var i = 0; i < maxArgs; i++) {
    arr.push({ name: 'arg' + i });
  }

  return arr;
}

/**
 * In connection with tiddlymap, this macro allows us to access
 * system information from within tiddlers as well as to execute
 * some util functions.
 *
 * Every command will be called with `this` pointing to the current
 * MacroCallWidget instance!
 *
 * @private
 */
var command = _utils2.default.makeHashMap();

/**
 * Returns the basename of the string
 *
 * @see {@link utils.basename}
 */
command.basename = function (separator) {

  var str = this.getVariable('currentTiddler');
  return _utils2.default.getBasename(str, separator);
};

/**
 * TW messes with svg urls so we always use base64 encoding when
 * a data uri is requested as macro call
 */
command.datauri = function (tiddler, type) {

  return _utils2.default.getDataUri(tiddler, type, true);
};

command.testJSON = function (fieldName) {

  var tObj = $tw.wiki.getTiddler(this.getVariable('currentTiddler'));

  try {
    JSON.parse(tObj.fields[fieldName]);
    return 'valid';
  } catch (SyntaxError) {
    return 'malformed';
  }
};

command.splitAndSelect = function (separator, index) {

  var str = this.getVariable('currentTiddler');
  var result = str.split(separator)[index];

  return result != null ? result : str;
};

command.concat = function () {

  var str = '';
  for (var i = 1, l = arguments.length; i < l; i++) {
    str += arguments[i];
  }
  return str;
};

command.uuid = function () {

  return _utils2.default.genUUID();
};

command.regRepl = function () {

  var oldStr = this.substVarRefs(arguments[0]);
  var regStr = arguments[1];
  var newStr = this.substVarRefs(arguments[2]);
  var regFlags = this.substVarRefs(arguments[4]);

  return oldStr.replace(new RegExp(regStr, regFlags), newStr);
};

command.halfOfString = function () {

  var str = this.substVarRefs(arguments[0]);

  if (!str) {
    return '';
  }

  return str.substr(0, Math.ceil(str.length / 2));
};

command.isETyVisible = function (view, userInput) {

  view = new _ViewAbstraction2.default(view);

  var id = command.getETyId.call(this, view, userInput);

  return '' + view.isEdgeTypeVisible(id);
};

command.getETyId = function (view, userInput) {

  view = new _ViewAbstraction2.default(view);

  var type = _EdgeType2.default.getInstance(userInput || this.getVariable('currentTiddler'));

  if (!type.namespace) {
    var _EdgeType$getIdParts = _EdgeType2.default.getIdParts(type.id),
        marker = _EdgeType$getIdParts.marker,
        _name = _EdgeType$getIdParts.name;

    var namespace = view.getConfig('edge_type_namespace');

    type = _EdgeType2.default.getInstance(_EdgeType2.default.getId(marker, namespace, _name));
  }

  return type.id;
};

command.scale = function () {

  var str = '';
  for (var i = 1, l = parseInt(arguments[0]); i < l; i++) {
    str += '[[' + i + ']]';
  }
  return str;
};

command.mergeFields = function () {

  var tObj = _utils2.default.getTiddler(arguments[0]);
  var prefix = arguments[1];
  var separator = arguments[2] || ' ';

  if (!tObj) return;

  var fields = _utils2.default.getPropertiesByPrefix(tObj.fields, prefix);
  var str = '';
  for (var name in fields) {

    if (typeof fields[name] === 'string') {

      str += fields[name] + separator;
    }
  }
  return str;
};

command.option = function (path, unit) {

  var prop = $tm;
  var propertyPath = path.split('.');

  for (var i = 0; i < propertyPath.length; i++) {
    if ((typeof prop === 'undefined' ? 'undefined' : _typeof(prop)) == 'object' && prop[propertyPath[i]]) {
      prop = prop[propertyPath[i]];
    }
  }

  // TODO: ugly, use regex
  if (unit && typeof prop === 'string' && _utils2.default.hasSubString(unit) && prop.lastIndexOf(unit) + unit.length === prop.length) {
    prop = prop + unit;
  }

  return prop;
};

/*** Exports *******************************************************/

exports.run = run;
exports.name = name;
exports.params = params;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/macro/MapMacro.js.map
