/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/MapConfigWidget
type: application/javascript
module-type: widget

@preserve

\*/
/* @preserve TW-Guard */

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import vis from '$:/plugins/felixhayashi/vis/vis.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';

/**
 * Wrapper for the Visjs configurator.
 *
 * ```
 * <$tmap-config
 *     inherited="FIELDNAME FIELDNAME …"
 *     extension="FIELDNAME"
 *     changes="FIELDNAME" (default: same field as extension)
 *     override="true|false" (default: false)
 *     mode="manage-*"
 *     refresh-trigger="tRef" />
 * ```
 *
 * @constructor
 */
function MapConfigWidget(parseTreeNode, options) {

  // call the parent constructor
  Widget.call(this);

  // call initialise on prototype
  this.initialise(parseTreeNode, options);

  // make the html attributes available to this widget
  this.computeAttributes();

}

// !! EXTENSION !!
MapConfigWidget.prototype = Object.create(Widget.prototype);
// !! EXTENSION !!

/**
 * Method to render this widget into the DOM.
 *
 * @override
 */
MapConfigWidget.prototype.render = function(parent, nextSibling) {

  // remember our place in the dom
  this.parentDomNode = parent;

  if (!this.domNode) {
    this.domNode = this.document.createElement('div');
    $tw.utils.addClass(this.domNode, 'tmap-config-widget');
    parent.insertBefore(this.domNode, nextSibling);
  }

  if (this.network) {

    // destroy any previous instance
    this.network.destroy();

  }

  // create container for vis configurator; destroyed when vis is destroyed
  this.networkContainer = document.createElement('div');
  this.domNode.appendChild(this.networkContainer);

  // get environment
  this.refreshTrigger = this.getAttribute('refresh-trigger');
  this.pipeTRef = this.getVariable('currentTiddler');
  this.inheritedFields = $tw.utils.parseStringArray(this.getAttribute('inherited'));
  this.extensionTField = this.getAttribute('extension');
  this.mode = this.getAttribute('mode');

  // load inherited options
  for (var i = 0; i < this.inheritedFields.length; i++) {
    var fieldName = this.inheritedFields[i];
    var style = utils.parseFieldData(this.pipeTRef, fieldName, {});

    // inherited options for nodes/edges come without a top level property
    // so we need to wrap these options
    if (this.mode === 'manage-edge-types') {
      style = { edges: style };
    } else if (this.mode === 'manage-node-types') {
      style = { nodes: style };
    }

    this.inherited = utils.merge(this.inherited, style);

  }

  // load extension to the inherited options; since we store vis config
  // for nodes and edges without the top level property, we may need to
  // append it again, if not done so already.
  this.extension = utils.parseFieldData(this.pipeTRef, this.extensionTField, {});
  // TODO looks clumsy; do it in a more generic way…
  if (this.mode === 'manage-edge-types') {
    if (!this.extension.edges) {
      this.extension = { edges: this.extension };
    }
  } else if (this.mode === 'manage-node-types') {
    if (!this.extension.nodes) {
      this.extension = { nodes: this.extension };
    }
  }

  // we record all changes in a separate variable
  var isSaveOnlyChanges = utils.isTrue(this.getAttribute('save-only-changes'));
  this.changes = (isSaveOnlyChanges ? {} : this.extension);

  var data = { nodes: [], edges: [] };
  var options = utils.merge({}, this.inherited, this.extension);
  $tw.utils.extend(options, {
    configure: {
      enabled: true,
      showButton: false,
      filter: this.getOptionFilter(this.mode)
    }
  });

  this.network = new vis.Network(this.networkContainer, data, options);
  this.network.on('configChange', this.handleConfigChange.bind(this));

  // giving the parent a css height will prevent it from jumping
  // back when the network is destroyed and the network
  // container is removed.
  // fixes https://github.com/almende/vis/issues/1568
  var height = this.parentDomNode.getBoundingClientRect().height;
  this.parentDomNode.style['height'] = height + 'px';

  var reset = this.handleResetEvent.bind(this);
  this.networkContainer.addEventListener('reset', reset, false);

  // register this graph at the caretaker's graph registry
  $tm.registry.push(this);


  this.enhanceConfigurator();

};

/**
 * I only receive the option that has actually changed
 */
MapConfigWidget.prototype.handleResetEvent = function(ev) {
  var change = {};
  change[ev.detail.trigger.path] = null;
  this.handleConfigChange(change);
};

/**
 * I only receive the option that has actually changed
 */
MapConfigWidget.prototype.handleConfigChange = function(change) {

  var flatChanges = utils.flatten(this.changes);
  var flatChange = utils.flatten(change);
  var confPath = Object.keys(utils.flatten(change))[0];
  var isReset = (flatChange[confPath] === null);

  if (isReset) { // we interpret this as delete

    flatChanges[confPath] = undefined;
    this.changes = utils.unflatten(flatChanges);

  } else {

    this.changes = utils.merge(this.changes, change);
  }

  // when storing edge- or node-styles we strip the root property
  var options = utils.merge({}, this.changes);
  if (this.mode === 'manage-node-types') { options = options['nodes']; }
  if (this.mode === 'manage-edge-types') { options = options['edges']; }

  // save changes
  utils.writeFieldData(this.pipeTRef, this.extensionTField, options, $tm.config.sys.jsonIndentation);

  // hack to ensure vis doesn't scroll
  var cls = 'vis-configuration-wrapper';
  var div = this.networkContainer.getElementsByClassName(cls)[0];
  div.style.height = div.getBoundingClientRect().height + 'px';

  if (isReset) {

    // we need to use a timeout here, otherwise we cause a vis bug
    // since it is in the middle of storing the value!
    window.setTimeout(this.refresh.bind(this), 0);

  } else {

    // add active-config indicators
    window.setTimeout(this.enhanceConfigurator.bind(this), 50);

  }

};

