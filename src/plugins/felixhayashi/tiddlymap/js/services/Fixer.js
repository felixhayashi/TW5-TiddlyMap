/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Fixer
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils           from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import ViewAbstraction from '$:/plugins/felixhayashi/tiddlymap/js/ViewAbstraction';
import EdgeType        from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import NodeType        from '$:/plugins/felixhayashi/tiddlymap/js/NodeType';
import * as env        from '$:/plugins/felixhayashi/tiddlymap/js/lib/environment';

/*** Code **********************************************************/

class Fixer {

  /**
   * @param {Adapter} adapter
   * @param {Object} logger
   * @param {Object} glNTy
   */
  constructor(adapter, logger, glNTy) {

    this.adapter = adapter;
    this.logger = logger;
    this.wiki = $tw.wiki;
    this.glNTy = glNTy;

  }

  moveEdges(path, view) {

    const matches = utils.getTiddlersByPrefix(path);
    for (let i = 0; i < matches.length; i++) {

      // create edge type
      let type = utils.getBasename(matches[i]);

      if (type === '__noname__') {
        type = 'tmap:unknown';
      }

      type = EdgeType.getInstance(type);

      if (!type.exists()) {
        type.save();
      }

      // move edges
      const edges = this.wiki.getTiddlerData(matches[i]);
      for (let j = 0; j < edges.length; j++) {
        // prefix formerly private edges with view name as namespace
        edges[j].type = (view ? view + ':' : '') + type.id;
        this.adapter.insertEdge(edges[j]);
      }

      // finally remove the store
      this.wiki.deleteTiddler(matches[i]);

    }

  }

  executeUpgrade(toVersion, curVersion, upgrade) {

    if (!utils.isLeftVersionGreater(toVersion, curVersion)) {
      // = current data structure version is newer than version we want to upgrade to.
      return;
    }

    // issue debug message
    this.logger('debug', `Upgrading data structure to ${toVersion}`);
    // execute fix
    const msg = upgrade();
    // update meta
    utils.setEntry(env.ref.sysMeta, 'dataStructureState', toVersion);

    return msg;

  };

  /**
   * Special fix that is not invoked along with the other fixes but
   * when creating the index (see caretaker code).
   *
   * Changes:
   * 1. The node id field is moved to tmap.id if **original version**
   *    is below v0.9.2.
   */
  fixId() {

    const meta = this.wiki.getTiddlerData(env.ref.sysMeta, {});

    this.executeUpgrade('0.9.2', meta.dataStructureState, () => {

      if (utils.isLeftVersionGreater('0.9.2', meta.originalVersion)) {
        // path of the user conf at least in 0.9.2
        const userConf = '$:/plugins/felixhayashi/tiddlymap/config/sys/user';
        const nodeIdField = utils.getEntry(userConf, 'field.nodeId', 'tmap.id');
        utils.moveFieldValues(nodeIdField, 'tmap.id', true, false);
      }
    });

  };

  fix() {

    const meta = this.wiki.getTiddlerData(env.ref.sysMeta, {});

    this.logger('debug', 'Fixer is started');
    this.logger('debug', 'Data-structure currently in use: ', meta.dataStructureState);

    /**
     * Changes:
     * 1. Edges are stored in tiddlers instead of type based edge stores
     * 2. No more private views
     */
    this.executeUpgrade('0.7.0', meta.dataStructureState, () => {

      // move edges that were formerly "global"
      this.moveEdges('$:/plugins/felixhayashi/tiddlymap/graph/edges', null);

      // move edges that were formerly bound to view ("private")
      const filter = env.selector.allViews;
      const viewRefs = utils.getMatches(filter);
      for (let i = 0; i < viewRefs.length; i++) {
        const view = new ViewAbstraction(viewRefs[i]);
        this.moveEdges(`${view.getRoot()}/graph/edges`, view);
      }

    });

    /**
     * Changes:
     * 1. Changes to the live view filter and refresh trigger field
     */
    this.executeUpgrade('0.7.32', meta.dataStructureState, () => {

      if (!ViewAbstraction.exists('Live View')) {

        return;
      }

      const liveView = new ViewAbstraction('Live View');

      // Only listen to the current tiddler of the history list
      liveView.setNodeFilter('[field:title{$:/temp/tmap/currentTiddler}]', true);

      liveView.setConfig({
        'refresh-trigger': null, // delete the field (renamed)
        'refresh-triggers': $tw.utils.stringifyList([ '$:/temp/tmap/currentTiddler' ]),
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
    this.executeUpgrade('0.9.0', meta.dataStructureState, () => {

      const confRef = env.ref.visUserConf;
      const userConf = utils.unflatten(this.wiki.getTiddlerData(confRef, {}));

      if (typeof userConf.groups === 'object') {

        const type = NodeType.getInstance('tmap:neighbour');
        type.setStyle(userConf.groups[ 'neighbours' ]);
        type.save();

        delete userConf.groups;
        this.wiki.setTiddlerData(confRef, userConf);

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
    this.executeUpgrade('0.9.16', meta.dataStructureState, () => {

      for (let i = this.glNTy.length; i--;) {
        this.glNTy[i].save(null, true);
      }

    });

    /**
     * Fixes the live tab
     */
    this.executeUpgrade('0.10.3', meta.dataStructureState, function () {

      const liveTab = env.ref.liveTab;
      if (utils.getTiddler(liveTab).hasTag('$:/tags/SideBar')) {
        this.wiki.deleteTiddler(liveTab);
        utils.setField(liveTab, 'tags', '$:/tags/SideBar');
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

      const views = utils.getMatches(env.selector.allViews);

      for (let i = views.length; i--;) {

        const view = new ViewAbstraction(views[i]);
        let eTyFilter = view.getEdgeTypeFilter('raw');
        const confKey = 'edge_type_namespace';
        view.setConfig(confKey, view.getConfig(confKey));

        let f = env.filter.defaultEdgeTypeFilter;

        if (eTyFilter) {

          // remove any occurences of the egde type path prefix
          const edgeTypePath = env.path.edgeTypes;
          eTyFilter = utils.replaceAll(eTyFilter, '', [
            edgeTypePath,
            edgeTypePath + '/',
            '[prefix[' + edgeTypePath + ']]',
            '[prefix[' + edgeTypePath + '/]]',
            [ '[suffix[tw-body:link]]', '[[tw-body:link]]' ],
            [ '[suffix[tw-list:tags]]', '[[tw-list:tags]]' ],
            [ '[suffix[tw-list:list]]', '[[tw-body:list]]' ],
            [ '[suffix[tmap:unknown]]', '[[tmap:unknown]]' ],
            [ '[suffix[unknown]]', '[[tmap:unknown]]' ],
          ]);

          f = '-[prefix[_]] ' + eTyFilter;

        }

        view.setEdgeTypeFilter(f);
      }

    });

  };
}

/*** Exports *******************************************************/

export default Fixer;

