/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/services/tracker
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

import utils from '$:/plugins/felixhayashi/tiddlymap/js/utils';

/***************************** CODE ********************************/

/**
 *
 */
class Tracker {

  constructor(fixer) {

    this.wiki = $tw.wiki;
    this.logger = $tm.logger;

    this._createIndex();

  }

  /**
   * TiddlyMap uses ids to reference tiddlers. This function creates
   * a table that maps ids to tRefs and vice versa.
   *
   * Two indeces are added to the indeces chain:
   * 1. tById – tiddler references by id
   * 2. idByT – ids by tiddler references
   *
   * @param {Array<TiddlerReference>} [allTiddlers] - The tiddlers to
   *     use as basis for this index. If not stated, all tiddlers in
   *     the wiki are used.
   */
  _createIndex() {

    const tById = this.tById = {}; // tiddlerById
    const idByT = this.idByT = {}; // idByTiddler

    this.wiki.each((tObj, tRef) => {

      if (utils.isSystemOrDraft(tObj)) {
        return;
      }

      // will create id if not present
      let id = tObj.fields['tmap.id'];
      if (!id) {
        id = utils.genUUID();
        utils.setField(tObj, 'tmap.id', id);
      }

      tById[id] = tRef; // tiddlerById
      idByT[tRef] = id; // idByTiddler

    });

  }

  /**
   * This method will assign an id to an *existing* tiddler that does
   * not already possess and id. Any assigned id will be registered
   * at the id->tiddler index.
   *
   * @param {Tiddler} tiddler - The tiddler to assign the id to.
   * @param {boolean} isForce - True if the id should be overridden,
   *     false otherwise. Only works if the id field is not set to title.
   *
   * @return {Id} The assigned or retrieved id.
   */
  assignId(tiddler, isForce) {

    // Note: always reload from store to avoid setting wrong ids on tiddler
    // being in the role of from and to at the same time.
    const tObj = utils.getTiddler(tiddler);

    if (!tObj) {
      throw new ResourceNotFoundException(tiddler);
    }

    let id = tObj.fields['tmap.id'];

    if (!id || isForce) {
      id = utils.genUUID();
      utils.setField(tObj, 'tmap.id', id);
      this.logger('info', 'Assigning new id to', tObj.fields.title);
    }

    // blindly update the index IN ANY CASE because tiddler may have
    // an id but it is not indexed yet (e.g. because of renaming operation)
    this.tById[id] = tObj.fields.title;
    this.idByT[tObj.fields.title] = id;

    return id;

  }

  /**
   * @param {Tiddler} tiddler
   * @return string
   */
  getIdByTiddler(tiddler) {

    return this.idByT[utils.getTiddlerRef(tiddler)];

  }

  getIdsByTiddlers() {
    return this.idByT;
  }

  getTiddlersByIds() {
    return this.tById;
  }

  /**
   * @param id
   * @return {TiddlerReference} tiddler
   */
  getTiddlerById(id) {

    return this.tById[id];

  }

}

/*** Exports *******************************************************/

export default Tracker;
