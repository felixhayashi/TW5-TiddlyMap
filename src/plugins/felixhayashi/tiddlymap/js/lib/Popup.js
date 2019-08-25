/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Popup
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/**** Code *********************************************************/

/**
 * Installs a hidden popup below `parentDomNode` that may be shown
 * and or hidden.
 *
 * @constructor
 *
 * @param {Element} [parentDomNode] - The popup container. The
 *    popup will create itself in this container.
 * @param {Hashmap} [options] - An options object.
 * @param {string} [options.className] - A classname to be added to
 *    the popup div.
 * @param {int} [options.delay] - The default delay for the popup
 *    show and hide.
 */
function Popup(parentDomNode, options) {

  options = options || {};

  this._parentDomNode = parentDomNode;
  this._domNode = document.createElement('div');
  this._domNode.style.display = 'none';
  this._domNode.className = 'tmap-popup';

  this._parentDomNode.appendChild(this._domNode);
  $tw.utils.addClass(this._domNode, options.className);

  this._isEnabled = true;
  this._isPreventShowOrHide = false;
  this._isHideOnClick = !!options.hideOnClick;
  this._timeoutShow = null;
  this._timeoutHide = null;
  this._isDisplayNoneAfterAnimation = true;

  // delays
  let val = parseInt(options.leavingDelay);
  this._hideDelayLeavingPopup = utils.isInteger(val) ? val : 200;

  val = parseInt(options.hideDelay);
  this._hideDelay = utils.isInteger(val) ? val : 200;

  val = parseInt(options.showDelay);
  this._showDelay = utils.isInteger(val) ? val : 200;

  // force early binding of functions to this context
  utils.bindTo(this, [
    '_show',
    '_hide',
    '_handleEnter',
    '_handleLeave',
    '_handleAnimationEnd',
    '_handleClick'
  ]);

  // specify handlers
  this._listeners = {
    'mouseenter': this._handleEnter,
    'mouseleave': this._handleLeave,
    'click': [ this._handleClick, true ]
  };

  const fn = this._handleAnimationEnd;
  this._listeners[$tw.utils.convertEventName('animationEnd')] = fn;
  this._listeners[$tw.utils.convertEventName('transitionEnd')] = fn;

  // add handlers
  utils.setDomListeners('add', this._domNode, this._listeners, false);

}

/**
 * When the mouse is inside the popup, the popup will manage closing
 * itself and ignore all closing attempts from outside.
 */
Popup.prototype._handleEnter = function(ev) {

  //~ console.log("_handleEnter");

  this._isPreventShowOrHide = true;

};

/**
 * Handler triggered when leaving the popup div.
 */
Popup.prototype._handleLeave = function(ev) {

  //~ console.log("_handleLeave");

  this._isPreventShowOrHide = false;

  // we need some delay because resizing may cause the mouse to
  // exit the popup for some miliseconds

  this.hide(this._hideDelayLeavingPopup);

};

Popup.prototype._handleClick = function(ev) {

  //~ console.log("_handleLeave");

  if (this._isHideOnClick) {
    this._hide(true);
  }

};

/**
 * Handler triggered when leaving the popup div.
 */
Popup.prototype._handleAnimationEnd = function() {

  if (this._isDisplayNoneAfterAnimation) {
    //~ console.log("display: none");
    this._domNode.style.display = 'none';
  }

};

/**
 * Immediately hides the popup.
 */
Popup.prototype._hide = function(isForce) {

  //~ console.log("_hide");

  if (!isForce && this._isPreventShowOrHide) return;

  //~ console.log("_hide SUCCESS");

  this._isDisplayNoneAfterAnimation = true;
  this._isPreventShowOrHide = false;

  $tw.utils.removeClass(this._domNode, 'tmap-popup-active');

};

/**
 * Makes the text visible as popup and registers it with the
 * given signature.
 *
 * The popup is spawned on the side that has the most space.
 *
 * @param {*} signature - The signature that has been
 *     passed to {@link show}.
 */
