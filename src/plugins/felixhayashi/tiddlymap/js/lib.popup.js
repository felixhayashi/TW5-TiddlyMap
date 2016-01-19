/*\

title: $:/plugins/felixhayashi/tiddlymap/js/Popup
type: application/javascript
module-type: library

@module TiddlyMap
@preserve

\*/

(/** @lends module:TiddlyMap*/function(){

/*jslint node: true, browser: true */
/*global $tw: false */

"use strict";

/**** Imports ******************************************************/

var utils = require("$:/plugins/felixhayashi/tiddlymap/js/utils").utils;
  
/**** Code *********************************************************/

/**
 * Installs a hidden popup below `parentDomNode` that may be shown
 * and or hidden.
 * 
 * @constructor
 * 
 * @param {DOMElement} [parentDomNode] - The popup container. The
 *    popup will create itself in this container.
 * @param {Hashmap} [options] - An options object.
 * @param {string} [options.className] - A classname to be added to
 *    the popup div.
 * @param {int} [options.delay] - The default delay for the popup
 *    show and hide.
 */
var Popup = function(parentDomNode, options) {
  
  options = options || {};
  
  // create shortcuts for services and frequently used vars
  this._opt = $tw.tmap;
  this._logger = $tw.tmap.logger;
  this._indeces = $tw.tmap.indeces;
  
  this._parentDomNode = parentDomNode;
  this._domNode = document.createElement("div");
  this._domNode.style.display = "none";
  this._domNode.className = "tmap-popup";
  
  this._parentDomNode.appendChild(this._domNode);
  $tw.utils.addClass(this._domNode, options.className);
  
  this._isEnabled = true;
  this._isPreventShowOrHide = false;
  this._timeoutShow = null;
  this._timeoutHide = null;
  this._signature = null;
  this._hideDelayAfterLeavingPopup = 500;
  this._isDisplayNoneAfterAnimation = true;
  this._delay = (utils.isInteger(options.delay) ? delay : 0);

  // force early binding of functions to this context
  utils.bind(this, [
    "_show",
    "_hide",
    "_handleEnter",
    "_handleLeave",
    "_handleAnimationEnd"
  ]);

  // specify handlers
  this._listeners = {
    "mouseenter": this._handleEnter,
    "mouseleave": this._handleLeave
  };
  
  var fn = this._handleAnimationEnd;
  this._listeners[$tw.utils.convertEventName("animationEnd")] = fn;
  this._listeners[$tw.utils.convertEventName("transitionEnd")] = fn;

  // add handlers
  utils.setDomListeners("add", this._domNode, this._listeners, false);
  
};

/**
 * When the mouse is inside the popup, the popup will manage closing
 * itself and ignore all closing attempts from outside.
 */
Popup.prototype._handleEnter = function(ev) {
  
  console.log("_handleEnter");
    
  this._isPreventShowOrHide = true;
  
};

/**
 * Handler triggered when leaving the popup div.
 */
Popup.prototype._handleLeave = function(ev) {
  
  console.log("_handleLeave");
  
  this._isPreventShowOrHide = false;
  
  // we need some delay because resizing may cause the mouse to
  // exit the popup for some miliseconds
  
  this.hide(this._hideDelayAfterLeavingPopup);
  
};

/**
 * Handler triggered when leaving the popup div.
 */
Popup.prototype._handleAnimationEnd = function() {
  
  if(this._isDisplayNoneAfterAnimation) {
    console.log("display: none");
    this._domNode.style.display = "none";
  }
  
};

/**
 * Immediately hides the popup.
 */
Popup.prototype._hide = function() {
  
  console.log("_hide");
  
  if(this._isPreventShowOrHide) return;
    
  console.log("_hide SUCCESS");
  
  this._signature = null;
  this._isDisplayNoneAfterAnimation = true;
  
  $tw.utils.removeClass(this._domNode, "tmap-popup-active");
      
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
  
  console.log("_show");
  
  if(this._isPreventShowOrHide || $tw.tmap.mouse.ctrlKey || !this._isEnabled) {
    return;
  }
  
  this._domNode.style.display = "none";
  $tw.utils.removeClass(this._domNode, "tmap-popup-active");
  
  // remove any positioning or modification done before
  this._domNode.removeAttribute("style");

  // remove any previous content
  utils.removeDOMChildNodes(this._domNode);
  var div = this._domNode.appendChild(document.createElement("div"));
  
  if(typeof text === "function") {
    text(signature, div);
  } else {
    div.innerHTML = text;
  }
  
  if(!div.childNodes.length) return;
  
  console.log("_show SUCCESS");
  
  this._signature = signature;
  
  // ATTENTION: display needs to be true before we can get the bounds!
  
  // make sure that display is block so the animation is executed
  // and we can retrieve the size of the div.
  this._domNode.style.display = "block";

  var parRect = this._parentDomNode.getBoundingClientRect();
  var popRect = this._domNode.getBoundingClientRect();
  
  var x = $tw.tmap.mouse.clientX;
  var y = $tw.tmap.mouse.clientY;
  
  var availSpaceRight = parRect.right - (x + popRect.width);
  var availSpaceLeft = (x - popRect.width) - parRect.left;
  var spawnRight = availSpaceRight > availSpaceLeft;
  
  var availSpaceBottom = parRect.bottom - (y + popRect.height);
  var availSpaceTop = (y - popRect.height) - parRect.top;
  var spawnBottom = availSpaceBottom > availSpaceTop;
  
  var shiftLeft = spawnRight ? -15 : popRect.width + 15;
  var shiftTop = spawnBottom ? -15 : popRect.height + 15;
  
  this._domNode.style.left = (x - parRect.left - shiftLeft) + "px";
  this._domNode.style.top = (y - parRect.top - shiftTop) + "px";
  
  // …and make sure that it stays block after the animation is done…
  this._isDisplayNoneAfterAnimation = false;
  // …and add the class that triggers the animation…
  $tw.utils.addClass(this._domNode, "tmap-popup-active");
  
};

/**
 * Makes the text visible as popup after a given delay and
 * registers the popup under the specified signature.
 * 
 * @param {*} signature - If {@param text} is provided as param and
 *     is a function, then this will be passed later as argument to
 *     text. It therefore acts as means to identify the popup later
 *     on or pass data that survives the delay.
 * @param {string|Function(*, DOMElement)} text - If text
 *     is a string, it will be shown in the popup, otherwise,
 *     if text is a function, it will be executed and it is
 *     expected to populate the popup div passed as second parameter;
 *     the first parameter will be the signature object.
 * @param{delay} delay - Delays the hide operation.
 */
Popup.prototype.show = function(signature, text, delay) {
  
  console.log("show", delay);
  
  this._clearTimeouts();
  
  delay = (utils.isInteger(delay) ? delay : this._delay);
    
  // start a new timeout
  this._timeoutShow = window.setTimeout(this._show, delay, signature, text);
  
};

/**
 * Hide the popup.
 * 
 * @param {int} delay - Delays the hide operation.
 */
Popup.prototype.hide = function(delay) {
  
  console.log("hide", delay);
    
  this._clearTimeouts();
    
  delay = (utils.isInteger(delay) ? delay : this._delay);
  
  // clear any previous timeout and start a new one.
  this._timeoutHide = window.setTimeout(this._hide, delay);
      
};

/**
 * Completely enable or disable the popup
 */
Popup.prototype.setEnabled = function(isEnabled) {
  this._isEnabled = isEnabled;
};
  
Popup.prototype._clearTimeouts = function() {
  
  console.log("_clearTimeouts", this._timeoutShow, this._timeoutHide);
  
  window.clearTimeout(this._timeoutShow);
  window.clearTimeout(this._timeoutHide);
  
  this._timeoutShow = undefined;
  this._timeoutHide = undefined;
      
};

/**** Export *******************************************************/

exports.Popup = Popup;

})();