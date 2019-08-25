/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/EdgeListWidgetItem
type: application/javascript
module-type: widget

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

class EdgeListItemWidget extends Widget {

  constructor(parseTreeNode, options) {

    super(parseTreeNode, options);
    this.arrows = $tm.misc.arrows;

  }

  execute() {

    const item = this.parseTreeNode;
    const tRef = $tm.tracker.getTiddlerById(item.neighbour.id);

    // make edge properties available as variables
    const edge = utils.flatten(item.edge);

    for (let p in edge) {
      if (typeof edge[p] === 'string') {
        this.setVariable(`edge.${p}`, edge[p]);
      }
    }

    // Perspective: Neighbour
    this.setVariable('currentTiddler', tRef);
    this.setVariable('neighbour', tRef);

    const type = $tm.indeces.allETy[edge.type];
    const indexedAs = (edge.to === item.neighbour.id ? 'to' : 'from');
    let arrow = indexedAs;

    if (type.biArrow) {
      arrow = 'bi';
    } else {
      if (indexedAs === 'to' && type.invertedArrow) {
        arrow = 'from';
      } else if (indexedAs === 'from' && type.invertedArrow) {
        arrow = 'to';
      }
    }

    this.setVariable('direction', arrow);
    this.setVariable('directionSymbol', arrow === 'bi'
      ? this.arrows.bi
      : arrow === 'from'
        ? this.arrows.in
        : this.arrows.out);

    // Construct the child widgets
    this.makeChildWidgets();

  }

  refresh(changedTiddlers) {

    return this.refreshChildren(changedTiddlers);

  }
}

/*** Exports *******************************************************/

exports['tmap-edgelistitem'] = EdgeListItemWidget;
