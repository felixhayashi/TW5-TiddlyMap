/*\

title: $:/plugins/felixhayashi/tiddlymap/js/ElementType
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function() {

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";

/**************************** IMPORTS ****************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/***************************** CODE ******************************/

var ElementType = function(type, root, fields) {

  if(typeof type !== "string") {
    throw "Cannot create type"; 
  }

  // create shortcuts to services
  this.opt = $tw.tmap.opt;
  this.logger = $tw.tmap.logger;
  
  this.type = type;
  this.allowedFields = [
    "description", "style", "modified", "created"
  ].concat(fields || []);
  this.root = root;
  this.data = utils.getDataMap();
  this.id = utils.getWithoutPrefix(type, this.root + "/");
  this.loadDataFromType(this.id);

};

/**
 * @return {string}
 */
ElementType.prototype.getPath = function() {

  return (this.root + "/" + this.id);

};

/**
 * Method to determine whether or not this type exists. A type
 * exists if a tiddler with the type's id can be found below
 * the type's root path.
 * 
 * @return {boolean} True if the type exists, false otherwise.
 */
ElementType.prototype.exists = function() {

  return utils.tiddlerExists(this.getPath());

};
    
ElementType.prototype.getId = function() {
  
  return this.id;

};

ElementType.prototype.getData = function(prop) {
  
  if(prop) {
    var getter = this["get" + utils.ucFirst(prop)];
    return (typeof getter === "function"
            ? getter.call(this)
            : this.data[prop]);
  }

  return this.data;  
  
};

/**
 * If two arguments are provided, a key-value schema is assumed,
 * otherwise, the whole data object is replaced.
 */
ElementType.prototype.setData = function() {
  
  var args = arguments;
  
  if(args.length === 2) {
    var key = args[0];
    var val = args[1];
    if(typeof key === "string") {
      
      if(val && utils.inArray(key, this.allowedFields)) {
        // a safeguard against multilines since we do not store in
        // the textfield.
        if(typeof val === "string") {
          val = val.replace(/[\n\r]/g, " ");
        }
        var setter = this["set" + utils.ucFirst(key)];
        if(typeof setter === "function") {
          setter.call(this, val);
        } else {
          this.data[key] = val;
        }
      } else {
        delete this.data[key];
      }
    }
  } else if(args.length === 1 && typeof args[0] === "object") {
    for(var p in args[0]) {
      this.setData(p, args[0][p]);
    }
  }
  
  return this;
 
};

ElementType.prototype.setStyle = function(style, isMerge) {

  // preprocessing: try to turn string into json
  if(typeof style === "string") {
    style = utils.parseJSON(style);
  }
  
  // merge or override
  if(typeof style === "object") {
    if(isMerge) {
      utils.merge(this.data.style, style);
    } else {
      this.data.style = style;
    }
  }
  
  return this;
    
};
  
/**
 * Store the type object as tiddler in the wiki. If the `title`
 * property is not provided, the default type path prefix 
 * will be used with the type id appended. The style data is
 * written as JSON into the text field.
 * 
 * @param {string} [tRef] - If `tRef` is provided, the type
 *     data will be written into this tiddler and the id property
 *     is added as extra field value. Do not use this option if you
 *     want the system to recognize the type. This is only for
 *     dumping purposes.
 * @param {boolean} [isPrettifyJSON] - True, if any json data should
 *     be stored in a prettified way, false otherwise.
 */
ElementType.prototype.persist = function(tRef, isPrettifyJSON) {

  if(!tRef) { tRef = this.getPath(); }
  
  if(typeof tRef === "string") {
  
    var fields = {
      title: tRef,
    };
    
    if(!utils.startsWith(tRef, this.root)) {
      fields.id = this.id;
    } else {
      $tw.utils.extend(fields, $tw.wiki.getModificationFields());
      if(!this.exists()) {
        $tw.utils.extend(fields, $tw.wiki.getCreationFields());
      }
    }
    

    var spaces = (isPrettifyJSON ? $tw.config.preferences.jsonSpaces : null);
    this.data.style = JSON.stringify(this.data.style, null, spaces);

    
    $tw.wiki.addTiddler(new $tw.Tiddler(this.data, fields));
    
  }
  
};

/**
 * Clone all data from the type provided (except the id).
 * 
 * @param {*} type - The type containing the data.
 *     The `type` parameter may be a string denoting the
 *     type's id, a path (tiddler title), a `$tw.Tiddler` object
 *     or an `ElementType` object.
 */
ElementType.prototype.loadDataFromType = function(type) {

  if(type instanceof ElementType) {
    
    this.setData(type.getData());
    
  } else {
    
    if(type instanceof $tw.Tiddler) {
      // get only title; we need to check if the prefix is correct 
      type = type.fields.title;
    }
  
    if(typeof type === "string") {
      
      if(!utils.startsWith(type, this.root)) {
        type = this.root + "/" + type;
      }
      
      this.loadDataFromTiddler($tw.wiki.getTiddler(type), false);
    }
  }
  
};

ElementType.prototype.isShipped = function() {
  
  return $tw.wiki.getSubTiddler(this.opt.path.pluginRoot, this.getPath());
  
};

/**
 * Retrieve all data from the tiddler provided. If a shadow tiddler
 * with the same id exists, its data is merged during the load process.
 * 
 * @param {*} edgeType - The edge-type containing the data.
 *     The  `edgeType` parameter may be a string denoting the
 *     type's id, a path (tiddler title), a `$tw.Tiddler` object
 *     or an `ElementType` object.
 * @param {boolean} [isAllowOverideId=false] - If the provided tiddler has
 *     an id field set, setting `isAllowOverideId` to `true` will cause
 *     the currently held id to be overridden.
 */
ElementType.prototype.loadDataFromTiddler = function(tiddler) {
  
  var tObj = utils.getTiddler(tiddler);
  if(tObj) {
    
    var shadowTObj = $tw.wiki.getSubTiddler(this.opt.path.pluginRoot, this.getPath()) || {};
    
    var data = $tw.utils.extend({}, shadowTObj.fields, tObj.fields);
          
    this.setData(data);
    
  }
    
};

// !! EXPORT !!
exports.ElementType = ElementType;
// !! EXPORT !!#
  
})();