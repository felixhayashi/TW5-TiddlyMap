'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tiddlymap = exports.tmap = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _CallbackManager = require('$:/plugins/felixhayashi/tiddlymap/js/CallbackManager');

var _CallbackManager2 = _interopRequireDefault(_CallbackManager);

var _ViewAbstraction = require('$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction');

var _ViewAbstraction2 = _interopRequireDefault(_ViewAbstraction);

var _EdgeType = require('$:/plugins/felixhayashi/tiddlymap/js/EdgeType');

var _EdgeType2 = _interopRequireDefault(_EdgeType);

var _Popup = require('$:/plugins/felixhayashi/tiddlymap/js/Popup');

var _Popup2 = _interopRequireDefault(_Popup);

var _vis = require('$:/plugins/felixhayashi/vis/vis.js');

var _vis2 = _interopRequireDefault(_vis);

var _widget = require('$:/core/modules/widgets/widget.js');

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _SelectionRectangle = require('$:/plugins/felixhayashi/tiddlymap/js/lib/SelectionRectangle');

var _SelectionRectangle2 = _interopRequireDefault(_SelectionRectangle);

var _environment = require('$:/plugins/felixhayashi/tiddlymap/js/lib/environment');

var env = _interopRequireWildcard(_environment);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/MapWidget
type: application/javascript
module-type: widget

@preserve

\*/

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * The map widget is responsible for drawing the actual network
 * diagrams.
 *
 * @constructor
 */
