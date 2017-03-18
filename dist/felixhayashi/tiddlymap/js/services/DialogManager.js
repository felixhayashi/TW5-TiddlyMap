'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/DialogManager
type: application/javascript
module-type: library

@preserve

\*/

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _CallbackManager = require('$:/plugins/felixhayashi/tiddlymap/js/CallbackManager');

var _CallbackManager2 = _interopRequireDefault(_CallbackManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The DialogManager is responsible for preparing, displaying and
 * finalizing all the dialogs.
 */
var DialogManager = function () {

  /**
   * @param {CallbackManager} callbackManager - A callback manager that
   *     is informed about changed tiddlers and keeps track of the
   *     various tiddlers produced during the dialog process.
   * @param {Object} [context] - An optional *this*-reference to bind the
   *     callback of each called dialog to. Otherwise, the callback of
   *     each dialog has to be bound manually to the callback if required.
   */
  function DialogManager(callbackManager, context) {
    _classCallCheck(this, DialogManager);

    // create callback registry
    this.callbackManager = callbackManager;
    this.context = context;
  }

  /**
   * This function opens a dialog based on a skeleton and some fields and eventually
   * calls a callback once the dialog is closed. The callback contains an indicator
   * whether the dialog subject was confirmed or the operation cancelled. In any
   * case the output tiddler is passed to the callback. Each dialog may write its
   * changes to this tiddler in order to store the dialog result and make it available
   * to the callback.
   *
   * How does it work?
   *
   * The output of the dialog process is stored in a temporary tiddler that is only known
   * to the current instance of the dialog. This way it is ensured that only the dialog process
   * that created the temporary tiddler will retrieve the result. Now we are able to
   * provide unambigous and unique correspondance to dialog callbacks.
    * Any dialog output is stored in a unique output-tiddler. Once there is a result,
   * a new result tiddler is created with indicators how to interpret the output.
   * The result tiddler can be understood as exit code that is independent of the output.
   * It is the result tiddler that triggers the dialog callback that was registered before.
   * the output is then read immediately from the output-tiddler.
   *
   * @param {string} templateId - The dialog id which is the basename of
   *     the template title.
   * @param {Hashmap} [param] - All properties (except those with special meanings)
   *     of param will be accessible as variables in the modal
   * @param {string} [param.subtitle] -
   * @param {string} [param.cancelButtonLabel] - The label of the cancel button.
   * @param {string} [param.confirmButtonLabel] - The label of the confirm button.
   * @param {function} [callback] - A function with the signature
   *     function(isConfirmed, outputTObj). `outputTObj` contains data
   *     produced by the dialog (can be undefined even if confirmed!).
   *     Be careful: the tiddler that outputTObj represents is deleted immediately.
   * @return {$tw.Tiddler} The dialog tddler object with all its fields.
   */


  _createClass(DialogManager, [{
    key: 'open',
    value: function open(templateId) {
      var param = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var callback = arguments[2];


      if (_utils2.default.isTrue($tm.config.sys.suppressedDialogs[templateId], false)) {
        $tm.logger('warning', 'Suppressed dialog', templateId);
        return;
      }

      $tm.logger('debug', 'Dialog param object', param);

      if (typeof callback === 'function' && this.context) {
        callback = callback.bind(this.context);
      }

      // create a temporary tiddler reference for the dialog
      var dialogTRef = $tm.path.tempRoot + '/dialog-' + _utils2.default.genUUID();

      // get the dialog template
      var skeleton = _utils2.default.getTiddler($tm.path.dialogs + '/' + templateId);

      // fields used to handle the dialog process
      var dialog = {
        title: dialogTRef,
        buttons: skeleton.fields['buttons'] || 'ok_cancel',
        classes: 'tmap-modal-content ' + skeleton.fields['classes'],
        output: dialogTRef + '/output',
        result: dialogTRef + '/result',
        temp: dialogTRef + '/temp',
        template: skeleton.fields.title,
        templateId: templateId,
        currentTiddler: dialogTRef + '/output',
        text: _utils2.default.getText($tm.path.dialogs)
      };

      if (param.dialog) {

        if (param.dialog.preselects) {

          // register preselects
          $tw.wiki.addTiddler(new $tw.Tiddler({ title: dialog.output }, _utils2.default.flatten(param.dialog.preselects)));

          // remove preselects from param object
          delete param.dialog.preselects;
        }

        // extend the dialog object with parameters provided by the user
        _utils2.default.merge(dialog, param.dialog);
      }

      // force the footer to be set to the wrapper
      // the footer wrapper will determine the footer from the
      // buttons field/variable
      dialog.footer = _utils2.default.getText($tm.path.footers);

      // flatten dialog and param object
      dialog = _utils2.default.flatten(dialog);
      param = _utils2.default.flatten(param);

      var fn = function fn(tRef) {

        DialogManager.getElement('hidden-close-button').click();

        var triggerTObj = $tw.wiki.getTiddler(tRef);
        var isConfirmed = triggerTObj.fields.text;

        var outputTObj = null;
        if (isConfirmed) {
          outputTObj = $tw.wiki.getTiddler(dialog.output);
        } else {
          $tm.notify('operation cancelled');
        }

        if (typeof callback === 'function') {
          callback(isConfirmed, outputTObj);
        }

        // close and remove all tiddlers used by the dialog
        _utils2.default.deleteByPrefix(dialogTRef);
      };

      // add trigger
      this.callbackManager.add(dialog.result, fn, true);

      // create dialog
      var dialogTiddler = new $tw.Tiddler(skeleton, param, dialog);
      $tw.wiki.addTiddler(dialogTiddler);

      $tm.logger('debug', 'Opening dialog', dialogTiddler);

      $tw.rootWidget.dispatchEvent({
        type: 'tm-modal',
        param: dialogTiddler.fields.title,
        paramObject: dialogTiddler.fields
      });

      DialogManager.addKeyBindings();

      return dialogTiddler;
    }
  }], [{
    key: 'getElement',
    value: function getElement(name) {

      return _utils2.default.getFirstElementByClassName('tmap-' + name);
    }

    /**
     * This method will search for form elements that have the class
     * `tmap-trigger-field` set, which means that TiddlyMap shall
     * perform a button press when a key combo occurs while the field
     * has focus. To know which button to press on what key event,
     * it looks for classes of the form: tmap-triggers-BUTTONNAME-on-KEYCOMBO.
     */

  }, {
    key: 'addKeyBindings',
    value: function addKeyBindings() {

      var keys = $tm.keycharm({
        container: _utils2.default.getFirstElementByClassName('tc-modal')
      });

      var re = /tmap-triggers-(.+?)-on-(.+?)(?:\s|$)/;
      var triggers = document.getElementsByClassName('tmap-trigger-field');

      for (var i = triggers.length; i--;) {
        var classNames = triggers[i].className.split(' ');
        for (var j = classNames.length; j--;) {
          var matches = classNames[j].match(re);
          if (!matches) {
            // don't care
            continue;
          }
          var buttonName = matches[1];
          var key = matches[2];
          var buttonElement = DialogManager.getElement(buttonName);
          if (!buttonElement) continue;
          keys.bind(key, function () {
            this.click();
          }.bind(buttonElement));
        }
      }
    }
  }]);

  return DialogManager;
}();

/*** Exports *******************************************************/

exports.default = DialogManager;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/DialogManager.js.map
