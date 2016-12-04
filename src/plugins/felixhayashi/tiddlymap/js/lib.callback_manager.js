// tw-module
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/CallbackManager
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

/**
 * @constructor
 */
class CallbackManager {

  constructor() {
    this.callbacks = utils.makeHashMap();
  }

  /**
   * The callback mechanism allows to dynamically listen to tiddler
   * changes without hardcoding a change-check for a tiddler name
   * in the refresh function.
   *
   * @param {TiddlerReference} tRef - A tiddler whose change triggers
   *     the callback.
   * @param {function} callback - A function that is called when the
   *     tiddler has changed.
   * @param {boolean} [isDeleteOnCall=true] - True if to delete the
   *     callback once it has been called, false otherwise.
   */
  add(tRef, callback, isDeleteOnCall) {

    $tm.logger('debug', `A callback was registered for changes of "${tRef}"`);
    this.callbacks[tRef] = {
      execute: callback,
      isDeleteOnCall: (typeof isDeleteOnCall === 'boolean' ? isDeleteOnCall : true)
    };

  };

  /**
   * Removes the callback from the list of tiddler callbacks.
   */
  remove(refOrRefList) {

    if (!refOrRefList) return;

    if (typeof refOrRefList === 'string') {
      refOrRefList = [refOrRefList];
    }

    for (var i = refOrRefList.length; i--;) {
      var tRef = refOrRefList[i];
      if (this.callbacks[tRef]) {
        $tm.logger('debug', `A callback for "${tRef}" will be deleted`);
        delete this.callbacks[tRef];
      }
    }

  };

  /**
   * this method has to be implemented at the top of the refresh method.
   * It checks for changed tiddlers that have
   * registered callbacks. If `deleteOnCall` was specified during
   * registration of the callback, the callback will be deleted
   * automatically.
   */
  handleChanges(changedTiddlers) {

    if (this.callbacks.length == 0) return;

    for (var tRef in changedTiddlers) {
      if (!this.callbacks[tRef]) continue;

      if ($tw.wiki.getTiddler(tRef)) {

        $tm.logger('debug', `Executing a callback for: ${tRef}`);
        this.callbacks[tRef].execute(tRef);

        // a continue prevents deleting the callback
        if (!this.callbacks.isDeleteOnCall) continue;

      }

      this.remove(tRef);
    }

  };
}

/*** Exports *******************************************************/

export default CallbackManager;
