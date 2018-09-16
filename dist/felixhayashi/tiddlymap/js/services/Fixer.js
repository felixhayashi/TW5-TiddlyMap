'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Fixer
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _ViewAbstraction = require('$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction');

var _ViewAbstraction2 = _interopRequireDefault(_ViewAbstraction);

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _NodeType = require('$:/plugins/felixhayashi/tiddlymap/js/NodeType');

var _NodeType2 = _interopRequireDefault(_NodeType);

var _environment = require('$:/plugins/felixhayashi/tiddlymap/js/lib/environment');

var env = _interopRequireWildcard(_environment);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*** Code **********************************************************/

var Fixer = function () {

  /**
   * @param {Adapter} adapter
   * @param {Object} logger
   * @param {Object} glNTy
   */
  function Fixer(adapter, logger, glNTy) {
    _classCallCheck(this, Fixer);

    this.adapter = adapter;
    this.logger = logger;
    this.wiki = $tw.wiki;
    this.glNTy = glNTy;
  }

  _createClass(Fixer, [{
    key: 'moveEdges',
    value: function moveEdges(path, view) {

      var matches = _utils2.default.getTiddlersByPrefix(path);
      for (var i = 0; i < matches.length; i++) {

        // create edge type
        var type = _utils2.default.getBasename(matches[i]);

        if (type === '__noname__') {
          type = 'tmap:unknown';
        }

        type = _EdgeType2.default.getInstance(type);

        if (!type.exists()) {
          type.save();
        }

        // move edges
        var edges = this.wiki.getTiddlerData(matches[i]);
        for (var j = 0; j < edges.length; j++) {
          // prefix formerly private edges with view name as namespace
          edges[j].type = (view ? view + ':' : '') + type.id;
          this.adapter.insertEdge(edges[j]);
        }

        // finally remove the store
        this.wiki.deleteTiddler(matches[i]);
      }
    }
  }, {
    key: 'executeUpgrade',
    value: function executeUpgrade(toVersion, curVersion, upgrade) {

      if (!_utils2.default.isLeftVersionGreater(toVersion, curVersion)) {
        // = current data structure version is newer than version we want to upgrade to.
        return;
      }

      // issue debug message
      this.logger('debug', 'Upgrading data structure to ' + toVersion);
      // execute fix
      var msg = upgrade();
      // update meta
      _utils2.default.setEntry(env.ref.sysMeta, 'dataStructureState', toVersion);

      return msg;
    }
  }, {
    key: 'fixId',


    /**
     * Special fix that is not invoked along with the other fixes but
     * when creating the index (see caretaker code).
     *
     * Changes:
     * 1. The node id field is moved to tmap.id if **original version**
     *    is below v0.9.2.
     */
    value: function fixId() {

      var meta = this.wiki.getTiddlerData(env.ref.sysMeta, {});

      this.executeUpgrade('0.9.2', meta.dataStructureState, function () {

        if (_utils2.default.isLeftVersionGreater('0.9.2', meta.originalVersion)) {
          // path of the user conf at least in 0.9.2
          var userConf = '$:/plugins/felixhayashi/tiddlymap/config/sys/user';
          var nodeIdField = _utils2.default.getEntry(userConf, 'field.nodeId', 'tmap.id');
          _utils2.default.moveFieldValues(nodeIdField, 'tmap.id', true, false);
        }
      });
    }
  }, {
    key: 'fix',
    value: function fix() {
      var _this = this;

      var meta = this.wiki.getTiddlerData(env.ref.sysMeta, {});

      this.logger('debug', 'Fixer is started');
      this.logger('debug', 'Data-structure currently in use: ', meta.dataStructureState);

      /**
       * Changes:
       * 1. Edges are stored in tiddlers instead of type based edge stores
       * 2. No more private views
       */
      this.executeUpgrade('0.7.0', meta.dataStructureState, function () {

        // move edges that were formerly "global"
        _this.moveEdges('$:/plugins/felixhayashi/tiddlymap/graph/edges', null);

        // move edges that were formerly bound to view ("private")
        var filter = env.selector.allViews;
        var viewRefs = _utils2.default.getMatches(filter);
        for (var i = 0; i < viewRefs.length; i++) {
          var view = new _ViewAbstraction2.default(viewRefs[i]);
          _this.moveEdges(view.getRoot() + '/graph/edges', view);
        }
      });

      /**
       * Changes:
       * 1. Changes to the live view filter and refresh trigger field
       */
      this.executeUpgrade('0.7.32', meta.dataStructureState, function () {

        if (!_ViewAbstraction2.default.exists('Live View')) {

          return;
        }

        var liveView = new _ViewAbstraction2.default('Live View');

        // Only listen to the current tiddler of the history list
        liveView.setNodeFilter('[field:title{$:/temp/tmap/currentTiddler}]', true);

        liveView.setConfig({
          'refresh-trigger': null, // delete the field (renamed)
          'refresh-triggers': $tw.utils.stringifyList(['$:/temp/tmap/currentTiddler'])
        });
      });

      /**
       * Changes:
       * 1. Group styles for matches and neighbours are now modulized
       *    and stored as node-types.
       * 2. vis user configuration is restored unflattened!
       *    The user only interacts through the GUI.
       * 3. If the node id field was "id" it is moved to tmap.id
       */
      this.executeUpgrade('0.9.0', meta.dataStructureState, function () {

        var confRef = env.ref.visUserConf;
        var userConf = _utils2.default.unflatten(_this.wiki.getTiddlerData(confRef, {}));

        if (_typeof(userConf.groups) === 'object') {

          var type = _NodeType2.default.getInstance('tmap:neighbour');
          type.setStyle(userConf.groups['neighbours']);
          type.save();

          delete userConf.groups;
          _this.wiki.setTiddlerData(confRef, userConf);
        }
      });

      /**
       * Changes:
       * 1. The node id field is moved to tmap.id if **original version**
       *    is below v0.9.2.
       */
      this.fixId();

      /**
       * This will ensure that all node types have a prioritization field
       * set.
       */
      this.executeUpgrade('0.9.16', meta.dataStructureState, function () {

        for (var i = _this.glNTy.length; i--;) {
          _this.glNTy[i].save(null, true);
        }
      });

      /**
       * Fixes the live tab
       */
      this.executeUpgrade('0.10.3', meta.dataStructureState, function () {

        var liveTab = env.ref.liveTab;
        if (_utils2.default.getTiddler(liveTab).hasTag('$:/tags/SideBar')) {
          this.wiki.deleteTiddler(liveTab);
          _utils2.default.setField(liveTab, 'tags', '$:/tags/SideBar');
        }
      });

      /**
       * 1) Fixes the edge type filter. Before, an empty filter was
       * treated as default filter, i.e. no links and tags shown.
       * Now an empty filter means that we show all edge types.
       *
       * 2) Adds prefix to hide private edges per default
       *
       * 3) Corrects view-namespaces (formerly stored with colon).
       *
       */
      this.executeUpgrade('0.11.0', meta.dataStructureState, function () {

        var views = _utils2.default.getMatches(env.selector.allViews);

        for (var i = views.length; i--;) {

          var view = new _ViewAbstraction2.default(views[i]);
          var eTyFilter = view.getEdgeTypeFilter('raw');
          var confKey = 'edge_type_namespace';
          view.setConfig(confKey, view.getConfig(confKey));

          var f = env.filter.defaultEdgeTypeFilter;

          if (eTyFilter) {

            // remove any occurences of the egde type path prefix
            var edgeTypePath = env.path.edgeTypes;
            eTyFilter = _utils2.default.replaceAll(eTyFilter, '', [edgeTypePath, edgeTypePath + '/', '[prefix[' + edgeTypePath + ']]', '[prefix[' + edgeTypePath + '/]]', ['[suffix[tw-body:link]]', '[[tw-body:link]]'], ['[suffix[tw-list:tags]]', '[[tw-list:tags]]'], ['[suffix[tw-list:list]]', '[[tw-body:list]]'], ['[suffix[tmap:unknown]]', '[[tmap:unknown]]'], ['[suffix[unknown]]', '[[tmap:unknown]]']]);

            f = '-[prefix[_]] ' + eTyFilter;
          }

          view.setEdgeTypeFilter(f);
        }
      });
    }
  }]);

  return Fixer;
}();

/*** Exports *******************************************************/

exports.default = Fixer;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/Fixer.js.map
