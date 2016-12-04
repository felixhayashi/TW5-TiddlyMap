// tw-module
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/MapWidget
type: application/javascript
module-type: widget

@preserve

\*/

/*** Imports *******************************************************/

import utils                from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import DialogManager        from '$:/plugins/felixhayashi/tiddlymap/js/DialogManager';
import CallbackManager      from '$:/plugins/felixhayashi/tiddlymap/js/CallbackManager';
import ViewAbstraction      from '$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction';
import EdgeType             from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import Popup                from '$:/plugins/felixhayashi/tiddlymap/js/Popup';
import vis                  from '$:/plugins/felixhayashi/vis/vis.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';

/*** Code **********************************************************/

/**
 * The map widget is responsible for drawing the actual network
 * diagrams.
 *
 * @constructor
 */
class MapWidget extends Widget {

  constructor(parseTreeNode, options) {
    super(parseTreeNode, options);

    // create shortcuts for services and frequently used vars
    this.getAttr = this.getAttribute;
    this.isDebug = utils.isTrue($tm.config.sys.debug, false);

    // force early binding of functions to this context
    utils.bindTo(this, [
      'constructTooltip',
      'handleResizeEvent',
      'handleClickEvent',
      'handleCanvasKeyup',
      'handleCanvasKeydown',
      'handleCanvasScroll',
      'handleWidgetKeyup',
      'handleWidgetKeydown',
      'handleTriggeredRefresh',
      'handleContextMenu'
    ]);

    // instanciate managers
    this.callbackManager = new CallbackManager();
    this.dialogManager = new DialogManager(this.callbackManager, this);

    // make the html attributes available to this widget
    this.computeAttributes();
    this.editorMode = this.getAttr('editor');
    this.clickToUse = utils.isTrue(this.getAttr('click-to-use'), false);

    // who am I? the id is used for debugging and special cases
    this.id = this.getAttr('object-id') || this.getStateQualifier();

    this.widgetTempStatePath = $tm.path.tempStates + '/' + this.id;
    this.widgetPopupsPath = $tm.path.tempPopups + '/' + this.id;

    // register listeners that are available in editor mode
    if (this.editorMode) {
      utils.addTWlisteners({
        'tmap:tm-create-view': this.handleCreateView,
        'tmap:tm-rename-view': this.handleRenameView,
        'tmap:tm-delete-view': this.handleDeleteView,
        'tmap:tm-delete-element': this.handleDeleteElement,
        'tmap:tm-edit-view': this.handleEditView,
        'tmap:tm-store-position': this.handleStorePositions,
        'tmap:tm-generate-widget': this.handleGenerateWidget,
        'tmap:tm-toggle-central-topic': this.handleSetCentralTopic,
        'tmap:tm-save-canvas': this.handleSaveCanvas
      }, this, this);
    }

    // register listeners that are available in any case
    utils.addTWlisteners({
      'tmap:tm-focus-node': this.handleFocusNode,
      'tmap:tm-reset-focus': this.repaintGraph
    }, this, this);

    // Visjs handlers
    this.visListeners = {
      'click': this.handleVisSingleClickEvent,
      'doubleClick': this.handleVisDoubleClickEvent,
      'stabilized': this.handleVisStabilizedEvent,
      'selectNode': this.handleVisSelectNode,
      'deselectNode': this.handleVisDeselectNode,
      'dragStart': this.handleVisDragStart,
      'dragEnd': this.handleVisDragEnd,
      'hoverNode': this.handleVisHoverElement,
      'hoverEdge': this.handleVisHoverElement,
      'blurNode': this.handleVisBlurElement,
      'blurEdge': this.handleVisBlurElement,
      'beforeDrawing': this.handleVisBeforeDrawing,
      'stabilizationProgress': this.handleVisLoading,
      'stabilizationIterationsDone': this.handleVisLoadingDone
    };

    this.windowDomListeners = {
      'resize': [ this.handleResizeEvent, false ],
      'click': [ this.handleClickEvent, false ]
    };

    this.canvasDomListeners = {
      'keyup': [ this.handleCanvasKeyup, true ],
      'keydown': [ this.handleCanvasKeydown, true ],
      'mousewheel': [ this.handleCanvasScroll, true ],
      'contextmenu': [ this.handleContextMenu, true ]
    };

    this.widgetDomListeners = {
      'keyup': [ this.handleWidgetKeyup, true ],
      'keydown': [ this.handleWidgetKeydown, true ]
    };

    this.conVector = { from: null, to: null };
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
   * @param {Edge} edge - A javascript object that contains at least
   *    the properties 'from' and 'to'
   * @param {function} [callback] - A function with the signature
   *    function(isConfirmed);
   */
  handleConnectionEvent(edge, callback) {

    var eTyFilter = this.view.getEdgeTypeFilter();

    var param = {
      fromLabel: $tm.adapter.selectNodeById(edge.from).label,
      toLabel: $tm.adapter.selectNodeById(edge.to).label,
      viewNS: this.view.getConfig('edge_type_namespace'),
      eTyFilter: eTyFilter.raw
    };

    var name = 'getEdgeType';
    this.dialogManager.open(name, param, (isConfirmed, outTObj) => {

      if (isConfirmed) {

        var type = utils.getText(outTObj);

        var options = {
          namespace: this.view.getConfig('edge_type_namespace')
        };

        type = new EdgeType(type, null, options);

        // persist the type if it doesn't exist
        if (!type.exists()) type.save();

        // add type to edge
        edge.type = type.id;
        $tm.adapter.insertEdge(edge);

        if (!this.view.isEdgeTypeVisible(type.id)) {

          var args = {
            type: type.id,
            view: this.view.getLabel(),
            eTyFilter: eTyFilter.pretty
          };

          this.dialogManager.open('edgeNotVisible', args);

        }

        this.preventFitAfterRebuild = true;

      }

      if (typeof callback === 'function') {
        callback(isConfirmed);
      }

    });

  };

  /**
   * The first time a map is opened, we want to display a welcome message.
   * Once shown, a flag is set and the message is not displayed again.
   */
  checkForFreshInstall() {

    var sysMeta = $tm.ref.sysMeta;
    if (!utils.getEntry(sysMeta, 'showWelcomeMessage', true)) return;

    // set flag
    utils.setEntry(sysMeta, 'showWelcomeMessage', false);

    var args = {};
    var name = 'welcome';
    this.dialogManager.open(name, args, (isConfirmed, outTObj) => {

      if (utils.tiddlerExists('$:/plugins/felixhayashi/topstoryview')) {

        utils.setText('$:/view', 'top');
        utils.setText('$:/config/Navigation/openLinkFromInsideRiver', 'above');
        utils.setText('$:/config/Navigation/openLinkFromOutsideRiver', 'top');
        utils.setText('$:/themes/tiddlywiki/vanilla/options/sidebarlayout', 'fixed-fluid');

        // trigger a save and reload message
        utils.touch('$:/plugins/felixhayashi/topstoryview');
      }

      var view = $tm.misc.defaultViewLabel;

      var node = { label: 'Have fun with', x: 0, y: 0 };
      var n1 = $tm.adapter.insertNode(node, view);

      node = { label: 'TiddlyMap!!', x: 100, y: 100 };
      var n2 = $tm.adapter.insertNode(node, view);

      $tm.adapter.insertEdge({ from: n1.id, to: n2.id });

    });

  };

  /**
   * A very basic dialog that will tell the user he/she has to make
   * a choice.
   *
   * @param {function} [callback] - A function with the signature
   *     function(isConfirmed).
   * @param {string} [message] - An small optional message to display.
   */
  openStandardConfirmDialog(callback, message) {

    var param = { message : message };
    this.dialogManager.open('getConfirmation', param, callback);

  };

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
  logger(type, message /*, more stuff*/) {

    if (this.isDebug) {

      var args = Array.prototype.slice.call(arguments, 1);
      args.unshift('@' + this.id);
      args.unshift(type);
      $tm.logger.apply(this, args);

    }

  };

  /**
   * Method to render this widget into the DOM.
   *
   * Note that we do not add this.domNode to the list of domNodes
   * since this widget does never remove itself during a refresh.
   *
   * @override
   */
  render(parent, nextSibling) {

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

    if (utils.isPreviewed(this) || this.domNode.isTiddlyWikiFakeDom) {

      $tw.utils.addClass(this.domNode, 'tmap-static-mode');
      this.renderPreview(this.graphBarDomNode, this.graphDomNode);

    } else {

      // render the full widget
      this.renderFullWidget(this.domNode, this.graphBarDomNode, this.graphDomNode);

    }

  };

  /**
   * When the widget is only previewed we do some alternative rendering.
   */
  renderPreview(header, body) {

    var snapshotTRef = this.view.getRoot() + '/snapshot';
    var snapshotTObj = utils.getTiddler(snapshotTRef);

    var label = this.document.createElement('span');
    label.innerHTML = this.view.getLabel();
    label.className = 'tmap-view-label';
    header.appendChild(label);

    if (snapshotTObj) {

      // Construct child widget tree
      var placeholder = this.makeChildWidget(utils.getTranscludeNode(snapshotTRef), true);
      placeholder.renderChildren(body, null);

    } else {

      $tw.utils.addClass(body, 'tmap-graph-placeholder');

    }

  };

  /**
   * The standard way of rendering.
   * Attention: BE CAREFUL WITH THE ORDER OF FUNCTION CALLS IN THIS FUNCTION.
   */
  renderFullWidget(widget, header, body) {

    // add window and widget dom node listeners
    utils.setDomListeners('add', window, this.windowDomListeners);
    utils.setDomListeners('add', widget, this.widgetDomListeners);

    // add a loading bar
    this.addLoadingBar(this.domNode);

    // prepare the tooltip for graph elements
    this.tooltip = new Popup(this.domNode, {
      className: 'tmap-tooltip',
      showDelay: $tm.config.sys.popups.delay
    });

    // prepare the context menu
    this.contextMenu = new Popup(this.domNode, {
      className: 'tmap-context-menu',
      showDelay: 0,
      hideOnClick: true,
      leavingDelay: 999999
    });

    // register
    this.sidebar = utils.getFirstElementByClassName('tc-sidebar-scrollable');
    this.isInSidebar = (this.sidebar
                                 && !this.domNode.isTiddlyWikiFakeDom
                                 && this.sidebar.contains(this.domNode));

    // flag that determines whether to zoom after stabilization finished;
    // always set to false after the next stabilization
    this.doFitAfterStabilize = true;

    // flag that determines whether to zoom after rebuilding the graph;
    // always set to false after the next rebuild
    this.preventFitAfterRebuild = false;

    // *first* inject the bar
    this.initAndRenderEditorBar(header);

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

  };

  /**
   * Add some classes to give the user a chance to apply some css
   * to different graph modes.
   */
  registerClassNames(parent) {

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

    if (!utils.isTrue(this.getAttr('show-buttons'), true)) {
      addClass(parent, 'tmap-no-buttons');
    }

    if (this.getAttr('class')) {
      addClass(parent, this.getAttr('class'));
    }

  };

  /**
   * Adds a loading bar div below the parent.
   */
  addLoadingBar(parent) {

    this.graphLoadingBarDomNode = this.document.createElement('progress');
    $tw.utils.addClass(this.graphLoadingBarDomNode, 'tmap-loading-bar');
    parent.appendChild(this.graphLoadingBarDomNode);

  };

  /**
   * The editor bar contains a bunch of widgets that allow the user
   * to manipulate the current view.
   *
   * Attention: The Editor bar needs to render *after* the graph
   * because some elements depend on the graph's nodes which are
   * calculated when the network is created.
   */
  initAndRenderEditorBar() {

    this.rebuildEditorBar();

  };

  /**
   * Creates this widget's child-widgets.
   *
   * @see https://groups.google.com/forum/#!topic/tiddlywikidev/sJrblP4A0o4
   * @see blob/master/editions/test/tiddlers/tests/test-wikitext-parser.js
   */
  rebuildEditorBar() {

    // register variables

    var view = this.view;
    var variables = {
      widgetQualifier: this.getStateQualifier(),
      widgetTempPath: this.widgetTempPath,
      widgetPopupsPath: this.widgetPopupsPath,
      isViewBound: String(this.isViewBound()),
      viewRoot: view.getRoot(),
      viewLabel: view.getLabel(),
      viewHolder: this.getViewHolderRef(),
      edgeTypeFilter: view.getPaths().edgeTypeFilter,
      allEdgesFilter: $tm.selector.allEdgeTypes,
      neighScopeBtnClass: 'tmap-neigh-scope-button'
                          + (view.isEnabled('neighbourhood_scope')
                             ? ' ' + 'tmap-active-button'
                             : '')
    };

    for (var name in variables) {
      this.setVariable(name, variables[name]);
    }

    // Construct the child widget tree
    var body = utils.getTiddlerNode(view.getRoot());

    if (this.editorMode === 'advanced') {

      body.children.push(utils.getTranscludeNode($tm.ref.graphBar));

    } else {

      var el = utils.getElementNode('span', view.getLabel(), 'tmap-view-label');
      body.children.push(el);

    }

    body.children.push(utils.getTranscludeNode($tm.ref.focusButton));

    this.makeChildWidgets([ body ]);
    this.renderChildren(this.graphBarDomNode, this.graphBarDomNode.firstChild);

  };

  /**
   * This function is called by the system to notify the widget about
   * tiddler changes. It is ignored by TiddlyMap.
   *
   * ATTENTION: TiddlyMap doesn't use the refresh mechanism here.
   * The caretaker module dispatches an `updates` object that provides
   * more advanced information, tailored to the needs of TiddlyMap.
   * These updates are picked up by {@link MapWidget#updates}.
   *
   * @override
   */
  refresh(changedTiddlers) {

    // TiddlyMap never needs a full refresh so we return false
    return false;

  };

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
  update(updates) {

    if (!this.network || this.isZombieWidget() || utils.isPreviewed(this)) {
      return;
    }

    var changedTiddlers = updates.changedTiddlers;
    var rebuildEditorBar = false;
    var rebuildGraph = false;
    var reinitNetwork = false;
    var rebuildGraphOptions = {};

    // check for callback changes
    this.callbackManager.handleChanges(changedTiddlers);

    if (this.isViewSwitched(changedTiddlers)
       || this.hasChangedAttributes()
       || updates[$tm.path.options]
       || updates[$tm.path.nodeTypes]
       || changedTiddlers[this.view.getRoot()]) {

      this.logger('warn', 'View switched (or main config change)');

      this.view = this.getView(true);
      this.reloadRefreshTriggers();

      rebuildEditorBar = true;
      reinitNetwork = true;

    } else { // view has not been switched

      // give the view a chance to refresh its components
      var isViewUpdated = this.view.update(updates);

      if (isViewUpdated && !this.ignoreNextViewModification) {

        this.logger('warn', 'View components modified');

        this.reloadBackgroundImage();
        rebuildEditorBar = true;
        rebuildGraph = true;
        rebuildGraphOptions.resetEdgeTypeWL = true;

        if (!this.preventFitAfterRebuild) {
          rebuildGraphOptions.resetFocus = { delay: 0, duration: 0 };
        }

      } else { // neither view switch or view modification

        if (updates[$tm.path.nodeTypes]) {
          rebuildGraph = true;

        } else if (this.hasChangedElements(changedTiddlers)) {
          rebuildGraph = true;
        }

      }
    }

    if (reinitNetwork) {
      this.initAndRenderGraph(this.graphDomNode);
      this.hidePopups(0, true);

    } else if (rebuildGraph) {
      this.rebuildGraph(rebuildGraphOptions);
      this.hidePopups(0, true);
    }

    if (rebuildEditorBar) {

      this.removeChildDomNodes();
      this.rebuildEditorBar();

    } else {

      // give children a chance to update themselves
      this.refreshChildren(changedTiddlers);

    }

    // reset this again
    this.ignoreNextViewModification = false;

  };

  hidePopups(delay, isForce) {

    this.tooltip.hide(delay, isForce);
    this.contextMenu.hide(0, true);

  };

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
  reloadRefreshTriggers() {

    // remove old triggers (if there are any)
    this.callbackManager.remove(this.refreshTriggers);

    // load new trigger list either from attribute or view config
    var str = this.getAttr('refresh-triggers')
              || this.view.getConfig('refresh-triggers');
    this.refreshTriggers = $tw.utils.parseStringArray(str) || [];

    this.logger('debug', 'Registering refresh trigger', this.refreshTriggers);

    // TODO: not nice, if more than one trigger changed it
    // will cause multiple reassertments
    for (var i = this.refreshTriggers.length; i--;) {
      this.callbackManager.add(this.refreshTriggers[i],
                               this.handleTriggeredRefresh,
                               false);
    }

  };

  /**
   * Calling this method will cause the graph to be rebuild, which means
   * the graph data is refreshed. A rebuild of the graph will always
   * cause the network to stabilize again.
   *
   * @param {Hashmap} [options] - An optional options object.
   * @param {boolean} [options.refreshData=false] - If this is set to
   *     true, all datasets will be cleared before new data is added.
   *     This guarantees a fresh start. This option should only be
   *     used when the topic of the graph changes (= view switched).
   * @param {boolean} [options.refreshOptions=false] - If this is set
   *     to true, the vis options will also be reloaded. This option
   *     should only be used if the options have actually changed, which
   *     is always the case when a view is switched or sometimes when
   *     a view is modified.
   * @param {Hashmap} [options.resetFocus=null] - If not false or null,
   *     this object requires two properties to be set: `delay` (the
   *     time to wait before starting the fit), `duration` (the length
   *     of the fit animation). If the global flag `preventFitAfterRebuild`
   *     is set to true at the time `rebuildGraph` is called with the
   *     `resetFocus` option specified, then it overrules this option
   *     and the fit will not take place. After the rebuild,
   *     `preventFitAfterRebuild` is said to false again.
   */
  rebuildGraph(options) {

    if (utils.isPreviewed(this)) return;

    this.logger('debug', 'Rebuilding graph');

    options = options || {};

    // always reset to allow handling of stabilized-event!
    this.hasNetworkStabilized = false;

    if (options.resetData) {
      this.graphData.edges.clear();
      this.graphData.nodes.clear();
      this.graphData.edgesById = null;
      this.graphData.nodesById = null;
    }

    if (!this.view.isEnabled('physics_mode')) {

      // in static mode we need to ensure that objects spawn
      // near center so we need to set physics from
      // zero to something. Yes, we override the users
      // central gravity value… who cares about central
      // gravity in static mode anyways.
      var physics = this.visOptions.physics;
      physics[physics.solver].centralGravity = 0.015;
    }

    if (!options.resetFocus) {
      // option or data resets always overrule any flags!
      this.doFitAfterStabilize = false;
    }

    this.rebuildGraphData();

    //~ this.rebuildGraphData({
      //~ resetEdgeTypeWL: options.resetEdgeTypeWL
    //~ });

    if (!utils.hasElements(this.graphData.nodesById)) {
      return;
    }

    // see https://github.com/almende/vis/issues/987#issuecomment-113226216
    // see https://github.com/almende/vis/issues/939
    this.network.stabilize();

    // resetting the focus is not the same as zooming after stabilization,
    // the question is whether after a rebuild the focus should be immediately
    // reset or not. Zooming after stabilization does always(!) takes place
    // after a rebuild, in contrast, resetting the focus doesn't necessarily take place.
    if (options.resetFocus && !this.preventFitAfterRebuild) {

      // a not-prevented focus reset will always also cause a fit after stabilize
      this.doFitAfterStabilize = true;
      this.fitGraph(options.resetFocus.delay, options.resetFocus.duration);

    }

    // in any case, reset to default
    this.preventFitAfterRebuild = false;

  };

  /**
   * WARNING: Do not change this functionname as it is used by the
   * caretaker's routinely checkups.
   */
  getContainer() {

    return this.domNode;

  };

  /**
   *
   */
  rebuildGraphData() {

    $tm.start('Reloading Network');

    var graph = $tm.adapter.getGraph({
      view: this.view
    });

    var nodes = graph.nodes;
    var edges = graph.edges;

    this.graphData.nodes = this.getRefreshedDataSet(nodes, // new nodes
                                         this.graphData.nodesById, // old nodes
                                         this.graphData.nodes); // dataset

    this.graphData.edges = this.getRefreshedDataSet(edges, // new edges
                                         this.graphData.edgesById, // old edges
                                         this.graphData.edges); // dataset

    // create lookup tables

    this.graphData.nodesById = nodes;
    this.graphData.edgesById = edges;

    // TODO: that's a performance killer. this should be loaded when
    // the search is actually used!
    // update: Careful when refactoring, some modules are using this…
    utils.setField('$:/temp/tmap/nodes/' + this.view.getLabel(),
                   'list',
                   $tm.adapter.getTiddlersById(nodes));

    $tm.stop('Reloading Network');

    return this.graphData;

  };

  isViewBound() {

    return utils.startsWith(this.getViewHolderRef(), $tm.path.localHolders);

  };

  /**
   * A view is switched, if the holder was changed.
   */
  isViewSwitched(changedTiddlers) {

    return changedTiddlers[this.getViewHolderRef()];

  };

  /**
   * A view is switched, if the holder was changed.
   */
  hasChangedAttributes() {

    return Object.keys(this.computeAttributes()).length;

  };

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
  hasChangedElements(changedTiddlers) {

    var maybeMatches = [];
    var inGraph = this.graphData.nodesById;
    var isShowNeighbourhood = this.view.isEnabled('neighbourhood_scope');

    for (var tRef in changedTiddlers) {
      if (utils.isSystemOrDraft(tRef)) continue;

      if (inGraph[$tm.adapter.getId(tRef)] || isShowNeighbourhood) {
        return true;
      }

      if (changedTiddlers[tRef].modified) {
        // still may be a match so we store this and process it later
        maybeMatches.push(tRef);
      }
    }

    if (maybeMatches.length) {

      var nodeFilter = this.view.getNodeFilter('compiled');
      var matches = utils.getMatches(nodeFilter, maybeMatches);
      return !!matches.length;

    }

  };

  /**
   * Rebuild the graph
   *
   * @see http://visjs.org/docs/network.html
   * @see http://visjs.org/docs/dataset.html
   */
  initAndRenderGraph(parent) {

    // make sure to destroy any previous instance
    if (this.network) this._destructVis();

    this.logger('info', 'Initializing and rendering the graph');

    if (!this.isInSidebar) {
      this.callbackManager.add('$:/state/sidebar', this.handleResizeEvent);
    }

    this.visOptions = this.getVisOptions();
    //~ this.edgeTypeWL = null;
    this.graphData = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet(),
      nodesById: utils.makeHashMap(),
      edgesById: utils.makeHashMap()
    };

    this.tooltip.setEnabled(
      utils.isTrue($tm.config.sys.popups.enabled, true));

    this.network = new vis.Network(parent, this.graphData, this.visOptions);
    // after vis.Network has been instantiated, we fetch a reference to
    // the canvas element
    this.canvas = parent.getElementsByTagName('canvas')[0];
    // just to be sure
    this.canvas.tabIndex = 0;

    for (var event in this.visListeners) {
      this.network.on(event, this.visListeners[event].bind(this));
    }

    this.addGraphButtons({
      'fullscreen-button': function() {
        this.toggleEnlargedMode('fullscreen'); },
      'halfscreen-button': function() {
        this.toggleEnlargedMode('halfscreen'); }
    });

    utils.setDomListeners('add', this.canvas, this.canvasDomListeners);

    this.reloadBackgroundImage();
    this.rebuildGraph({ resetFocus: { delay: 0, duration: 0 }});
    this.handleResizeEvent();
    this.canvas.focus();

  };

