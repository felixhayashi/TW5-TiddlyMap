"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/SelectionRectangle
type: application/SelectionRectangle
module-type: library

@preserve

\*/

/**** Code *********************************************************/

/**
 * Represents a rectangle spanned by mouse selection
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
var SelectionRectangle = function () {

  /**
   * Sets up the selection with the specified initial offset.
   *
   * @param {number} x - offset x
   * @param {number} y - offset y
   */
  function SelectionRectangle(x, y) {
    _classCallCheck(this, SelectionRectangle);

    this.x1 = x;
    this.x2 = x;

    this.y1 = y;
    this.y2 = y;
  }

  /**
   * Spans the selection.
   *
   * @param {number} x - x coordinate
   * @param {number} y - y coordinate
   */


  _createClass(SelectionRectangle, [{
    key: "span",
    value: function span(x, y) {

      this.x2 = x;
      this.y2 = y;
    }

    /**
     * @return {number} width
     */

  }, {
    key: "getWidth",
    value: function getWidth() {

      return this.x2 - this.x1;
    }

    /**
     * @return {number} height
     */

  }, {
    key: "getHeight",
    value: function getHeight() {

      return this.y2 - this.y1;
    }

    /**
     * @return {array} an array holding the following data in sequence: x, y, width, height
     */

  }, {
    key: "getRect",
    value: function getRect() {

      return [this.x1, this.y1, this.getWidth(), this.getHeight()];
    }

    /**
     * @param {number} x - x coordinate
     * @param {number} y - y coordinate
     * @return {boolean}
     */

  }, {
    key: "isPointWithin",
    value: function isPointWithin(_ref) {
      var x = _ref.x,
          y = _ref.y;
      var x1 = this.x1,
          x2 = this.x2,
          y1 = this.y1,
          y2 = this.y2;


      var mostLeft = Math.min(x1, x2);
      var mostRight = Math.max(x1, x2);
      var mostBottom = Math.min(y1, y2);
      var mostTop = Math.max(y1, y2);

      return mostLeft < x && x < mostRight && mostBottom < y && y < mostTop;
    }
  }]);

  return SelectionRectangle;
}();

/*** Exports *******************************************************/

exports.default = SelectionRectangle;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/lib/SelectionRectangle.js.map
