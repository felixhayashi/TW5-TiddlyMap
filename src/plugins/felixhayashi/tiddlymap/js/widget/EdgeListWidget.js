/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/EdgeListWidget
type: application/javascript
module-type: widget

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

class EdgeListWidget extends Widget {

  constructor(parseTreeNode, options) {

    super(parseTreeNode, options);

  }

  render(parent, nextSibling) {

    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);

  };

  execute() {

    const nodes = [ this.getVariable('currentTiddler') ];
    const filter = this.getAttribute('filter', '');
    const direction = this.getAttribute('direction', 'both');
    const allETy = $tm.indeces.allETy;
    const matches = utils.getEdgeTypeMatches(filter, allETy);

    const options = {
      typeWL: utils.getLookupTable(matches),
      direction: direction
    };

    // retrieve nodes and edges
    const { nodes: neighbours, edges } = $tm.adapter.getNeighbours(nodes, options);

    let entries = [];
    for (let id in edges) {

      const edge = edges[id];
      const neighbour = neighbours[edge.to] || neighbours[edge.from];

      if (!neighbour) { // obsolete edge from old times;
        continue;
      }

      // make item template
      entries.push({
        type: 'tmap-edgelistitem',
        edge: edge,
        typeWL: options.typeWL,
        neighbour: neighbour,
        // the children of this widget (=what is wrapped inside the
        // widget-element's body) is used as template for the list items
        children: this.parseTreeNode.children
      });
    }

    if (!entries.length) {

      this.wasEmpty = true;
      entries = this.getEmptyMessage();

    } else if (this.wasEmpty) {

      // we need to remove the empty message
      this.removeChildDomNodes();

    }

    this.makeChildWidgets(entries);

  }

  getEmptyMessage() {

    const parser = this.wiki.parseText(
      'text/vnd.tiddlywiki',
      this.getAttribute('emptyMessage', ''),
      { parseAsInline: true }
    );

    return parser ? parser.tree : [];

  }

  refresh(changedTiddlers) {

    const changedAttributes = this.computeAttributes();

    if (utils.hasElements(changedAttributes)) {

      this.refreshSelf();

      return true;
    }

    for (let tRef in changedTiddlers) {
      if (!utils.isSystemOrDraft(tRef)) {

        this.refreshSelf();

        return true;
      }
    }

    // let children decide for themselves
    return this.refreshChildren(changedTiddlers);

  }
}

/*** Exports *******************************************************/

exports['tmap-connections'] = EdgeListWidget;
