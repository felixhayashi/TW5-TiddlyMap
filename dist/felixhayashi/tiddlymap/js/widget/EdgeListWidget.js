'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _widget = require('$:/core/modules/widgets/widget.js');

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/widget/EdgeListWidget
type: application/javascript
module-type: widget

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

var EdgeListWidget = function (_Widget) {
  _inherits(EdgeListWidget, _Widget);

  function EdgeListWidget(parseTreeNode, options) {
    _classCallCheck(this, EdgeListWidget);

    return _possibleConstructorReturn(this, (EdgeListWidget.__proto__ || Object.getPrototypeOf(EdgeListWidget)).call(this, parseTreeNode, options));
  }

  _createClass(EdgeListWidget, [{
    key: 'render',
    value: function render(parent, nextSibling) {

      this.parentDomNode = parent;
      this.computeAttributes();
      this.execute();
      this.renderChildren(parent, nextSibling);
    }
  }, {
    key: 'execute',
    value: function execute() {

      var nodes = [this.getVariable('currentTiddler')];
      var filter = this.getAttribute('filter', '');
      var direction = this.getAttribute('direction', 'both');
      var allETy = $tm.indeces.allETy;
      var matches = _utils2.default.getEdgeTypeMatches(filter, allETy);

      var options = {
        typeWL: _utils2.default.getLookupTable(matches),
        direction: direction
      };

      // retrieve nodes and edges

      var _$tm$adapter$getNeigh = $tm.adapter.getNeighbours(nodes, options),
          neighbours = _$tm$adapter$getNeigh.nodes,
          edges = _$tm$adapter$getNeigh.edges;

      var entries = [];
      for (var id in edges) {

        var edge = edges[id];
        var neighbour = neighbours[edge.to] || neighbours[edge.from];

        if (!neighbour) {
          // obsolete edge from old times;
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
  }, {
    key: 'getEmptyMessage',
    value: function getEmptyMessage() {

      var parser = this.wiki.parseText('text/vnd.tiddlywiki', this.getAttribute('emptyMessage', ''), { parseAsInline: true });

      return parser ? parser.tree : [];
    }
  }, {
    key: 'refresh',
    value: function refresh(changedTiddlers) {

      var changedAttributes = this.computeAttributes();

      if (_utils2.default.hasElements(changedAttributes)) {

        this.refreshSelf();

        return true;
      }

      for (var tRef in changedTiddlers) {
        if (!_utils2.default.isSystemOrDraft(tRef)) {

          this.refreshSelf();

          return true;
        }
      }

      // let children decide for themselves
      return this.refreshChildren(changedTiddlers);
    }
  }]);

  return EdgeListWidget;
}(_widget.widget);

/*** Exports *******************************************************/

exports['tmap-connections'] = EdgeListWidget;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/widget/EdgeListWidget.js.map