var MapWidget = function (_Widget) {
  _inherits(MapWidget, _Widget);

  function MapWidget(parseTreeNode, options) {
    _classCallCheck(this, MapWidget);

    // create shortcuts for services and frequently used vars
    var _this = _possibleConstructorReturn(this, (MapWidget.__proto__ || Object.getPrototypeOf(MapWidget)).call(this, parseTreeNode, options));

    _this.getAttr = _this.getAttribute;
    _this.isDebug = _utils2.default.isTrue($tm.config.sys.debug, false);

    // force early binding of functions to this context
    _utils2.default.bindTo(_this, ['constructTooltip', 'handleResizeEvent', 'handleClickEvent', 'handleCanvasKeyup', 'handleCanvasKeydown', 'handleCanvasScroll', 'handleCanvasMouseMove', 'handleWidgetKeyup', 'handleWidgetKeydown', 'handleTriggeredRefresh', 'handleContextMenu']);

    // instanciate managers
    _this.callbackManager = new _CallbackManager2.default();

    // make the html attributes available to this widget
    _this.computeAttributes();
    _this.editorMode = _this.getAttr('editor');
    _this.clickToUse = _utils2.default.isTrue(_this.getAttr('click-to-use'), false);

    // who am I? the id is used for debugging and special cases
    _this.id = _this.getAttr('object-id') || _this.getStateQualifier();

    _this.widgetPopupsPath = $tm.path.tempPopups + '/' + _this.id;

    // register listeners that are available in editor mode
    if (_this.editorMode) {
      _utils2.default.addTWlisteners({
        'tmap:tm-create-view': _this.handleCreateView,
        'tmap:tm-rename-view': _this.handleRenameView,
        'tmap:tm-delete-view': _this.handleDeleteView,
        'tmap:tm-delete-element': _this.handleDeleteElement,
        'tmap:tm-edit-view': _this.handleEditView,
        'tmap:tm-generate-widget': _this.handleGenerateWidget,
        'tmap:tm-toggle-central-topic': _this.handleSetCentralTopic,
        'tmap:tm-save-canvas': _this.handleSaveCanvas
      }, _this, _this);
    }

    // register listeners that are available in any case
    _utils2.default.addTWlisteners({
      'tmap:tm-focus-node': _this.handleFocusNode,
      'tmap:tm-reset-focus': _this.repaintGraph
    }, _this, _this);

    // Visjs handlers
    _this.visListeners = {
      'click': _this.handleVisSingleClickEvent,
      'doubleClick': _this.handleVisDoubleClickEvent,
      'stabilized': _this.handleVisStabilizedEvent,
      'selectNode': _this.handleVisSelectNode,
      'deselectNode': _this.handleVisDeselectNode,
      'dragStart': _this.handleVisDragStart,
      'dragEnd': _this.handleVisDragEnd,
      'hoverNode': _this.handleVisHoverElement,
      'hoverEdge': _this.handleVisHoverElement,
      'blurNode': _this.handleVisBlurElement,
      'blurEdge': _this.handleVisBlurElement,
      'beforeDrawing': _this.handleVisBeforeDrawing,
      'afterDrawing': _this.handleVisAfterDrawing,
      'stabilizationProgress': _this.handleVisLoading,
      'stabilizationIterationsDone': _this.handleVisLoadingDone
    };

    _this.windowDomListeners = {
      'resize': [_this.handleResizeEvent, false],
      'click': [_this.handleClickEvent, false],
      'mousemove': [_this.handleCanvasMouseMove, true]
    };

    _this.canvasDomListeners = {
      'keyup': [_this.handleCanvasKeyup, true],
      'keydown': [_this.handleCanvasKeydown, true],
      'mousewheel': [_this.handleCanvasScroll, true],
      'DOMMouseScroll': [_this.handleCanvasScroll, true],
      'contextmenu': [_this.handleContextMenu, true]
    };

    _this.widgetDomListeners = {
      'keyup': [_this.handleWidgetKeyup, true],
      'keydown': [_this.handleWidgetKeydown, true]
    };

    _this.conVector = { from: null, to: null };
    return _this;
  }

  /**
   * This handler will open a dialog that allows the user to create a
   * new relation between two edges. This includes, that the user
   * gets a chance to specify the edgetype of the connection.
   *
   * If an edge-type namespace has been declared for the entire view,
   * then add it to the `id` of the specified type…
   *   - …if the type doesn't exist yet.
   *   - …if the type doesn't contain a namespace already, regardless
   *     whether it exists or not.
   *
   * Once the user confirmed the dialog, the edge is persisted.
   *
   * Note: this should not trigger a zoom.
   *
   * @param {Edge} edge - A javascript object that contains at least
   *    the properties 'from' and 'to'
   * @param {function} [callback] - A function with the signature
   *    function(isConfirmed);
   */


  _createClass(MapWidget, [{
    key: 'handleConnectionEvent',
    value: function handleConnectionEvent(edge, callback) {
      var _this2 = this;

      var eTyFilter = this.view.getEdgeTypeFilter();

      var param = {
        fromLabel: $tm.adapter.selectNodeById(edge.from).label,
        toLabel: $tm.adapter.selectNodeById(edge.to).label,
        view: this.view.getLabel(),
        eTyFilter: eTyFilter.raw
      };

      $tm.dialogManager.open('getEdgeType', param, function (isConfirmed, outTObj) {

        if (isConfirmed) {

          var str = _utils2.default.getText(outTObj);
          var type = _EdgeType2.default.getInstance(str);

          if (!type.namespace) {
            var _EdgeType$getIdParts = _EdgeType2.default.getIdParts(type.id),
                marker = _EdgeType$getIdParts.marker,
                name = _EdgeType$getIdParts.name;

            var namespace = _this2.view.getConfig('edge_type_namespace');
            type = _EdgeType2.default.getInstance(_EdgeType2.default.getId(marker, namespace, name));
          }

          // persist the type if it doesn't exist
          if (!type.exists()) {
            type.save();
          }

          // add type to edge
          edge.type = type.id;
          $tm.adapter.insertEdge(edge);

          // prevent zoom
          _this2.isPreventZoomOnNextUpdate = true;

          if (!_this2.view.isEdgeTypeVisible(type)) {

            $tm.dialogManager.open('edgeNotVisible', {
              type: type.id,
              view: _this2.view.getLabel(),
              eTyFilter: eTyFilter.pretty
            });
          }
        }

        if (typeof callback === 'function') {
          callback(isConfirmed);
        }
      });
    }

    /**
     * The first time a map is opened, we want to display a welcome message.
     * Once shown, a flag is set and the message is not displayed again.
     */

  }, {
    key: 'checkForFreshInstall',
    value: function checkForFreshInstall() {

      if (!_utils2.default.getEntry($tm.ref.sysMeta, 'showWelcomeMessage', true)) {
        return;
      }

      _utils2.default.setEntry($tm.ref.sysMeta, 'showWelcomeMessage', false);

      var args = {
        dialog: {
          preselects: {
            "config.storyview": "true",
            "config.navigation": "true",
            "config.sidebar": "true",
            "config.demo": "true"
          }
        }
      };

      $tm.dialogManager.open('welcome', args, function (isConfirmed, outTObj) {

        var config = _utils2.default.getPropertiesByPrefix(outTObj.fields, 'config.', true);

        if (config['storyview'] && _utils2.default.tiddlerExists('$:/plugins/felixhayashi/topstoryview')) {
          _utils2.default.setText('$:/view', 'top');
        }

        if (config['navigation']) {
          _utils2.default.setText('$:/config/Navigation/openLinkFromInsideRiver', 'above');
          _utils2.default.setText('$:/config/Navigation/openLinkFromOutsideRiver', 'top');
        }

        if (config['sidebar']) {
          _utils2.default.setText('$:/themes/tiddlywiki/vanilla/options/sidebarlayout', 'fixed-fluid');
        }

        if (config['demo']) {
          var view = $tm.misc.defaultViewLabel;

          var n1 = $tm.adapter.insertNode({ label: 'Have fun with', x: 0, y: 0 }, view);
          var n2 = $tm.adapter.insertNode({ label: 'TiddlyMap!!', x: 100, y: 100 }, view);

          $tm.adapter.insertEdge({ from: n1.id, to: n2.id });
        }

        if (Object.keys(config).length) {
          // trigger a save and reload message
          _utils2.default.touch('$:/plugins/felixhayashi/tiddlymap');
        }
      });
    }

    /**
     * A very basic dialog that will tell the user he/she has to make
     * a choice.
     *
     * @param {function} [callback] - A function with the signature
     *     function(isConfirmed).
     * @param {string} [message] - An small optional message to display.
     */

  }, {
    key: 'openStandardConfirmDialog',
    value: function openStandardConfirmDialog(callback, message) {

      var param = { message: message };
      $tm.dialogManager.open('getConfirmation', param, callback);
    }

    /**
     * An extention of the default logger mechanism. It works like
     * `this.logger` but will include the object id of the widget
     * instance.
     *
     * @param {string} type - The type of the message (debug, info, warning…)
     *     which is exactly the same as in `console[type]`.
     * @param {...*} message - An infinite number of arguments to be printed
     *     (just like console).
     */

  }, {
    key: 'logger',
    value: function logger(type, message /*, more stuff*/) {

      if (this.isDebug) {

        var args = Array.prototype.slice.call(arguments, 1);
        args.unshift('@' + this.id);
        args.unshift(type);
        $tm.logger.apply(this, args);
      }
    }

    /**
     * Method to render this widget into the DOM.
     *
     * Note that we do not add this.domNode to the list of domNodes
     * since this widget does never remove itself during a refresh.
     *
     * @override
     */

  }, {
    key: 'render',
    value: function render(parent, nextSibling) {

      this.parentDomNode = parent;

      this.domNode = this.document.createElement('div');
      parent.insertBefore(this.domNode, nextSibling);

      // add widget classes
      this.registerClassNames(this.domNode);

      // get view and view holder
      this.viewHolderRef = this.getViewHolderRef();
      this.view = this.getView();

      // create the header div
      this.graphBarDomNode = this.document.createElement('div');
      $tw.utils.addClass(this.graphBarDomNode, 'tmap-topbar');
      this.domNode.appendChild(this.graphBarDomNode);

      // create body div
      this.graphDomNode = this.document.createElement('div');
      this.domNode.appendChild(this.graphDomNode);

      $tw.utils.addClass(this.graphDomNode, 'tmap-vis-graph');

      if (_utils2.default.isPreviewed(this) || this.domNode.isTiddlyWikiFakeDom) {

        $tw.utils.addClass(this.domNode, 'tmap-static-mode');
        this.renderPreview(this.graphBarDomNode, this.graphDomNode);
      } else {

        // render the full widget
        this.renderFullWidget(this.domNode, this.graphBarDomNode, this.graphDomNode);
      }
    }

    /**
     * When the widget is only previewed we do some alternative rendering.
     */

  }, {
    key: 'renderPreview',
    value: function renderPreview(header, body) {

      var snapshotTRef = this.view.getRoot() + '/snapshot';
      var snapshotTObj = _utils2.default.getTiddler(snapshotTRef);

      var label = this.document.createElement('span');
      label.innerHTML = this.view.getLabel();
      label.className = 'tmap-view-label';
      header.appendChild(label);

      if (snapshotTObj) {

        // Construct child widget tree
        var placeholder = this.makeChildWidget(_utils2.default.getTranscludeNode(snapshotTRef), true);
        placeholder.renderChildren(body, null);
      } else {

        $tw.utils.addClass(body, 'tmap-graph-placeholder');
      }
    }

    /**
     * The standard way of rendering.
     * Attention: BE CAREFUL WITH THE ORDER OF FUNCTION CALLS IN THIS FUNCTION.
     */

  }, {
    key: 'renderFullWidget',
    value: function renderFullWidget(widget, header, body) {

      // add window and widget dom node listeners
      _utils2.default.setDomListeners('add', window, this.windowDomListeners);
      _utils2.default.setDomListeners('add', widget, this.widgetDomListeners);

      // add a loading bar
      this.addLoadingBar(this.domNode);

      // prepare the tooltip for graph elements
      this.tooltip = new _Popup2.default(this.domNode, {
        className: 'tmap-tooltip',
        showDelay: $tm.config.sys.popups.delay
      });

      // prepare the context menu
      this.contextMenu = new _Popup2.default(this.domNode, {
        className: 'tmap-context-menu',
        showDelay: 0,
        hideOnClick: true,
        leavingDelay: 999999
      });

      // register
      this.sidebar = _utils2.default.getFirstElementByClassName('tc-sidebar-scrollable');
      this.isInSidebar = this.sidebar && !this.domNode.isTiddlyWikiFakeDom && this.sidebar.contains(this.domNode);

      // *first* inject the bar
      this.rebuildEditorBar(header);

      // *second* initialise graph variables and render the graph
      this.initAndRenderGraph(body);

      // register this graph at the caretaker's graph registry
      $tm.registry.push(this);

      // if any refresh-triggers exist, register them
      this.reloadRefreshTriggers();

      // maybe display a welcome message
      this.checkForFreshInstall();

      if (this.id === $tm.misc.mainEditorId) {

        var url = $tm.url;
        if (url && url.query['tmap-enlarged']) {

          this.toggleEnlargedMode(url.query['tmap-enlarged']);
          //~ this.setView(url.query['tmap-view']);
        }
      }
    }

    /**
     * Add some classes to give the user a chance to apply some css
     * to different graph modes.
     */

  }, {
    key: 'registerClassNames',
    value: function registerClassNames(parent) {

      var addClass = $tw.utils.addClass;

      // add main class
      addClass(parent, 'tmap-widget');

      if (this.clickToUse) {
        addClass(parent, 'tmap-click-to-use');
      }

      if (this.getAttr('editor') === 'advanced') {
        addClass(parent, 'tmap-advanced-editor');
      }

      if (this.getAttr('design') === 'plain') {
        addClass(parent, 'tmap-plain-design');
      }

      if (!_utils2.default.isTrue(this.getAttr('show-buttons'), true)) {
        addClass(parent, 'tmap-no-buttons');
      }

      if (this.getAttr('class')) {
        addClass(parent, this.getAttr('class'));
      }
    }

    /**
     * Adds a loading bar div below the parent.
     */

  }, {
    key: 'addLoadingBar',
    value: function addLoadingBar(parent) {

      this.graphLoadingBarDomNode = this.document.createElement('progress');
      $tw.utils.addClass(this.graphLoadingBarDomNode, 'tmap-loading-bar');
      parent.appendChild(this.graphLoadingBarDomNode);
    }

    /**
     * The editor bar contains a bunch of widgets that allow the user
     * to manipulate the current view.
     *
     * Attention: The Editor bar needs to render *after* the graph
     * because some elements depend on the graph's nodes which are
     * calculated when the network is created.
     *
     * @see https://groups.google.com/forum/#!topic/tiddlywikidev/sJrblP4A0o4
     * @see blob/master/editions/test/tiddlers/tests/test-wikitext-parser.js
     */

  }, {
    key: 'rebuildEditorBar',
    value: function rebuildEditorBar() {

      this.removeChildDomNodes();

      // register dialog variables

      var view = this.view;

      var unicodeBtnClass = 'tmap-unicode-button';
      var activeUnicodeBtnClass = unicodeBtnClass + ' tmap-active-button';
      var variables = {
        widgetQualifier: this.getStateQualifier(),
        widgetTempPath: this.widgetTempPath,
        widgetPopupsPath: this.widgetPopupsPath,
        isViewBound: String(this.isViewBound()),
        viewRoot: view.getRoot(),
        viewLabel: view.getLabel(),
        viewHolder: this.getViewHolderRef(),
        edgeTypeFilter: view.edgeTypeFilterTRef,
        allEdgesFilter: $tm.selector.allEdgeTypes,
        neighScopeBtnClass: view.isEnabled('neighbourhood_scope') ? activeUnicodeBtnClass : unicodeBtnClass,
        rasterMenuBtnClass: view.isEnabled('raster') ? activeUnicodeBtnClass : unicodeBtnClass
      };

      for (var name in variables) {
        this.setVariable(name, variables[name]);
      }

      // Construct the child widget tree
      var body = _utils2.default.getTiddlerNode(view.getRoot());

      if (this.editorMode === 'advanced') {

        body.children.push(_utils2.default.getTranscludeNode($tm.ref.graphBar));
      } else {

        var el = _utils2.default.getElementNode('span', 'tmap-view-label', view.getLabel());
        body.children.push(el);
      }

      body.children.push(_utils2.default.getTranscludeNode($tm.ref.focusButton));

      this.makeChildWidgets([body]);
      this.renderChildren(this.graphBarDomNode, this.graphBarDomNode.firstChild);
    }

    /**
     * This function is called by the system to notify the widget about
     * tiddler changes. It is ignored by TiddlyMap.
     *
     * ATTENTION: TiddlyMap doesn't use the refresh mechanism here.
     * The caretaker module dispatches an `updates` object that provides
     * more advanced information, tailored to the needs of TiddlyMap.
     * These updates are picked up by {@link MapWidget#update}.
     *
     * @override
     */

  }, {
    key: 'refresh',
    value: function refresh(changedTiddlers) {

      // TiddlyMap never needs a full refresh so we return false
      return false;
    }

    /**
     * This function is called by the caretaker module to notify the
     * widget about tiddler changes.
     *
     * TiddlyMap is interested in the following changes:
     *
     * - Callbacks have been triggered (e.g. dialog results)
     * - A view has been switched
     * - A view has been modified (= configured)
     * - Global options have changed
     * - Node- or edge-types have changed
     * - Graph elements have changed
     * - Changes to the graph's topbar
     *
     * @override
     * @see https://groups.google.com/d/msg/tiddlywikidev/hwtX59tKsIk/EWSG9glqCnsJ
     */

  }, {
    key: 'update',
    value: function update(updates) {

      if (!this.network || this.isZombieWidget() || _utils2.default.isPreviewed(this)) {
        return;
      }

      var changedTiddlers = updates.changedTiddlers;

      // check for callback changes

      this.callbackManager.refresh(changedTiddlers);

      if (this.isViewSwitched(changedTiddlers) // use changed view
      || this.hasChangedAttributes() // widget html code changed
      || updates[env.path.options] // global options changed
      || changedTiddlers[this.view.getRoot()] // view's main config changed
      ) {

          this.logger('warn', 'View switched config changed');

          this.isPreventZoomOnNextUpdate = false;
          this.view = this.getView(true);
          this.reloadRefreshTriggers();
          this.rebuildEditorBar();
          this.initAndRenderGraph(this.graphDomNode);
        } else {
        // view has not been switched

        // give the view a chance to refresh itself
        var isViewUpdated = this.view.hasUpdated(updates);

        if (isViewUpdated) {

          this.logger('warn', 'View components modified');

          this.rebuildEditorBar();
          this.reloadBackgroundImage();
          this.rebuildGraph({ resetFocus: { delay: 1000, duration: 1000 } });
        } else {
          // neither view switch or view modification

          if (updates[env.path.nodeTypes] || this.hasChangedElements(changedTiddlers)) {
            this.rebuildGraph();
          }

          // give children a chance to update themselves
          this.refreshChildren(changedTiddlers);
        }
      }
    }
  }, {
    key: 'hidePopups',
    value: function hidePopups(delay, isForce) {

      this.tooltip.hide(delay, isForce);
      this.contextMenu.hide(0, true);
    }

    /**
     * Refresh-triggers are tiddlers whose mere occurrence in the
     * changedTiddlers list forces tiddlymap to reassert
     * whether a filter expression returns the same set of matches as it
     * is currently displayed in the graph.
     *
     * The raison d'etre for refresh-triggers is that a filter may contain
     * implicit text-references or variables that may require a filter to be
     * reasserted even though, the filter expression itself did not change.
     *
     * For example a filter `[field:title{$:/HistoryList!!current-tiddler}]`
     * requires a `$:/HistoryList` refresh trigger to be added to the view so
     * everytime the `$:/HistoryList` tiddler changes, the filter gets
     * reasserted.
     */

  }, {
    key: 'reloadRefreshTriggers',
    value: function reloadRefreshTriggers() {

      // remove old triggers (if there are any)
      this.callbackManager.remove(this.refreshTriggers);

      // load new trigger list either from attribute or view config
      var str = this.getAttr('refresh-triggers') || this.view.getConfig('refresh-triggers');
      this.refreshTriggers = $tw.utils.parseStringArray(str) || [];

      this.logger('debug', 'Registering refresh trigger', this.refreshTriggers);

      // TODO: not nice, if more than one trigger changed it
      // will cause multiple reassertments
      for (var i = this.refreshTriggers.length; i--;) {
        this.callbackManager.add(this.refreshTriggers[i], this.handleTriggeredRefresh, false);
      }
    }

    /**
     * Calling this method will cause the graph to be rebuild, which means
     * the graph data is refreshed. A rebuild of the graph will always
     * cause the network to stabilize again.
     *
     * @param {Hashmap} [resetFocus=null] - If not false or null,
     *     this object requires two properties to be set: `delay` (the
     *     time to wait before starting the fit), `duration` (the length
     *     of the fit animation).
     */

  }, {
    key: 'rebuildGraph',
    value: function rebuildGraph() {
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          resetFocus = _ref.resetFocus;

      if (_utils2.default.isPreviewed(this)) {

        return;
      }

      this.logger('debug', 'Rebuilding graph');

      this.hidePopups(0, true);

      // always reset to allow handling of stabilized-event!
      this.hasNetworkStabilized = false;

      var changes = this.rebuildGraphData();

      if (changes.changedNodes.withoutPosition.length) {

        // force resetFocus
        resetFocus = resetFocus || { delay: 1000, duration: 1000 };

        if (!this.view.isEnabled('physics_mode')) {

          // in static mode we need to ensure that objects spawn
          // near center so we need to set physics from
          // zero to something. Yes, we override the users
          // central gravity value… who cares about central
          // gravity in static mode anyways.
          var physics = this.visOptions.physics;
          physics[physics.solver].centralGravity = 0.25;
          this.network.setOptions(this.visOptions);
        }
      }

      if (!_utils2.default.hasElements(this.graphData.nodesById)) {
        return;
      }

      if (resetFocus) {

        if (!this.isPreventZoomOnNextUpdate) {

          // see https://github.com/almende/vis/issues/987#issuecomment-113226216
          // see https://github.com/almende/vis/issues/939
          this.network.stabilize();
          this.resetFocus = resetFocus;
        }

        this.isPreventZoomOnNextUpdate = false;
      }
    }

    /**
     * WARNING: Do not change this functionname as it is used by the
     * caretaker's routinely checkups.
     */

  }, {
    key: 'getContainer',
    value: function getContainer() {

      return this.domNode;
    }

    /**
     *
     */

  }, {
    key: 'rebuildGraphData',
    value: function rebuildGraphData() {

      $tm.start('Reloading Network');

      var graph = $tm.adapter.getGraph({ view: this.view });

      var changedNodes = _utils2.default.refreshDataSet(this.graphData.nodes, // dataset
      graph.nodes // new nodes
      );

      var changedEdges = _utils2.default.refreshDataSet(this.graphData.edges, // dataset
      graph.edges // new edges
      );

      // create lookup tables

      this.graphData.nodesById = graph.nodes;
      this.graphData.edgesById = graph.edges;

      // TODO: that's a performance killer. this should be loaded when
      // the search is actually used!
      // update: Careful when refactoring, some modules are using this…
      _utils2.default.setField('$:/temp/tmap/nodes/' + this.view.getLabel(), 'list', $tm.adapter.getTiddlersByIds(graph.nodes));

      $tm.stop('Reloading Network');

      return { changedEdges: changedEdges, changedNodes: changedNodes };
    }
  }, {
    key: 'isViewBound',
    value: function isViewBound() {

      return _utils2.default.startsWith(this.getViewHolderRef(), $tm.path.localHolders);
    }

    /**
     * A view is switched, if the holder was changed.
     */

  }, {
    key: 'isViewSwitched',
    value: function isViewSwitched(changedTiddlers) {

      return changedTiddlers[this.getViewHolderRef()];
    }

    /**
     * A view is switched, if the holder was changed.
     */

  }, {
    key: 'hasChangedAttributes',
    value: function hasChangedAttributes() {

      return Object.keys(this.computeAttributes()).length;
    }

    /**
     * Rebuild or update the graph if one of the following is true:
     *
     * 1. A tiddler currently contained as node in the graph has been
     *    deleted or modified. This also includes tiddlers that are
     *    represented as neighbours in the graph.
     * 2. The neighbourhood is shown and a non-system tiddler has changed.
     * 3. A tiddler that matches the node filter has been modified
     *    (not deleted).
     *
     * Since edges are stored in tiddlers themselves, any edge modification
     * is always accounted for as in this case the tiddler holding the
     * edge would be included as changed tiddler.
     *
     * @param {Hashmap<TiddlerReference, *>} changedTiddlers - A list of
     *     tiddler changes.
     *
     * @return {boolean} true if the graph needs a refresh.
     */

  }, {
    key: 'hasChangedElements',
    value: function hasChangedElements(changedTiddlers) {

      var maybeMatches = [];
      var inGraph = this.graphData.nodesById;
      var isShowNeighbourhood = this.view.isEnabled('neighbourhood_scope');

      for (var tRef in changedTiddlers) {

        if (_utils2.default.isSystemOrDraft(tRef)) {

          continue;
        }

        if (inGraph[$tm.adapter.getId(tRef)] || isShowNeighbourhood) {

          return true;
        }

        if (changedTiddlers[tRef].modified) {
          // may be a match so we store this and process it later
          maybeMatches.push(tRef);
        }
      }

      if (maybeMatches.length) {

        var nodeFilter = this.view.getNodeFilter('compiled');
        var matches = _utils2.default.getMatches(nodeFilter, maybeMatches);

        return !!matches.length;
      }
    }

    /**
     * Rebuild the graph
     *
     * @see http://visjs.org/docs/network.html
     * @see http://visjs.org/docs/dataset.html
     */

  }, {
    key: 'initAndRenderGraph',
    value: function initAndRenderGraph(parent) {
      var _this3 = this;

      // make sure to destroy any previous instance
      if (this.network) {
        this._destructVis();
      }

      this.logger('info', 'Initializing and rendering the graph');

      if (!this.isInSidebar) {
        this.callbackManager.add('$:/state/sidebar', this.handleResizeEvent);
      }

      this.visOptions = this.getVisOptions();

      this.graphData = {
        nodes: new _vis2.default.DataSet(),
        edges: new _vis2.default.DataSet(),
        nodesById: _utils2.default.makeHashMap(),
        edgesById: _utils2.default.makeHashMap()
      };

      this.tooltip.setEnabled(_utils2.default.isTrue($tm.config.sys.popups.enabled, true));

      this.network = new _vis2.default.Network(parent, this.graphData, this.visOptions);
      // after vis.Network has been instantiated, we fetch a reference to
      // the canvas element
      this.canvas = parent.getElementsByTagName('canvas')[0];
      this.networkDomNode = _utils2.default.getFirstElementByClassName('vis-network', parent, true);
      // just to be sure
      this.canvas.tabIndex = 0;

      for (var event in this.visListeners) {
        this.network.on(event, this.visListeners[event].bind(this));
      }

      this.addGraphButtons({
        'fullscreen-button': function fullscreenButton() {
          _this3.toggleEnlargedMode('fullscreen');
        },
        'halfscreen-button': function halfscreenButton() {
          _this3.toggleEnlargedMode('halfscreen');
        }
      });

      _utils2.default.setDomListeners('add', this.canvas, this.canvasDomListeners);

      this.reloadBackgroundImage();
      this.rebuildGraph({
        resetFocus: { delay: 0, duration: 0 }
      });
      this.handleResizeEvent();
      this.canvas.focus();
    }
  }, {
    key: 'handleCanvasKeyup',
    value: function handleCanvasKeyup(ev) {
      var _this4 = this;

      var nodeIds = this.network.getSelectedNodes();

      // this.isCtrlKeyDown = ev.ctrlKey;

      if (ev.ctrlKey) {
        // ctrl key is hold down
        ev.preventDefault();

        if (ev.keyCode === 88) {
          // x
          if (this.editorMode) {
            this.handleAddNodesToClipboard('move');
          } else {
            $tm.notify('Map is read only!');
          }
        } else if (ev.keyCode === 67) {
          // c
          this.handleAddNodesToClipboard('copy');
        } else if (ev.keyCode === 86) {
          // v
          this.handlePasteNodesFromClipboard();
        } else if (ev.keyCode === 65) {
          // a
          var allNodes = Object.keys(this.graphData.nodesById);
          this.network.selectNodes(allNodes);
        } else if (ev.keyCode === 49 || ev.keyCode === 50) {
          // 1 || 2
          if (nodeIds.length !== 1) return;

          var role = ev.keyCode === 49 ? 'from' : 'to';
          $tm.notify(_utils2.default.ucFirst(role) + '-part selected');

          this.conVector[role] = nodeIds[0];
          if (this.conVector.from && this.conVector.to) {
            // create the edge
            this.handleConnectionEvent(this.conVector, function () {
              // reset both properties, regardless whether confirmed
              _this4.conVector = { from: null, to: null };
            });
          }
        }
      } else {
        // ctrl is not pressed

        if (ev.keyCode === 13) {
          // ENTER

          if (nodeIds.length !== 1) return;

          this.openTiddlerWithId(nodeIds[0]);
        }
      }
    }
  }, {
    key: 'handleCanvasKeydown',
    value: function handleCanvasKeydown(ev) {

      if (ev.keyCode === 46) {
        // delete
        ev.preventDefault();
        this.handleRemoveElements(this.network.getSelection());
      }
    }
  }, {
    key: 'handleDeleteElement',
    value: function handleDeleteElement(ev) {

      var id = ev.paramObject.id;
      var elements = id ? [id] : this.network.getSelectedNodes();

      this.handleRemoveElements({ nodes: elements });
    }

    /**
     *
     * @param ev
     */

  }, {
    key: 'handleCanvasMouseMove',
    value: function handleCanvasMouseMove(ev) {
      var network = this.network;


      if (!(ev.ctrlKey && ev.buttons)) {

        if (this.selectRect) {
          this.selectRect = null;
          var _selectedNodes = network.getSelectedNodes();
          $tm.notify(_selectedNodes.length + ' nodes selected');
          network.redraw();
        }

        return;
      }

      // prevent vis' network drag if ctrl key and mouse button is pressed
      ev.preventDefault();
      ev.stopPropagation();

      if (!this.domNode.contains(ev.target)) {
        // since we are using a global mouse listener, we need to check whether
        // we are actually inside our widget, so we stop updating the selectRect
        return;
      }

      var mouse = network.DOMtoCanvas({ x: ev.offsetX, y: ev.offsetY });

      if (!this.selectRect) {
        this.selectRect = new _SelectionRectangle2.default(mouse.x, mouse.y);
      }

      // register new coordinates
      this.selectRect.span(mouse.x, mouse.y);
      // retrieve current mouse positions
      var nodePositions = network.getPositions();
      // we include previously selected nodes in the new set
      var selectedNodes = network.getSelectedNodes();

      for (var id in nodePositions) {

        if (this.selectRect.isPointWithin(nodePositions[id]) && !_utils2.default.inArray(id, selectedNodes)) {
          selectedNodes.push(id);
        }
      }

      network.selectNodes(selectedNodes);
      this.assignActiveStyle(selectedNodes);

      network.redraw();
    }

    //https://github.com/almende/vis/blob/111c9984bc4c1870d42ca96b45d90c13cb92fe0a/lib/network/modules/InteractionHandler.js

  }, {
    key: 'handleCanvasScroll',
    value: function handleCanvasScroll(ev) {

      var isZoomAllowed = !!(this.isInSidebar || // e.g. the map editor in the sidebar
      ev.ctrlKey || this.enlargedMode || this.clickToUse && this.networkDomNode.classList.contains('vis-active'));

      var interaction = this.visOptions.interaction;

      var isVisSettingInSync = isZoomAllowed === interaction.zoomView;

      if (isZoomAllowed || !isVisSettingInSync) {
        ev.preventDefault();
      }

      if (!isVisSettingInSync) {
        // prevent visjs from reacting to this event as we first need to sync states
        ev.stopPropagation();

        interaction.zoomView = isZoomAllowed;
        this.network.setOptions({ interaction: { zoomView: isZoomAllowed } });

        return false;
      }
    }

    /**
     * Called when the user click on the canvas with the right
     * mouse button. A context menu is opened.
     */

  }, {
    key: 'handleContextMenu',
    value: function handleContextMenu(ev) {
      var _this5 = this;

      ev.preventDefault();

      var network = this.network;


      this.hidePopups(0, true);

      var nodeId = network.getNodeAt({ x: ev.offsetX, y: ev.offsetY });
      if (!nodeId) return;

      // ids of selected nodes
      var selectedNodes = network.getSelectedNodes();

      if (!_utils2.default.inArray(nodeId, selectedNodes)) {
        // unselect other nodes and select this one instead…
        selectedNodes = [nodeId];
        network.selectNodes(selectedNodes);
      }

      this.contextMenu.show(selectedNodes, function (selectedNodes, div) {

        var mode = selectedNodes.length > 1 ? 'multi' : 'single';
        var tRef = '$:/plugins/felixhayashi/tiddlymap/editor/contextMenu/node';

        _utils2.default.registerTransclude(_this5, 'contextMenuWidget', tRef);
        _this5.contextMenuWidget.setVariable('mode', mode);
        _this5.contextMenuWidget.render(div);
      });
    }
  }, {
    key: 'handleWidgetKeyup',
    value: function handleWidgetKeyup(ev) {}
  }, {
    key: 'handleWidgetKeydown',
    value: function handleWidgetKeydown(ev) {

      if (ev.ctrlKey) {
        // ctrl key is hold down
        ev.preventDefault();

        if (ev.keyCode === 70) {
          // f
          ev.preventDefault();

          var focusButtonStateTRef = this.widgetPopupsPath + '/focus';
          _utils2.default.setText(focusButtonStateTRef, _utils2.default.getText(focusButtonStateTRef) ? '' : '1');

          // note: it is ok to focus the graph right after this,
          // if the focus button is activated it will steal the focus anyway
        } else {

          return;
        }
      } else if (ev.keyCode === 120) {
        // F9
        ev.preventDefault();
        this.toggleEnlargedMode('halfscreen');
      } else if (ev.keyCode === 121) {
        // F10
        ev.preventDefault();
        this.toggleEnlargedMode('fullscreen');
      } else if (ev.keyCode === 27) {
        // ESC
        ev.preventDefault();

        _utils2.default.deleteByPrefix(this.widgetPopupsPath);
      } else {
        return;
      }

      this.canvas.focus();
    }
  }, {
    key: 'handlePasteNodesFromClipboard',
    value: function handlePasteNodesFromClipboard() {

      if (!this.editorMode) {
        $tm.notify('Map is read only!');
        return;
      }

      if (!$tm.clipBoard || $tm.clipBoard.type !== 'nodes') {
        $tm.notify('TiddlyMap clipboad is empty!');
      }

      var nodes = $tm.clipBoard.nodes;
      var ids = Object.keys(nodes);

      for (var i = ids.length; i--;) {

        var id = ids[i];

        if (this.graphData.nodesById[id]) {
          // node already present in this view
          continue;
        }

        this.view.addNode(nodes[id]);

        // paste nodes so we can select them!
        this.graphData.nodes.update({ id: id });
      }

      this.network.selectNodes(ids);

      this.rebuildGraph({ resetFocus: { delay: 0, duration: 0 } });

      $tm.notify('pasted ' + ids.length + ' nodes into map.');
    }
  }, {
    key: 'handleAddNodesToClipboard',
    value: function handleAddNodesToClipboard(mode) {

      var nodeIds = this.network.getSelectedNodes();

      if (!nodeIds.length) {
        return;
      }

      $tm.clipBoard = {
        type: 'nodes',
        nodes: this.graphData.nodes.get(nodeIds, { returnType: 'Object' })
      };

      $tm.notify('Copied ' + nodeIds.length + ' nodes to clipboard');

      if (mode === 'move') {
        for (var i = nodeIds.length; i--;) {
          this.view.removeNode(nodeIds[i]);
        }
      }

      // prevent zoom
      this.isPreventZoomOnNextUpdate = true;
    }

    /**
     * @todo Instead of redrawing the whole graph when an edge or node is
     * added it may be worth considering only getting the element from the
     * adapter and directly inserting it into the graph and *avoid* a
     * reload of the graph via `rebuildGraph`!
     *
     * @todo: too much recomputation -> outsource
     */

  }, {
    key: 'getVisOptions',
    value: function getVisOptions() {
      var _this6 = this;

      // merge options
      var globalOptions = $tm.config.vis;
      var localOptions = _utils2.default.parseJSON(this.view.getConfig('vis'));
      var options = _utils2.default.merge({}, globalOptions, localOptions);

      options.clickToUse = this.clickToUse;
      options.manipulation.enabled = !!this.editorMode;

      options.manipulation.deleteNode = function (data, callback) {
        _this6.handleRemoveElements(data);
        _this6.resetVisManipulationBar(callback);
      };

      options.manipulation.deleteEdge = function (data, callback) {
        _this6.handleRemoveElements(data);
        _this6.resetVisManipulationBar(callback);
      };

      options.manipulation.addEdge = function (data, callback) {
        _this6.handleConnectionEvent(data);
        _this6.resetVisManipulationBar(callback);
      };

      options.manipulation.addNode = function (data, callback) {
        _this6.handleInsertNode(data);
        _this6.resetVisManipulationBar(callback);
      };

      options.manipulation.editNode = function (data, callback) {
        _this6.handleEditNode(data);
        _this6.resetVisManipulationBar(callback);
      };

      options.interaction.zoomView = !!(this.isInSidebar || this.enlargedMode);

      // not allowed
      options.manipulation.editEdge = false;

      // make sure the actual solver is an object
      var physics = options.physics;
      physics[physics.solver] = physics[physics.solver] || {};

      physics.stabilization.iterations = 1000;

      this.logger('debug', 'Loaded graph options', options);

      return options;
    }
  }, {
    key: 'resetVisManipulationBar',
    value: function resetVisManipulationBar(visCallback) {

      if (visCallback) {
        visCallback(null);
      }

      this.network.disableEditMode();
      this.network.enableEditMode();
    }
  }, {
    key: 'isVisInEditMode',
    value: function isVisInEditMode() {

      return this.graphDomNode.getElementsByClassName('vis-button vis-back').length > 0;
    }

    /**
     * Create an empty view. A dialog is opened that asks the user how to
     * name the view. The view is then registered as current view.
     */

  }, {
    key: 'handleCreateView',
    value: function handleCreateView() {
      var _this7 = this;

      var args = {
        view: this.view.getLabel()
      };

      $tm.dialogManager.open('createView', args, function (isConfirmed, outTObj) {

        if (!isConfirmed) return;

        var label = _utils2.default.getField(outTObj, 'name');
        var isClone = _utils2.default.getField(outTObj, 'clone', false);

        if (_ViewAbstraction2.default.exists(label)) {

          $tm.notify('Forbidden! View already exists!');

          return;
        }

        if (isClone && _this7.view.isLiveView()) {
          $tm.notify('Forbidden to clone the live view!');
          return;
        }

        var newView = new _ViewAbstraction2.default(label, {
          isCreate: true,
          protoView: isClone ? _this7.view : null
        });

        _this7.setView(newView);
      });
    }
  }, {
    key: 'handleRenameView',
    value: function handleRenameView() {
      var _this8 = this;

      if (this.view.isLocked()) {

        $tm.notify('Forbidden!');
        return;
      }

      var references = this.view.getOccurrences();

      var args = {
        count: references.length.toString(),
        refFilter: _utils2.default.joinAndWrap(references, '[[', ']]')
      };

      $tm.dialogManager.open('renameView', args, function (isConfirmed, outTObj) {

        if (!isConfirmed) {
          return;
        }

        var label = _utils2.default.getText(outTObj);

        if (!label) {

          $tm.notify('Invalid name!');
        } else if (_ViewAbstraction2.default.exists(label)) {

          $tm.notify('Forbidden! View already exists!');
        } else {

          _this8.view.rename(label);
          _this8.setView(_this8.view);
        }
      });
    }
  }, {
    key: 'handleEditView',
    value: function handleEditView() {
      var _this9 = this;

      var visInherited = JSON.stringify($tm.config.vis);
      var data = this.graphData;

      var viewConfig = this.view.getConfig();

      var preselects = {
        'filter.prettyNodeFltr': this.view.getNodeFilter('pretty'),
        'filter.prettyEdgeFltr': this.view.getEdgeTypeFilter('pretty'),
        'vis-inherited': visInherited
      };

      var args = {
        view: this.view.getLabel(),
        createdOn: this.view.getCreationDate(true),
        numberOfNodes: Object.keys(data.nodesById).length.toString(),
        numberOfEdges: Object.keys(data.edgesById).length.toString(),
        dialog: {
          preselects: $tw.utils.extend({}, viewConfig, preselects)
        }
      };

      $tm.dialogManager.open('configureView', args, function (isConfirmed, outTObj) {

        if (!isConfirmed) {
          return;
        }

        var config = _utils2.default.getPropertiesByPrefix(outTObj.fields, 'config.', true);

        // ATTENTION: needs to be tested before applying new config!
        var prvBg = _this9.view.getConfig('background_image');

        _this9.view.setConfig(config);
        if (config['physics_mode'] && !_this9.view.isEnabled('physics_mode')) {
          // when not in physics mode, store positions
          // to prevent floating afterwards
          _this9.view.saveNodePositions(_this9.network.getPositions());
        }

        var curBg = _this9.view.getConfig('background_image');
        if (curBg && curBg !== prvBg) {
          $tm.notify('Background changed! You may need to zoom out a bit.');
        }

        var nf = _utils2.default.getField(outTObj, 'filter.prettyNodeFltr', '');
        var eTf = _utils2.default.getField(outTObj, 'filter.prettyEdgeFltr', '');

        _this9.view.setNodeFilter(nf);
        _this9.view.setEdgeTypeFilter(eTf);
      });
    }

    /**
     * Triggers a download dialog where the user can store the canvas
     * as png on his/her harddrive.
     */

  }, {
    key: 'handleSaveCanvas',
    value: function handleSaveCanvas() {
      var _this10 = this;

      var tempImagePath = '$:/temp/tmap/snapshot';
      this.createAndSaveSnapshot(tempImagePath);
      var defaultName = _utils2.default.getSnapshotTitle(this.view.getLabel(), 'png');

      var args = {
        dialog: {
          snapshot: tempImagePath,
          width: this.canvas.width.toString(),
          height: this.canvas.height.toString(),
          preselects: {
            name: defaultName,
            action: 'download'
          }
        }
      };

      $tm.dialogManager.open('saveCanvas', args, function (isConfirmed, outTObj) {
        if (!isConfirmed) return;

        // allow the user to override the default name or if name is
        // empty use the original default name
        defaultName = outTObj.fields.name || defaultName;

        var action = outTObj.fields.action;

        if (action === 'download') {
          _this10.handleDownloadSnapshot(defaultName);
        } else if (action === 'wiki') {
          _utils2.default.cp(tempImagePath, defaultName, true);
          _this10.dispatchEvent({
            type: 'tm-navigate', navigateTo: defaultName
          });
        } else if (action === 'placeholder') {
          _this10.view.addPlaceholder(tempImagePath);
        }

        // in any case
        $tw.wiki.deleteTiddler('$:/temp/tmap/snapshot');
      });
    }
  }, {
    key: 'handleDownloadSnapshot',
    value: function handleDownloadSnapshot(title) {

      var a = this.document.createElement('a');
      var label = this.view.getLabel();
      a.download = title || _utils2.default.getSnapshotTitle(label, 'png');
      a.href = this.getSnapshot();

      // we cannot simply call click() on <a>; chrome is cool with it but
      // firefox requires us to create a mouse event…
      var event = new MouseEvent('click');
      a.dispatchEvent(event);
    }
  }, {
    key: 'createAndSaveSnapshot',
    value: function createAndSaveSnapshot(title) {

      var tRef = title || this.view.getRoot() + '/snapshot';
      $tw.wiki.addTiddler(new $tw.Tiddler({
        title: tRef,
        type: 'image/png',
        text: this.getSnapshot(true),
        modified: new Date()
      }));

      return tRef;
    }
  }, {
    key: 'getSnapshot',
    value: function getSnapshot(stripPreamble) {

      var data = this.canvas.toDataURL('image/png');

      return stripPreamble ? _utils2.default.getWithoutPrefix(data, 'data:image/png;base64,') : data;
    }
  }, {
    key: 'handleDeleteView',
    value: function handleDeleteView() {
      var _this11 = this;

      var viewname = this.view.getLabel();

      if (this.view.isLocked()) {

        $tm.notify('Forbidden!');
        return;
      }

      // regex is non-greedy

      var references = this.view.getOccurrences();
      if (references.length) {

        var fields = {
          count: references.length.toString(),
          refFilter: _utils2.default.joinAndWrap(references, '[[', ']]')
        };

        $tm.dialogManager.open('cannotDeleteViewDialog', fields);

        return;
      }

      var message = '\n        You are about to delete the view \'\'' + viewname + '\'\'\n        (no tiddler currently references this view).\n     ';

      this.openStandardConfirmDialog(function (isConfirmed) {
        // TODO: this dialog needs an update

        if (!isConfirmed) {
          return;
        }

        _this11.view.destroy();
        _this11.setView($tm.misc.defaultViewLabel);
        var msg = 'view "' + viewname + '\' deleted';
        _this11.logger('debug', msg);
        $tm.notify(msg);
      }, message);
    }

    /**
     * This will rebuild the graph after a trigger has been activated.
     *
     * Prior to TiddlyMap v0.9, an additional check was performed
     * to verify, if the graph had actually changed before rebuilding
     * the graph. This check, however, was an overkill and as such removed.
     */

  }, {
    key: 'handleTriggeredRefresh',
    value: function handleTriggeredRefresh(trigger) {

      this.logger('log', trigger, 'Triggered a refresh');

      // special case for the live tab
      if (this.id === 'live_tab') {
        var curTiddler = _utils2.default.getTiddler(_utils2.default.getText(trigger));
        if (curTiddler) {
          var view = curTiddler.fields['tmap.open-view'] || $tm.config.sys.liveTab.fallbackView;
          if (view && view !== this.view.getLabel()) {
            this.setView(view);
            return;
          }
        }
      }

      this.rebuildGraph({
        resetFocus: {
          delay: 1000,
          duration: 1000
        }
      });
    }

    /**
     * Called by vis when the user tries to delete nodes or edges.
     * The action is delegated to subhandlers.
     *
     * @param {Array<Id>} nodes - Removed edges.
     * @param {Array<Id>} edges - Removed nodes.
     */

  }, {
    key: 'handleRemoveElements',
    value: function handleRemoveElements(_ref2) {
      var nodes = _ref2.nodes,
          edges = _ref2.edges;


      if (nodes.length) {
        // the adapter also removes edges when nodes are removed.
        this.handleRemoveNodes(nodes);
      } else if (edges.length) {
        this.handleRemoveEdges(edges);
      }

      this.resetVisManipulationBar();
    }
  }, {
    key: 'handleRemoveEdges',
    value: function handleRemoveEdges(edgeIds) {

      $tm.adapter.deleteEdges(this.graphData.edges.get(edgeIds));
      $tm.notify('edge' + (edgeIds.length > 1 ? 's' : '') + ' removed');
    }

    /**
     * Handler that guides the user through the process of deleting a node
     * from the graph. The nodes may be removed from the filter (if possible)
     * or from the system.
     *
     * Note: this should not trigger a zoom.
     */

  }, {
    key: 'handleRemoveNodes',
    value: function handleRemoveNodes(nodeIds) {
      var _this12 = this;

      var tiddlers = $tm.adapter.getTiddlersByIds(nodeIds);
      var params = {
        'count': nodeIds.length.toString(),
        'tiddlers': $tw.utils.stringifyList(tiddlers),
        dialog: {
          preselects: {
            'delete-from': 'filter'
          }
        }
      };

      $tm.dialogManager.open('deleteNodeDialog', params, function (isConfirmed, outTObj) {

        if (!isConfirmed) return;

        var deletionCount = 0;

        for (var i = nodeIds.length; i--;) {
          var success = _this12.view.removeNode(nodeIds[i]);
          if (success) {
            deletionCount++;
          }
        }

        if (outTObj.fields['delete-from'] === 'system') {

          // will also delete edges
          $tm.adapter.deleteNodes(nodeIds);
          deletionCount = nodeIds.length; // we just say so ;)
        }

        // prevent zoom
        _this12.isPreventZoomOnNextUpdate = true;

        $tm.notify('\n        Removed ' + deletionCount + '\n        of ' + nodeIds.length + '\n        from ' + outTObj.fields['delete-from'] + '\n      ');
      });
    }

    /**
     * Calling this function will toggle the enlargement of the map
     * instance. Markers need to be added at various places to ensure the
     * map stretches properly. This includes marking ancestor dom nodes
     * to be able to shift the stacking context.
     *
     * @param {string} type - either 'halfscreen' or 'fullscreen'.
     */

  }, {
    key: 'toggleEnlargedMode',
    value: function toggleEnlargedMode(type) {

      if (!this.isInSidebar && type === 'halfscreen') {
        return;
      }

      this.logger('log', 'Toggled graph enlargement');

      var enlargedMode = this.enlargedMode;

      // in any case, exit enlarged mode if active
      if (enlargedMode) {

        // reset click to use
        this.network.setOptions({ clickToUse: this.clickToUse });

        // remove markers
        _utils2.default.findAndRemoveClassNames(['tmap-has-' + enlargedMode + '-widget', 'tmap-' + enlargedMode]);

        // reset flag
        this.enlargedMode = null;
        document.body.scrollTop = this.scrollTop;
      }

      if (!enlargedMode || enlargedMode !== type && (type === 'fullscreen' || type === 'halfscreen' && !this.isInSidebar)) {

        this.scrollTop = document.body.scrollTop;

        this.enlargedMode = type;

        var pContainer = this.isInSidebar ? this.sidebar : _utils2.default.getFirstElementByClassName('tc-story-river');

        $tw.utils.addClass(this.document.body, 'tmap-has-' + type + '-widget');
        $tw.utils.addClass(pContainer, 'tmap-has-' + type + '-widget');
        $tw.utils.addClass(this.domNode, 'tmap-' + type);

        // disable click to use by force
        this.network.setOptions({ clickToUse: false });

        $tm.notify('Toggled ' + type + ' mode');
      }

      // always do resize
      this.handleResizeEvent();
    }
  }, {
    key: 'handleGenerateWidget',
    value: function handleGenerateWidget(event) {

      $tw.rootWidget.dispatchEvent({
        type: 'tmap:tm-generate-widget',
        paramObject: { view: this.view.getLabel() }
      });
    }
  }, {
    key: 'handleSetCentralTopic',
    value: function handleSetCentralTopic(_ref3) {
      var paramObject = _ref3.paramObject;


      var nodeId = paramObject.id || this.network.getSelectedNodes()[0];

      if (nodeId === this.view.getConfig('central-topic')) {
        nodeId = '';
      }

      this.view.setCentralTopic(nodeId);
    }

    /**
     * Called by vis when the graph has stabilized itself.
     *
     * ATTENTION: never store positions in a view's map during stabilize
     * as this will affect other graphs positions and will cause recursion!
     * Storing positions inside vis' nodes is fine though
     */

  }, {
    key: 'handleVisStabilizedEvent',
    value: function handleVisStabilizedEvent(properties) {

      if (this.hasNetworkStabilized) {
        return;
      }

      this.hasNetworkStabilized = true;
      this.logger('log', 'Network stabilized after', properties.iterations, 'iterations');

      if (!this.view.isEnabled('physics_mode')) {
        // static mode

        // store positions if new nodes without position were added
        var nodes = this.graphData.nodesById;
        var idsOfNodesWithoutPosition = [];

        for (var id in nodes) {
          if (nodes[id].x === undefined) {
            idsOfNodesWithoutPosition.push(id);
          }
        }

        if (idsOfNodesWithoutPosition.length) {
          this.setNodesMoveable(idsOfNodesWithoutPosition, false);
          $tm.notify(idsOfNodesWithoutPosition.length + ' nodes were added to the graph');
        }

        // after storing positions, set gravity to zero again
        var physics = this.visOptions.physics;
        physics[physics.solver].centralGravity = 0;
        this.network.setOptions(this.visOptions);
      }

      if (this.resetFocus) {
        this.fitGraph(this.resetFocus.delay, this.resetFocus.duration);
        this.resetFocus = null;
      }
    }

    /**
     * Zooms on a specific node in the graph
     */

  }, {
    key: 'handleFocusNode',
    value: function handleFocusNode(_ref4) {
      var tRef = _ref4.param;


      this.network.focus($tm.adapter.getId(tRef), {
        scale: 1.5,
        animation: true
      });
    }

    /**
     * A zombie widget is a widget that is removed from the dom tree
     * but still referenced or still partly executed -- I mean
     * otherwise you couldn't call this function, right?
     *
     * If TiddlyMap is executed in a fake environment, the function
     * always returns true.
     */

  }, {
    key: 'isZombieWidget',
    value: function isZombieWidget() {

      return this.domNode.isTiddlyWikiFakeDom === true || !this.document.body.contains(this.getContainer());
    }

    /**
     * This method allows us to specify after what time and for how long
     * the zoom-to-fit process should be executed for a graph.
     *
     * @param {number} [delay=0] - How long to wait before starting to zoom.
     * @param {number} [duration=0] - After the delay, how long should it
     *     take for the graph to be zoomed.
     */

  }, {
    key: 'fitGraph',
    value: function fitGraph() {
      var _this13 = this;

      var delay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;


      // clear any existing fitting attempt
      clearTimeout(this.activeFitTimeout);

      var fit = function fit() {

        // happens when widget is removed after stabilize but before fit
        if (_this13.isZombieWidget()) {
          return;
        }

        // fixes #97
        _this13.network.redraw();

        _this13.network.fit({ // v4: formerly zoomExtent
          animation: {
            duration: duration,
            easingFunction: 'easeOutQuart'
          }
        });
      };

      this.activeFitTimeout = setTimeout(fit, delay);
    }

    /**
     * Spawns a dialog in which the user can specify node attributes.
     * Once the dialog is closed, the node is inserted into the current
     * view, unless the operation was cancelled.
     */

  }, {
    key: 'handleInsertNode',
    value: function handleInsertNode(node) {
      var _this14 = this;

      $tm.dialogManager.open('addNodeToMap', {}, function (isConfirmed, outTObj) {

        if (!isConfirmed) {
          return;
        }

        var tRef = _utils2.default.getField(outTObj, 'draft.title');

        if (_utils2.default.tiddlerExists(tRef)) {

          // Todo: use graphData and test if node is match (!=neighbour)
          if (_utils2.default.isMatch(tRef, _this14.view.getNodeFilter('compiled'))) {

            $tm.notify('Node already exists');

            return;
          } else {

            node = $tm.adapter.makeNode(tRef, node);
            _this14.view.addNode(node);
          }
        } else {

          var tObj = new $tw.Tiddler(outTObj, { 'draft.title': null });

          node.label = tRef;
          $tm.adapter.insertNode(node, _this14.view, tObj);
        }

        // prevent zoom
        _this14.isPreventZoomOnNextUpdate = true;
      });
    }

    /**
     * Open the node editor to style the node.
     */

  }, {
    key: 'handleEditNode',
    value: function handleEditNode(node) {
      var _this15 = this;

      var tRef = $tm.tracker.getTiddlerById(node.id);
      var tObj = _utils2.default.getTiddler(tRef);
      var globalDefaults = JSON.stringify($tm.config.vis);
      var localDefaults = this.view.getConfig('vis');
      var nodes = {};
      nodes[node.id] = node;
      var nodeStylesByTRef = $tm.adapter.getInheritedNodeStyles(nodes);
      var groupStyles = JSON.stringify(nodeStylesByTRef[tRef]);
      var globalNodeStyle = JSON.stringify(_utils2.default.merge({}, { color: tObj.fields['color'] }, _utils2.default.parseJSON(tObj.fields['tmap.style'])));

      var viewLabel = this.view.getLabel();

      // we copy the object since we intend to modify it.
      // NOTE: A deep copy would be needed if a nested property were modified
      //       In that case, use $tw.utils.deepCopy.
      var nodeData = _extends({}, this.view.getNodeData(node.id));
      // we need to delete the positions so they are not reset when a user
      // resets the style…
      delete nodeData.x;
      delete nodeData.y;

      var args = {
        'view': viewLabel,
        'tiddler': tObj.fields.title,
        'tidColor': tObj.fields['color'],
        'tidIcon': tObj.fields[$tm.field.nodeIcon] || tObj.fields['tmap.fa-icon'],
        'tidLabelField': 'global.' + $tm.field.nodeLabel,
        'tidIconField': 'global.' + $tm.field.nodeIcon,
        dialog: {
          preselects: {
            'inherited-global-default-style': globalDefaults,
            'inherited-local-default-style': localDefaults,
            'inherited-group-styles': groupStyles,
            'global.tmap.style': globalNodeStyle,
            'local-node-style': JSON.stringify(nodeData)
          }
        }
      };

      // function to iterate over attributes that shall be available
      // in the dialog.
      var addToPreselects = function addToPreselects(scope, store, keys) {
        for (var i = keys.length; i--;) {
          args.dialog.preselects[scope + '.' + keys[i]] = store[keys[i]] || '';
        }
      };

      // local values are retrieved from the view's node data store
      addToPreselects('local', nodeData, ['label', 'tw-icon', 'fa-icon', 'open-view']);

      // global values are taken from the tiddler's field object
      addToPreselects('global', tObj.fields, [$tm.field.nodeLabel, $tm.field.nodeIcon, 'tmap.fa-icon', 'tmap.open-view']);

      $tm.dialogManager.open('editNode', args, function (isConfirmed, outTObj) {

        if (!isConfirmed) return;

        var fields = outTObj.fields;

        // save or remove global individual style
        var global = _utils2.default.getPropertiesByPrefix(fields, 'global.', true);
        for (var p in global) {

          _utils2.default.setField(tRef, p, global[p] || undefined);
        }

        // save local individual data (style + config)
        var local = _utils2.default.getPropertiesByPrefix(fields, 'local.', true);

        // CAREFUL: Never change 'local-node-style' to 'local.node-style'
        // (with a dot) because it will get included in the loop!
        var data = _utils2.default.parseJSON(fields['local-node-style'], {});

        for (var _p in local) {
          data[_p] = local[_p] || undefined;
        }

        _this15.view.saveNodeStyle(node.id, data);

        _this15.isPreventZoomOnNextUpdate = true;
      });
    }

    /**
     * This handler is registered at and called by the vis network event
     * system.
     */

  }, {
    key: 'handleVisSingleClickEvent',
    value: function handleVisSingleClickEvent(properties) {

      var isActivated = _utils2.default.isTrue($tm.config.sys.singleClickMode);
      if (isActivated && !this.editorMode) {
        this.handleOpenMapElementEvent(properties);
      }
    }

    /**
     * This handler is registered at and called by the vis network event
     * system.
     *
     * @see Coordinates not passed on click/tap events within the properties object
     * @see https://github.com/almende/vis/issues/440
     *
     * @properties a list of nodes and/or edges that correspond to the
     * click event.
     */

  }, {
    key: 'handleVisDoubleClickEvent',
    value: function handleVisDoubleClickEvent(properties) {

      if (properties.nodes.length || properties.edges.length) {

        if (this.editorMode || !_utils2.default.isTrue($tm.config.sys.singleClickMode)) {

          this.handleOpenMapElementEvent(properties);
        }
      } else {
        // = clicked on an empty spot

        if (this.editorMode) {
          this.handleInsertNode(properties.pointer.canvas);
        }
      }
    }
  }, {
    key: 'handleOpenMapElementEvent',
    value: function handleOpenMapElementEvent(_ref5) {
      var nodes = _ref5.nodes,
          edges = _ref5.edges;


      if (nodes.length) {
        // clicked on a node

        var node = this.graphData.nodesById[nodes[0]];
        if (node['open-view']) {
          $tm.notify('Switching view');
          this.setView(node['open-view']);
        } else {
          this.openTiddlerWithId(nodes[0]);
        }
      } else if (edges.length) {
        // clicked on an edge

        this.logger('debug', 'Clicked on an Edge');
        var typeId = this.graphData.edgesById[edges[0]].type;
        this.handleEditEdgeType(typeId);
      } else {

        return;
      }

      this.hidePopups(0, true);
    }
  }, {
    key: 'handleEditEdgeType',
    value: function handleEditEdgeType(type) {

      if (!this.editorMode) return;

      var behaviour = $tm.config.sys.edgeClickBehaviour;
      if (behaviour !== 'manager') return;

      $tw.rootWidget.dispatchEvent({
        type: 'tmap:tm-manage-edge-types',
        paramObject: {
          type: type
        }
      });
    }
  }, {
    key: 'handleResizeEvent',


    /**
     * Listener will be removed if the parent is not part of the dom anymore
     *
     * @see https://groups.google.com/d/topic/tiddlywikidev/yuQB1KwlKx8/discussion [TW5] Is there a destructor for widgets?
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Node.contains
     */
    value: function handleResizeEvent(event) {

      if (this.isZombieWidget()) return;

      var height = this.getAttr('height');
      var width = this.getAttr('width');

      if (this.isInSidebar) {

        var rect = this.domNode.getBoundingClientRect();
        var distRight = 15;
        width = document.body.clientWidth - rect.left - distRight + 'px';

        var distBottom = parseInt(this.getAttr('bottom-spacing')) || 15;
        var calculatedHeight = window.innerHeight - rect.top;
        height = calculatedHeight - distBottom + 'px';
      }

      this.domNode.style.height = height || '300px';
      this.domNode.style.width = width;

      this.repaintGraph(); // redraw graph
    }

    /**
     * used to prevent nasty deletion as edges are not unselected when leaving vis
     */

  }, {
    key: 'handleClickEvent',
    value: function handleClickEvent(evt) {

      if (this.isZombieWidget() || !this.network) return;

      if (!this.graphDomNode.contains(evt.target)) {
        // clicked outside

        var selected = this.network.getSelection();
        if (selected.nodes.length || selected.edges.length) {
          this.logger('debug', 'Clicked outside; deselecting nodes/edges');
          // upstream bug: this.network.unselectAll() doesn't work
          this.network.selectNodes([]); // deselect nodes and edges
          this.resetVisManipulationBar();
        }
      } else {

        this.canvas.focus();
      }

      if (evt.button !== 2) {
        // not the right button
        this.contextMenu.hide(0, true);
      }
    }
  }, {
    key: 'handleVisSelectNode',
    value: function handleVisSelectNode(_ref6) {
      var nodes = _ref6.nodes;


      if (!this.isDraggingAllowed(nodes)) {
        return;
      }

      // assign selected style
      this.assignActiveStyle(nodes);
    }
  }, {
    key: 'isDraggingAllowed',
    value: function isDraggingAllowed(_ref7) {
      var nodes = _ref7.nodes;

      return this.editorMode || this.view.isEnabled('physics_mode');
    }

    /**
     * Assign some styles when the graph element becomes active, i.e.
     * it is selected or hovered over.
     *
     * @param {Id|Array<Id>} nodeIds - A single id or an Array of ids.
     */

  }, {
    key: 'assignActiveStyle',
    value: function assignActiveStyle(nodeIds) {

      if (!Array.isArray(nodeIds)) nodeIds = [nodeIds];

      var defaultColor = this.visOptions.nodes.color;

      // iterate over selected nodes
      for (var i = nodeIds.length; i--;) {
        var id = nodeIds[i];
        var node = this.graphData.nodesById[id];
        var colorObj = _utils2.default.merge({}, defaultColor, node.color);
        this.graphData.nodes.update({
          id: id,
          color: {
            highlight: colorObj,
            hover: colorObj
          }
        });
      }
    }
  }, {
    key: 'handleVisDeselectNode',
    value: function handleVisDeselectNode(properties) {}

    //~ var prevSelectedNodes = properties.previousSelection.nodes;
    //~ for (var i = prevSelectedNodes.length; i--;) {
    //~ };

    /**
     * Called by vis when the dragging of a node(s) has ended.
     * Vis passes an object containing event-related information.
     *
     * @param {Array<Id>} nodes - Array of ids of the nodes
     *     that were being dragged.
     */

  }, {
    key: 'handleVisDragEnd',
    value: function handleVisDragEnd(_ref8) {
      var nodes = _ref8.nodes;


      if (!nodes.length) {
        return;
      }

      if (nodes.length === 1 && this.view.isEnabled('raster')) {
        var pos = this.network.getPositions()[nodes[0]];
        this.graphData.nodes.update(_extends({
          id: nodes[0]
        }, _utils2.default.getNearestRasterPosition(pos, parseInt(this.view.getConfig('raster')))));
      }

      // reset store
      this.draggedNode = null;

      // fix node again and store positions
      // if in static mode, fixing will be ignored
      this.setNodesMoveable(nodes, false);
    }

    /**
     *
     * @param context2d
     */

  }, {
    key: 'handleVisBeforeDrawing',
    value: function handleVisBeforeDrawing(context2d) {
      var view = this.view,
          network = this.network,
          backgroundImage = this.backgroundImage;


      if (backgroundImage) {
        context2d.drawImage(backgroundImage, 0, 0);
      }

      if (view.isEnabled('raster')) {
        _utils2.default.drawRaster(context2d, network.getScale(), network.getViewPosition(), parseInt(view.getConfig('raster')));
      }
    }

    /**
     *
     * @param context2d
     */

  }, {
    key: 'handleVisAfterDrawing',
    value: function handleVisAfterDrawing(context2d) {

      if (this.selectRect) {

        var rect = this.selectRect.getRect();

        context2d.beginPath();
        context2d.globalAlpha = 0.5;
        context2d.fillStyle = '#EAFFEF';
        context2d.fillRect.apply(context2d, _toConsumableArray(rect));

        context2d.beginPath();
        context2d.globalAlpha = 1;
        context2d.strokeStyle = '#B4D9BD';
        context2d.strokeRect.apply(context2d, _toConsumableArray(rect));
      }

      if (this.draggedNode && this.view.isEnabled('raster')) {

        var pos = this.network.getPositions()[this.draggedNode];
        var rPos = _utils2.default.getNearestRasterPosition(pos, parseInt(this.view.getConfig('raster')));

        context2d.strokeStyle = 'green';
        context2d.fillStyle = 'green';

        context2d.beginPath();
        context2d.moveTo(pos.x, pos.y);
        context2d.lineTo(rPos.x, rPos.y);
        context2d.stroke();
        context2d.beginPath();
        context2d.arc(rPos.x, rPos.y, 5, 0, Math.PI * 2);
        context2d.fill();
      }
    }

    /**
     * called by tooltip class when tooltip is displayed;
     */

  }, {
    key: 'constructTooltip',
    value: function constructTooltip(signature, div) {

      var ev = _utils2.default.parseJSON(signature);
      var id = ev.node || ev.edge;

      var text = null;
      var outType = 'text/html';
      var inType = 'text/vnd-tiddlywiki';

      if (ev.node) {
        // node

        var tRef = $tm.tracker.getTiddlerById(id);
        var tObj = _utils2.default.getTiddler(tRef);

        var descr = tObj.fields[$tm.field.nodeInfo];

        if (descr) {

          div.innerHTML = $tw.wiki.renderText(outType, inType, descr);
        } else if (tObj.fields.text) {

          // simply rendering the text is not sufficient as this prevents
          // us from updating the tooltip content on refresh. So we need
          // to create a temporary widget that is registered to the dom
          // node passed by the tooltip.

          _utils2.default.registerTransclude(this, 'tooltipWidget', tRef);
          this.tooltipWidget.setVariable('tv-tiddler-preview', 'yes');
          this.tooltipWidget.render(div);
        } else {

          div.innerHTML = tRef;
        }
      } else {
        // edge

        var edge = this.graphData.edgesById[id];
        var type = $tm.indeces.allETy[edge.type];

        if (type.description) {
          text = $tw.wiki.renderText(outType, inType, type.description);
        }

        div.innerHTML = text || type.label || type.id;
      }
    }
  }, {
    key: 'handleVisHoverElement',
    value: function handleVisHoverElement(ev) {

      if ($tm.mouse.buttons) return;

      //~ this.graphDomNode.style.cursor = 'pointer';

      var id = ev.node || ev.edge;
      var signature = JSON.stringify(ev);

      if (ev.node) {

        // override the hover color
        this.assignActiveStyle(id);
      }

      // show tooltip if not in edit mode
      if (!this.isVisInEditMode() && !this.contextMenu.isShown()) {
        var populator = this.constructTooltip;
        this.tooltip.show(signature, populator);
      }
    }
  }, {
    key: 'handleVisBlurElement',
    value: function handleVisBlurElement(ev) {

      this.tooltip.hide();
    }
  }, {
    key: 'handleVisLoading',
    value: function handleVisLoading(_ref9) {
      var total = _ref9.total,
          iterations = _ref9.iterations;


      // we only start to show the progress bar after a while
      //~ if (params.iterations / params.total < 0.05) return;

      this.graphLoadingBarDomNode.style.display = 'block';
      this.graphLoadingBarDomNode.setAttribute('max', total);
      this.graphLoadingBarDomNode.setAttribute('value', iterations);

      //~ var text = 'Loading ' + Math.round((iterations / total) * 100) + '%';
      //~ this.graphLoadingBarDomNode.innerHTML = text;
    }
  }, {
    key: 'handleVisLoadingDone',
    value: function handleVisLoadingDone(params) {

      this.graphLoadingBarDomNode.style.display = 'none';
    }

    /**
    * Called by vis when a node is being dragged.
    * Vis passes an object containing event-related information.
    * @param {Array<Id>} nodes - Array of ids of the nodes
    *     that were being dragged.
    */

  }, {
    key: 'handleVisDragStart',
    value: function handleVisDragStart(_ref10) {
      var nodes = _ref10.nodes;


      if (!nodes.length ||
      // we do not allow nodes to be dragged if not in editor mode
      // except cases physics is enabled
      !this.isDraggingAllowed(nodes)) {
        return;
      }

      this.hidePopups(0, true);
      this.assignActiveStyle(nodes);
      this.setNodesMoveable(nodes, true);

      if (nodes.length === 1) {
        this.draggedNode = nodes[0];
      }
    }

    /**
     * called from outside.
     */

  }, {
    key: 'destruct',
    value: function destruct() {

      // while the container should be destroyed and the listeners
      // garbage collected, we remove them manually just to be save

      _utils2.default.setDomListeners('remove', window, this.windowDomListeners);
      _utils2.default.setDomListeners('remove', this.domNode, this.widgetDomListeners);

      this._destructVis();
    }

    /**
     * Only destructs stuff related to vis.
     */

  }, {
    key: '_destructVis',
    value: function _destructVis() {

      if (!this.network) return;

      _utils2.default.setDomListeners('remove', this.canvas, this.canvasDomListeners);

      this.network.destroy();
      this.network = null;
    }

    /**
     * Opens the tiddler that corresponds to the given id either as
     * modal (when in fullscreen mode) or in the story river.
     */

  }, {
    key: 'openTiddlerWithId',
    value: function openTiddlerWithId(id) {
      var _this16 = this;

      var tRef = $tm.tracker.getTiddlerById(id);

      this.logger('debug', 'Opening tiddler', tRef, 'with id', id);

      if (this.enlargedMode === 'fullscreen') {

        var draftTRef = $tw.wiki.findDraft(tRef);
        var wasInDraftAlready = !!draftTRef;

        if (!wasInDraftAlready) {

          var type = 'tm-edit-tiddler';
          this.dispatchEvent({ type: type, tiddlerTitle: tRef });
          draftTRef = $tw.wiki.findDraft(tRef);
        }

        var args = { draftTRef: draftTRef, originalTRef: tRef };

        $tm.dialogManager.open('fullscreenTiddlerEditor', args, function (isConfirmed, outTObj) {

          if (isConfirmed) {

            var _type = 'tm-save-tiddler';
            _this16.dispatchEvent({ type: _type, tiddlerTitle: draftTRef });
          } else if (!wasInDraftAlready) {

            // also removes the draft from the river before deletion!
            _utils2.default.deleteTiddlers([draftTRef]);
          }

          // in any case, remove the original tiddler from the river
          var type = 'tm-close-tiddler';
          _this16.dispatchEvent({ type: type, tiddlerTitle: tRef });
        });
      } else {

        var bounds = this.domNode.getBoundingClientRect();

        this.dispatchEvent({
          type: 'tm-navigate',
          navigateTo: tRef,
          navigateFromTitle: this.getVariable('storyTiddler'),
          navigateFromNode: this,
          navigateFromClientRect: {
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            right: bounds.right,
            bottom: bounds.bottom,
            height: bounds.height
          }
        });
      }
    }

    /**
     * The view holder is a tiddler that stores a references to the current
     * view. If the graph is not bound to a view by the user via an
     * attribute, the default view holder is used. Otherwise, a temporary
     * holder is created whose value is set to the view specified by the user.
     * This way, the graph is independent from view changes made in a
     * tiddlymap editor.
     *
     * This function will only calculate a new reference to the holder
     * on first call (that is when no view holder is registered to 'this'.
     *
     */

  }, {
    key: 'getViewHolderRef',
    value: function getViewHolderRef() {

      // the viewholder is never recalculated once it exists
      if (this.viewHolderRef) {
        return this.viewHolderRef;
      }

      this.logger('info', 'Retrieving or generating the view holder reference');

      // if given, try to retrieve the viewHolderRef by specified attribute
      var viewName = this.getAttr('view');
      var holderRef = null;

      if (viewName) {

        this.logger('log', 'User wants to bind view "' + viewName + '\' to graph');

        var viewRef = $tm.path.views + '/' + viewName;

        if ($tw.wiki.getTiddler(viewRef)) {

          // create a view holder that is exclusive for this graph

          holderRef = $tm.path.localHolders + '/' + _utils2.default.genUUID();
          this.logger('log', 'Created an independent temporary view holder "' + holderRef + '"');

          // we do not use setView here because it would store and reload the view unnecessarily...
          _utils2.default.setText(holderRef, viewRef);

          this.logger('log', 'View "' + viewRef + '\' inserted into independend holder');
        } else {
          this.logger('log', 'View "' + viewName + '" does not exist');
        }
      }

      if (!holderRef) {
        this.logger('log', 'Using default (global) view holder');
        holderRef = $tm.ref.defaultViewHolder;
      }

      return holderRef;
    }

    /**
     * This function will switch the current view reference of the
     * view holder.
     *
     * NOTE:
     * The changes will be picked up in the next refresh cycle.
     * This function will never update the view object currently
     * held by this widget (this.view)! This would create a race
     * condition where the view has changed, but the graph data hasn't
     * and maybe a stabilization event fires in this moment. At this point
     * it would work with graph data that doesn't relate to the view
     * and do bad things, trust me, big time bad things.
     *
     * @param {ViewAbstraction|string} view – A reference to the view.
     * @param {string} [viewHolderRef] – A reference to the view holder.
     */

  }, {
    key: 'setView',
    value: function setView(view, viewHolderRef) {

      if (!_ViewAbstraction2.default.exists(view)) {

        return;
      }

      view = new _ViewAbstraction2.default(view);

      var viewLabel = view.getLabel();
      viewHolderRef = viewHolderRef || this.viewHolderRef;
      this.logger('info', 'Inserting view "' + viewLabel + '" into holder "' + viewHolderRef + '"');
      $tw.wiki.addTiddler(new $tw.Tiddler({
        title: viewHolderRef,
        text: viewLabel
      }));

      // WARNING: Never set this.view to the new view state at this point.
      // e.g. via `this.view = this.getView(true)` This would produce a
      // race condition!
    }

    /**
     * This function will return a view abstraction that is based on the
     * view specified in the view holder of this graph.
     *
     * @param {boolean} noCache - Retrieve the view reference again
     *     from the holder and recreate the view abstraction object.
     * @return {ViewAbstraction} the view
     */

  }, {
    key: 'getView',
    value: function getView(noCache) {

      if (!noCache && this.view) {
        return this.view;
      }

      var viewHolderRef = this.getViewHolderRef();

      // transform into view object
      var ref = _utils2.default.getText(viewHolderRef);

      this.logger('debug', 'Retrieved view from holder');

      var view = void 0;

      if (_ViewAbstraction2.default.exists(ref)) {

        view = new _ViewAbstraction2.default(ref);
      } else {

        this.logger('debug', 'Warning: View "' + ref + '" doesn\'t exist. Default is used instead.');
        view = new _ViewAbstraction2.default('Default');
      }

      return view;
    }
  }, {
    key: 'reloadBackgroundImage',
    value: function reloadBackgroundImage(msg) {
      var _this17 = this;

      this.backgroundImage = null;

      var bgFieldValue = this.view.getConfig('background_image');
      var imgTObj = _utils2.default.getTiddler(bgFieldValue);
      if (!imgTObj && !bgFieldValue) return;

      var img = new Image();
      var ajaxCallback = function ajaxCallback(b64) {
        img.src = b64;
      };
      img.onload = function () {
        // only now set the backgroundImage to the img object!
        _this17.backgroundImage = img;
        _this17.repaintGraph();
        if (msg) {
          $tm.notify(msg);
        }
      };

      if (imgTObj) {
        // try loading from tiddler
        var urlField = imgTObj.fields['_canonical_uri'];
        if (urlField) {
          // try loading by uri field
          _utils2.default.getImgFromWeb(urlField, ajaxCallback);
        } else if (imgTObj.fields.text) {
          // try loading from base64
          img.src = $tw.utils.makeDataUri(imgTObj.fields.text, imgTObj.fields.type);
        }
      } else if (bgFieldValue) {
        // try loading directly from reference
        _utils2.default.getImgFromWeb(bgFieldValue, ajaxCallback);
      }
    }

    /**
     * The graph of this widget is only repainted if the following counts:
     *
     * The network object exists (prerequisit).
     *
     * 1. We are not in fullscreen at all
     * 2. This particular graph instance is currently running fullscreen.
     */

  }, {
    key: 'repaintGraph',
    value: function repaintGraph() {

      var isInFS = $tw.utils.hasClass(this.document.body, 'tmap-has-fullscreen-widget');
      if (this.network && (!isInFS || isInFS && this.enlargedMode)) {

        this.logger('info', 'Repainting the whole graph');

        this.network.redraw();
        this.fitGraph(0, 1000);
      }
    }

    /**
     * If a button is enabled it means it is displayed on the graph canvas.
     *
     * @param {string} name - The name of the button to enabled. Has to
     *     correspond with the css button name.
     * @param {boolean} enable - True if the button should be visible,
     *     false otherwise.
     */

  }, {
    key: 'setGraphButtonEnabled',
    value: function setGraphButtonEnabled(name, enable) {

      var className = 'vis-button tmap-' + name;
      var b = _utils2.default.getFirstElementByClassName(className, this.domNode);
      $tw.utils.toggleClass(b, 'tmap-button-enabled', enable);
    }

    /**
     * Allow the given nodes to be moveable.
     *
     * @param {Array<number>} nodeIds - The ids of the nodes for which
     *     we allow or disallow the movement.
     * @param {boolean} isMoveable - True, if the nodes are allowed to
     *     move or be moved.
     */

  }, {
    key: 'setNodesMoveable',
    value: function setNodesMoveable(nodeIds, isMoveable) {

      if (!nodeIds || !nodeIds.length || this.view.isEnabled('physics_mode')) {
        // = no ids passed or in floating mode
        return;
      }

      var updates = [];
      var isFixed = !isMoveable;
      for (var i = nodeIds.length; i--;) {

        updates.push({
          id: nodeIds[i],
          fixed: { x: isFixed, y: isFixed }
        });
      }

      this.graphData.nodes.update(updates);

      if (isFixed) {

        this.logger('debug', 'Fixing', updates.length, 'nodes');

        // if we fix nodes in static mode then we also store the positions
        this.view.saveNodePositions(this.network.getPositions());
        // prevent zoom
        this.isPreventZoomOnNextUpdate = true;
      }
    }

    /**
     * This function will create the dom elements for all tiddlymap-vis
     * buttons and register the event listeners.
     *
     * @param {Object<string, function>} buttonEvents - The label of the
     *     button that is used as css class and the click handler.
     */

  }, {
    key: 'addGraphButtons',
    value: function addGraphButtons(buttonEvents) {

      var parent = _utils2.default.getFirstElementByClassName('vis-navigation', this.domNode);

      for (var name in buttonEvents) {
        var div = this.document.createElement('div');
        div.className = 'vis-button tmap-' + name;

        div.addEventListener('click', buttonEvents[name].bind(this), false);
        parent.appendChild(div);

        this.setGraphButtonEnabled(name, true);
      }
    }
  }]);

  return MapWidget;
}(_widget.widget);

/*** Exports *******************************************************/

exports.tmap = MapWidget;
exports.tiddlymap = MapWidget;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/widget/MapWidget.js.map
