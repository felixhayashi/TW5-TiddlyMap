/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import EdgeType from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import utils    from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import * as env from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';
import {
  InvalidArgumentException,
} from '$:/plugins/felixhayashi/tiddlymap/js/exception';

/*** Code **********************************************************/

/**
 * This class abstracts the various pieces that together make up the
 * view such as map, edge filter, node filter, config etc.
 * If {@code isCreate} is not specified, the viewAbstraction will only
 * represent the view and not create it or any missing part of it.
 */
class ViewAbstraction {

  /**
   *
   * @param {string|ViewAbstraction|Tiddler} view - The view
   * @param {Object} options
   * @param {boolean} [options.isCreate] - True if the view should be created and override
   *     any existing view, false otherwise.
   */
  constructor(view, options = {}) {

    if (view instanceof ViewAbstraction) {

      // bounce back the object we received
      return view;

    }

    this._registerPaths(view);

    if (options.isCreate) {

      if (!this.configTRef) {

        const name = utils.getRandomLabel({plural: true});
        this.configTRef = $tw.wiki.generateNewTitle(`${$tm.path.views}/${name}`);

      }

      this._createView(options);

    } else if (!ViewAbstraction.exists(this.getRoot())) { // no valid config path

      throw new ResourceNotFoundException('ViewAbstraction', view);

    }

  }

  /**
   * Returns true if this view cannot be edited.
   * As a general rule, all views that come as plugins are locked.
   *
   * @return {boolean}
   */
  isLocked() {

    return $tw.wiki.isShadowTiddler(this.configTRef);

  }

