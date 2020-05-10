'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TmapEdgeTypeSubscriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _Edge = require('$:/plugins/felixhayashi/tiddlymap/js/Edge');

var _Edge2 = _interopRequireDefault(_Edge);

var _AbstractEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber');

var _AbstractEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractEdgeTypeSubscriber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/tmap
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * TiddlyMap's original EdgeTypeSubscriber. It will store and retrieve edges by relying on
 * json stored in a tiddler field.
 *
 * @constructor
 */
var TmapEdgeTypeSubscriber = function (_AbstractEdgeTypeSubs) {
  _inherits(TmapEdgeTypeSubscriber, _AbstractEdgeTypeSubs);

  function TmapEdgeTypeSubscriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, TmapEdgeTypeSubscriber);

    return _possibleConstructorReturn(this, (TmapEdgeTypeSubscriber.__proto__ || Object.getPrototypeOf(TmapEdgeTypeSubscriber)).call(this, allEdgeTypes, _extends({ priority: 0 }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(TmapEdgeTypeSubscriber, [{
    key: 'loadEdges',
    value: function loadEdges(tObj, toWL, typeWL) {

      var connections = _utils2.default.parseFieldData(tObj, 'tmap.edges');
      if (!connections) {
        return;
      }

      var tById = this.tracker.getTiddlersByIds();
      var fromId = tObj.fields['tmap.id'];

      var edges = _utils2.default.makeHashMap();

      for (var conId in connections) {

        var con = connections[conId];
        var toTRef = tById[con.to];
        if (toTRef && (!toWL || toWL[toTRef]) && (!typeWL || typeWL[con.type])) {

          edges[conId] = new _Edge2.default(fromId, con.to, con.type, conId);
        }
      }

      return edges;
    }

    /**
     * @inheritDoc
     */

  }, {
    key: 'insertEdge',
    value: function insertEdge(tObj, edge, type) {

      // load existing connections
      var connections = _utils2.default.parseFieldData(tObj, 'tmap.edges', {});

      // assign new id if not present yet
      edge.id = edge.id || _utils2.default.genUUID();
      // add to connections object
      connections[edge.id] = { to: edge.to, type: type.id };

      // save
      _utils2.default.writeFieldData(tObj, 'tmap.edges', connections, $tm.config.sys.jsonIndentation);

      return edge;
    }

    /**
     * @inheritDoc
     */

  }, {
    key: 'deleteEdge',
    value: function deleteEdge(tObj, edge, type) {

      if (!edge.id) return;

      // load
      var connections = _utils2.default.parseFieldData(tObj, 'tmap.edges', {});

      // delete
      delete connections[edge.id];

      // save
      _utils2.default.writeFieldData(tObj, 'tmap.edges', connections, $tm.config.sys.jsonIndentation);

      return edge;
    }

    /**
     * @inheritDoc
     */

  }, {
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return true;
    }
  }]);

  return TmapEdgeTypeSubscriber;
}(_AbstractEdgeTypeSubscriber2.default);

/*** Exports *******************************************************/

exports.TmapEdgeTypeSubscriber = TmapEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/TmapEdgeTypeSubscriber.js.map
