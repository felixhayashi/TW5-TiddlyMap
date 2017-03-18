'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ListEdgeTypeSubscriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _AbstractMagicEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber');

var _AbstractMagicEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractMagicEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/list
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * The ListEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields in a tiddler-list format.
 *
 * If an EdgeType with a 'tw-list" namespace is inserted or deleted, the type's name
 * is interpreted as field name and the list of connections is stored or removed in a tiddler
 * field with of that name. Each outgoing connection to a tiddler is stored by
 * inserting the title the edge is pointing to into a list.
 *
 * Say you the user creates a connection between tiddler "Dawna Dozal" and
 * tiddler "Toney Thacker" and names the connection "tw-list:friends". Then a field
 * named "friends" will be created in tiddler "Dawna Dozal" and "Toney Thacker" will be
 * added to this field.
 *
 * @see http://tiddlymap.org/#tw-list
 */
var ListEdgeTypeSubscriber = function (_AbstractMagicEdgeTyp) {
  _inherits(ListEdgeTypeSubscriber, _AbstractMagicEdgeTyp);

  /**
   * @inheritDoc
   */
  function ListEdgeTypeSubscriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, ListEdgeTypeSubscriber);

    return _possibleConstructorReturn(this, (ListEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(ListEdgeTypeSubscriber)).call(this, allEdgeTypes, _extends({ priority: 10 }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(ListEdgeTypeSubscriber, [{
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return edgeType.namespace === 'tw-list';
    }

    /**
     * @override
     */

  }, {
    key: 'getReferencesFromField',
    value: function getReferencesFromField(tObj, fieldName, toWL) {

      return $tw.utils.parseStringArray(tObj.fields[fieldName]);
    }

    /**
     * Stores and maybe overrides an edge in this tiddler
     */

  }, {
    key: 'insertEdge',
    value: function insertEdge(tObj, edge, type) {

      if (!edge.to) {
        return;
      }

      // get the name without the private marker or the namespace
      var name = type.name;

      var list = $tw.utils.parseStringArray(tObj.fields[name]);
      // we need to clone the array since tiddlywiki might directly
      // returned the auto-parsed field value (as in case of tags, or list)
      // and this array would be read only!
      list = (list || []).slice();

      // transform
      var toTRef = this.tracker.getTiddlerById(edge.to);

      list.push(toTRef);

      // save
      _utils2.default.setField(tObj, name, $tw.utils.stringifyList(list));

      return edge;
    }
  }, {
    key: 'deleteEdge',


    /**
     * Deletes an edge in this tiddler
     */
    value: function deleteEdge(tObj, edge, type) {

      var list = $tw.utils.parseStringArray(tObj.fields[type.name]);
      // we need to clone the array since tiddlywiki might directly
      // returned the auto-parsed field value (as in case of tags, or list)
      // and this array would be read only!
      list = (list || []).slice();

      // transform
      var toTRef = this.tracker.getTiddlerById(edge.to);

      var index = list.indexOf(toTRef);
      if (index > -1) {
        list.splice(index, 1);
      }

      // save
      _utils2.default.setField(tObj, type.name, $tw.utils.stringifyList(list));

      return edge;
    }
  }]);

  return ListEdgeTypeSubscriber;
}(_AbstractMagicEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.ListEdgeTypeSubscriber = ListEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/magicEdgeTypeSubscriber/ListEdgeTypeSubscriber.js.map
