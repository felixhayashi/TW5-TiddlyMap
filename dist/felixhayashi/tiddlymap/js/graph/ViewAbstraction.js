'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _environment = require('$:/plugins/felixhayashi/tiddlymap/js/lib/environment');

var env = _interopRequireWildcard(_environment);

var _exception = require('$:/plugins/felixhayashi/tiddlymap/js/exception');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*** Code **********************************************************/

/**
 * This class abstracts the various pieces that together make up the
 * view such as map, edge filter, node filter, config etc.
 * If {@code isCreate} is not specified, the viewAbstraction will only
 * represent the view and not create it or any missing part of it.
 */
var ViewAbstraction = function () {

  /**
   *
   * @param {string|ViewAbstraction|Tiddler} view - The view
   * @param {Object} options
   * @param {boolean} [options.isCreate] - True if the view should be created and override
   *     any existing view, false otherwise.
   */
  function ViewAbstraction(view) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, ViewAbstraction);

    if (view instanceof ViewAbstraction) {

      // bounce back the object we received
      return view;
    }

    this._registerPaths(view);

    if (options.isCreate) {

      if (!this.configTRef) {

        var name = _utils2.default.getRandomLabel({ plural: true });
        this.configTRef = $tw.wiki.generateNewTitle($tm.path.views + '/' + name);
      }

      this._createView(options);
    } else if (!ViewAbstraction.exists(this.getRoot())) {
      // no valid config path

      throw new ResourceNotFoundException('ViewAbstraction', view);
    }

    // force complete rebuild
    this._rebuildCache();
  }

  /**
   * Returns true if this view cannot be edited.
   * As a general rule, all views that come as plugins are locked.
   *
   * @return {boolean}
   */


  _createClass(ViewAbstraction, [{
    key: 'isLocked',
    value: function isLocked() {

      return $tw.wiki.isShadowTiddler(this.configTRef);
    }

    /**
     * Gives the view a chance to rebuild its properties cache.
     *
     * @param {Updates} updates
     * @return {boolean} True if changes affect parts of the view.
     */

  }, {
    key: 'update',
    value: function update(updates) {
      var changedTiddlers = updates.changedTiddlers;


      if (updates[env.path.edgeTypes] || _utils2.default.hasKeyWithPrefix(changedTiddlers, this.getRoot())) {

        this._rebuildCache();

        return true;
      }

      return false;
    }

    /**
     * clones the tiddler denoted via tRef and uses it as placeholder
     * for this view when a widget using this view is displayed in
     * static mode
     *
     * @param {Tiddler} tiddler
     */

  }, {
    key: 'addPlaceholder',
    value: function addPlaceholder(tiddler) {

      _utils2.default.cp(_utils2.default.getTiddler(tiddler), this.snapshotTRef, true);
    }

    /**
     * A view exists if the the view's root exists as tiddler in the store.
     *
     * @deprecated
     *
     * @return {boolean}
     */

  }, {
    key: 'exists',
    value: function exists() {

      return ViewAbstraction.exists(this);
    }

    /**
     * The path to the config tiddler that represents the view.
     *
     * @return {TiddlerReference}
     */

  }, {
    key: 'getRoot',
    value: function getRoot() {

      return this.configTRef;
    }

    /**
     * Returns this view's creation date.
     *
     * @param {boolean} [asString] True if the returned value should be a string in any case.
     * @return {string|object|undefined} The creation date in the specified output format.
     */

  }, {
    key: 'getCreationDate',
    value: function getCreationDate(asString) {

      var date = $tw.wiki.getTiddler(this.configTRef).fields['created'];

      if (asString) {
        // note: th will be translated as well!
        return date instanceof Date ? $tw.utils.formatDateString(date, 'DDth MMM YYYY') : '';
      }

      return date;
    }

    /**
     * The label of the view (which is basically the root-path's basename).
     *
     * @return {string} The label (name) of the view.
     */

  }, {
    key: 'getLabel',
    value: function getLabel() {

      return _utils2.default.getBasename(this.configTRef);
    }

    /**
     * Method to remove the view and its configuration.
     * It will make the view non-existent.
     *
     * Note: Do not use the object anymore after you called this function!
     */

  }, {
    key: 'destroy',
    value: function destroy() {

      // delete the view and all tiddlers stored in its path (map, edge-filter etc.)
      _utils2.default.deleteTiddlers(_utils2.default.getMatches('[prefix[' + this.configTRef + ']]'));
    }

    /**
     * Returns all tiddlers include tiddlymap widgets that reference this view.
     */

  }, {
    key: 'getOccurrences',
    value: function getOccurrences() {

      var filter = '[regexp:text[<\\$(tiddlymap|tmap).*?view=.' + this.getLabel() + '..*?>]]';
      return _utils2.default.getMatches(filter);
    }

    /**
     * Renames the view.
     *
     * @param {string} newLabel
     * @return {boolean}
     */

  }, {
    key: 'rename',
    value: function rename(newLabel) {

      if (typeof newLabel !== 'string') {

        return false;
      }

      if (_utils2.default.inArray('/', newLabel)) {

        $tm.notify('A view name must not contain any "/"');

        return false;
      }

      // keep a reference to the old label before we change it
      var oldLabel = this.getLabel();

      // start the renaming
      var newRoot = env.path.views + '/' + newLabel;
      var oldRoot = this.getRoot();

      _utils2.default.mv(oldRoot, newRoot, true);

      // update references

      if ($tm.config.sys.defaultView === oldLabel) {
        _utils2.default.setEntry($tm.ref.sysUserConf, 'defaultView', newLabel);
      }

      if ($tm.config.sys.liveTab.fallbackView === oldLabel) {
        _utils2.default.setEntry($tm.ref.sysUserConf, 'liveTab.fallbackView', newLabel);
      }

      $tw.wiki.each(function (tObj, tRef) {

        if (tObj.fields['tmap.open-view'] === oldLabel) {

          // update global node data fields referencing this view
          _utils2.default.setField(tRef, 'tmap.open-view', newLabel);

          return;
        }

        if (ViewAbstraction.exists(tRef)) {

          // update all local node data referencing this view
          var view = new ViewAbstraction(tRef);
          var nodes = view.getNodeData();

          for (var id in nodes) {
            if (nodes[id]['open-view'] === oldLabel) {
              nodes[id]['open-view'] = newLabel;
            }
          }

          view.saveNodeData(nodes);
        }
      });

      this._registerPaths(newLabel);
      this._rebuildCache();
    }

    /**
     * All configurations that are toggled via checkboxes to have a value
     * either `true` or `false` can be accessed via this method.
     *
     * @param {string} name - The configs name without the `_config` prefix.
     * @return {boolean} True if the configuration is enabled, false otherwise.
     */

  }, {
    key: 'isEnabled',
    value: function isEnabled(name) {

      return _utils2.default.isTrue(this.getConfig(name), false);
    }

    /**
     * Returns a configuration value relating to the given name. If no name
     * is given, an object with all configurations is returned.
     *
     * @param {string} [name] - Instead of all configurations being returned,
     *     only the configuration named name is returned. The initial "config."
     *     may be omitted.
     * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
     * @result {string|Object} If `type` is not specified an object containing
     *     all configurations is returned, otherwise a single value will be returned.
     */

  }, {
    key: 'getConfig',
    value: function getConfig(name, isRebuild) {

      var config = void 0;

      if (!isRebuild && this.config) {

        config = this.config;
      } else {

        var fields = _utils2.default.getTiddler(this.configTRef).fields;
        config = _utils2.default.getPropertiesByPrefix(fields, 'config.');
      }

      var prefixlessName = name && _utils2.default.startsWith(name, 'config.') ? name : 'config.' + name;

      return name ? config[prefixlessName] : config;
    }

    /**
     * Enables the api user to modify the view's configuration.
     *
     * In case two arguments are provided, the first is assumed to be the property
     * name and the second the value to be set.
     *
     * In case a single object is provided as argument, it is treated as a key-value
     * collection and each property in this object is saved as config.
     *
     * @param {*} args
     */

  }, {
    key: 'setConfig',
    value: function setConfig() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (args[0] == null) {
        // null or undefined

        return;
      }

      if (args.length === 1 && _typeof(args[0]) === 'object') {

        for (var prop in args[0]) {
          this.setConfig(prop, args[0][prop]);
        }
      } else if (args.length === 2 && typeof args[0] === 'string') {

        var _prop = _utils2.default.getWithoutPrefix(args[0], 'config.');
        var val = args[1];

        if (val === undefined) {

          return;
        }

        if (val === null) {

          $tm.logger('debug', 'Removing config', _prop);
          delete this.config['config.' + _prop];
        } else {

          if (_prop === 'edge_type_namespace') {
            var match = val.match(/[^:]+/);
            val = match ? match[0] : '';
          }
        }

        $tm.logger('log', 'Setting config', _prop, val);
        this.config['config.' + _prop] = val;
      } else {
        // not allowed

        throw new (Function.prototype.bind.apply(_exception.InvalidArgumentException, [null].concat(args)))();
      }

      // save
      $tw.wiki.addTiddler(new $tw.Tiddler(_utils2.default.getTiddler(this.configTRef), this.config));
    }

    /**
     * Whether this view represents the 'live view'
     *
     * @return {boolean}
     */

  }, {
    key: 'isLiveView',
    value: function isLiveView() {

      return this.getLabel() === $tm.misc.liveViewLabel;
    }

    /**
     * Whether the node is already explicitly contained in the view's node filter,
     * i.e. whether it is explicitly referenced by its title.
     *
     * @private
     *
     * @param {Node} node
     * @return {string}
     */

  }, {
    key: '_isNodeIncludedById',
    value: function _isNodeIncludedById(node) {

      var regex = $tw.utils.escapeRegExp(ViewAbstraction._getNodeIdFilterPart(node));

      return this.getNodeFilter('raw').match(regex);
    }

    /**
     * Sets and rebuilds the node filter according to the expression provided.
     *
     * @param {string} expr - A tiddlywiki filter expression.
     * @param {boolean} force
     */

  }, {
    key: 'setNodeFilter',
    value: function setNodeFilter(expr, force) {

      expr = expr.replace(/[\n\r]/g, ' ');

      if (this.getNodeFilter('raw') === expr) {
        // already up to date;
        // This check is critical to prevent recursion!
        return;
      }

      if (this.isLiveView() && !force) {

        $tm.notify('You must not change the live view\'s node filter!');

        return;
      }

      _utils2.default.setField(this.nodeFilterTRef, 'filter', expr);

      $tm.logger('debug', 'Node filter set to', expr);

      // this register new filter
      this.nodeFilter = this.getNodeFilter(null, true);
    }

    /**
     * Sets and rebuilds the edge type filter according to the expression provided.
     *
     * @param {string} expr - A tiddlywiki filter expression.
     */

  }, {
    key: 'setEdgeTypeFilter',
    value: function setEdgeTypeFilter(expr) {

      expr = expr.replace(/[\n\r]/g, ' ');

      if (this.getEdgeTypeFilter('raw') === expr) {
        // already up to date
        // This check is critical to prevent recursion!
        return;
      }

      _utils2.default.setField(this.edgeTypeFilterTRef, 'filter', expr);

      $tm.logger('debug', 'Edge filter set to', expr);

      // this register new filter
      this.edgeTypeFilter = this.getEdgeTypeFilter(null, true);
    }

    /**
     * Method to append a filter part to the current filter (*or*-style).
     * The node's tmap.id will be used in the filter to reference the corresponding tiddler.
     *
     * @param {Node} node
     */

  }, {
    key: 'addNode',
    value: function addNode(node) {

      if (!this._isNodeIncludedById(node)) {

        var part = ViewAbstraction._getNodeIdFilterPart(node);
        var separator = ' ';
        this.setNodeFilter(this.getNodeFilter('raw') + separator + part);

        this.saveNodePosition(node);
      }
    }

    /**
     * Removes a node from the the view filter that has been
     * explicitly added before.
     *
     * ATTENTION: Never remove the node data (i.e. style and positions)
     * from the node-data store. This will be done by a garbage
     * collector. See Adapter.prototype._removeObsoleteViewData
     *
     * @return {boolean} True if node was removed, false otherwise.
     *     Note: false is also returned if the node did not exist before.
     */

  }, {
    key: 'removeNode',
    value: function removeNode(nodeId) {

      if (!this._isNodeIncludedById(nodeId)) {

        return false;
      }

      var part = ViewAbstraction._getNodeIdFilterPart(nodeId);
      var f = this.getNodeFilter('raw').replace(part, '');

      this.setNodeFilter(f);

      if (this.nodeData[nodeId]) {
        this.saveNodeData(nodeId, null);
      }

      return true;
    }

    /**
     * Method will return a tiddlywiki edge-type filter that is used to
     * decide which edge types are displayed by the graph.
     *
     * Note: needs to be recalculated if the collection of edge types changed
     * in the wiki.
     *
     * @param {("raw"|"pretty"|"matches"|"whitelist")} [type]
     *     Use this param to control the output type.
     * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
     * @result {*}
     *     Depends on the type param:
     *     - raw: the original filter string
     *     - pretty: the prettyfied filter string for usage in textareas
     *     - matches: {Array<string>} all matches
     *     - whitelist: A lookup table where all matches are true
     */

  }, {
    key: 'getEdgeTypeFilter',
    value: function getEdgeTypeFilter(type, isRebuild) {

      var filter = void 0;

      if (!isRebuild && this.edgeTypeFilter) {

        filter = this.edgeTypeFilter;
      } else {

        var allETy = $tm.indeces.allETy;
        var src = Object.keys(allETy);
        var tObj = $tw.wiki.getTiddler(this.edgeTypeFilterTRef);

        filter = {};
        filter.raw = tObj && tObj.fields.filter || '';
        filter.pretty = _utils2.default.getPrettyFilter(filter.raw);
        filter.matches = _utils2.default.getEdgeTypeMatches(filter.raw, allETy);
        filter.whitelist = _utils2.default.getLookupTable(filter.matches);
      }

      return type ? filter[type] : filter;
    }

    /**
     * Whether or not this EdgeType is visible in this view.
     *
     * @param {EdgeType|string} id
     * @return {*}
     */

  }, {
    key: 'isEdgeTypeVisible',
    value: function isEdgeTypeVisible(id) {

      return _utils2.default.isEdgeTypeMatch(_EdgeType2.default.getInstance(id).id, this.edgeTypeFilter.raw);
    }

    /**
     * Method will return a tiddlywiki node filter that is used to
     * decide which nodes are displayed by the graph.
     *
     * @param {("raw"|"pretty"|"compiled")} [type] - Use this param to control the output type.
     * @param {boolean} [isRebuild=false] - True if to rebuild the cache, false otherwise.
     * @result {*}
     *     Depends on the type param:
     *     - raw: the original filter string
     *     - pretty: the prettyfied filter string for usage in textareas
     *     - compiled: {Array<string>} all matches
     */

  }, {
    key: 'getNodeFilter',
    value: function getNodeFilter(type) {
      var isRebuild = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;


      var filter = void 0;

      if (!isRebuild && this.nodeFilter) {

        filter = this.nodeFilter;
      } else {

        filter = _utils2.default.makeHashMap();
        var tObj = $tw.wiki.getTiddler(this.nodeFilterTRef);

        filter.raw = tObj && tObj.fields.filter || '';
        filter.pretty = _utils2.default.getPrettyFilter(filter.raw);
        filter.compiled = $tw.wiki.compileFilter(filter.raw);
      }

      return type ? filter[type] : filter;
    }

    /**
     * This method will return the node data stored in the view.
     *
     * @todo When to delete obsolete data?
     *
     * @param {string} nodeId
     * @param {boolean} [isRebuild] - True if to rebuild the cache, false otherwise.
     * @result {Hashmap<Id, Object>} A Hashmap with node data.
     */

  }, {
    key: 'getNodeData',
    value: function getNodeData(nodeId, isRebuild) {

      var data = !isRebuild && this.nodeData ? this.nodeData : _utils2.default.parseFieldData(this.mapTRef, 'text', {});

      return nodeId ? data[nodeId] : data;
    }

    /**
     * A view equals another view either
     *
     * 1) if the js objects reference the same objects in the js runtime
     * 2) or if the views have the same root and both views exist
     *
     * @param view
     * @return {boolean}
     */

  }, {
    key: 'equals',
    value: function equals(view) {

      return view === this || ViewAbstraction.exists(view) && new ViewAbstraction(view).getRoot() === this.getRoot();
    }

    /**
     * This function will merge the given data in the view's node store.
     *
     * If a property is set to null, it will be removed.
     *
     * If two arguments are provided, the first parameter is assumed
     * to be a node id and the second to be the data object. The data
     * will extend the existing data. If data is not an object, it is
     * assumed to be a delete directive and consequently the node data
     * in the store will be deleted.
     *
     * Otherwise, if a single object parameter is provided, it is regarded
     * as a node collection and the whole object is used to extend the store.
     *
     * Note: The Adapter will routinely delete node content of nodes that are
     * not contained in the view anymore.
     */

  }, {
    key: 'saveNodeData',
    value: function saveNodeData() {

      var data = this.getNodeData();

      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      if (args.length === 2) {

        if (_typeof(args[1]) === 'object') {

          if (args[1] === null) {

            delete data[args[0]];
          } else {

            data[args[0]] = Object.assign(data[args[0]] || {}, args[1]);
          }
        }
      } else if (args.length === 1 && _typeof(args[0]) === 'object') {

        $tm.logger('log', 'Storing data in', this.mapTRef);

        Object.assign(data, args[0]);
      } else {
        // not allowed

        throw new (Function.prototype.bind.apply(_exception.InvalidArgumentException, [null].concat(args)))();
      }

      _utils2.default.writeFieldData(this.mapTRef, 'text', data, $tm.config.sys.jsonIndentation);

      // register new values
      this.nodeData = data;
    }

    /**
     * Saves a node's position to the store
     *
     * @param {Node} node
     */

  }, {
    key: 'saveNodePosition',
    value: function saveNodePosition(node) {

      if (node.id && node.x != null && node.y != null) {
        // only pass coordinates to prevent other data from being stored!
        this.saveNodeData(node.id, { x: node.x, y: node.y });
      }
    }

    /**
     * Saves a node's position to the store
     *
     * @param {Object} positions
     */

  }, {
    key: 'saveNodePositions',
    value: function saveNodePositions(positions) {
      var nodeData = this.nodeData;


      for (var id in positions) {

        nodeData[id] = nodeData[id] || {};
        nodeData[id].x = positions[id].x;
        nodeData[id].y = positions[id].y;
      }

      this.saveNodeData(nodeData);
    }

    /**
     * Marks the node with the given id as central topic.
     *
     * @param nodeId
     */

  }, {
    key: 'setCentralTopic',
    value: function setCentralTopic(nodeId) {

      this.setConfig('central-topic', nodeId);
    }

    /**
     * Saves the provided style for the node with the specified id in the view's store.
     *
     * Note: The coordinates of the node on the map are not stored via this function.
     * For this task, use saveNodePosition() instead.
     *
     * @param {string} nodeId
     * @param {Object} style
     */

  }, {
    key: 'saveNodeStyle',
    value: function saveNodeStyle(nodeId, style) {

      // remove any previos style from store;
      // @TODO: optimize this only null in style var needs to be removed
      var data = this.getNodeData(nodeId) || {};

      var pos = { x: data.x, y: data.y };

      // tabula rasa! delete all previous properties
      for (var p in data) {
        delete data[p];
      }

      // save new style
      this.saveNodeData(nodeId, _extends({}, style, pos));
    }

    /**
     * The view's configTiddlerRef is stored in different tiddlers (paths).
     * This function registers these paths to this the view instance.
     *
     * @private
     * @params {ViewAbstraction|string} view
     */

  }, {
    key: '_registerPaths',
    value: function _registerPaths(view, isCreate) {

      // main config is stored here
      this.configTRef = ViewAbstraction._getRootPath(view);

      // store for node properties (positions and local node styles)
      this.mapTRef = this.configTRef + '/map';

      // filter stores
      this.nodeFilterTRef = this.configTRef + '/filter/nodes';
      this.edgeTypeFilterTRef = this.configTRef + '/filter/edges';

      this.snapshotTRef = this.getRoot() + '/snapshot';
    }

    /**
     * Will create the config tiddler which means that the view will
     * start to exist.
     *
     * @private
     */

  }, {
    key: '_createView',
    value: function _createView() {
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          isForce = _ref.isForce,
          protoView = _ref.protoView,
          isHidden = _ref.isHidden;

      // destroy any former view that existed in this path
      if (ViewAbstraction.exists(this)) {

        if (!isForce) {

          return;
        }

        this.destroy();
      }

      if (ViewAbstraction.exists(protoView)) {
        _utils2.default.cp(new ViewAbstraction(protoView).getRoot(), this.configTRef, true);
      }

      // create new view
      var fields = {
        title: this.configTRef,
        id: _utils2.default.genUUID() };

      if (!isHidden) {
        fields[$tm.field.viewMarker] = true;
      }

      $tw.wiki.addTiddler(new $tw.Tiddler(_utils2.default.getTiddler(this.configTRef), // in case we cloned the view
      fields));

      this.setEdgeTypeFilter(env.filter.defaultEdgeTypeFilter);
    }

    /**
     * This method will rebuild the cache.
     *
     * @private
     * @return {boolean} true if the cache was dirty, false if cache was up-to-date and did
     */

  }, {
    key: '_rebuildCache',
    value: function _rebuildCache() {

      this.config = this.getConfig(null, true);
      this.nodeData = this.getNodeData(null, true);
      this.nodeFilter = this.getNodeFilter(null, true);
      this.edgeTypeFilter = this.getEdgeTypeFilter(null, true);
    }

    /**
     * Will return a filter part that matches the node's id.
     *
     * E.g. [field:tmap.id[1748576e-74bb-4165-85bb-0d312e3e4f1f]]
     *
     * @private
     *
     * @param node
     * @return {string}
     */

  }], [{
    key: '_getNodeIdFilterPart',
    value: function _getNodeIdFilterPart(node) {

      var id = (typeof node === 'undefined' ? 'undefined' : _typeof(node)) === 'object' ? node.id : node;

      return '[field:tmap.id[' + id + ']]';
    }

    /**
     * Will return the path to the config tiddler of this view, aka the view's root.
     *
     * @private
     *
     * @param {*} view - The constructor param to abstract or create the view.
     * @result {string|undefined} The view config path.
     */

  }, {
    key: '_getRootPath',
    value: function _getRootPath(view) {

      if (view instanceof ViewAbstraction) {

        return view.configTRef;
      }

      if (view instanceof $tw.Tiddler) {
        // is a tiddler object

        view = view.fields.title;
      }

      if (typeof view === 'string') {

        // remove prefix and slash
        var label = _utils2.default.getWithoutPrefix(view, $tm.path.views + '/');

        // a valid label must not contain any slashes
        if (label && !_utils2.default.hasSubString(label, '/')) {

          return $tm.path.views + '/' + label;
        }
      }
    }

    /**
     * A view exists if the the view's root exists as tiddler in the store.
     *
     * @return {ViewAbstraction|string}
     */

  }, {
    key: 'exists',
    value: function exists(view) {

      if (!view) {

        return false;
      }

      if (view instanceof ViewAbstraction) {

        view = view.configTRef;
      } else {

        view = ViewAbstraction._getRootPath(view);
      }

      return _utils2.default.tiddlerExists(view);
    }
  }]);

  return ViewAbstraction;
}();

/*** Exports *******************************************************/

exports.default = ViewAbstraction;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/graph/ViewAbstraction.js.map
