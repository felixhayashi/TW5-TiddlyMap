'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FieldEdgeTypeSubscriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _AbstractMagicEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber');

var _AbstractMagicEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractMagicEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/field
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/**
 * The FieldEdgeTypeSubscriber deals with connections that are stored in form of tiddler fields.
 * In this case one field can only hold one connection.
 *
 * If an EdgeType with a "tw-field" namespace is inserted or deleted, the type's name
 * is interpreted as field name and the connection is stored or removed in a tiddler
 * field with of that name.
 *
 * E.g. creating an edge between the tiddlers "Betsy" and "Dave" with the type
 * tw-field:husband will create a field "husband" inside the "Betsy" tiddler and set
 * "Dave" as value.

 * Note: A single field can only hold one connection.
 *
 * @see http://tiddlymap.org/#tw-field
 *
 * @inheritDoc
 * @constructor
 */
var FieldEdgeTypeSubscriber = function (_AbstractMagicEdgeTyp) {
  _inherits(FieldEdgeTypeSubscriber, _AbstractMagicEdgeTyp);

  /**
   * @inheritDoc
   */
  function FieldEdgeTypeSubscriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, FieldEdgeTypeSubscriber);

    return _possibleConstructorReturn(this, (FieldEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(FieldEdgeTypeSubscriber)).call(this, allEdgeTypes, _extends({ priority: 10 }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(FieldEdgeTypeSubscriber, [{
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return edgeType.namespace === 'tw-field';
    }

    /**
     * @override
     */

  }, {
    key: 'getReferencesFromField',
    value: function getReferencesFromField(tObj, fieldName, toWL) {

      // wrap in array
      return [tObj.fields[fieldName]];
    }

    /**
     * Stores and maybe overrides an edge in this tiddler
     */

  }, {
    key: 'insertEdge',
    value: function insertEdge(tObj, edge, type) {

      var toTRef = this.tracker.getTiddlerById(edge.to);
      if (toTRef == null) {
        // null or undefined
        return;
      }

      // only use the name without the private marker or the namespace
      _utils2.default.setField(tObj, type.name, toTRef);

      return edge;
    }
  }, {
    key: 'deleteEdge',


    /**
     * Deletes an edge in this tiddler
     */
    value: function deleteEdge(tObj, edge, type) {

      var toTRef = this.tracker.getTiddlerById(edge.to);

      if (toTRef == null) {
        // null or undefined
        return;
      }

      // only use the name without the private marker or the namespace
      _utils2.default.setField(tObj, type.name, undefined);

      return edge;
    }
  }]);

  return FieldEdgeTypeSubscriber;
}(_AbstractMagicEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.FieldEdgeTypeSubscriber = FieldEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/magicEdgeTypeSubscriber/FieldEdgeTypeSubscriber.js.map
