/*\

title: $:/plugins/felixhayashi/tiddlymap/js/MapElementType
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

/**
 * 
 */
var MapElementType = function(id, root, fieldMeta, data) {

  // create shortcuts for services and frequently used vars
  this.opt = $tw.tmap.opt;
  this.logger = $tw.tmap.logger;
  
  this.root = root;
  this.id = utils.getWithoutPrefix(id, this.root + "/");
  this._fieldMeta = fieldMeta;
  this.fullPath = this.root + "/" + this.id;
  this.isShipped = $tw.wiki.getSubTiddler(this.opt.path.pluginRoot,
                                          this.fullPath)
  // finally get the data
  this.load(data || this.fullPath);

};

/**
 * A list of fields that are used as data identifiers. Only these
 * listed keys are acknowledged by the load and save functions in
 * this class.
 * 
 * This object resembles tw's field modules that are used by
 * `boot.js` to decide how fields are parsed and stringified again.
 */
MapElementType._fieldMeta = {
  "description": {},
  "style": {
    parse: utils.parseJSON,
    stringify: JSON.stringify
  },
  "modified": {},
  "created": {}
};

/**
 * Load the type's data. Depending on the constructor arguments,
 * the data source can be a tiddler, a type store
 */
MapElementType.prototype.load = function(data) {
  
  if(!data) return;
  
  if(typeof data === "string") { // assume id or full path
    // assume id
    var tRef = (!utils.startsWith(data, this.root)
                ? this.root + "/" + type
                : data);
    this.loadFromTiddler(tRef);
    
  } else if(data instanceof $tw.Tiddler) {
    this.loadFromTiddler(data);
    
  } else if(typeof data === "object") { // = type or a data object
    for(var field in this._fieldMeta) {
      this[field] = data[field];
    }
  }
  
};


/**
 * Retrieve all data from the tiddler provided. If a shadow tiddler
 * with the same id exists, its data is merged during the load
 * process.
 */
MapElementType.prototype.loadFromTiddler = function(tiddler) {
  
  var tObj = utils.getTiddler(tiddler);
  if(!tObj) return;
  
  var shadowTObj = $tw.wiki.getSubTiddler(this.opt.path.pluginRoot,
                                          this.fullPath) || {};
  
  // copy object to allow manipulation of the data
  var rawData = $tw.utils.extend({}, shadowTObj.fields, tObj.fields);
  // allow parsers to transform the raw field data
  for(var field in this._fieldMeta) {
    var parser = this._fieldMeta[field].parse;
    var rawVal = rawData[field];
    this[field] = (parser ? parser.call(this, rawVal) : rawVal);
  }    

};

/**
 * Method to determine whether or not this type exists. A type
 * exists if a tiddler with the type's id can be found below
 * the type's root path.
 * 
 * @return {boolean} True if the type exists, false otherwise.
 */
MapElementType.prototype.exists = function() {

  return utils.tiddlerExists(this.fullPath);

};

MapElementType.prototype.setStyle = function(style, isMerge) {

  // preprocessing: try to turn string into json
  if(typeof style === "string") {
    style = utils.parseJSON(style);
  }
  
  // merge or override
  if(typeof style === "object") {
    if(isMerge) {
      utils.merge(this.style, style);
    } else {
      this.style = style;
    }
  }
    
};
  
/**
 * Store the type object as tiddler in the wiki. If the `tRef`
 * property is not provided, the default type path prefix 
 * will be used with the type id appended. Stringifiers provided in
 * the field meta object (that was passed to the constructor) are
 * called.
 * 
 * @param {string} [tRef] - If `tRef` is provided, the type
 *     data will be written into this tiddler and the id property
 *     is added as extra field value. Only do this is only for
 *     dumping purposes!
 */
MapElementType.prototype.save = function(tRef) {

  if(!tRef) { tRef = this.fullPath; }
  
  if(typeof tRef === "string") {
  
    var fields = {
      title: tRef,
    };
    
    if(!utils.startsWith(tRef, this.root)) {
      
      // = not the standard path for storing this type!
      // in this case we add the id to the output.
      fields.id = this.id;
      
    } else {
      
      // add modification date to the output;
      $tw.utils.extend(fields, $tw.wiki.getModificationFields());
      
      if(!this.exists()) { // newly created
        // add a creation field as well
        $tw.utils.extend(fields, $tw.wiki.getCreationFields());
      }
            
    }

    // allow parsers to transform the raw field data
    for(var field in this._fieldMeta) {
      var stringify = this._fieldMeta[field].stringify;
      fields[field] = (stringify
                       ? stringify.call(this, this[field])
                       : this[field]);
    }
    
    $tw.wiki.addTiddler(new $tw.Tiddler(fields));
    
  }
  
};

// !! EXPORT !!
exports.MapElementType = MapElementType;
// !! EXPORT !!#
  
})();