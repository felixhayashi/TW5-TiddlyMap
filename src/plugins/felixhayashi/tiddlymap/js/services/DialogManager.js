/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/DialogManager
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

import utils           from '$:/plugins/felixhayashi/tiddlymap/js/utils';
import CallbackManager from '$:/plugins/felixhayashi/tiddlymap/js/CallbackManager';

/**
 * The DialogManager is responsible for preparing, displaying and
 * finalizing all the dialogs.
 */
class DialogManager {

  /**
   * @param {CallbackManager} callbackManager - A callback manager that
   *     is informed about changed tiddlers and keeps track of the
   *     various tiddlers produced during the dialog process.
   * @param {Object} [context] - An optional *this*-reference to bind the
   *     callback of each called dialog to. Otherwise, the callback of
   *     each dialog has to be bound manually to the callback if required.
   */
  constructor(callbackManager, context) {

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
  open(templateId, param = {}, callback) {

    if (utils.isTrue($tm.config.sys.suppressedDialogs[templateId], false)) {
      $tm.logger('warning', 'Suppressed dialog', templateId);
      return;
    }

    $tm.logger('debug', 'Dialog param object', param);

    if (typeof callback === 'function' && this.context) {
      callback = callback.bind(this.context);
    }

    // create a temporary tiddler reference for the dialog
    const dialogTRef = `${$tm.path.tempRoot}/dialog-${utils.genUUID()}`;

    // get the dialog template
    const skeleton = utils.getTiddler(`${$tm.path.dialogs}/${templateId}`);

    // fields used to handle the dialog process
    let dialog = {
      title: dialogTRef,
      buttons: skeleton.fields['buttons'] || 'ok_cancel',
      classes: 'tmap-modal-content ' + skeleton.fields['classes'],
      output: dialogTRef + '/output',
      result: dialogTRef + '/result',
      temp: dialogTRef + '/temp',
      template: skeleton.fields.title,
      templateId: templateId,
      currentTiddler: dialogTRef + '/output',
      text: utils.getText($tm.path.dialogs)
    };

    utils.touch(dialog.output);

    if (param.dialog) {

      if (param.dialog.preselects) {

        // register preselects
        $tw.wiki.addTiddler(new $tw.Tiddler(
          {title: dialog.output},
          utils.flatten(param.dialog.preselects)
        ));

        // remove preselects from param object
        delete param.dialog.preselects;

      }

      // extend the dialog object with parameters provided by the user
      utils.merge(dialog, param.dialog);

    }

    // force the footer to be set to the wrapper
    // the footer wrapper will determine the footer from the
    // buttons field/variable
    dialog.footer = utils.getText($tm.path.footers);

    // flatten dialog and param object
    dialog = utils.flatten(dialog);
    param = utils.flatten(param);

    const fn = tRef => {

      DialogManager.getElement('hidden-close-button').click();

      const triggerTObj = $tw.wiki.getTiddler(tRef);
      const isConfirmed = triggerTObj.fields.text;

      let outputTObj = null;
      if (isConfirmed) {
        outputTObj = $tw.wiki.getTiddler(dialog.output);
      } else {
        $tm.notify('operation cancelled');
      }

      if (typeof callback === 'function') {
        callback(isConfirmed, outputTObj);
      }

      // close and remove all tiddlers used by the dialog
      utils.deleteByPrefix(dialogTRef);

    };

    // add trigger
    this.callbackManager.add(dialog.result, fn, true);


    // create dialog
    const dialogTiddler = new $tw.Tiddler(skeleton, param, dialog);
    $tw.wiki.addTiddler(dialogTiddler);

    $tm.logger('debug', 'Opening dialog', dialogTiddler);

    $tw.rootWidget.dispatchEvent({
      type: 'tm-modal',
      param: dialogTiddler.fields.title,
      paramObject: dialogTiddler.fields
    });

    DialogManager.addKeyBindings();

    return dialogTiddler;

  };

  static getElement(name) {

    return utils.getFirstElementByClassName('tmap-' + name);

  }

  /**
   * This method will search for form elements that have the class
   * `tmap-trigger-field` set, which means that TiddlyMap shall
   * perform a button press when a key combo occurs while the field
   * has focus. To know which button to press on what key event,
   * it looks for classes of the form: tmap-triggers-BUTTONNAME-on-KEYCOMBO.
   */
  static addKeyBindings() {

    const keys = $tm.keycharm({
      container: utils.getFirstElementByClassName('tc-modal')
    });

    const re = /tmap-triggers-(.+?)-on-(.+?)(?:\s|$)/;
    const triggers = document.getElementsByClassName('tmap-trigger-field');

    for (let i = triggers.length; i--;) {
      const classNames = triggers[i].className.split(' ');
      for (let j = classNames.length; j--;) {
        const matches = classNames[j].match(re);
        if (!matches) { // don't care
          continue;
        }
        const buttonName = matches[1];
        const key = matches[2];
        const buttonElement = DialogManager.getElement(buttonName);
        if (!buttonElement) {
          continue;
        }
        keys.bind(key, () => {
          if (document.getElementsByClassName(classNames[j]).length) {
            // only click button if trigger is active (i.e. still in focus)
            // see https://github.com/felixhayashi/TW5-TiddlyMap/issues/280
            buttonElement.click();
          }
        });
      }
    }

  }
}

/*** Exports *******************************************************/

export default DialogManager;
