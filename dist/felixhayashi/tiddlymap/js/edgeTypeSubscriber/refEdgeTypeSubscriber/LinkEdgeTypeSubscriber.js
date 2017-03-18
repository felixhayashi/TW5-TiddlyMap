'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LinkEdgeTypeSubscriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _AbstractRefEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber');

var _AbstractRefEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractRefEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/body/link
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/

/**
 * The LinkEdgeTypeSubscriber deals with connections that are stored inside
 * a tiddler' text field.
 *
 * Note: This subscriber only retrieves edges, however doesn't store or delete them.
 *
 * @see http://tiddlymap.org/#tw-body
 */
var LinkEdgeTypeSubscriber = function (_AbstractRefEdgeTypeS) {
  _inherits(LinkEdgeTypeSubscriber, _AbstractRefEdgeTypeS);

  /**
   * @inheritDoc
   */
  function LinkEdgeTypeSubscriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, LinkEdgeTypeSubscriber);

    return _possibleConstructorReturn(this, (LinkEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(LinkEdgeTypeSubscriber)).call(this, allEdgeTypes, _extends({ priority: 20 }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(LinkEdgeTypeSubscriber, [{
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return edgeType.id === 'tw-body:link';
    }

    /**
     * @inheritDoc
     */

  }, {
    key: 'getReferences',
    value: function getReferences(tObj, toWL, typeWL) {

      if (typeWL && !typeWL['tw-body:link']) {
        return;
      }

      var toRefs = $tw.wiki.getTiddlerLinks(tObj.fields.title);

      if (!toRefs || !toRefs.length) {
        return;
      }

      return { 'tw-body:link': toRefs };
    }
  }]);

  return LinkEdgeTypeSubscriber;
}(_AbstractRefEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.LinkEdgeTypeSubscriber = LinkEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/refEdgeTypeSubscriber/LinkEdgeTypeSubscriber.js.map