  handleCanvasKeyup(ev) {
    var nodeIds = this.network.getSelectedNodes();

    if (ev.ctrlKey) { // ctrl key is hold down
      ev.preventDefault();

      if (ev.keyCode === 88) { // x
        if (this.editorMode) {
          this.handleAddNodesToClipboard('move');
        } else {
          $tm.notify('Map is read only!');
        }

      } else if (ev.keyCode === 67) { // c
        this.handleAddNodesToClipboard('copy');

      } else if (ev.keyCode === 86) { // v
        this.handlePasteNodesFromClipboard();

      } else if (ev.keyCode === 65) { // a
        var allNodes = Object.keys(this.graphData.nodesById);
        this.network.selectNodes(allNodes);

      } else if (ev.keyCode === 49 || ev.keyCode === 50) { // 1 || 2
        if (nodeIds.length !== 1) return;

        var role = ev.keyCode === 49 ? 'from' : 'to';
        $tm.notify(utils.ucFirst(role) + '-part selected');

        this.conVector[role] = nodeIds[0];
        if (this.conVector.from && this.conVector.to) {
          // create the edge
          this.handleConnectionEvent(this.conVector, () => {
            // reset both properties, regardless whether confirmed
            this.conVector = { from: null, to: null };
          });
        }

      }

    } else if (ev.keyCode === 13) { // ENTER

      if (nodeIds.length !== 1) return;

      this.openTiddlerWithId(nodeIds[0]);

    }
  }

