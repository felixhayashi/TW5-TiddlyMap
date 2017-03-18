'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/MapElementType
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*** Code **********************************************************/

/**
 * @abstract
 */
var MapElementType = function () {
  function MapElementType(id, root, fieldMeta, data) {
    _classCallCheck(this, MapElementType);

    this.id = id;
    this.root = root;
    this._fieldMeta = fieldMeta;
    this.fullPath = this.root + '/' + this.id;
    this.isShipped = $tw.wiki.getSubTiddler($tm.path.pluginRoot, this.fullPath);

    // finally get the data
    this._load(data || this.fullPath);
  }

  /**
   * Load the type's data. Depending on the constructor arguments,
   * the data source can be a tiddler, a type store
   *
   * @private
   */


  _createClass(MapElementType, [{
    key: '_load',
    value: function _load(data) {

      if (!data) {

        return;
      }

      if (typeof data === 'string') {
        // assume id or full path

        var isFullPath = _utils2.default.startsWith(data, this.root);
        var tRef = isFullPath ? data : this.root + '/' + data;
        this._loadFromTiddler(tRef);
      } else if (data instanceof $tw.Tiddler) {

        this._loadFromTiddler(data);
      } else if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
        // = type or a data object

        for (var field in this._fieldMeta) {
          this[field] = data[field];
        }
      }
    }

    /**
     * Retrieve all data from the tiddler provided. If a shadow tiddler
     * with the same id exists, its data is merged during the load
     * process.
     *
     * @private
     */

  }, {
    key: '_loadFromTiddler',
    value: function _loadFromTiddler(tiddler) {

      var tObj = _utils2.default.getTiddler(tiddler);

      if (!tObj) {

        return;
      }

      var shadowTObj = $tw.wiki.getSubTiddler($tm.path.pluginRoot, this.fullPath) || {};

      // copy object to allow manipulation of the data
      var rawData = $tw.utils.extend({}, shadowTObj.fields, tObj.fields);
      // allow parsers to transform the raw field data
      for (var field in this._fieldMeta) {

        var parser = this._fieldMeta[field].parse;
        var rawVal = rawData[field];

        this[field] = parser ? parser.call(this, rawVal) : rawVal;
      }
    }

    /**
     * Method to determine whether or not this type exists. A type
     * exists if a tiddler with the type's id can be found below
     * the type's root path.
     *
     * @return {boolean} True if the type exists, false otherwise.
     */

  }, {
    key: 'exists',
    value: function exists() {

      return _utils2.default.tiddlerExists(this.fullPath);
    }
  }, {
    key: 'setStyle',
    value: function setStyle(style, isMerge) {

      // preprocessing: try to turn string into json
      if (typeof style === 'string') {

        style = _utils2.default.parseJSON(style);
      }

      // merge or override
      if ((typeof style === 'undefined' ? 'undefined' : _typeof(style)) === 'object') {

        if (isMerge) {

          _utils2.default.merge(this.style, style);
        } else {

          this.style = style;
        }
      }
    }

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
     * @param {boolean} [silently=false] do not update the modification date
     */

  }, {
    key: 'save',
    value: function save(tRef, silently) {

      if (!tRef) {

        tRef = this.fullPath;
      } else if (typeof tRef !== 'string') {

        return;
      }

      // also add an empty text field to guard against
      // https://github.com/Jermolene/TiddlyWiki5/issues/2025
      var fields = {
        title: tRef,
        text: ''
      };

      if (!_utils2.default.startsWith(tRef, this.root)) {

        // = not the standard path for storing this type!
        // in this case we add the id to the output.
        fields.id = this.id;
      }

      // allow parsers to transform the raw field data
      for (var field in this._fieldMeta) {

        var stringify = this._fieldMeta[field].stringify;

        fields[field] = stringify ? stringify.call(this, this[field]) : this[field];
      }

      if (!this.exists()) {
        // newly created
        Object.assign(fields, $tw.wiki.getCreationFields());
      }

      if (silently !== true) {
        // add modification date to the output;
        Object.assign(fields, $tw.wiki.getModificationFields());
      }

      $tw.wiki.addTiddler(new $tw.Tiddler(fields));
    }
  }]);

  return MapElementType;
}();

/**
 * A list of fields that are used as data identifiers. Only these
 * listed keys are acknowledged by the load and save functions in
 * this class.
 *
 * This object resembles tw's field modules that are used by
 * `boot.js` to decide how fields are parsed and stringified again.
 */


MapElementType.fieldMeta = {
  'description': {},
  'style': {
    parse: _utils2.default.parseJSON,
    stringify: JSON.stringify
  },
  'modified': {}, // translation handled by TW's core
  'created': {} // translation handled by TW's core
};

/*** Exports *******************************************************/

exports.default = MapElementType;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/graph/MapElementType.js.map
