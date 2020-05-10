'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.utils = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/utils
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

var _basic = require('$:/plugins/felixhayashi/tiddlymap/js/lib/utils/basic');

var basicUtils = _interopRequireWildcard(_basic);

var _thirdParty = require('$:/plugins/felixhayashi/tiddlymap/js/lib/utils/thirdParty');

var thirdPartyUtils = _interopRequireWildcard(_thirdParty);

var _wiki = require('$:/plugins/felixhayashi/tiddlymap/js/lib/utils/wiki');

var wikiUtils = _interopRequireWildcard(_wiki);

var _tmap = require('$:/plugins/felixhayashi/tiddlymap/js/lib/utils/tmap');

var tMapUtils = _interopRequireWildcard(_tmap);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/*** Code **********************************************************/

/**
 * A utilities class that contains universally used helper functions
 * to abbreviate code and make my life easier.
 *
 * ATTENTION: This module must not require any other tiddlymap file
 * in order to avoid cyclic dependencies. For the same reason,
 * it must also not access the `$tm.*` object.
 *
 * Exceptions to this restriction:
 *   - The utils module may access all `$tm.*` properties
 *     defined in startup.environment.
 *   - The utils module may require vendor libs or tiddlymap libs
 *     that only require vendor libs themselves.
 *
 * @see Dom utilities {@link https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/utils/*}
 * @namespace utils
 */
var utils = exports.utils = _extends({}, basicUtils, thirdPartyUtils, wikiUtils, tMapUtils);

exports.default = utils;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/lib/utils/utils.js.map