  handleDeleteElement(ev) {

    var id = ev.paramObject.id;
    var elements = (id ? [ id ] : this.network.getSelectedNodes());

    this.handleRemoveElements({
      nodes: elements
    });

  };

  handleCanvasKeydown(ev) {

    if (ev.keyCode === 46) { // delete
      ev.preventDefault();
      this.handleRemoveElements(this.network.getSelection());
    }

  };

  //https://github.com/almende/vis/blob/111c9984bc4c1870d42ca96b45d90c13cb92fe0a/lib/network/modules/InteractionHandler.js
  handleCanvasScroll(ev) {

    var zoomView = !!(ev.ctrlKey || this.isInSidebar || this.enlargedMode);

    if (zoomView) {
      ev.preventDefault();
    }

    if (zoomView !== this.visOptions.interaction.zoomView) {

      ev.preventDefault();
      ev.stopPropagation();

      this.visOptions.interaction.zoomView = zoomView;
      this.network.setOptions({ interaction: { zoomView: zoomView }});

      return false;
    }

  };

  /**
   * Called when the user click on the canvas with the right
   * mouse button. A context menu is opened.
   */
  handleContextMenu(ev) {

    ev.preventDefault();

    this.tooltip.hide(0, true);

    var nodeId = this.network.getNodeAt({ x: ev.offsetX, y: ev.offsetY });
    if (!nodeId) return;

    // ids of selected nodes
    var selectedNodes = this.network.getSelectedNodes();

    if (!utils.inArray(nodeId, selectedNodes)) {
      // unselect other nodes and select this one instead…
      selectedNodes = [ nodeId ];
      this.network.selectNodes(selectedNodes);
    }

    this.contextMenu.show(selectedNodes, function(selectedNodes, div) {

      var mode = (selectedNodes.length > 1 ? 'multi' : 'single');

      var tRef = '$:/plugins/felixhayashi/tiddlymap/editor/contextMenu/node';
      utils.registerTransclude(this, 'contextMenuWidget', tRef);
      this.contextMenuWidget.setVariable('mode', mode);
      this.contextMenuWidget.render(div);

    }.bind(this));

  };

