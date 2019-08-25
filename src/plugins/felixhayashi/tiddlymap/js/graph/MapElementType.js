/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/MapElementType
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/*** Code **********************************************************/

/**
 * @abstract
 */
class MapElementType {

  constructor(id, root, fieldMeta, data) {

    this.id = id;
    this.root = root;
    this._fieldMeta = fieldMeta;
    this.fullPath = `${this.root}/${this.id}`;
    this.isShipped = $tw.wiki.getSubTiddler($tm.path.pluginRoot, this.fullPath);

    // finally get the data
    this._load(data || this.fullPath);

  }

  /**
   * Load the type's data. Depending on the constructor arguments,
   * the data source can be a tiddler, a type store
   *
   * @private
   */
  _load(data) {

    if (!data) {

      return;
    }

    if (typeof data === 'string') { // assume id or full path

      const isFullPath = utils.startsWith(data, this.root);
      const tRef = (isFullPath ? data : `${this.root}/${data}`);
      this._loadFromTiddler(tRef);

    } else if (data instanceof $tw.Tiddler) {

      this._loadFromTiddler(data);

    } else if (typeof data === 'object') { // = type or a data object

      for (let field in this._fieldMeta) {
        this[field] = data[field];
      }
    }

  }

  /**
   * Retrieve all data from the tiddler provided. If a shadow tiddler
   * with the same id exists, its data is merged during the load
   * process.
   *
   * @private
   */
  _loadFromTiddler(tiddler) {

    const tObj = utils.getTiddler(tiddler);

    if (!tObj) {

      return;
    }

    const shadowTObj = $tw.wiki.getSubTiddler($tm.path.pluginRoot, this.fullPath) || {};

    // copy object to allow manipulation of the data
    const rawData = $tw.utils.extend({}, shadowTObj.fields, tObj.fields);
    // allow parsers to transform the raw field data
    for (let field in this._fieldMeta) {

      const parser = this._fieldMeta[field].parse;
      const rawVal = rawData[field];

      this[field] = (parser ? parser.call(this, rawVal) : rawVal);
    }

  }

  /**
   * Method to determine whether or not this type exists. A type
   * exists if a tiddler with the type's id can be found below
   * the type's root path.
   *
   * @return {boolean} True if the type exists, false otherwise.
   */
  exists() {

    return utils.tiddlerExists(this.fullPath);

  }

  setStyle(style, isMerge) {

    // preprocessing: try to turn string into json
    if (typeof style === 'string') {

      style = utils.parseJSON(style);

    }

    // merge or override
    if (typeof style === 'object') {

      if (isMerge) {

        utils.merge(this.style, style);

      } else {

        this.style = style;

      }
    }

  }

  /**
   * Store the type object as tiddler in the wiki. If the `tRef`
   * property is not provided, the default type path prefix
   * will be used with the type id appended. Stringifiers provided in
   * the field meta object (that was passed to the constructor) are
   * called.
   *
   * @param {string} [tRef] - If `tRef` is provided, the type
   *     data will be written into this tiddler and the id property
   *     is added as extra field value. Only do this is only for
   *     dumping purposes!
   * @param {boolean} [silently=false] do not update the modification date
   */
  save(tRef, silently) {

    if (!tRef) {

      tRef = this.fullPath;

    } else if (typeof tRef !== 'string') {

      return;

    }

    // also add an empty text field to guard against
    // https://github.com/Jermolene/TiddlyWiki5/issues/2025
    const fields = {
      title: tRef,
      text: ''
    };

    if (!utils.startsWith(tRef, this.root)) {

      // = not the standard path for storing this type!
      // in this case we add the id to the output.
      fields.id = this.id;

    }

    // allow parsers to transform the raw field data
    for (let field in this._fieldMeta) {

      const stringify = this._fieldMeta[field].stringify;

      fields[field] = (stringify ? stringify.call(this, this[field]) : this[field]);
    }

    if (!this.exists()) { // newly created
      Object.assign(fields, $tw.wiki.getCreationFields());
    }

    if (silently !== true) {
      // add modification date to the output;
      Object.assign(fields, $tw.wiki.getModificationFields());
    }

    $tw.wiki.addTiddler(new $tw.Tiddler(fields));

  }
}

/**
 * A list of fields that are used as data identifiers. Only these
 * listed keys are acknowledged by the load and save functions in
 * this class.
 *
 * This object resembles tw's field modules that are used by
 * `boot.js` to decide how fields are parsed and stringified again.
 */
MapElementType.fieldMeta = {
  'description': {},
  'style': {
    parse: utils.parseJSON,
    stringify: JSON.stringify
  },
  'modified': {}, // translation handled by TW's core
  'created': {} // translation handled by TW's core
};

/*** Exports *******************************************************/

export default MapElementType;
