'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _MapElementType2 = require('$:/plugins/felixhayashi/tiddlymap/js/MapElementType');

var _MapElementType3 = _interopRequireDefault(_MapElementType2);

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * Used to define the type of a node.
 *
 * Note: NodeType instances are immutable (frozen).
 */
var NodeType = function (_MapElementType) {
  _inherits(NodeType, _MapElementType);

  function NodeType(id, data) {
    _classCallCheck(this, NodeType);

    id = typeof id === 'string' ? _utils2.default.getWithoutPrefix(id, $tm.path.nodeTypes + '/') : 'tmap:unknown';

    // call the parent constructor

    var _this = _possibleConstructorReturn(this, (NodeType.__proto__ || Object.getPrototypeOf(NodeType)).call(this, id, $tm.path.nodeTypes, NodeType.fieldMeta, data));

    Object.freeze(_this);

    return _this;
  }

  /**
   * Get all tiddlers that inherit this type.
   *
   * @param {Array<TiddlerReference>} [src=$tw.wiki.allTitles()] - A list
   *     of tiddlers that is searched for inheritors.
   * @return {Array<TiddlerReference>} The inheritors.
   */


  _createClass(NodeType, [{
    key: 'getInheritors',
    value: function getInheritors(src) {

      return this.scope ? _utils2.default.getMatches(this.scope, src || $tw.wiki.allTitles()) : [];
    }
  }]);

  return NodeType;
}(_MapElementType3.default);

/**
 * @see https://github.com/babel/babel/issues/4854
 * @param {string} id - Either the edge type id (name)
 *     or a tiddler reference denoting the type or an
 *     `EdgeType` object (that is directly bounced back). If the
 *     id can be translated into a tiddler object that resides in
 *     the edge type path, then its data is retrieved automatically.
 */


NodeType.getInstance = function (id) {
  return id instanceof NodeType ? id : new NodeType(id);
};

NodeType.fieldMeta = _extends({}, _MapElementType3.default.fieldMeta, {
  'view': {},
  'priority': {
    parse: function parse(raw) {
      return isNaN(raw) ? 1 : parseInt(raw);
    },
    stringify: function stringify(num) {
      return _utils2.default.isInteger(num) ? num.toString() : '1';
    }
  },
  'scope': {
    stringify: _utils2.default.getWithoutNewLines
  },
  'fa-icon': {},
  'tw-icon': {}
});

/*** Exports *******************************************************/

exports.default = NodeType;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/graph/NodeType.js.map