  handleWidgetKeyup(ev) {

  };

  handleWidgetKeydown(ev) {

    if (ev.ctrlKey) { // ctrl key is hold down
      ev.preventDefault();

      if (ev.keyCode === 70) { // f
        ev.preventDefault();

        var focusButtonStateTRef = this.widgetPopupsPath + '/focus';
        utils.setText(focusButtonStateTRef,
                      utils.getText(focusButtonStateTRef) ? '' : '1');

        // note: it is ok to focus the graph right after this,
        // if the focus button is activated it will steal the focus anyway

      } else {
        return;
      }

    } else if (ev.keyCode === 120) { // F9
      ev.preventDefault();
      this.toggleEnlargedMode('halfscreen');

    } else if (ev.keyCode === 121) { // F10
      ev.preventDefault();
      this.toggleEnlargedMode('fullscreen');

    } else if (ev.keyCode === 27) { // ESC
      ev.preventDefault();

      utils.deleteByPrefix(this.widgetPopupsPath);

    } else {
      return;
    }

    this.canvas.focus();

  };

  handlePasteNodesFromClipboard() {

    if (!this.editorMode || this.view.isLiveView()) {
      $tm.notify('Map is read only!');
      return;
    }

    if ($tm.clipBoard) {
      if ($tm.clipBoard.type === 'nodes') {
        var nodes = $tm.clipBoard.nodes;
        var ids = Object.keys(nodes);
        if (ids.length) {
          for (var id in nodes) {

            // node already present in this view
            if (this.graphData.nodesById[id]) continue;

            this.view.addNode(nodes[id]);
            // paste nodes already so we can select them!
            this.graphData.nodes.update({
              id: id
            });
          }
          this.network.selectNodes(ids);
          $tm.notify('pasted ' + ids.length + ' nodes into map.');
        }
        return;
      }
    }

    $tm.notify('TiddlyMap clipboad is empty!');

  };

  handleAddNodesToClipboard(mode) {

    var nodeIds = this.network.getSelectedNodes();
    if (!nodeIds.length) return;

    $tm.clipBoard = {
      type: 'nodes',
      nodes: this.graphData.nodes.get(nodeIds,
                                      { returnType: 'Object' })
    };

    $tm.notify('Copied ' + nodeIds.length + ' nodes to clipboard');

    if (mode === 'move') {
      for (var i = nodeIds.length; i--;) {
        this.view.removeNode(nodeIds[i]);
      }
    }

  };

  isMobileMode() {

    var breakpoint = utils.getText($tm.ref.sidebarBreakpoint, 960);
    return (window.innerWidth <= parseInt(breakpoint));

  };

  /**
   * @todo Instead of redrawing the whole graph when an edge or node is
   * added it may be worth considering only getting the element from the
   * adapter and directly inserting it into the graph and *avoid* a
   * reload of the graph via `rebuildGraph`!
   *
   * @todo: too much recomputation -> outsource
   */
  getVisOptions() {

    // merge options
    var globalOptions = $tm.config.vis;
    var localOptions = utils.parseJSON(this.view.getConfig('vis'));
    var options = utils.merge({}, globalOptions, localOptions);

    options.clickToUse = this.clickToUse;

    options.manipulation.enabled = !!this.editorMode;

    options.manipulation.deleteNode = function(data, callback) {
      this.handleRemoveElements(data);
      this.resetVisManipulationBar(callback);
    }.bind(this);

    options.manipulation.deleteEdge = function(data, callback) {
      this.handleRemoveElements(data);
      this.resetVisManipulationBar(callback);
    }.bind(this);

    options.manipulation.addEdge = function(data, callback) {
      this.handleConnectionEvent(data);
      this.resetVisManipulationBar(callback);
    }.bind(this);

    options.manipulation.addNode = function(data, callback) {
      this.handleInsertNode(data);
      this.resetVisManipulationBar(callback);
    }.bind(this);

    options.manipulation.editNode = function(data, callback) {
      this.handleEditNode(data);
      this.resetVisManipulationBar(callback);
    }.bind(this);

    options.interaction.zoomView = !!(this.isInSidebar || this.enlargedMode);

    // not allowed
    options.manipulation.editEdge = false;

    // make sure the actual solver is an object
    var physics = options.physics;
    physics[physics.solver] = physics[physics.solver] || {};

    physics.stabilization.iterations = 1000;

    this.logger('debug', 'Loaded graph options', options);

    return options;

  };

  resetVisManipulationBar(visCallback) {

    if (visCallback) visCallback(null);
    this.network.disableEditMode();
    this.network.enableEditMode();

  };

  isVisInEditMode() {

    var cls = 'vis-button vis-back';
    return this.graphDomNode.getElementsByClassName(cls).length > 0;

  };

  /**
   * Create an empty view. A dialog is opened that asks the user how to
   * name the view. The view is then registered as current view.
   */
  handleCreateView() {

    var args = {
      view: this.view.getLabel()
    };

    var name = 'createView';
    this.dialogManager.open(name, args, (isConfirmed, outTObj) => {

      if (!isConfirmed) return;

      var label = utils.getField(outTObj, 'name');
      var isClone = utils.getField(outTObj, 'clone', false);
      var view = new ViewAbstraction(label);

      if (view.exists()) {
        $tm.notify('Forbidden! View already exists!');
        return;
      }

      if (isClone && this.view.isLiveView()) {
        $tm.notify('Forbidden to clone the live view!');
        return;
      }

      view = new ViewAbstraction(label, {
        isCreate: true,
        protoView: (isClone ? this.view : null)
      });

      this.setView(view);

    });

  };

