'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TranscludeEdgeTypeSubscriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _AbstractRefEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber');

var _AbstractRefEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractRefEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/body/transclude
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/**
 * The TranscludeEdgeTypeSubscriber retrieves connections that result tiddler transclusions.
 *
 * Note: This subscriber only retrieves edges, however doesn't store or delete them. It only
 * works if the `$tw.wiki.getTiddlerTranscludes` method is present in the wiki.
 */
var TranscludeEdgeTypeSubscriber = function (_AbstractRefEdgeTypeS) {
  _inherits(TranscludeEdgeTypeSubscriber, _AbstractRefEdgeTypeS);

  /**
   * @inheritDoc
   */
  function TranscludeEdgeTypeSubscriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, TranscludeEdgeTypeSubscriber);

    return _possibleConstructorReturn(this, (TranscludeEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(TranscludeEdgeTypeSubscriber)).call(this, allEdgeTypes, _extends({
      priority: 20,
      ignore: typeof $tw.wiki.getTiddlerTranscludes !== 'function'
    }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(TranscludeEdgeTypeSubscriber, [{
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return edgeType.id === 'tw-body:transclude';
    }

    /**
     * @inheritDoc
     */

  }, {
    key: 'getReferences',
    value: function getReferences(tObj, toWL, typeWL) {

      if (typeWL && !typeWL['tw-body:transclude']) {
        return;
      }

      var toRefs = $tw.wiki.getTiddlerTranscludes(tObj.fields.title);

      if (!toRefs || !toRefs.length) {
        return;
      }

      return { 'tw-body:transclude': toRefs };
    }
  }]);

  return TranscludeEdgeTypeSubscriber;
}(_AbstractRefEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.TranscludeEdgeTypeSubscriber = TranscludeEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/refEdgeTypeSubscriber/TranscludeEdgeTypeSubscriber.js.map
