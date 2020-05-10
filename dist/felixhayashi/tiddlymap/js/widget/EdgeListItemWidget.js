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

title: $:/plugins/felixhayashi/tiddlymap/js/widget/EdgeListWidgetItem
type: application/javascript
module-type: widget

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

var EdgeListItemWidget = function (_Widget) {
  _inherits(EdgeListItemWidget, _Widget);

  function EdgeListItemWidget(parseTreeNode, options) {
    _classCallCheck(this, EdgeListItemWidget);

    var _this = _possibleConstructorReturn(this, (EdgeListItemWidget.__proto__ || Object.getPrototypeOf(EdgeListItemWidget)).call(this, parseTreeNode, options));

    _this.arrows = $tm.misc.arrows;

    return _this;
  }

  _createClass(EdgeListItemWidget, [{
    key: 'execute',
    value: function execute() {

      var item = this.parseTreeNode;
      var tRef = $tm.tracker.getTiddlerById(item.neighbour.id);

      // make edge properties available as variables
      var edge = _utils2.default.flatten(item.edge);

      for (var p in edge) {
        if (typeof edge[p] === 'string') {
          this.setVariable('edge.' + p, edge[p]);
        }
      }

      // Perspective: Neighbour
      this.setVariable('currentTiddler', tRef);
      this.setVariable('neighbour', tRef);

      var type = $tm.indeces.allETy[edge.type];
      var indexedAs = edge.to === item.neighbour.id ? 'to' : 'from';
      var arrow = indexedAs;

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
      this.setVariable('directionSymbol', arrow === 'bi' ? this.arrows.bi : arrow === 'from' ? this.arrows.in : this.arrows.out);

      // Construct the child widgets
      this.makeChildWidgets();
    }
  }, {
    key: 'refresh',
    value: function refresh(changedTiddlers) {

      return this.refreshChildren(changedTiddlers);
    }
  }]);

  return EdgeListItemWidget;
}(_widget.widget);

/*** Exports *******************************************************/

exports['tmap-edgelistitem'] = EdgeListItemWidget;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/widget/EdgeListItemWidget.js.map
