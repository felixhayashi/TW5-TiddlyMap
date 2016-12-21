"use strict";Object.defineProperty(exports,"__esModule",{value:true});var _MapElementType=require("$:/plugins/felixhayashi/tiddlymap/js/MapElementType");var _MapElementType2=_interopRequireDefault(_MapElementType);var _utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");var _utils2=_interopRequireDefault(_utils);function _interopRequireDefault(e){return e&&e.__esModule?e:{default:e}}
// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/NodeType
type: application/javascript
module-type: library

@preserve

\*/
function NodeType(e,t){if(e instanceof NodeType){return e}e=typeof e==="string"?_utils2.default.getWithoutPrefix(e,$tm.path.nodeTypes+"/"):"tmap:unknown";_MapElementType2.default.call(this,e,$tm.path.nodeTypes,NodeType._fieldMeta,t)}NodeType.prototype=Object.create(_MapElementType2.default.prototype);NodeType._fieldMeta=$tw.utils.extend({},_MapElementType2.default._fieldMeta,{view:{},priority:{parse:function e(t){return isNaN(t)?1:parseInt(t)},stringify:function e(t){return _utils2.default.isInteger(t)?t.toString():"1"}},scope:{stringify:_utils2.default.getWithoutNewLines},"fa-icon":{},"tw-icon":{}});NodeType.prototype.getInheritors=function(e){var t=this.scope;return t?_utils2.default.getMatches(t,e||$tw.wiki.allTitles()):[]};exports.default=NodeType;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/graph/NodeType.js.map
