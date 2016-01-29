/*\
title: $:/plugins/felixhayashi/tiddlymap/js/macro/tmap
type: application/javascript
module-type: macro

@preserve

\*/

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*** Exports *******************************************************/

exports.name = "tmap";
exports.params = getParamSlots(5);
exports.run = run;

/*** Imports *******************************************************/

var EdgeType        = require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType").EdgeType;
var utils           = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
var ViewAbstraction = require("$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction").ViewAbstraction;
  
/*** Code **********************************************************/

/**
 * @this MacroCallWidget
 * @return {string} the result of the operation or an empty string.
 * @private
 */
function run() {
  
  this.substVarRefs = this.substituteVariableReferences;
  
  var fn = command[arguments[0]];
  var result = null;
  
  if(typeof fn === "function") {
    var args = Array.prototype.slice.call(arguments,1);
    var result = fn.apply(this, args);
  }
  
  return (typeof result === "string" ? result : "");
  
};

/** 
 * unfortunately tw forces us to specify params in advance so I
 * will reserve some argument slots here.
 * @private
 */
function getParamSlots(maxArgs) {
  
  var arr = [];
  
  for(var i = 0; i < maxArgs; i++) {
    arr.push({ name : ("arg" + i) });
  };
  
  return arr;
  
};

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
command.basename = function(path) {
  
  var str = path || this.getVariable("currentTiddler");
  return utils.getBasename(str);
                           
};

command.testJSON = function(fieldName) {
  
  var tObj = $tw.wiki.getTiddler(this.getVariable("currentTiddler"));
  
  try {
    JSON.parse(tObj.fields[fieldName]);
    return "valid";
  } catch(SyntaxError) {
    return "malformed";
  }
                           
};

command.splitAndSelect = function(separator, index) {
  
  var str = this.getVariable("currentTiddler");
  var result = str.split(separator)[index];
  
  return (result != null ? result : str);
                           
};

command.concat = function() {
  
  var str = "";
  for(var i = 1, l = arguments.length; i < l; i++) {
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
  if(!str) return "";
  
  return str.substr(0, Math.ceil(str.length / 2));
                       
};

command.isETyVisible = function(viewNS, eTyFilter, id) {
  
  id = command.getETyId.call(this, viewNS, id);
  return "" + utils.isEdgeTypeMatch(id, eTyFilter);

};

command.getETyId = function(viewNS, id) {
  
  id = id || this.getVariable("currentTiddler");
  return (new EdgeType(id, null, { namespace: viewNS })).id;

};

command.scale = function() {
  
  var str = "";
  for(var i = 1, l = parseInt(arguments[0]); i < l; i++) {
    str += "[[" + i + "]]";
  }
  return str;
                       
};

command.mergeFields = function() {
  
  var tObj = utils.getTiddler(arguments[0]);
  var prefix = arguments[1];
  var separator = arguments[2] || " ";

  if(!tObj) return;

  var fields = utils.getPropertiesByPrefix(tObj.fields, prefix);
  var str = "";
  for(var name in fields) {
    if(typeof fields[name] === "string") {
      str += fields[name] + separator;
    }
  }
  return str;
                       
};

command.option = function(path, unit) {
  
  var prop = $tm;
  var propertyPath = path.split(".");

  for(var i = 0; i < propertyPath.length; i++) {
    if(typeof prop == "object" && prop[propertyPath[i]]) {
      prop = prop[propertyPath[i]];
    }        
  }
  
  // TODO: ugly, use regex
  if(unit && typeof prop === "string"
     && utils.hasSubString(unit)
     && (prop.lastIndexOf(unit) + unit.length) === prop.length) {
    prop = prop + unit;
  }
    
  return prop;
                       
};