  handleRenameView() {

    if (this.view.isLocked()) {

      $tm.notify('Forbidden!');
      return;

    }

    var references = this.view.getOccurrences();

    var args = {
      count : references.length.toString(),
      filter : utils.joinAndWrap(references, '[[', ']]')
    };

    var name = 'renameView';
    this.dialogManager.open(name, args, (isConfirmed, outTObj) => {

      if (isConfirmed) {

        var label = utils.getText(outTObj);
        var view = new ViewAbstraction(label);

        if (!label) {
          $tm.notify('Invalid name!');

        } else if (view.exists()) {
          $tm.notify('Forbidden! View already exists!');

        } else {
          this.view.rename(label);
          this.setView(this.view);
        }

      }

    });

  };

  handleEditView() {

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

    var name = 'configureView';
    this.dialogManager.open(name, args, (isConfirmed, outTObj) => {

      if (!isConfirmed) return;

      var config = utils.getPropertiesByPrefix(outTObj.fields, 'config.', true);

      // ATTENTION: needs to be tested before applying new config!
      var prvBg = this.view.getConfig('background_image');

      this.view.setConfig(config);
      if (config['physics_mode'] && !this.view.isEnabled('physics_mode')) {
        // when not in physics mode, store positions
        // to prevent floating afterwards
        this.handleStorePositions();
      }

      var curBg = this.view.getConfig('background_image');
      if (curBg && curBg !== prvBg) {
        $tm.notify('Background changed! You may need to zoom out a bit.');
      }

      var nf = utils.getField(outTObj, 'filter.prettyNodeFltr', '');
      var eTf = utils.getField(outTObj, 'filter.prettyEdgeFltr', '');

      this.view.setNodeFilter(nf);
      this.view.setEdgeTypeFilter(eTf);

    });

  };

  /**
   * Triggers a download dialog where the user can store the canvas
   * as png on his/her harddrive.
   */
  handleSaveCanvas() {

    var tempImagePath = '$:/temp/tmap/snapshot';
    var defaultName = utils.getSnapshotTitle(this.view.getLabel(), 'png');

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

    var name = 'saveCanvas';
    this.dialogManager.open(name, args, (isConfirmed, outTObj) => {
      if (!isConfirmed) return;

      // allow the user to override the default name or if name is
      // empty use the original default name
      defaultName = outTObj.fields.name || defaultName;

      var action = outTObj.fields.action;

      if (action === 'download') {
        this.handleDownloadSnapshot(defaultName);

      } else if (action === 'wiki') {
        utils.cp(tempImagePath, defaultName, true);
        this.dispatchEvent({
          type: 'tm-navigate', navigateTo: defaultName
        });

      } else if (action === 'placeholder') {
        this.view.addPlaceholder(tempImagePath);

      }

      // in any case
      $tw.wiki.deleteTiddler('$:/temp/tmap/snapshot');

    });

  };

  handleDownloadSnapshot(title) {

    var a = this.document.createElement('a');
    var label = this.view.getLabel();
    a.download = title || utils.getSnapshotTitle(label, 'png');
    a.href = this.getSnapshot();

    // we cannot simply call click() on <a>; chrome is cool with it but
    // firefox requires us to create a mouse event…
    var event = new MouseEvent('click');
    a.dispatchEvent(event);

  };

  createAndSaveSnapshot(title) {

    var tRef = title || this.view.getRoot() + '/snapshot';
    $tw.wiki.addTiddler(new $tw.Tiddler({
      title: tRef,
      type: 'image/png',
      text: this.getSnapshot(true),
      modified: new Date()
    }));

    return tRef;

  };

  getSnapshot(stripPreamble) {

    var data = this.canvas.toDataURL('image/png');
    return (stripPreamble
            ? utils.getWithoutPrefix(data, 'data:image/png;base64,')
            : data);

  };

  handleDeleteView() {

    var viewname = this.view.getLabel();

    if (this.view.isLocked()) {
      $tm.notify('Forbidden!');
      return;
    }

    // regex is non-greedy

    var references = this.view.getOccurrences();
    if (references.length) {

      var fields = {
        count : references.length.toString(),
        filter : utils.joinAndWrap(references, '[[', ']]')
      };

      this.dialogManager.open('cannotDeleteViewDialog', fields);

      return;

    }

    var message = `
        You are about to delete the view ''${viewname}''
        (no tiddler currently references this view).
     `;

    this.openStandardConfirmDialog(function(isConfirmed) { // TODO: this dialog needs an update

      if (isConfirmed) {
        this.view.destroy();
        this.setView($tm.misc.defaultViewLabel);
        const msg = `view "${viewname}' deleted`;
        this.logger('debug', msg);
        $tm.notify(msg);
      }

    }, message);

  };