Popup.prototype._show = function(signature, text) {

  //~ console.log("_show");

  if (this._isPreventShowOrHide || $tm.mouse.ctrlKey || !this._isEnabled) {
    return;
  }

  this._domNode.style.display = 'none';
  $tw.utils.removeClass(this._domNode, 'tmap-popup-active');

  // remove any positioning or modification done before
  this._domNode.removeAttribute('style');

  // remove any previous content
  utils.removeDOMChildNodes(this._domNode);
  var div = this._domNode.appendChild(document.createElement('div'));

  if (typeof text === 'function') {
    text(signature, div);
  } else {
    div.innerHTML = text;
  }

  if (!div.childNodes.length) return;

  var parRect = this._parentDomNode.getBoundingClientRect();
  var x = $tm.mouse.clientX;
  var y = $tm.mouse.clientY;

  //~ console.log("_show SUCCESS");

  // ATTENTION: display needs to be true before we can get the bounds!

  // make sure that display is block so the animation is executed
  // and we can retrieve the size of the div.
  this._domNode.style.display = 'block';

  var popRect = this._domNode.getBoundingClientRect();

  var availSpaceRight = parRect.right - (x + popRect.width);
  var availSpaceLeft = (x - popRect.width) - parRect.left;
  var spawnRight = availSpaceRight > availSpaceLeft;

  var availSpaceBottom = parRect.bottom - (y + popRect.height);
  var availSpaceTop = (y - popRect.height) - parRect.top;
  var spawnBottom = availSpaceBottom > availSpaceTop;

  var shiftLeft = spawnRight ? -15 : popRect.width + 15;
  var shiftTop = spawnBottom ? -15 : popRect.height + 15;

  this._domNode.style.left = (x - parRect.left - shiftLeft) + 'px';
  this._domNode.style.top = (y - parRect.top - shiftTop) + 'px';

  // …and make sure that it stays block after the animation is done…
  this._isDisplayNoneAfterAnimation = false;
  // …and add the class that triggers the animation…
  $tw.utils.addClass(this._domNode, 'tmap-popup-active');

};

/**
 * Makes the text visible as popup after a given delay and
 * registers the popup under the specified signature.
 *
 * @param {*} signature - If {@param text} is provided as param and
 *     is a function, then this will be passed later as argument to
 *     text. It therefore acts as means to identify the popup later
 *     on or pass data that survives the delay.
 * @param {string|Function} text - If text
 *     is a string, it will be shown in the popup, otherwise,
 *     if text is a function, it will be executed and it is
 *     expected to populate the popup div passed as second parameter;
 *     the first parameter will be the signature object.
 * @param{delay} delay - Delays the hide operation.
 */
Popup.prototype.show = function(signature, text, delay) {

  //~ console.log("show", delay);

  this._clearTimeouts();

  delay = (utils.isInteger(delay) ? delay : this._showDelay);

  // start a new timeout
  this._timeoutShow = setTimeout(this._show, delay, signature, text);

};

/**
 * Hide the popup.
 *
 * @param {int} delay - Delays the hide operation.
 */
Popup.prototype.hide = function(delay, isForce) {

  //~ console.log("hide", delay);

  this._clearTimeouts();

  delay = (utils.isInteger(delay) ? delay : this._hideDelay);

  if (isForce || delay === 0) { // @TODO is this really correct?
    this._hide(isForce);
  } else {
    this._timeoutHide = setTimeout(this._hide, delay, isForce);
  }

};

/**
 * Completely enable or disable the popup
 */
Popup.prototype.setEnabled = function(isEnabled) {
  this._isEnabled = isEnabled;
};

Popup.prototype.isShown = function() {
  return this._domNode.style.display === 'block';
};

Popup.prototype._clearTimeouts = function() {

  clearTimeout(this._timeoutShow);
  clearTimeout(this._timeoutHide);

  this._timeoutShow = undefined;
  this._timeoutHide = undefined;

};


/*** Exports *******************************************************/

export default Popup;
