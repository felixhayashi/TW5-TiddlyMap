'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/AbstractEdgeTypeSubscriber
type: application/javascript
module-type: library

@preserve

\*/

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _exception = require('$:/plugins/felixhayashi/tiddlymap/js/exception');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Super class for all edge type subscribers.
 */
var AbstractEdgeTypeSubscriber = function () {

  /**
   * @param {Object.<id, EdgeType>} allEdgeTypes - A list of all EdgeType instances that
   *     are currently in the system. Each subscriber may use this list to build up an
   *     index or perform mappings etc. Note that this list does not include types that are
   *     just about to be inserted. Therefore, this list should only be used, if needed,
   *     in the context of edge retrieval via loadEdges.
   * @param {number} [priority} - Subscribers with a higher priority get executed earlier
   * @param {boolean} [skipOthers] - In case of insert and delete operations: Whether or
   *     not to skip any subsequent subscribers that also can handle the edge type
   *     but have a lower priority assigned.
   * @param {boolean} [ignore] - Whether or not to completely ignore this subscriber.
   *     This flag is useful if you want to dynamically at runtime whether or not to
   *     include the subscriber.
   */
  function AbstractEdgeTypeSubscriber(allEdgeTypes) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$priority = _ref.priority,
        priority = _ref$priority === undefined ? 0 : _ref$priority,
        _ref$skipOthers = _ref.skipOthers,
        skipOthers = _ref$skipOthers === undefined ? true : _ref$skipOthers,
        _ref$ignore = _ref.ignore,
        ignore = _ref$ignore === undefined ? false : _ref$ignore;

    _classCallCheck(this, AbstractEdgeTypeSubscriber);

    this.allEdgeTypes = allEdgeTypes;
    this.priority = priority;
    this.skipOthers = skipOthers;
    this.ignore = ignore;
  }

  /**
   * DI
   * @param {Tracker} tracker
   */


  _createClass(AbstractEdgeTypeSubscriber, [{
    key: 'setTracker',
    value: function setTracker(tracker) {
      this.tracker = tracker;
    }

    /**
     * Returns all edges stored in the specified tiddler.
     *
     * @interface
     * @param {Tiddler} tObj - the tiddler that holds the references.
     * @param {Object<TiddlerReference, boolean>} toWL - a whitelist of tiddlers that are allowed to
     *     be included in the result.
     * @param {Object<id, EdgeType>} [typeWL] - a whitelist that defines that only Tiddlers that are linked
     *     via a type specified in the list may be included in the result. If typeWL is not passed it means
     *     all types are included.
     * @return {Object<Id, Edge>|null}
     */

  }, {
    key: 'loadEdges',
    value: function loadEdges(tObj, toWL, typeWL) {

      throw new _exception.MissingOverrideError(this, 'loadEdges');
    }

    /**
     * Whether or not this subscriber instance can handle an edge of the given type.
     *
     * @interface
     * @param {EdgeType} edgeType
     * @return boolean
     */

  }, {
    key: 'canHandle',
    value: function canHandle(edgeType) {

      throw new _exception.MissingOverrideError(this, 'canHandle');
    }

    /**
     * Called by the Adapter whenever a type is inserted
     *
     * @param {Tiddler} tObj - the tiddler that holds the references.
     * @param {Edge} edge - the edge to be deleted
     * @param {EdgeType} type
     */

  }, {
    key: 'insertEdge',
    value: function insertEdge(tObj, edge, type) {}

    // optional

    /**
     * Called by the Adapter whenever a type is deleted
     *
     * @param {Tiddler} tObj - the tiddler that holds the references.
     * @param {Edge} edge - the edge to be deleted
     * @param {EdgeType} type
     */

  }, {
    key: 'deleteEdge',
    value: function deleteEdge(tObj, edge, type) {

      // optional

    }
  }]);

  return AbstractEdgeTypeSubscriber;
}();

/*** Exports *******************************************************/

exports.default = AbstractEdgeTypeSubscriber;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/edgeTypeSubscriber/AbstractEdgeTypeSubscriber.js.map
