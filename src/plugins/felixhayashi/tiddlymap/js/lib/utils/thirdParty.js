/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/lib/utils/thirdParty
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/**
 * Modified TW-Code from Navigator widget
 * https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/widgets/navigator.js
 */
export const generateDraftTitle = title => {

  let c = 0,
    draftTitle;
  do {
    draftTitle = 'Draft ' + (c ? (c + 1) + ' ' : '') + 'of \'' + title + '\'';
    c++;
  } while ($tw.wiki.tiddlerExists(draftTitle));
  return draftTitle;

};

/**
 * Modified TW-Code from Navigator widget
 * https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/widgets/navigator.js
 */
export const makeDraftTiddler = targetTitle => {

  // See if there is already a draft tiddler for this tiddler
  let draftTitle = $tw.wiki.findDraft(targetTitle);
  if (draftTitle) {
    return $tw.wiki.getTiddler(draftTitle);
  }
  // Get the current value of the tiddler we're editing
  const tiddler = $tw.wiki.getTiddler(targetTitle);
  // Save the initial value of the draft tiddler
  draftTitle = generateDraftTitle(targetTitle);
  const draftTiddler = new $tw.Tiddler(
      tiddler,
    {
      title: draftTitle,
      'draft.title': targetTitle,
      'draft.of': targetTitle
    },
      $tw.wiki.getModificationFields()
  );
  $tw.wiki.addTiddler(draftTiddler);
  return draftTiddler;

};

/**
 * TW-Code
 * @deprecated delete this in 2016 and use $tw.utils.getFullScreenApis instead
 */
export const getFullScreenApis = () => {

  const d = document,
    db = d.body,
    result = {
      '_requestFullscreen': db.webkitRequestFullscreen !== undefined ? 'webkitRequestFullscreen' :
              db.mozRequestFullScreen !== undefined ? 'mozRequestFullScreen' :
              db.msRequestFullscreen !== undefined ? 'msRequestFullscreen' :
              db.requestFullscreen !== undefined ? 'requestFullscreen' : '',
      '_exitFullscreen': d.webkitExitFullscreen !== undefined ? 'webkitExitFullscreen' :
              d.mozCancelFullScreen !== undefined ? 'mozCancelFullScreen' :
              d.msExitFullscreen !== undefined ? 'msExitFullscreen' :
              d.exitFullscreen !== undefined ? 'exitFullscreen' : '',
      '_fullscreenElement': d.webkitFullscreenElement !== undefined ? 'webkitFullscreenElement' :
              d.mozFullScreenElement !== undefined ? 'mozFullScreenElement' :
              d.msFullscreenElement !== undefined ? 'msFullscreenElement' :
              d.fullscreenElement !== undefined ? 'fullscreenElement' : '',
      '_fullscreenChange': d.webkitFullscreenElement !== undefined ? 'webkitfullscreenchange' :
              d.mozFullScreenElement !== undefined ? 'mozfullscreenchange' :
              d.msFullscreenElement !== undefined ? 'MSFullscreenChange' :
              d.fullscreenElement !== undefined ? 'fullscreenchange' : ''
    };
  if (!result._requestFullscreen || !result._exitFullscreen || !result._fullscreenElement) {
    return null;
  } else {
    return result;
  }

};

/**
 *
 * Slightly modified by me to allow an optional prefix.
 *
 * For the original code:
 *
 * Copyright (c) 2014, Hugh Kennedy, All rights reserved.
 * Code published under the BSD 3-Clause License
 *
 * @see oringal repo https://github.com/hughsk/flat
 * @see snapshot https://github.com/felixhayashi/flat
 * @see http://opensource.org/licenses/BSD-3-Clause
 */
export const flatten = (target, opts = {}) => {

  var delimiter = opts.delimiter || '.';
  var prefix = opts.prefix || '';
  var output = {};

  function step(object, prev) {
    Object.keys(object).forEach(function(key) {
      var value = object[key];
      var isarray = opts.safe && Array.isArray(value);
      var type = Object.prototype.toString.call(value);
      var isobject = (
        type === '[object Object]' ||
        type === '[object Array]'
      );

      var newKey = prev
        ? prev + delimiter + key
        : prefix + key;

      if (!isarray && isobject) {
        return step(value, newKey);
      }

      output[newKey] = value;
    });
  }

  step(target);

  return output;

};


/**
 * Copyright (c) 2014, Hugh Kennedy, All rights reserved.
 * Code published under the BSD 3-Clause License
 *
 * @see oringal repo https://github.com/hughsk/flat
 * @see snapshot https://github.com/felixhayashi/flat
 * @see http://opensource.org/licenses/BSD-3-Clause
 */
export const unflatten = (target, opts = {}) => {

  var delimiter = opts.delimiter || '.';
  var result = {};

  if (Object.prototype.toString.call(target) !== '[object Object]') {
    return target;
  }

  // safely ensure that the key is
  // an integer.
  function getkey(key) {
    var parsedKey = Number(key);

    return (
      isNaN(parsedKey) ||
      key.indexOf('.') !== -1
    ) ? key
      : parsedKey;
  }

  Object.keys(target).forEach(function(key) {
    var split = key.split(delimiter);
    var key1 = getkey(split.shift());
    var key2 = getkey(split[0]);
    var recipient = result;

    while (key2 !== undefined) {
      if (recipient[key1] === undefined) {
        recipient[key1] = (
          typeof key2 === 'number' &&
          !opts.object ? [] : {}
        );
      }

      recipient = recipient[key1];
      if (split.length > 0) {
        key1 = getkey(split.shift());
        key2 = getkey(split[0]);
      }
    }

    // unflatten again for 'messy objects'
    recipient[key1] = unflatten(target[key], opts);
  });

  return result;

};


/**
 * An adopted version of pmario's version to create
 * uuids of type RFC4122, version 4 ID.
 *
 * Shortened version:
 * pmario (1.0 - 2011.05.22):
 * http://chat-plugins.tiddlyspace.com/#UUIDPlugin
 *
 * Original version:
 * Math.uuid.js (v1.4)
 * http://www.broofa.com
 * mailto:robert@broofa.com
 *
 * Copyright (c) 2010 Robert Kieffer
 * Dual licensed under the MIT and GPL licenses.
 *
 * ---
 * @see https://github.com/almende/vis/issues/432
*/
export const genUUID = (function() {

  // Private array of chars to use
  var CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');

  return function () {
    var chars = CHARS, uuid = new Array(36);

    var rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }

    return uuid.join('');
  };

})();
