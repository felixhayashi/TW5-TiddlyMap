/* @preserve TW-Guard */
/*\
title: $:/plugins/felixhayashi/tiddlymap/js/macro/tmap
type: application/javascript
module-type: macro

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import EdgeType        from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import ViewAbstraction from '$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction';
import utils           from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

const name = 'tmap';
const params = getParamSlots(5);

/**
 * @this MacroCallWidget
 * @return {string} the result of the operation or an empty string.
 * @private
 */
function run() {

  this.substVarRefs = this.substituteVariableReferences;

  const fn = command[arguments[0]];
  let result = null;

  if (typeof fn === 'function') {
    const args = Array.prototype.slice.call(arguments,1);
    result = fn.apply(this, args);
  }

  return (typeof result === 'string' ? result : '');

}

/**
 * unfortunately tw forces us to specify params in advance so I
 * will reserve some argument slots here.
 * @private
 */
function getParamSlots(maxArgs) {

  const arr = [];
  for (let i = 0; i < maxArgs; i++) {
    arr.push({ name : ('arg' + i) });
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
var command = utils.makeHashMap();

/**
 * Returns the basename of the string
 *
 * @see {@link utils.basename}
 */
command.basename = function(separator) {

  var str = this.getVariable('currentTiddler');
  return utils.getBasename(str, separator);

};

/**
 * TW messes with svg urls so we always use base64 encoding when
 * a data uri is requested as macro call
 */
command.datauri = function(tiddler, type) {

  return utils.getDataUri(tiddler, type, true);

};

command.testJSON = function(fieldName) {

  var tObj = $tw.wiki.getTiddler(this.getVariable('currentTiddler'));

  try {
    JSON.parse(tObj.fields[fieldName]);
    return 'valid';
  } catch (SyntaxError) {
    return 'malformed';
  }

};

command.splitAndSelect = function(separator, index) {

  var str = this.getVariable('currentTiddler');
  var result = str.split(separator)[index];

  return (result != null ? result : str);

};

command.concat = function() {

  var str = '';
  for (var i = 1, l = arguments.length; i < l; i++) {
    str += arguments[i];
  }
  return str;

};

command.uuid = function() {

  return utils.genUUID();

};

command.regRepl = function() {

  var oldStr = this.substVarRefs(arguments[0]);
  var regStr = arguments[1];
  var newStr = this.substVarRefs(arguments[2]);
  var regFlags = this.substVarRefs(arguments[4]);

  return oldStr.replace(new RegExp(regStr, regFlags), newStr);

};

command.halfOfString = function() {

  var str = this.substVarRefs(arguments[0]);

  if (!str) {
    return '';
  }

  return str.substr(0, Math.ceil(str.length / 2));

};

command.isETyVisible = function(view, userInput) {

  view = new ViewAbstraction(view);

  const id = command.getETyId.call(this, view, userInput);

  return '' + view.isEdgeTypeVisible(id);

};

command.getETyId = function(view, userInput) {

  view = new ViewAbstraction(view);

  let type = EdgeType.getInstance(userInput || this.getVariable('currentTiddler'));

  if (!type.namespace) {

    const { marker, name } = EdgeType.getIdParts(type.id);
    const namespace = view.getConfig('edge_type_namespace');

    type = EdgeType.getInstance(EdgeType.getId(marker, namespace, name));

  }

  return type.id;

};

command.scale = function() {

  var str = '';
  for (var i = 1, l = parseInt(arguments[0]); i < l; i++) {
    str += '[[' + i + ']]';
  }
  return str;

};

command.mergeFields = function() {

  var tObj = utils.getTiddler(arguments[0]);
  var prefix = arguments[1];
  var separator = arguments[2] || ' ';

  if (!tObj) return;

  var fields = utils.getPropertiesByPrefix(tObj.fields, prefix);
  var str = '';
  for (var name in fields) {

    if (typeof fields[name] === 'string') {

      str += fields[name] + separator;
    }
  }
  return str;

};

command.option = function(path, unit) {

  if (typeof $tm == "undefined") {
    // this macro is referenced from css which means we cannot
    // expect $tm to exist, e.g when rendering static css
    // @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/257#issuecomment-427343226
    return '';
  }

  var prop = $tm;
  var propertyPath = path.split('.');

  for (var i = 0; i < propertyPath.length; i++) {
    if (typeof prop == 'object' && prop[propertyPath[i]]) {
      prop = prop[propertyPath[i]];
    }
  }

  // TODO: ugly, use regex
  if (unit && typeof prop === 'string'
     && utils.hasSubString(unit)
     && (prop.lastIndexOf(unit) + unit.length) === prop.length) {
    prop = prop + unit;
  }

  return prop;

};

/*** Exports *******************************************************/

export { run, name, params };
