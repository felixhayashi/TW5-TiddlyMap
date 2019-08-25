/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/CallbackManager
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/**
 * Makes it possible to register callbacks for tiddler changes.
 */
class CallbackManager {

  constructor() {
    this.callbacks = utils.makeHashMap();
    this.logger = $tm.logger;
    this.wiki = $tw.wiki;
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
  add(tRef, callback, isDeleteOnCall = true) {

    this.logger('debug', `A callback was registered for changes of "${tRef}"`);
    this.callbacks[tRef] = {
      execute: callback,
      isDeleteOnCall
    };

  };

  /**
   * Removes the callback from the list of tiddler callbacks.
   */
  remove(refOrRefList) {

    if (!refOrRefList) {
      return;
    }

    if (typeof refOrRefList === 'string') {
      refOrRefList = [ refOrRefList ];
    }

    for (let i = refOrRefList.length; i--;) {
      const tRef = refOrRefList[i];
      if (this.callbacks[tRef]) {
        this.logger('debug', `Deleting callback for "${tRef}"`);
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
  refresh(changedTiddlers) {

    if (this.callbacks.length == 0) {
      return;
    }

    for (let tRef in changedTiddlers) {

      if (!this.callbacks[tRef]) {
        continue;
      }

      if (this.wiki.getTiddler(tRef)) {

        this.logger('debug', `Executing a callback for: ${tRef}`);
        this.callbacks[tRef].execute(tRef);

        // a continue prevents deleting the callback
        if (!this.callbacks.isDeleteOnCall) {
          continue;
        }
      }

      this.remove(tRef);
    }

  };
}

/*** Exports *******************************************************/

export default CallbackManager;
