'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/services/tracker
type: application/javascript
module-type: library

@preserve

\*/

/*** Imports *******************************************************/

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/***************************** CODE ********************************/

/**
 *
 */
var Tracker = function () {
  function Tracker(fixer) {
    _classCallCheck(this, Tracker);

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


  _createClass(Tracker, [{
    key: '_createIndex',
    value: function _createIndex() {

      var tById = this.tById = {}; // tiddlerById
      var idByT = this.idByT = {}; // idByTiddler

      this.wiki.each(function (tObj, tRef) {

        if (_utils2.default.isSystemOrDraft(tObj)) {
          return;
        }

        // will create id if not present
        var id = tObj.fields['tmap.id'];
        if (!id) {
          id = _utils2.default.genUUID();
          _utils2.default.setField(tObj, 'tmap.id', id);
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

  }, {
    key: 'assignId',
    value: function assignId(tiddler, isForce) {

      // Note: always reload from store to avoid setting wrong ids on tiddler
      // being in the role of from and to at the same time.
      var tObj = _utils2.default.getTiddler(tiddler);

      if (!tObj) {
        throw new ResourceNotFoundException(tiddler);
      }

      var id = tObj.fields['tmap.id'];

      if (!id || isForce) {
        id = _utils2.default.genUUID();
        _utils2.default.setField(tObj, 'tmap.id', id);
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

  }, {
    key: 'getIdByTiddler',
    value: function getIdByTiddler(tiddler) {

      return this.idByT[_utils2.default.getTiddlerRef(tiddler)];
    }
  }, {
    key: 'getIdsByTiddlers',
    value: function getIdsByTiddlers() {
      return this.idByT;
    }
  }, {
    key: 'getTiddlersByIds',
    value: function getTiddlersByIds() {
      return this.tById;
    }

    /**
     * @param id
     * @return {TiddlerReference} tiddler
     */

  }, {
    key: 'getTiddlerById',
    value: function getTiddlerById(id) {

      return this.tById[id];
    }
  }]);

  return Tracker;
}();

/*** Exports *******************************************************/

exports.default = Tracker;
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/Tracker.js.map
