'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterEdgeTypeSubstriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _AbstractMagicEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber');

var _AbstractMagicEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractMagicEdgeTypeSubscriber);

var _widget = require('$:/core/modules/widgets/widget.js');

var _widget2 = _interopRequireDefault(_widget);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * The FilterEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields via a dynamic filter.
 *
 * @see http://tiddlymap.org/#tw-filter
 * @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/206
 */
var FilterEdgeTypeSubstriber = function (_AbstractMagicEdgeTyp) {
  _inherits(FilterEdgeTypeSubstriber, _AbstractMagicEdgeTyp);

  /**
   * @inheritDoc
   */
  function FilterEdgeTypeSubstriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, FilterEdgeTypeSubstriber);

    return _possibleConstructorReturn(this, (FilterEdgeTypeSubstriber.__proto__ || Object.getPrototypeOf(FilterEdgeTypeSubstriber)).call(this, allEdgeTypes, _extends({ priority: 10 }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(FilterEdgeTypeSubstriber, [{
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return edgeType.namespace === 'tw-filter';
    }

    /**
     * @override
     */

  }, {
    key: 'getReferencesFromField',
    value: function getReferencesFromField(tObj, fieldName, toWL) {

      var filter = tObj.fields[fieldName];

      // Solves https://github.com/felixhayashi/TW5-TiddlyMap/issues/278
      var parentWidget = new _widget2.default.widget({});
      parentWidget.setVariable("currentTiddler", tObj.fields.title);
      var widget = new _widget2.default.widget({}, { "parentWidget": parentWidget });
      //noinspection UnnecessaryLocalVariableJS
      var toRefs = _utils2.default.getMatches(filter, toWL, widget);

      return toRefs;
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
      var currentFilter = tObj.fields[name] || "";
      var toTRef = this.tracker.getTiddlerById(edge.to);
      // by treating the toTRef as a list of one, we can make
      // it safe to append to any filter.
      // "tiddler" -> "tiddler"
      // "tiddler with spaces" -> "[[tiddler with spaces]]"
      var safe_toTRef = $tw.utils.stringifyList([toTRef]);

      if (currentFilter.length > 0) {
        safe_toTRef = " " + safe_toTRef;
      }

      // save
      _utils2.default.setField(tObj, name, currentFilter + safe_toTRef);

      return edge;
    }
  }]);

  return FilterEdgeTypeSubstriber;
}(_AbstractMagicEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.FilterEdgeTypeSubstriber = FilterEdgeTypeSubstriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/magicEdgeTypeSubscriber/FilterEdgeTypeSubscriber.js.map
