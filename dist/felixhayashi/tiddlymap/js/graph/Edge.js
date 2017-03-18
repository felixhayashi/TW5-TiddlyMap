'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Edge
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * @constructor
 */
var Edge = function Edge(from, to, type, id) {
  _classCallCheck(this, Edge);

  this.from = from;
  this.to = to;
  this.type = type;
  this.id = id || _utils2.default.genUUID();
};

/*** Exports *******************************************************/

exports.default = Edge;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/graph/Edge.js.map
