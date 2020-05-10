'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _Edge = require('$:/plugins/felixhayashi/tiddlymap/js/Edge');

var _Edge2 = _interopRequireDefault(_Edge);

var _exception = require('$:/plugins/felixhayashi/tiddlymap/js/exception');

var _AbstractRefEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber');

var _AbstractRefEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractRefEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/**
 * @constructor
 */
var AbstractMagicEdgeTypeSubscriber = function (_AbstractRefEdgeTypeS) {
  _inherits(AbstractMagicEdgeTypeSubscriber, _AbstractRefEdgeTypeS);

  /**
   * @inheritDoc
   */
  function AbstractMagicEdgeTypeSubscriber(allEdgeTypes, options) {
    _classCallCheck(this, AbstractMagicEdgeTypeSubscriber);

    // later used for edge retrieval to identify those fields that hold connections
    var _this = _possibleConstructorReturn(this, (AbstractMagicEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(AbstractMagicEdgeTypeSubscriber)).call(this, allEdgeTypes, options));

    _this.edgeTypesByFieldName = _utils2.default.makeHashMap();

    for (var id in allEdgeTypes) {

      var edgeType = allEdgeTypes[id];
      if (_this.canHandle(edgeType)) {
        _this.edgeTypesByFieldName[edgeType.name] = edgeType;
      }
    }

    return _this;
  }

  /**
   * Returns all references to other tiddlers stored in the specified tiddler.
   *
   * @interface
   * @param {Tiddler} tObj - the tiddler that holds the references.
   * @param {String} fieldName - the name of the field to get the reference from.
   * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
   *     be included in the result.
   * @return {Object<Id, Edge>|null}
   */


  _createClass(AbstractMagicEdgeTypeSubscriber, [{
    key: 'getReferencesFromField',
    value: function getReferencesFromField(tObj, fieldName, toWL) {

      throw new _exception.MissingOverrideError(this, 'getReferencesFromField');
    }
  }, {
    key: 'getReferences',


    /**
     * @inheritDoc
     */
    value: function getReferences(tObj, toWL, typeWL) {

      var refsGroupedByType = _utils2.default.makeHashMap();
      var fieldNames = tObj.fields;

      for (var fieldName in fieldNames) {

        var type = this.edgeTypesByFieldName[fieldName];

        if (!type || typeWL && !typeWL[type.id]) continue;

        var toRefs = this.getReferencesFromField(tObj, fieldName, toWL);

        if (toRefs && toRefs.length) {
          refsGroupedByType[type.id] = toRefs;
        }
      }

      return refsGroupedByType;
    }
  }]);

  return AbstractMagicEdgeTypeSubscriber;
}(_AbstractRefEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.default = AbstractMagicEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/AbstractMagicEdgeTypeSubscriber.js.map
