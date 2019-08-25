/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/listener
type: application/javascript
module-type: startup

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import NodeType from '$:/plugins/felixhayashi/tiddlymap/js/NodeType';
import EdgeType from '$:/plugins/felixhayashi/tiddlymap/js/EdgeType';
import Edge from '$:/plugins/felixhayashi/tiddlymap/js/Edge';
import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import visDefConf from '$:/plugins/felixhayashi/tiddlymap/js/config/vis';

/*** Code **********************************************************/

/**
 * @param {Object} param - event.param
 */
const handleCancelDialog = ({param}) => {
  utils.setField(param, 'text', '');
};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleClearTiddler = ({paramObject} = {})  => {

  const {title, keep} = paramObject;

  if (!title) return;

  const tObj = utils.getTiddler(title);
  const originalFields = tObj ? tObj.fields : {};
  const fieldsToKeep = keep ? keep.split() : [];
  const cloneFields = {
    title,
    text: '' // see https://github.com/Jermolene/TiddlyWiki5/issues/2025
  };

  for (let i = fieldsToKeep.length; i--;) {
    const fieldName = fieldsToKeep[i];
    cloneFields[fieldName] = originalFields[fieldName];
  }

  $tw.wiki.deleteTiddler(title);
  $tw.wiki.addTiddler(new $tw.Tiddler(cloneFields));

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleMixTiddlers = ({paramObject = {}}) => {

  const {tiddlers: tiddlersStringArray, output} = paramObject;

  if (!tiddlersStringArray || !output) return;

  const tiddlers = $tw.utils.parseStringArray(tiddlersStringArray);
  const tObj = utils.getMergedTiddlers(tiddlers, output);

  $tw.wiki.addTiddler(tObj);

};

/**
 * @param {string} param - event.param
 */
const handleConfirmDialog = ({param}) => {

  utils.setField(param, 'text', '1');

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleSuppressDialog = ({paramObject}) => {

  const {dialog, suppress} = paramObject;

  if (utils.isTrue(suppress, false)) {
    utils.setEntry($tm.ref.sysUserConf, `suppressedDialogs.${dialog}`, true);
  }

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleDownloadGraph = ({paramObject}) => {

  const { view } = paramObject;
  const graph = $tm.adapter.getGraph({ view });

  graph.nodes = utils.convert(graph.nodes, 'array');
  graph.edges = utils.convert(graph.edges, 'array');

  const tRef = '$:/temp/tmap/export';

  utils.setField(tRef, 'text', JSON.stringify(graph, null, 2));

  $tw.rootWidget.dispatchEvent({
    type: 'tm-download-file',
    param: tRef,
    paramObject: {
      filename: `${view}.json`
    }
  });
};

/**
 *
 */
const handleConfigureSystem = () => {

  const allTiddlers = utils.getMatches($tm.selector.allPotentialNodes);
  const allEdges = $tm.adapter.getEdgesForSet(allTiddlers);
  const plugin = $tw.wiki.getTiddler($tm.path.pluginRoot).fields;
  const meta = $tw.wiki.getTiddlerData($tm.ref.sysMeta);
  const hasLiveTab = utils.getTiddler($tm.ref.liveTab).hasTag('$:/tags/SideBar');

  const args = {
    numberOfNodes: '' + allTiddlers.length,
    numberOfEdges: '' + Object.keys(allEdges).length,
    pluginVersion: `v${plugin.version}`,
    dataStructureVersion: `v${meta.dataStructureState}`,
    dialog: {
      preselects: {
        'liveTab': '' + hasLiveTab,
        'vis-inherited': JSON.stringify(visDefConf),
        'config.vis': utils.getText($tm.ref.visUserConf),
        'config.sys': $tm.config.sys,
      }
    }
  };

  $tm.dialogManager.open('globalConfig', args, (isConfirmed, outTObj) => {

    if (!isConfirmed) return;

    const config = utils.getPropertiesByPrefix(outTObj.fields, 'config.sys.', true);

    // CAREFUL: this is a data tiddler!
    $tw.wiki.setTiddlerData($tm.ref.sysUserConf, config);

    // show or hide the live tab; to hide the live tab, we override
    // the shadow tiddler; to show it, we remove the overlay again.
    if (utils.isTrue(outTObj.fields.liveTab, false)) {
      utils.setField($tm.ref.liveTab, 'tags', '$:/tags/SideBar');
    } else {
      $tw.wiki.deleteTiddler($tm.ref.liveTab);
    }

    // tw doesn't translate the json to an object so this is already a string
    utils.setField($tm.ref.visUserConf, 'text', outTObj.fields['config.vis']);

  });

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleGenerateWidget = ({paramObject = {}}) => {

  const options = {
    dialog: {
      preselects: {
        'var.view': (paramObject.view || $tm.misc.defaultViewLabel)
      }
    }
  };

  $tm.dialogManager.open('widgetCodeGenerator', options);

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleRemoveEdge = ({paramObject}) => {

  $tm.adapter.deleteEdge(paramObject);

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleCreateEdge = ({paramObject}) => {

  const {from, to, force: isForce} = paramObject;

  if (!from || !to) return;

  if ((utils.tiddlerExists(from) && utils.tiddlerExists(to)) || isForce) {

    // will not override any existing tiddlers…
    utils.addTiddler(to);
    utils.addTiddler(from);

    const edge = new Edge(
      $tm.adapter.makeNode(from).id,
      $tm.adapter.makeNode(to).id,
      paramObject.label,
      paramObject.id
    );

    $tm.adapter.insertEdge(edge);
    $tm.notify('Edge inserted');

  }

};

/**
 * @param {string} type - event.type
 * @param {Object} [paramObject] - event.paramObject
 */
const handleOpenTypeManager = ({type, paramObject = {}}) => {

  // either 'manage-edge-types' or 'manage-node-types'
  const mode = type.match(/tmap:tm-(.*)/)[1];

  if (mode === 'manage-edge-types') {
    var topic = 'Edge-Type Manager';
    var allTypesSelector = $tm.selector.allEdgeTypes;
    var typeRootPath = $tm.path.edgeTypes;
  } else {
    var topic = 'Node-Type Manager';
    var allTypesSelector = $tm.selector.allNodeTypes;
    var typeRootPath = $tm.path.nodeTypes;
  }

  const args = {
    mode: mode,
    topic: topic,
    searchSelector: allTypesSelector,
    typeRootPath: typeRootPath
  };

  const dialogTObj = $tm.dialogManager.open('MapElementTypeManager', args);

  if (paramObject.type) {
    handleLoadTypeForm({
      paramObject: {
        mode: mode,
        id: paramObject.type,
        output: dialogTObj.fields['output']
      }
    });
  }

};

/**
 * @param {string} id - The id of a {@link MapElementType}
 * @param {('manage-edge-types'|'manage-node-types')} mode
 * @param {TiddlerReference} output
 */
const handleLoadTypeForm = ({ paramObject: { mode, id, output } }) => {

  const outTRef = output;
  const type = (mode === 'manage-edge-types' ? EdgeType.getInstance(id) : NodeType.getInstance(id));

  // inject all the type data as fields into the dialog output
  type.save(outTRef, true);

  // fields that need preprocessing

  if (mode === 'manage-edge-types') {
    const usage = $tm.adapter.selectEdgesByType(type);
    const count = Object.keys(usage).length;
    utils.setField(outTRef, 'temp.usageCount', count);
  }

  $tw.wiki.addTiddler(new $tw.Tiddler(
    utils.getTiddler(outTRef),
    {
      'typeTRef': type.fullPath,
      'temp.idImmutable': (type.isShipped ? 'true' : ''),
      'temp.newId': type.id,
      'vis-inherited': JSON.stringify($tm.config.vis)
    }
  ));

  // reset the tabs to default
  utils.deleteByPrefix('$:/state/tabs/MapElementTypeManager');

};

/**
 * @param {Object} paramObject - event.paramObject
 */
const handleSaveTypeForm = ({paramObject}) => {

  const tObj = utils.getTiddler(paramObject.output);
  if (!tObj) return;

  const id = tObj.fields.id;
  const mode = paramObject.mode;

  if (utils.isTrue(tObj.fields['temp.deleteType'], false)) {
    deleteType(mode, id, tObj);
  } else {
    saveType(mode, id, tObj);
  }

};

const deleteType = (mode, id, dialogOutput) => {

  const type = (mode === 'manage-edge-types' ? EdgeType.getInstance(id) : NodeType.getInstance(id));

  $tm.logger('debug', 'Deleting type', type);

  if (mode === 'manage-edge-types') {
    $tm.adapter._processEdgesWithType(type, {action: 'delete'});
  } else {
    $tm.adapter.removeNodeType(type);
  }

  $tw.wiki.addTiddler(new $tw.Tiddler({
    title: utils.getTiddlerRef(dialogOutput)
  }));

  $tm.notify('Deleted type');

};

/**
 * @param {string} id - The id of a {@link MapElementType}
 * @param {('manage-edge-types'|'manage-node-types')} mode
 * @param {TiddlerReference} output
 */
const saveType = (mode, id, output) => {

  const tObj = utils.getTiddler(output);

  // update the type with the form data
  const Type = (mode === 'manage-edge-types' ? EdgeType : NodeType);
  const type = new Type(id, tObj);
  type.save();

  const newId = tObj.fields['temp.newId'];

  if (newId && newId !== tObj.fields['id']) { //renamed

    if (mode === 'manage-edge-types') {

      $tm.adapter._processEdgesWithType(type, {
        action: 'rename',
        newName: newId
      });

    } else {

      (new NodeType(newId, type)).save();
      $tw.wiki.deleteTiddler(type.fullPath);

    }

    utils.setField(tObj, 'id', newId);

  }

  $tm.notify('Saved type data');

};

/**
 * @param {string} id - The id of a {@link MapElementType}
 * @param {('manage-edge-types'|'manage-node-types')} mode
 * @param {TiddlerReference} output
 */
const handleCreateType = ({ paramObject: { mode, id = 'New type', output } }) => {

  const type = (mode === 'manage-edge-types' ? new EdgeType(id) : new NodeType(id));

  type.save();

  handleLoadTypeForm({ paramObject: { id: type.id, mode, output } });

};

/*** Exports *******************************************************/

export const name = 'tmap.listener';
export const platforms = [ 'browser' ];
export const after = [ 'rootwidget', 'tmap.caretaker' ];
export const before = [ 'story' ];
export const synchronous = true;
export const startup = () => {
  utils.addTWlisteners({
    'tmap:tm-remove-edge': handleRemoveEdge,
    'tmap:tm-load-type-form': handleLoadTypeForm,
    'tmap:tm-save-type-form': handleSaveTypeForm,
    'tmap:tm-create-type': handleCreateType,
    'tmap:tm-create-edge': handleCreateEdge,
    'tmap:tm-suppress-dialog': handleSuppressDialog,
    'tmap:tm-generate-widget': handleGenerateWidget,
    'tmap:tm-download-graph': handleDownloadGraph,
    'tmap:tm-configure-system': handleConfigureSystem,
    'tmap:tm-manage-edge-types': handleOpenTypeManager,
    'tmap:tm-manage-node-types': handleOpenTypeManager,
    'tmap:tm-cancel-dialog': handleCancelDialog,
    'tmap:tm-clear-tiddler': handleClearTiddler,
    'tmap:tm-merge-tiddlers': handleMixTiddlers,
    'tmap:tm-confirm-dialog': handleConfirmDialog
  }, $tw.rootWidget, this);
};
