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

var _AbstractEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber');

var _AbstractEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractRefEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * Parent class for all subscribers that retrieve or store
 * non-TiddlyMap edges ({@see TmapEdgeTypeSubscriber) from a tiddler,
 * for example tag or list references.
 */
var AbstractRefEdgeTypeSubscriber = function (_AbstractEdgeTypeSubs) {
  _inherits(AbstractRefEdgeTypeSubscriber, _AbstractEdgeTypeSubs);

  function AbstractRefEdgeTypeSubscriber() {
    _classCallCheck(this, AbstractRefEdgeTypeSubscriber);

    return _possibleConstructorReturn(this, (AbstractRefEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(AbstractRefEdgeTypeSubscriber)).apply(this, arguments));
  }

  _createClass(AbstractRefEdgeTypeSubscriber, [{
    key: 'loadEdges',


    /**
     * @inheritDoc
     */
    value: function loadEdges(tObj, toWL, typeWL) {

      // references to other tiddlers grouped by their edge type
      var refsByType = this.getReferences(tObj, toWL, typeWL);

      if (!refsByType || !_utils2.default.hasElements(refsByType)) return;

      var fromId = tObj.fields['tmap.id'];
      var idByT = $tm.tracker.getIdsByTiddlers();
      var allETy = this.allEdgeTypes;
      var fromTRef = _utils2.default.getTiddlerRef(tObj);

      var edges = _utils2.default.makeHashMap();

      for (var typeId in refsByType) {

        var toRefs = refsByType[typeId];

        if (!toRefs) {
          continue;
        }

        var type = allETy[typeId];
        for (var i = toRefs.length; i--;) {
          var toTRef = toRefs[i];

          if (!toTRef || !$tw.wiki.tiddlerExists(toTRef) || _utils2.default.isSystemOrDraft(toTRef) || toWL && !toWL[toTRef]) {
            continue;
          }

          var id = type.id + $tw.utils.hashString(fromTRef + toTRef);
          edges[id] = new _Edge2.default(fromId, idByT[toTRef], type.id, id);
        }
      }

      return edges;
    }

    /**
     * Returns a list of tiddlers (= tiddler names) that are targeted by the specified tiddler.
     * Note: All referenced tiddlers have to be grouped by their edge type.
     *
     * @interface
     * @param {Tiddler} tObj - the tiddler that holds the references.
     * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
     *     be included in the result.
     * @param {Object<id, EdgeType>} typeWL - a whitelist that defines that only Tiddlers that are linked
     *     via a type specified in the list may be included in the result.
     * @return {Object<string, TiddlerReference[]>|null} a list of referenced tiddlers grouped by their edge type.
     */

  }, {
    key: 'getReferences',
    value: function getReferences(tObj, toWL, typeWL) {

      throw new _exception.MissingOverrideError(this, 'getReferences');
    }
  }]);

  return AbstractRefEdgeTypeSubscriber;
}(_AbstractEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.default = AbstractRefEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/AbstractRefEdgeTypeSubscriber.js.map
