'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/CallbackManager
type: application/javascript
module-type: library

@preserve

\*/

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Makes it possible to register callbacks for tiddler changes.
 */
var CallbackManager = function () {
  function CallbackManager() {
    _classCallCheck(this, CallbackManager);

    this.callbacks = _utils2.default.makeHashMap();
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


  _createClass(CallbackManager, [{
    key: 'add',
    value: function add(tRef, callback) {
      var isDeleteOnCall = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;


      this.logger('debug', 'A callback was registered for changes of "' + tRef + '"');
      this.callbacks[tRef] = {
        execute: callback,
        isDeleteOnCall: isDeleteOnCall
      };
    }
  }, {
    key: 'remove',


    /**
     * Removes the callback from the list of tiddler callbacks.
     */
    value: function remove(refOrRefList) {

      if (!refOrRefList) {
        return;
      }

      if (typeof refOrRefList === 'string') {
        refOrRefList = [refOrRefList];
      }

      for (var i = refOrRefList.length; i--;) {
        var tRef = refOrRefList[i];
        if (this.callbacks[tRef]) {
          this.logger('debug', 'Deleting callback for "' + tRef + '"');
          delete this.callbacks[tRef];
        }
      }
    }
  }, {
    key: 'refresh',


    /**
     * this method has to be implemented at the top of the refresh method.
     * It checks for changed tiddlers that have
     * registered callbacks. If `deleteOnCall` was specified during
     * registration of the callback, the callback will be deleted
     * automatically.
     */
    value: function refresh(changedTiddlers) {

      if (this.callbacks.length == 0) {
        return;
      }

      for (var tRef in changedTiddlers) {

        if (!this.callbacks[tRef]) {
          continue;
        }

        if (this.wiki.getTiddler(tRef)) {

          this.logger('debug', 'Executing a callback for: ' + tRef);
          this.callbacks[tRef].execute(tRef);

          // a continue prevents deleting the callback
          if (!this.callbacks.isDeleteOnCall) {
            continue;
          }
        }

        this.remove(tRef);
      }
    }
  }]);

  return CallbackManager;
}();

/*** Exports *******************************************************/

exports.default = CallbackManager;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/CallbackManager.js.map
