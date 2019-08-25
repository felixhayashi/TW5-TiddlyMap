/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/utils
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import * as basicUtils        from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/basic';
import * as thirdPartyUtils   from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/thirdParty';
import * as wikiUtils         from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/wiki';
import * as tMapUtils         from '$:/plugins/felixhayashi/tiddlymap/js/lib/utils/tmap';

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
export const utils = {
  ...basicUtils,
  ...thirdPartyUtils,
  ...wikiUtils,
  ...tMapUtils
};

export default utils;