  /**
   * This will rebuild the graph after a trigger has been activated.
   *
   * Prior to TiddlyMap v0.9, an additional check was performed
   * to verify, if the graph had actually changed before rebuilding
   * the graph. This check, however, was an overkill and as such removed.
   */
  handleTriggeredRefresh(trigger) {

    this.logger('log', trigger, 'Triggered a refresh');

    // special case for the live tab
    if (this.id === 'live_tab') {
      var curTiddler = utils.getTiddler(utils.getText(trigger));
      if (curTiddler) {
        var view = (curTiddler.fields['tmap.open-view']
                    || $tm.config.sys.liveTab.fallbackView);
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

  };

  /**
   * Called by vis when the user tries to delete nodes or edges.
   * The action is delegated to subhandlers.
   *
   * @param {Object} elements - An object containing the elements to be
   *     removed.
   * @param {Array<Id>} elements.nodes - Removed edges.
   * @param {Array<Id>} elements.edges - Removed nodes.
   */
  handleRemoveElements(elements) {

    if (elements.nodes.length) {
      // the adapter also removes edges when nodes are removed.
      this.handleRemoveNodes(elements.nodes);

    } else if (elements.edges.length) {
      this.handleRemoveEdges(elements.edges);

    }

    this.resetVisManipulationBar();


  };

  handleRemoveEdges(edgeIds) {

    $tm.adapter.deleteEdges(this.graphData.edges.get(edgeIds));
    $tm.notify('edge' + (edgeIds.length > 1 ? 's' : '') + ' removed');

    this.preventFitAfterRebuild = true;

  };


  /**
   * Handler that guides the user through the process of deleting a node
   * from the graph. The nodes may be removed from the filter (if possible)
   * or from the system.
   *
   * This action represents a direct graph manipulation by the user,
   * which means it will prevent a graph fitting (viewport adjusting)
   * in the course of the next rebuild.
   */
  handleRemoveNodes(nodeIds) {

    var tiddlers = $tm.adapter.getTiddlersById(nodeIds);
    var params = {
      'count': nodeIds.length.toString(),
      'tiddlers': $tw.utils.stringifyList(tiddlers),
      dialog: {
        preselects: {
          'delete-from': 'filter'
        }
      }
    };

    var name = 'deleteNodeDialog';
    this.dialogManager.open(name, params, (isConfirmed, outTObj) => {

      if (!isConfirmed) return;

      if (outTObj.fields['delete-from'] === 'system') {

        // will also delete edges
        $tm.adapter.deleteNodes(nodeIds);
        var deletionCount = nodeIds.length; // we just say so ;)

      } else {

        var deletionCount = 0;
        for (var i = nodeIds.length; i--;) {

          var success = this.view.removeNode(nodeIds[i]);
          if (success) deletionCount++;

        }

      }

      this.preventFitAfterRebuild = true;

      $tm.notify('Removed ' +  deletionCount
                  + ' of ' + nodeIds.length
                  + ' from ' + outTObj.fields['delete-from']);

    });

  };

  /**
   * Calling this function will toggle the enlargement of the map
   * instance. Markers need to be added at various places to ensure the
   * map stretches properly. This includes marking ancestor dom nodes
   * to be able to shift the stacking context.
   *
   * @param {string} type - either 'halfscreen' or 'fullscreen'.
   */

  toggleEnlargedMode(type) {

    if (!this.isInSidebar && type === 'halfscreen') return;

    this.logger('log', 'Toggled graph enlargement');

    var enlargedMode = this.enlargedMode;

    // in any case, exit enlarged mode if active
    if (enlargedMode) {

      // reset click to use
      this.network.setOptions({ clickToUse: this.clickToUse });
      // remove markers
      utils.findAndRemoveClassNames([
        'tmap-has-' + enlargedMode + '-widget',
        'tmap-' + enlargedMode
      ]);
      // reset flag
      this.enlargedMode = null;
      document.body.scrollTop = this.scrollTop;
    }

    if (!enlargedMode
       || (enlargedMode !== type
           && (type === 'fullscreen'
               || (type === 'halfscreen' && !this.isInSidebar)))) {

      this.scrollTop = document.body.scrollTop;

      this.enlargedMode = type;

      var pContainer = (this.isInSidebar
                        ? this.sidebar
                        : utils.getFirstElementByClassName('tc-story-river'));

      $tw.utils.addClass(this.document.body, 'tmap-has-' + type + '-widget');
      $tw.utils.addClass(pContainer, 'tmap-has-' + type + '-widget');
      $tw.utils.addClass(this.domNode, 'tmap-' + type);

      // disable click to use by force
      this.network.setOptions({ clickToUse: false });

      $tm.notify('Toggled ' + type + ' mode');

    }

    // always do resize
    this.handleResizeEvent();

  };

  handleGenerateWidget(event) {

    $tw.rootWidget.dispatchEvent({
      type: 'tmap:tm-generate-widget',
      paramObject: { view: this.view.getLabel() }
    });

  };

  handleSetCentralTopic(event) {

    var nodeId = event.paramObject.id || this.network.getSelectedNodes()[0];

    if (nodeId === this.view.getConfig('central-topic')) {
      nodeId = '';
    }

    this.view.setCentralTopic(nodeId);

  };

  handleStorePositions(withNotify) {

    var data = this.view.getNodeData();
    var positions = this.network.getPositions();
    for (var id in positions) {
      data[id] = data[id] || {};
      data[id].x = positions[id].x;
      data[id].y = positions[id].y;
    }
    this.view.saveNodeData(data);
    this.ignoreNextViewModification = true;

    if (withNotify) {
      $tm.notify('positions stored');
    }

  };

  /**
   * Called by vis when the graph has stabilized itself.
   *
   * ATTENTION: never store positions in a view's map during stabilize
   * as this will affect other graphs positions and will cause recursion!
   * Storing positions inside vis' nodes is fine though
   */
  handleVisStabilizedEvent(properties) {

    if (this.hasNetworkStabilized) return;

    this.hasNetworkStabilized = true;
    this.logger('log', 'Network stabilized after',
                        properties.iterations,
                        'iterations');

    if (!this.view.isEnabled('physics_mode')) { // static mode

      // store positions if new nodes without position were added
      var nodes = this.graphData.nodesById;
      var idsOfNodesWithoutPosition = [];
      for (var id in nodes) {
        if (!nodes[id].x) { idsOfNodesWithoutPosition.push(id); }
      }
      if (idsOfNodesWithoutPosition.length) {
        this.setNodesMoveable(idsOfNodesWithoutPosition, false);
        $tm.notify(idsOfNodesWithoutPosition.length
                    + ' nodes were added to the graph');
        this.doFitAfterStabilize = true;
      }

      // after storing positions, set gravity to zero again
      var physics = this.visOptions.physics;
      physics[physics.solver].centralGravity = 0;
      this.network.setOptions(this.visOptions);

    }

    if (this.doFitAfterStabilize) {
      this.doFitAfterStabilize = false;
      this.fitGraph(1000, 1000);
    }

  };

  /**
   * Zooms on a specific node in the graph
   *
   * @param {Object} event - An object containing a `param` property
   *     that holds a tiddler reference/title.
   */
  handleFocusNode(event) {
    this.network.focus($tm.adapter.getId(event.param), {
      scale: 1.5,
      animation: true
    });
  };

  /**
   * A zombie widget is a widget that is removed from the dom tree
   * but still referenced or still partly executed -- I mean
   * otherwise you couldn't call this function, right?
   *
   * If TiddlyMap is executed in a fake environment, the function
   * always returns true.
   */
  isZombieWidget() {

    if (this.domNode.isTiddlyWikiFakeDom === true) {
      return true;
    } else {
      return !this.document.body.contains(this.getContainer());
    }

  };

  /**
   * This method allows us to specify after what time and for how long
   * the zoom-to-fit process should be executed for a graph.
   *
   * @param {number} [delay=0] - How long to wait before starting to zoom.
   * @param {number} [duration=0] - After the delay, how long should it
   *     take for the graph to be zoomed.
   */
  fitGraph(delay, duration) {

    // clear any existing fitting attempt
    window.clearTimeout(this.activeFitTimeout);

    duration = duration || 0;
    delay = delay || 0;

    var fit = function() {

      // happens when widget is removed after stabilize but before fit
      if (this.isZombieWidget()) return;

      // fixes #97
      this.network.redraw();

      this.network.fit({ // v4: formerly zoomExtent
        animation: {
          duration: duration,
          easingFunction: 'easeOutQuart'
        }
      });

    };

    this.activeFitTimeout = window.setTimeout(fit.bind(this), delay);

  }

  /**
   * Spawns a dialog in which the user can specify node attributes.
   * Once the dialog is closed, the node is inserted into the current
   * view, unless the operation was cancelled.
   */
  handleInsertNode(node) {

    var name = 'addNodeToMap';
    this.dialogManager.open(name, null, (isConfirmed, outTObj) => {
      if (!isConfirmed) return;

      var tRef = utils.getField(outTObj, 'draft.title');

      if (utils.tiddlerExists(tRef)) {

        // Todo: use graphData and test if node is match (!=neighbour)
        if (utils.isMatch(tRef, this.view.getNodeFilter('compiled'))) {

          $tm.notify('Node already exists');
          return;

        } else {
          node = $tm.adapter.makeNode(tRef, node);
          this.view.addNode(node);

        }

      } else {

        var tObj = new $tw.Tiddler(outTObj, { 'draft.title': null });

        node.label = tRef;
        $tm.adapter.insertNode(node, this.view, tObj);

      }

      this.preventFitAfterRebuild = true;

    });

  };

  /**
   * Open the node editor to style the node.
   */
  handleEditNode(node) {

    var tRef = $tm.indeces.tById[node.id];
    var tObj = utils.getTiddler(tRef);
    var globalDefaults = JSON.stringify($tm.config.vis);
    var localDefaults = this.view.getConfig('vis');
    var nodes = {};
    nodes[node.id] = node;
    var nodeStylesByTRef = $tm.adapter.getInheritedNodeStyles(nodes);
    var groupStyles = JSON.stringify(nodeStylesByTRef[tRef]);
    var globalNodeStyle = JSON.stringify(utils.merge(
                            {},
                            { color: tObj.fields['color'] },
                            utils.parseJSON(tObj.fields['tmap.style'])));

    var viewLabel = this.view.getLabel();

    // we do not used the cashed version since we need a new object!
    var nodeData = this.view.getNodeData(node.id, true) || {};
    // we need to delete the positions so they are not reset when a user
    // resets the style…
    delete nodeData.x;
    delete nodeData.y;

    var args = {
      'view': viewLabel,
      'tiddler': tObj.fields.title,
      'tidColor': tObj.fields['color'],
      'tidIcon': tObj.fields[$tm.field.nodeIcon]
                 || tObj.fields['tmap.fa-icon'],
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
    var addToPreselects = function(scope, store, keys) {
      for (var i = keys.length; i--;) {
        args.dialog.preselects[scope + '.' + keys[i]] = store[keys[i]] || '';
      }
    };
    // local values are retrieved from the view's node data store
    addToPreselects('local', nodeData, [
      'label', 'tw-icon', 'fa-icon', 'open-view'
    ]);
    // global values are taken from the tiddler's field object
    addToPreselects('global', tObj.fields, [
      $tm.field.nodeLabel,
      $tm.field.nodeIcon,
      'tmap.fa-icon',
      'tmap.open-view'
    ]);

    this.dialogManager.open('editNode', args, (isConfirmed, outTObj) => {

      if (!isConfirmed) return;

      var fields = outTObj.fields;

      // save or remove global individual style
      var global = utils.getPropertiesByPrefix(fields, 'global.', true);
      for (var p in global) {
        utils.setField(tRef, p, global[p] || undefined);
      }

      // save local individual data (style + config)
      var local = utils.getPropertiesByPrefix(fields, 'local.', true);
      // CAREFUL: Never change 'local-node-style' to 'local.node-style'
      // (with a dot) because it will get included in the loop!
      var data = utils.parseJSON(fields['local-node-style'], {});
      for (var p in local) {
        data[p] = local[p] || undefined;
      }

      this.view.saveNodeStyle(node.id, data);

      this.preventFitAfterRebuild = true;

    });

  };

  /**
   * This handler is registered at and called by the vis network event
   * system.
   */
  handleVisSingleClickEvent(properties) {

    var isActivated = utils.isTrue($tm.config.sys.singleClickMode);
    if (isActivated && !this.editorMode) {
      this.handleOpenMapElementEvent(properties);
    }

  };

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
  handleVisDoubleClickEvent(properties) {

    if (properties.nodes.length || properties.edges.length) {

      if (this.editorMode
         || !utils.isTrue($tm.config.sys.singleClickMode)) {
        this.handleOpenMapElementEvent(properties);
      }


    } else { // = clicked on an empty spot
      if (this.editorMode) {
        this.handleInsertNode(properties.pointer.canvas);
      }
    }

  };

  handleOpenMapElementEvent(properties) {

    if (properties.nodes.length) { // clicked on a node

      var node = this.graphData.nodesById[properties.nodes[0]];
      if (node['open-view']) {
        $tm.notify('Switching view');
        this.setView(node['open-view']);
      } else {
        this.openTiddlerWithId(properties.nodes[0]);
      }

    } else if (properties.edges.length) { // clicked on an edge

      this.logger('debug', 'Clicked on an Edge');
      var typeId = this.graphData.edgesById[properties.edges[0]].type;
      this.handleEditEdgeType(typeId);

    } else {

      return;

    }

    this.hidePopups(0, true);

  };

  handleEditEdgeType(type) {

    if (!this.editorMode) return;

    var behaviour = $tm.config.sys.edgeClickBehaviour;
    if (behaviour !== 'manager') return;

    $tw.rootWidget.dispatchEvent({
      type: 'tmap:tm-manage-edge-types',
      paramObject: {
        type: type
      }
    });

  };

  /**
   * Listener will be removed if the parent is not part of the dom anymore
   *
   * @see https://groups.google.com/d/topic/tiddlywikidev/yuQB1KwlKx8/discussion [TW5] Is there a destructor for widgets?
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Node.contains
   */
  handleResizeEvent(event) {

    if (this.isZombieWidget()) return;

    var height = this.getAttr('height');
    var width = this.getAttr('width');

    if (this.isInSidebar) {

      var rect = this.domNode.getBoundingClientRect();
      var distRight = 15;
      width = (document.body.clientWidth - rect.left - distRight) + 'px';

      var distBottom = parseInt(this.getAttr('bottom-spacing')) || 15;
      var calculatedHeight = window.innerHeight - rect.top;
      height = (calculatedHeight - distBottom) + 'px';

    }

    this.domNode.style.height = height || '300px';
    this.domNode.style.width = width;

    this.repaintGraph(); // redraw graph

  };

  /**
   * used to prevent nasty deletion as edges are not unselected when leaving vis
   */
  handleClickEvent(evt) {

    if (this.isZombieWidget() || !this.network) return;

    if (!this.graphDomNode.contains(evt.target)) { // clicked outside

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

    this.contextMenu.hide(0, true);

  };

  handleVisSelectNode(properties) {

    // assign selected style
    this.assignActiveStyle(properties.nodes);

  };

  /**
   * Assign some styles when the graph element becomes active, i.e.
   * it is selected or hovered over.
   *
   * @param {Id|Array<Id>} nodeIds - A single id or an Array of ids.
   */
  assignActiveStyle(nodeIds) {

    if (!Array.isArray(nodeIds)) nodeIds = [ nodeIds ];

    var defaultColor = this.visOptions.nodes.color;

    // iterate over selected nodes
    for (var i = nodeIds.length; i--;) {
      var id = nodeIds[i];
      var node = this.graphData.nodesById[id];
      var colorObj = utils.merge({}, defaultColor, node.color);
      this.graphData.nodes.update({
        id: id,
        color: {
          highlight: colorObj,
          hover: colorObj
        }
      });
    }

  };

  handleVisDeselectNode(properties) {

    //~ var prevSelectedNodes = properties.previousSelection.nodes;
    //~ for (var i = prevSelectedNodes.length; i--;) {
    //~ };

  };

  /**
   * Called by vis when the dragging of a node(s) has ended.
   * @param {Object} properties - A vis object containing event-related
   *     information.
   * @param {Array<Id>} properties.nodes - Array of ids of the nodes
   *     that were being dragged.
   */
  handleVisDragEnd(properties) {

    if (!properties.nodes.length) return;

    // fix node again and store positions
    // if in static mode, fixing will be ignored
    this.setNodesMoveable(properties.nodes, false);

  };

  handleVisBeforeDrawing(context2d) {

    if (this.backgroundImage) {
      //utils.drawRaster(context2d, this.network.getScale(), this.network.getViewPosition());
      context2d.drawImage(this.backgroundImage, 0, 0);
    }

  };

  /**
   * called by tooltip class when tooltip is displayed;
   */
  constructTooltip(signature, div) {

    var ev = utils.parseJSON(signature);
    var id = ev.node || ev.edge;

    var text = null;
    var outType = 'text/html';
    var inType = 'text/vnd-tiddlywiki';

    if (ev.node) { // node

      var tRef = $tm.indeces.tById[id];
      var tObj = utils.getTiddler(tRef);

      var descr = tObj.fields[$tm.field.nodeInfo];

      if (descr) {

        div.innerHTML = $tw.wiki.renderText(outType, inType, descr);

      } else if (tObj.fields.text) {

        // simply rendering the text is not sufficient as this prevents
        // us from updating the tooltip content on refresh. So we need
        // to create a temporary widget that is registered to the dom
        // node passed by the tooltip.

        utils.registerTransclude(this, 'tooltipWidget', tRef);
        this.tooltipWidget.setVariable('tv-tiddler-preview', 'yes');
        this.tooltipWidget.render(div);

      } else {

        div.innerHTML = tRef;

      }

    } else { // edge

      var edge = this.graphData.edgesById[id];
      var type = $tm.indeces.allETy[edge.type];

      if (type.description) {
        text = $tw.wiki.renderText(outType, inType, type.description);
      }

      div.innerHTML = (text || type.label || type.id);

    }

  };

  handleVisHoverElement(ev) {

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

  };

  handleVisBlurElement(ev) {

    //~ console.log('vis blur fired');
    //~ this.graphDomNode.style.cursor = 'auto';
    this.tooltip.hide();

  };

  handleVisLoading(params) {

    // we only start to show the progress bar after a while
    //~ if (params.iterations / params.total < 0.05) return;

    this.graphLoadingBarDomNode.style.display = 'block';
    this.graphLoadingBarDomNode.setAttribute('max', params.total);
    this.graphLoadingBarDomNode.setAttribute('value', params.iterations);

    //~ var text = 'Loading ' + Math.round((params.iterations / params.total) * 100) + '%';
    //~ this.graphLoadingBarDomNode.innerHTML = text;

  };

  handleVisLoadingDone(params) {

    this.graphLoadingBarDomNode.style.display = 'none';

  };

  /**
   * Called by vis when a node is being dragged.
   * @param {Object} properties - A vis object containing event-related
   *     information.
   * @param {Array<Id>} properties.nodes - Array of ids of the nodes
   *     that are being dragged.
   */
  handleVisDragStart(properties) {

    if (properties.nodes.length) {
      this.hidePopups(0, true);
      this.assignActiveStyle(properties.nodes);
      this.setNodesMoveable(properties.nodes, true);
    }

  };

  /**
   * called from outside.
   */
  destruct() {

    // while the container should be destroyed and the listeners
    // garbage collected, we remove them manually just to be save

    utils.setDomListeners('remove', window, this.windowDomListeners);
    utils.setDomListeners('remove', this.domNode, this.widgetDomListeners);

    this._destructVis();
  };

  /**
   * Only destructs stuff related to vis.
   */
  _destructVis() {

    if (!this.network) return;

    utils.setDomListeners('remove', this.canvas, this.canvasDomListeners);

    this.network.destroy();
    this.network = null;

  };

  /**
   * Opens the tiddler that corresponds to the given id either as
   * modal (when in fullscreen mode) or in the story river.
   */
  openTiddlerWithId(id) {

    var tRef = $tm.indeces.tById[id];

    this.logger('debug', 'Opening tiddler', tRef, 'with id', id);

    if (this.enlargedMode === 'fullscreen') {

      var draftTRef = this.wiki.findDraft(tRef);
      var wasInDraftAlready = !!draftTRef;

      if (!wasInDraftAlready) {

        var type = 'tm-edit-tiddler';
        this.dispatchEvent({ type: type, tiddlerTitle: tRef });
        draftTRef = this.wiki.findDraft(tRef);

      }

      var args = {
        draftTRef: draftTRef,
        originalTRef: tRef
      };

      var name = 'fullscreenTiddlerEditor';
      this.dialogManager.open(name, args, (isConfirmed, outTObj) => {

        if (isConfirmed) {

          var type = 'tm-save-tiddler';
          this.dispatchEvent({ type: type, tiddlerTitle: draftTRef });

        } else if (!wasInDraftAlready) {

          // also removes the draft from the river before deletion!
          utils.deleteTiddlers([ draftTRef ]);

        }

        // in any case, remove the original tiddler from the river
        var type = 'tm-close-tiddler';
        this.dispatchEvent({ type: type, tiddlerTitle: tRef });

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
  };

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
  getViewHolderRef() {

    // the viewholder is never recalculated once it exists
    if (this.viewHolderRef) {
      return this.viewHolderRef;
    }

    this.logger('info', 'Retrieving or generating the view holder reference');

    // if given, try to retrieve the viewHolderRef by specified attribute
    var viewName = this.getAttr('view');
    if (viewName) {

      this.logger('log', `User wants to bind view "${viewName}' to graph`);

      var viewRef = $tm.path.views + '/' + viewName;
      if (this.wiki.getTiddler(viewRef)) {

        // create a view holder that is exclusive for this graph

        var holderRef = $tm.path.localHolders + '/' + utils.genUUID();
        this.logger('log', `Created an independent temporary view holder "${holderRef}"`);

        // we do not use setView here because it would store and reload the view unnecessarily...
        utils.setText(holderRef, viewRef);

        this.logger('log', `View "${viewRef}' inserted into independend holder`);

      } else {
        this.logger('log', `View "${viewName}" does not exist`);
      }

    }

    if (typeof holderRef === 'undefined') {
      this.logger('log', 'Using default (global) view holder');
      var holderRef =  $tm.ref.defaultViewHolder;
    }

    return holderRef;

  };

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
  setView(view, viewHolderRef) {

    view = new ViewAbstraction(view);

    if (!view.exists()) return;

    var viewLabel = view.getLabel();
    viewHolderRef = viewHolderRef || this.viewHolderRef;
    this.logger('info', `Inserting view "${viewLabel}" into holder "${viewHolderRef}"`);
    this.wiki.addTiddler(new $tw.Tiddler({
      title : viewHolderRef,
      text : viewLabel
    }));

    // WARNING: Never set this.view to the new view state at this point.
    // e.g. via `this.view = this.getView(true)` This would produce a
    // race condition!

  };

  /**
   * This function will return a view abstraction that is based on the
   * view specified in the view holder of this graph.
   *
   * @param {boolean} noCache - Retrieve the view reference again
   *     from the holder and recreate the view abstraction object.
   * @return {ViewAbstraction} the view
   */
  getView(noCache) {

    if (!noCache && this.view) {
      return this.view;
    }

    var viewHolderRef = this.getViewHolderRef();

    // transform into view object
    var text = utils.getText(viewHolderRef);
    var view = new ViewAbstraction(text);

    this.logger('debug', 'Retrieved view from holder');

    if (!view.exists()) {
      this.logger('debug', `Warning: View "${text}" doesn't exist. Default is used instead.`);
      view = new ViewAbstraction('Default');
    }

    return view;

  };

  reloadBackgroundImage(msg) {

    this.backgroundImage = null;

    var bgFieldValue = this.view.getConfig('background_image');
    var imgTObj = utils.getTiddler(bgFieldValue);
    if (!imgTObj && !bgFieldValue) return;

    var img = new Image();
    var ajaxCallback = function(b64) { img.src = b64; };
    img.onload = function() {
      // only now set the backgroundImage to the img object!
      this.backgroundImage = img;
      this.repaintGraph();
      if (msg) { $tm.notify(msg); }
    }.bind(this);

    if (imgTObj) { // try loading from tiddler
      var urlField = imgTObj.fields['_canonical_uri'];
      if (urlField) { // try loading by uri field
        utils.getImgFromWeb(urlField, ajaxCallback);
      } else if (imgTObj.fields.text) { // try loading from base64
         img.src = $tw.utils.makeDataUri(imgTObj.fields.text, imgTObj.fields.type);
      }

    } else if (bgFieldValue) { // try loading directly from reference
      utils.getImgFromWeb(bgFieldValue, ajaxCallback);

    }

  };

  /**
   * using an existing dataset to reflect the changes between
   * two node sets.
   *
   * @param {Hashmap<id, Node>} ltNew - Lookup table that contains the
   *     *new* set of nodes.
   * @param {Hashmap<id, Node>} ltOld - lookup table that holds the
   *     *old* set of nodes.
   * @param {vis.DataSet} [ds] - The dataset to be updated
   */
  getRefreshedDataSet(ltNew, ltOld, ds) {

    if (!ds) {
      return new vis.DataSet(utils.getValues(ltNew));
    }

    // remove all elements;
    // formerly I kept all elements that were included in the new set in
    // the dataset. I would then set properties to null that are
    // not present anymore to prevent property relicts. This turned out
    // to be cumbersome and didn't really work with vis, especially
    // setting nested properties to null. therefore I decided to simply
    // remove all previous elements – surprisingly you don't see any
    // performance decrease…
    if (ltOld) ds.remove(Object.keys(ltOld));

    // inject the new data
    ds.update(utils.getValues(ltNew));

    return ds;

  };

  /**
   * The graph of this widget is only repainted if the following counts:
   *
   * The network object exists (prerequisit).
   *
   * 1. We are not in fullscreen at all
   * 2. This particular graph instance is currently running fullscreen.
   */
  repaintGraph() {

    var isInFS = $tw.utils.hasClass(this.document.body,
                                    'tmap-has-fullscreen-widget');
    if (this.network && (!isInFS || (isInFS && this.enlargedMode))) {

      this.logger('info', 'Repainting the whole graph');

      this.network.redraw();
      this.fitGraph(0, 1000);

    }

  };

  /**
   * If a button is enabled it means it is displayed on the graph canvas.
   *
   * @param {string} name - The name of the button to enabled. Has to
   *     correspond with the css button name.
   * @param {boolean} enable - True if the button should be visible,
   *     false otherwise.
   */
  setGraphButtonEnabled(name, enable) {

    var className = 'vis-button' + ' ' + 'tmap-' + name;
    var b = utils.getFirstElementByClassName(className, this.domNode);
    $tw.utils.toggleClass(b, 'tmap-button-enabled', enable);

  };

  /**
   * Allow the given nodes to be moveable.
   *
   * @param {Array<NodeId>} nodeIds - The ids of the nodes for which
   *     we allow or disallow the movement.
   * @param {boolean} isMoveable - True, if the nodes are allowed to
   *     move or be moved.
   */
  setNodesMoveable(nodeIds, isMoveable) {

    if (!nodeIds || !nodeIds.length || this.view.isEnabled('physics_mode')) {
    // = no ids passed or in floating mode
      return;
    }

    //~ this.network.storePositions();

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
      this.handleStorePositions();
    }

  };

  /**
   * This function will create the dom elements for all tiddlymap-vis
   * buttons and register the event listeners.
   *
   * @param {Object<string, function>} buttonEvents - The label of the
   *     button that is used as css class and the click handler.
   */
  addGraphButtons(buttonEvents) {

    var parent = utils.getFirstElementByClassName('vis-navigation', this.domNode);

    for (var name in buttonEvents) {
      var div = this.document.createElement('div');
      div.className = 'vis-button ' + ' ' + 'tmap-' + name;
      div.addEventListener('click', buttonEvents[name].bind(this), false);
      parent.appendChild(div);

      this.setGraphButtonEnabled(name, true);

    }

  };
}

/*** Exports *******************************************************/

export {
  MapWidget as tmap,
  MapWidget as tiddlymap, // legacy
};
