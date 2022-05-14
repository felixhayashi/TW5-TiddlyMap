/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import AbstractMagicEdgeTypeSubscriber from '$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber';
import Widget from "$:/core/modules/widgets/widget.js";

/*** Code **********************************************************/

/**
 * The FilterEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields via a dynamic filter.
 *
 * @see http://tiddlymap.org/#tw-filter
 * @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/206
 */
class FilterEdgeTypeSubstriber extends AbstractMagicEdgeTypeSubscriber {

  /**
   * @inheritDoc
   */
  constructor(allEdgeTypes, options = {}) {
    super(allEdgeTypes, { priority: 10, ...options });
  }

  /**
   * @inheritDoc
   */
  canHandle(edgeType) {

    return edgeType.namespace === 'tw-filter';

  }

  /**
   * @override
   */
  getReferencesFromField(tObj, fieldName, toWL) {

    const filter = tObj.fields[fieldName];

    return runFilter(filter, tObj.fields.title, toWL);

  }

  /**
   * Stores and maybe overrides an edge in this tiddler
   */
  insertEdge(tObj, edge, type) {

    if (!edge.to) {
      return;
    }

    // get the name without the private marker or the namespace
    const name = type.name;
    const toTRef = this.tracker.getTiddlerById(edge.to);
    const currentTiddler = tObj.fields.title;
    let filterString = tObj.fields[name] || "";

    // We don't want to add the title if it's already a filter result.
    while (runFilter(filterString, currentTiddler).indexOf(toTRef) < 0) {
      let filterTree = $tw.wiki.parseFilter(filterString);
      let found = false;

      // Search backwards for any explicit removal of the target Ref
      // Otherwise, we might get `... -toTRef toTRef`
      for (let i = filterTree.length-1; i>= 0; i--) {
        let run = filterTree[i];
        let title = runIsSingleTitle(run);
        if (run.prefix === "-" && title === toTRef) {
          // We found an explicit removal. Remove the removal.
          filterTree.splice(i, 1);
          found = true;
          break;
        }
      }

      if (!found) {
        // We didn't find an explicit removal (expected), so we add the title
        // to the list.
        filterTree.push({prefix: "", operators: [{operator: "title", operands: [{text: toTRef}]}]});
      }

      filterString = reassembleFilter(filterTree);
      // Now we go back around and try again to make sure it actually took.
    }

    // save
    utils.setField(tObj, name, filterString);

    return edge;

  };

  /**
   * Deletes an edge in this tiddler
   */
  deleteEdge(tObj, edge, type) {

    // transform
    const name = type.name
    const toTRef = this.tracker.getTiddlerById(edge.to);
    const currentTiddler = tObj.fields.title;
    let filterString = tObj.fields[name];

    // We don't want to remove a title that's not already there
    while (filterString && runFilter(filterString, currentTiddler).indexOf(toTRef) >= 0) {
      let filterTree = $tw.wiki.parseFilter(tObj.fields[name]);
      let found = false;

      for (let i = 0; i < filterTree.length; i++) {
        let run = filterTree[i];
        let title = runIsSingleTitle(run);
        if (!run.prefix && title === toTRef) {
          // This is the title we're looking for. Remove it.
          filterTree.splice(i, 1);
          found = true;
          break;
        }
      }

      if (!found) {
        // We couldn't find it. So it must be a complicated filter. We'll put in
        // a manual removal.
        filterTree.push({prefix: "-", operators: [{operator: "title", operands: [{text: toTRef}]}]});
      }

      filterString = reassembleFilter(filterTree);
      // Now we do it again to make sure it was actually removed
    }

    // save
    utils.setField(tObj, name, filterString);

    return edge;

  }

}

/*** Utility *******************************************************/

  function reassembleFilter(parseTree) {

    // This will hold all of the filter parts
    const fragments = [];
    // Rebuild the filter.
    for (var i = 0; i < parseTree.length; i++) {
      var run = parseTree[i];
      if (fragments.length > 0) {
        fragments.push(" ");
      }
      fragments.push(run.prefix);
      let title = runIsSingleTitle(run);
      if (title) {
        fragments.push(bestQuoteFor(title));
      } else if (run.operators.length > 0) {
        fragments.push("[");
        for (let j = 0; j < run.operators.length; j++) {
          let op = run.operators[j];
          let firstOperand = true;
          if (op.prefix) {
            fragments.push(op.prefix);
          }
          if (op.operator !== "title" || op.suffix) {
            fragments.push(op.operator);
          }
          if (op.suffix) {
            fragments.push(':', op.suffix);
          }
          if (op.regexp) {
            fragments.push("/", op.regexp.source, "/");
            if (op.regexp.flags) {
              fragments.push("(", op.regexp.flags, ")");
            }
          } else {
            for (let k = 0; k < op.operands.length; k++) {
              let operand = op.operands[k];
              if (!firstOperand) {
                fragments.push(',');
              }
              firstOperand = false;
              if (operand.variable) {
                fragments.push('<', operand.text, '>');
              } else if (operand.indirect) {
                fragments.push('{', operand.text, '}');
              } else {
                fragments.push('[', operand.text, ']');
              }
            }
          }
        }
        fragments.push(']');
      }
    }
    // Return compiled filter string, if there is one
    if (fragments.length > 0) {
      return fragments.join("");
    }

    return undefined;

  };

  /**
   * If this is a single title, return the title, otherwise null
   */
  function runIsSingleTitle(run) {

    if (run.operators.length === 1 && !run.namedPrefix) {
        var op = run.operators[0];
        if (op.operator === "title"
        && op.operands.length === 1
        && !op.suffix
        && !op.prefix) {
            var operand = op.operands[0];
            if (!operand.variable && !operand.indirect) {
                return operand.text;
            }
        }
    }
    return null;

  };

  /**
   * Returns title wrapped in quotes if necessary.
   */
  function bestQuoteFor(title) {

    if (/^[^\s\[\]\-+~=:'"][^\s\[\]]*$/.test(title)) {
        return title;
    }
    if (title.indexOf("]") < 0) {
        return "[[" + title + "]]";
    }
    if (title.indexOf("'") < 0) {
        return "'" + title + "'";
    }
    return '"' + title + '"';

  };

  /**
   * Runs a filter and returns an array of the results.
   * Ensures currentTiddler is set.
   */
  function runFilter(filterString, currentTiddler, toWL) {

    // Solves https://github.com/felixhayashi/TW5-TiddlyMap/issues/278
    const parentWidget = new Widget.widget({});
    parentWidget.setVariable("currentTiddler", currentTiddler);
    const widget = new Widget.widget({}, {"parentWidget": parentWidget});
    //noinspection UnnecessaryLocalVariableJS
    const toRefs = utils.getMatches(filterString, toWL, widget);

    return toRefs;

  }

/*** Exports *******************************************************/

export { FilterEdgeTypeSubstriber };