  /**
   * Gives the view a chance to rebuild its properties cache.
   *
   * @param {Updates} updates
   * @return {boolean} True if changes affect parts of the view.
   */
  update(updates) {

    const { changedTiddlers } = updates;

    if (updates[env.path.edgeTypes] || utils.hasKeyWithPrefix(changedTiddlers, this.getRoot())) {
      this._clearCaches();

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
  addPlaceholder(tiddler) {

    utils.cp(utils.getTiddlerRef(tiddler), this.snapshotTRef, true);

  }

  /**
   * A view exists if the the view's root exists as tiddler in the store.
   *
   * @deprecated
   *
   * @return {boolean}
   */
  exists() {

    return ViewAbstraction.exists(this);

  }

  /**
   * The path to the config tiddler that represents the view.
   *
   * @return {TiddlerReference}
   */
  getRoot() {

    return this.configTRef;

  }

  /**
   * Returns this view's creation date.
   *
   * @param {boolean} [asString] True if the returned value should be a string in any case.
   * @return {string|object|undefined} The creation date in the specified output format.
   */
  getCreationDate(asString) {

    const date = $tw.wiki.getTiddler(this.configTRef).fields['created'];

    if (asString) {
      // note: th will be translated as well!
      return (date instanceof Date ? $tw.utils.formatDateString(date, 'DDth MMM YYYY') : '');
    }

    return date;

  }

  /**
   * The label of the view (which is basically the root-path's basename).
   *
   * @return {string} The label (name) of the view.
   */
  getLabel() {

    return utils.getBasename(this.configTRef);

  }

  /**
   * Method to remove the view and its configuration.
   * It will make the view non-existent.
   *
   * Note: Do not use the object anymore after you called this function!
   */
  destroy() {

    // delete the view and all tiddlers stored in its path (map, edge-filter etc.)
    utils.deleteTiddlers(utils.getMatches(`[prefix[${this.configTRef}]]`));

  }

  /**
   * Returns all tiddlers include tiddlymap widgets that reference this view.
   */
  getOccurrences() {

    const filter = `[regexp:text[<\\$(tiddlymap|tmap).*?view=.${this.getLabel()}..*?>]]`;
    return utils.getMatches(filter);

  }

  /**
   * Renames the view.
   *
   * @param {string} newLabel
   * @return {boolean}
   */
  rename(newLabel) {

    if (typeof newLabel !== 'string') {

      return false;
    }

    if (utils.inArray('/', newLabel)) {

      $tm.notify('A view name must not contain any "/"');

      return false;
    }

    // keep a reference to the old label before we change it
    const oldLabel = this.getLabel();

    // start the renaming
    const newRoot = env.path.views + '/' + newLabel;
    const oldRoot = this.getRoot();

    utils.mv(oldRoot, newRoot, true);

    // update references

    if ($tm.config.sys.defaultView === oldLabel) {
      utils.setEntry($tm.ref.sysUserConf, 'defaultView', newLabel);
    }

    if ($tm.config.sys.liveTab.fallbackView === oldLabel) {
      utils.setEntry($tm.ref.sysUserConf, 'liveTab.fallbackView', newLabel);
    }

    $tw.wiki.each((tObj, tRef) => {

      if (tObj.fields['tmap.open-view'] === oldLabel) {

        // update global node data fields referencing this view
        utils.setField(tRef, 'tmap.open-view', newLabel);

        return;

      }

      if (ViewAbstraction.exists(tRef)) {

        // update all local node data referencing this view
        const view = new ViewAbstraction(tRef);
        const nodes = view.getNodeData();

        for (let id in nodes) {
          if (nodes[id]['open-view'] === oldLabel) {
            nodes[id]['open-view'] = newLabel;
          }
        }

        view.saveNodeData(nodes);

      }

    });

    // clear caches registered to previous root before registering new paths
    this._clearCaches();
    this._registerPaths(newLabel);

  }

  /**
   * All configurations that are toggled via checkboxes to have a value
   * either `true` or `false` can be accessed via this method.
   *
   * @param {string} name - The configs name without the `_config` prefix.
   * @return {boolean} True if the configuration is enabled, false otherwise.
   */
  isEnabled(name) {

    return utils.isTrue(this.getConfig(name), false);

  }

  /**
   * Returns a configuration value relating to the given name. If no name
   * is given, an object with all configurations is returned.
   *
   * @param {string} [name] - Instead of all configurations being returned,
   *     only the configuration named name is returned. The initial "config."
   *     may be omitted.
   * @result {string|Object} If `type` is not specified an object containing
   *     all configurations is returned, otherwise a single value will be returned.
   */
  getConfig(name) {

    const config = $tw.wiki.getCacheForTiddler(this.configTRef, "tmap-config", () => {

      const fields = utils.getTiddler(this.configTRef).fields;
      return utils.getPropertiesByPrefix(fields, 'config.');

    });

    const prefixlessName = name && utils.startsWith(name, 'config.') ? name : `config.${name}`;

    return (name ? config[prefixlessName] : config);

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
  setConfig(...args) {

    if (args[0] == null) { // null or undefined

      return;
    }

    if (args.length === 1 && typeof args[0] === 'object') {

      for (let prop in args[0]) {
        this.setConfig(prop, args[0][prop]);
      }

    } else if (args.length === 2 && typeof args[0] === 'string') {

      const prop = utils.getWithoutPrefix(args[0], 'config.');
      let val = args[1];

      if (val === undefined) {

        return;
      }

      const config = this.getConfig();

      if (val === null) {

        $tm.logger('debug', 'Removing config', prop);
        delete config[`config.${prop}`];

      } else {

        if (prop === 'edge_type_namespace') {
          const match = val.match(/[^:]+/);
          val = (match ? match[0] : '');
        }

      }

      $tm.logger('log', 'Setting config', prop, val);
      config[`config.${prop}`] = val;

      // save
      $tw.wiki.addTiddler(new $tw.Tiddler(
        utils.getTiddler(this.configTRef),
        config
      ));

    } else { // not allowed

      throw new InvalidArgumentException(...args);

    }

  }

  /**
   * Whether this view represents the 'live view'
   *
   * @return {boolean}
   */
  isLiveView() {

    return (this.getLabel() === $tm.misc.liveViewLabel);

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
  isNodeIncludedById(node) {

    const regex = $tw.utils.escapeRegExp(ViewAbstraction._getNodeIdFilterPart(node));

    return this.getNodeFilter('raw').match(regex);

  }

  /**
   * Sets and rebuilds the node filter according to the expression provided.
   *
   * @param {string} expr - A tiddlywiki filter expression.
   * @param {boolean} force
   */
  setNodeFilter(expr, force) {

    expr = expr.replace(/[\n\r]/g, ' ');

    if (this.getNodeFilter('raw') === expr) {
      // already up to date;
      // This check is critical to prevent recursion!
      return;
    }

    utils.setField(this.nodeFilterTRef, 'filter', expr);

    $tm.logger('debug', 'Node filter set to', expr);

  }

  /**
   * Sets and rebuilds the edge type filter according to the expression provided.
   *
   * @param {string} expr - A tiddlywiki filter expression.
   */
  setEdgeTypeFilter(expr) {

    expr = expr.replace(/[\n\r]/g, ' ');

    if (this.getEdgeTypeFilter('raw') === expr) { // already up to date
      // This check is critical to prevent recursion!
      return;
    }

    utils.setField(this.edgeTypeFilterTRef, 'filter', expr);

    $tm.logger('debug', 'Edge filter set to', expr);

  }

  /**
   * Method to append a filter part to the current filter (*or*-style).
   * The node's tmap.id will be used in the filter to reference the corresponding tiddler.
   *
   * @param {Node} node
   */
  addNode(node) {

    if (!this.isNodeIncludedById(node)) {

      // @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/285
      if (
        utils.isTrue($tm.config.sys.alwaysAddNodeIdToViewFilter) ||
        !utils.isMatch(node.tRef, this.getNodeFilter('compiled'))
      ) {

        const part = ViewAbstraction._getNodeIdFilterPart(node);
        const separator = ' ';
        this.setNodeFilter(this.getNodeFilter('raw') + separator + part);

      }

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
  removeNode(nodeId) {

    if (!this.isNodeIncludedById(nodeId)) {

      return false;
    }

    const part = ViewAbstraction._getNodeIdFilterPart(nodeId);
    const f = this.getNodeFilter('raw').replace(part, '');

    this.setNodeFilter(f);

    // if (this.getNodeData(nodeId)) {
    //   this.saveNodeData(nodeId, null);
    // }

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
   * @result {*}
   *     Depends on the type param:
   *     - raw: the original filter string
   *     - pretty: the prettyfied filter string for usage in textareas
   *     - matches: {Array<string>} all matches
   *     - whitelist: A lookup table where all matches are true
   */
  getEdgeTypeFilter(type) {

    const filter = $tw.wiki.getCacheForTiddler(this.edgeTypeFilterTRef, "tmap-edgeTypeFilter", () => {

      const allETy = $tm.indeces.allETy;
      const src = Object.keys(allETy);
      const tObj = $tw.wiki.getTiddler(this.edgeTypeFilterTRef);

      let filter = {};
      filter.raw = (tObj && tObj.fields.filter || '');
      filter.pretty = utils.getPrettyFilter(filter.raw);
      filter.matches = utils.getEdgeTypeMatches(filter.raw, allETy);
      filter.whitelist = utils.getLookupTable(filter.matches);

      return filter;

    });

    return (type ? filter[type] : filter);

  }

  /**
   * Whether or not this EdgeType is visible in this view.
   *
   * @param {EdgeType|string} id
   * @return {*}
   */
  isEdgeTypeVisible(id) {

    return utils.isEdgeTypeMatch(EdgeType.getInstance(id).id, this.getEdgeTypeFilter("raw"));

  }

  /**
   * Method will return a tiddlywiki node filter that is used to
   * decide which nodes are displayed by the graph.
   *
   * @param {("raw"|"pretty"|"compiled")} [type] - Use this param to control the output type.
   * @result {*}
   *     Depends on the type param:
   *     - raw: the original filter string
   *     - pretty: the prettyfied filter string for usage in textareas
   *     - compiled: {Array<string>} all matches
   */
  getNodeFilter(type) {

    const filter = $tw.wiki.getCacheForTiddler(this.nodeFilterTRef, "tmap-nodeFilter", () => {

      let filter = utils.makeHashMap();
      const tObj = $tw.wiki.getTiddler(this.nodeFilterTRef);

      filter.raw = (tObj && tObj.fields.filter) || '';
      filter.pretty = utils.getPrettyFilter(filter.raw);
      filter.compiled = $tw.wiki.compileFilter(filter.raw);

      return filter;

    });

    return (type ? filter[type] : filter);

  }

  /**
   * This method will return the node data stored in the view.
   *
   * @todo When to delete obsolete data?
   *
   * @param {string} nodeId
   * @result {Hashmap<Id, Object>} A Hashmap with node data.
   */
  getNodeData(nodeId) {

    const data = $tw.wiki.getCacheForTiddler(this.mapTRef, "tmap-map", () => utils.parseFieldData(this.mapTRef, 'text', {}));

    return (nodeId ? data[nodeId] : data);

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
  equals(view) {

    return view === this
      || (ViewAbstraction.exists(view) && (new ViewAbstraction(view)).getRoot() === this.getRoot());

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
  saveNodeData(...args) {

    const data = this.getNodeData();

    if (args.length === 2) {

      if (typeof args[1] === 'object') {

        if (args[1] === null) {

          delete data[args[0]];

        } else {

          data[args[0]] = Object.assign(data[args[0]] || {}, args[1]);
        }
      }

    } else if (args.length === 1 && typeof args[0] === 'object') {

      $tm.logger('log', 'Storing data in', this.mapTRef);

      Object.assign(data, args[0]);

    } else { // not allowed

      throw new InvalidArgumentException(...args);
    }

    utils.writeFieldData(this.mapTRef, 'text', data, $tm.config.sys.jsonIndentation);

  }

  /**
   * Saves a node's position to the store
   *
   * @param {Node} node
   */
  saveNodePosition(node) {

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
  saveNodePositions(positions) {

    const nodeData = this.getNodeData();

    for (let id in positions) {

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
  setCentralTopic(nodeId) {

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
  saveNodeStyle(nodeId, style) {

    // remove any previos style from store;
    // @TODO: optimize this only null in style var needs to be removed
    const data = this.getNodeData(nodeId) || {};

    const pos = { x: data.x, y: data.y };

    // tabula rasa! delete all previous properties
    for (let p in data) {
      delete data[p];
    }

    // save new style
    this.saveNodeData(nodeId, {
      ...style,
      ...pos
    });

  }

  /**
   * The view's configTiddlerRef is stored in different tiddlers (paths).
   * This function registers these paths to this the view instance.
   *
   * @private
   * @params {ViewAbstraction|string} view
   */
  _registerPaths(view, isCreate) {

    // main config is stored here
    this.configTRef = ViewAbstraction._getRootPath(view);

    // store for node properties (positions and local node styles)
    this.mapTRef = `${this.configTRef}/map`;

    // filter stores
    this.nodeFilterTRef = `${this.configTRef}/filter/nodes`;
    this.edgeTypeFilterTRef = `${this.configTRef}/filter/edges`;

    this.snapshotTRef = `${this.getRoot()}/snapshot`;

  }

  /**
   * This will clear all cached tiddlers related to this view.
   *
   * @private
   * @return {boolean} true if the cache was dirty, false if cache was up-to-date and did
   */
  _clearCaches() {
    // clear all tiddler-caches below this path
    utils
      .getMatches(`[prefix[${this.getRoot()}]]`)
      .forEach(tRef => { $tw.wiki.clearCache(tRef); });
  }

  /**
   * Will create the config tiddler which means that the view will
   * start to exist.
   *
   * @private
   */
  _createView({ isForce, protoView, isHidden } = {}) {

    // destroy any former view that existed in this path
    if (ViewAbstraction.exists(this)) {

      if (!isForce) {

        return;

      }

      this.destroy();
    }

    if (ViewAbstraction.exists(protoView)) {
      utils.cp((new ViewAbstraction(protoView)).getRoot(), this.configTRef, true);
    }

    // create new view
    const fields = {
      title: this.configTRef,
      id: utils.genUUID(), // maybe useful for future purposes…
    };

    if (!isHidden) {
      fields[$tm.field.viewMarker] = true;
    }

    $tw.wiki.addTiddler(new $tw.Tiddler(
      utils.getTiddler(this.configTRef), // in case we cloned the view
      fields
    ));

    this.setEdgeTypeFilter(env.filter.defaultEdgeTypeFilter);

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
  static _getNodeIdFilterPart(node) {

    const id = (typeof node === 'object' ? node.id : node);

    return `[field:tmap.id[${id}]]`;

  }

  /**
   * Will return the path to the config tiddler of this view, aka the view's root.
   *
   * @private
   *
   * @param {*} view - The constructor param to abstract or create the view.
   * @result {string|undefined} The view config path.
   */
  static _getRootPath(view) {

    if (view instanceof ViewAbstraction) {

      return view.configTRef;

    }

    if (view instanceof $tw.Tiddler) { // is a tiddler object

      view  = view.fields.title;

    }

    if (typeof view === 'string') {

      // remove prefix and slash
      const label = utils.getWithoutPrefix(view, `${$tm.path.views}/`);

      // a valid label must not contain any slashes
      if (label && !utils.hasSubString(label, '/')) {

        return `${$tm.path.views}/${label}`;

      }
    }

  }

  /**
   * A view exists if the the view's root exists as tiddler in the store.
   *
   * @return {ViewAbstraction|string}
   */
  static exists(view) {

    if (!view) {

      return false;
    }

    if (view instanceof ViewAbstraction) {

      view = view.configTRef;

    } else {

      view = ViewAbstraction._getRootPath(view);
    }

    return utils.tiddlerExists(view);

  }

}

/*** Exports *******************************************************/

export default ViewAbstraction;
