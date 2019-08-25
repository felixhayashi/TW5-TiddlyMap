/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/SelectionRectangle
type: application/SelectionRectangle
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

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
class SelectionRectangle {

  /**
   * Sets up the selection with the specified initial offset.
   *
   * @param {number} x - offset x
   * @param {number} y - offset y
   */
  constructor(x, y) {

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
  span(x, y) {

    this.x2 = x;
    this.y2 = y;

  }

  /**
   * @return {number} width
   */
  getWidth() {

    return this.x2 - this.x1;

  }

  /**
   * @return {number} height
   */
  getHeight() {

    return this.y2 - this.y1;

  }

  /**
   * @return {array} an array holding the following data in sequence: x, y, width, height
   */
  getRect() {

    return [ this.x1, this.y1, this.getWidth(), this.getHeight() ];

  }

  /**
   * @param {number} x - x coordinate
   * @param {number} y - y coordinate
   * @return {boolean}
   */
  isPointWithin({ x, y} ) {

    const { x1, x2, y1, y2 } = this;

    const mostLeft = Math.min(x1, x2);
    const mostRight = Math.max(x1, x2);
    const mostBottom = Math.min(y1, y2);
    const mostTop = Math.max(y1, y2);

    return mostLeft < x && x < mostRight && mostBottom < y && y < mostTop;

  }
}

/*** Exports *******************************************************/

export default SelectionRectangle;