/**
 * enhanceConfigurator over all config items and add an indicator.
 */
MapConfigWidget.prototype.enhanceConfigurator = function() {

  var cls = 'vis-configuration-wrapper';
  var elements = this.networkContainer
                     .getElementsByClassName(cls)[0].children;
  var list = [];
  var changes = utils.flatten(this.changes);
  for (var i = 0; i < elements.length; i++) {
    if (!elements[i].classList.contains('vis-config-item')) continue;

    var conf = new VisConfElement(elements[i], list, i);
    list.push(conf);

    if (conf.level === 0) continue;

    conf.setActive(!!changes[conf.path]);

  }
};

/**
 *
 * @param {DOMElement} The config item element.
 * @param {Array<VisConfElement>} a list of VisConfElements of which
 *     this element is also part of.
 * @param {number} the position in the list
 */
function VisConfElement(el, list, pos) {

  var getByCls = 'getElementsByClassName';

  this.el = el;
  this.labelEl = el[getByCls]('vis-config-label')[0]
                 || el[getByCls]('vis-config-header')[0]
                 || el;
  var labelText = (this.labelEl.innerText || this.labelEl.textContent);
  this.label = labelText && labelText.match(/([a-zA-Z0-9]+)/)[1];
  this.level = parseInt(el.className.match(/.*vis-config-s(.).*/)[1]) || 0;

  this.path = this.label;

  if (this.level > 0) {
    for (var i = pos; i--;) {
      var prev = list[i];
      if (prev.level < this.level) {
        this.path = prev.path + '.' + this.path;
        break;
      }
    }
  }
}

VisConfElement.prototype.setActive = function(isEnable) {

  if (!isEnable) return;

  // cannot use utils.hasKeyWithPrefix because some keys start with
  // same value as others
  var cls = 'tmap-vis-config-item-' + (isEnable ? 'active' : 'inactive');
  $tw.utils.addClass(this.el, cls);

  if (isEnable) {

    var button = document.createElement('button');
    button.innerHTML = 'reset';
    button.className = 'tmap-config-item-reset';

    var self = this;

    button.addEventListener('click', function(ev) {
      ev.currentTarget.dispatchEvent(new CustomEvent('reset', {
        detail: { trigger: self },
        bubbles: true,
        cancelable: true
      }));
    }, false);

    this.el.appendChild(button);
  }

};

/**
 *
 *
 */
MapConfigWidget.prototype.getOptionFilter = function(mode) {

  var whitelist = {
    nodes: {
      borderWidth: true,
      borderWidthSelected: true,
      widthConstraint: true,
      heightConstraint: true,
      color: {
        background: true,
        border: true
      },
      font: {
        color: true,
        size: true,
      },
      icon: true,
      labelHighlightBold: false,
      shadow: true,
      shape: true,
      shapeProperties: {
        borderDashes: true,

      },
      size: true
    },
    edges: {
      arrows: true,
      color: true,
      dashes: true,
      font: true,
      labelHighlightBold: false,
      length: true,
      selfReferenceSize: false,
      shadow: true,
      smooth: true,
      width: true
    },
    interaction: {
      hideEdgesOnDrag: true,
      hideNodesOnDrag: true,
      tooltipDelay: true
    },
    layout: {
      hierarchical: true
    },
    manipulation: {
      initiallyActive: true
    },
    physics: {
      forceAtlas2Based: {
        gravitationalConstant: true,
        springLength: true,
        springConstant: true,
        damping: true,
        centralGravity: true
      }
    }
  };

  if (mode === 'manage-edge-types') {
    whitelist = { edges: whitelist.edges };
  } else if (mode === 'manage-node-types') {
    whitelist = { nodes: whitelist.nodes };
  } else {
    whitelist.edges.arrows = false;
  }

  return function(option, path) {

    // operate on a clone; add option as element
    path = path.concat([ option ]);

    var wlObj = whitelist;
    for (var i = 0, l = path.length; i < l; i++) {
      if (wlObj[path[i]] === true) {
        return true;
      } else if (wlObj[path[i]] == null) {
        return false;
      } // else assume object
      wlObj = wlObj[path[i]];
    }

    return false;

  };

};

/**
 * A zombie widget is a widget that is removed from the dom tree
 * but still referenced or still partly executed -- I mean
 * otherwise you couldn't call this function, right?
 *
 * @TODO Outsource this as interface or common super class
 */
MapConfigWidget.prototype.isZombieWidget = function() {

  return !document.body.contains(this.parentDomNode);

};

/**
 * called from outside.
 *
 * @TODO Outsource this as interface or common super class
 */
MapConfigWidget.prototype.destruct = function() {

  if (this.network) {
    this.network.destroy();
  }

};

/**
 * This function is called by the system to notify the widget about
 * tiddler changes.
 *
 * @override
 */
MapConfigWidget.prototype.refresh = function(changedTiddlers) {

  if (this.isZombieWidget() || !this.network) return;

  if (!changedTiddlers || changedTiddlers[this.refreshTrigger]) {
    this.refreshSelf();
    return true;
  }

};

MapConfigWidget.prototype.setNull = function(obj) {

  for (var p in obj) {

    if (typeof obj[p] == 'object') {

      this.setNull(obj[p]);
    } else {

      obj[p] = undefined;
    }
  }

};


/*** Exports *******************************************************/

exports['tmap-config'] = MapConfigWidget;
