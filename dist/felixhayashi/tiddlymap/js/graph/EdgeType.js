'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _MapElementType2 = require('$:/plugins/felixhayashi/tiddlymap/js/MapElementType');

var _MapElementType3 = _interopRequireDefault(_MapElementType2);

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _environment = require('$:/plugins/felixhayashi/tiddlymap/js/lib/environment');

var env = _interopRequireWildcard(_environment);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/EdgeType
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * This class is used to abstract edge types. It facilitates the parsing
 * of style information, the translation of type names into actual type data
 * or the persistance of edge type data.
 *
 * Note: EdgeType instances are immutable (frozen).
 */
var EdgeType = function (_MapElementType) {
  _inherits(EdgeType, _MapElementType);

  /**
   * @param {EdgeTypeId} id
   * @param {Object} [data] @see http://visjs.org/docs/network/edges.html
   */
  function EdgeType(id, data) {
    _classCallCheck(this, EdgeType);

    // we do not simply use the provided id but disassemble and
    // reassemble it again to ensure the id is well formatted.
    var _EdgeType$getIdParts = EdgeType.getIdParts(id),
        marker = _EdgeType$getIdParts.marker,
        namespace = _EdgeType$getIdParts.namespace,
        name = _EdgeType$getIdParts.name;

    id = EdgeType.getId(marker, namespace, name);

    // call the parent constructor

    var _this = _possibleConstructorReturn(this, (EdgeType.__proto__ || Object.getPrototypeOf(EdgeType)).call(this, id, env.path.edgeTypes, EdgeType.fieldMeta, data));

    _this.id = id;
    _this.marker = marker;
    _this.name = name;
    _this.namespace = namespace;

    var arrows = (_this.style || {}).arrows;

    if (arrows) {

      _this.invertedArrow = isArrowEnabled(arrows, 'from');
      _this.toArrow = isArrowEnabled(arrows, 'to') || isArrowEnabled(arrows, 'middle');
      // determine if bi arrows (either from+to or no arrows)
      _this.biArrow = _this.invertedArrow === _this.toArrow;

      if (_this.biArrow) {
        _this.toArrow = true;
        _this.invertedArrow = true;
      }
    } else {

      _this.toArrow = true;
    }

    Object.freeze(_this);

    return _this;
  }

  /**
   * Returns an object holding the parts that make up the edge type id.
   *
   * @param {EdgeTypeId} id
   * @return {{marker: (*|string), namespace: (*|string), name: (*|string)}}
   */


  _createClass(EdgeType, [{
    key: 'getLabel',
    value: function getLabel() {

      return this.label || this.name;
    }
  }], [{
    key: 'getIdParts',
    value: function getIdParts() {
      var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';


      id = _utils2.default.getWithoutPrefix(id, env.path.edgeTypes + '/');
      var match = id.match(edgeTypeRegex) || [];

      return {
        marker: match[1] || '',
        namespace: match[3] && match[2] || '',
        name: match[3] || match[2] || ''
      };
    }
  }, {
    key: 'getId',


    /**
     * Creates an {@link EdgeTypeId} from a set of parts that make up the id.
     * If it is not possible to create the id from the parts, the default
     * edge type 'tmap:unknown' is returned.
     *
     * @param {string} marker
     * @param {string} namespace
     * @param {string} name
     * @return {EdgeTypeId}
     */
    value: function getId() {
      var marker = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var namespace = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var name = arguments[2];


      return name ? marker + (namespace && namespace + ':') + name : 'tmap:unknown';
    }
  }]);

  return EdgeType;
}(_MapElementType3.default);

/**
  * @see https://github.com/babel/babel/issues/4854
  * @param {string} id - Either the edge type id (name)
  *     or a tiddler reference denoting the type or an
  *     `EdgeType` object (that is directly bounced back). If the
  *     id can be translated into a tiddler object that resides in
  *     the edge type path, then its data is retrieved automatically.
 */


EdgeType.getInstance = function (id) {
  return id instanceof EdgeType ? id : new EdgeType(id);
};

EdgeType.fieldMeta = _extends({}, _MapElementType3.default.fieldMeta, {
  'label': {},
  'show-label': {}
});

/**
 *
 * @param {Object} arrows
 * @param {('from'|'to'|'middle')} direction
 * @return {boolean}
 */
var isArrowEnabled = function isArrowEnabled(arrows, direction) {

  var arrow = arrows[direction];

  if (arrow == null && direction === 'to') {
    // if the arrow is not further specified and its direction is to
    // we regard it as enabled.
    return true;
  }

  return (typeof arrow === 'undefined' ? 'undefined' : _typeof(arrow)) === 'object' ? arrow.enabled !== false : arrow === true;
};

/**
 * An edge-type id consists of the following parts of which the
 * first two are optional: `[marker][namespace:]name`
 *
 * The colon is not considered to be part of the namespace.
 */
var edgeTypeRegex = new RegExp('^(_?)([^:_][^:]*):?([^:]*)');

/*** Exports *******************************************************/

exports.default = EdgeType;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/graph/EdgeType.js.map
