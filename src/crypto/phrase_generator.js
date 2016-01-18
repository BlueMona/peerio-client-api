/**
 * Peerio passphrase generator
 *
 */


var Peerio = this.Peerio || {};
Peerio.PhraseGenerator = {};

Peerio.PhraseGenerator.init = function () {
  'use strict';

  var api = Peerio.PhraseGenerator;
  Peerio.PhraseGenerator.init = undefined;

  // dictionary for the language required will be loaded here
  var loadedDictionary = null;

  // building dictionary files list
  var base = Peerio.Config.apiFolder + 'dict/';

  /**
   * Generates passphrase
   * @param {string} lang - 2-letter language code
   * @param {Number} wordsCount - number of words in passphrase
   * @promise {string}
   */
  api.getPassPhrase = function (lang, wordsCount) {
    return buildDict(lang).then(function () {
      return generate(wordsCount);
    });
  };
  /**
   * Frees some RAM by cleaning cached dictionary.
   * Call this when PhraseGenerator is no longer needed.
   * PhraseGenerator is still usable after this call.
   */
  api.cleanup = function () {
    loadedDictionary = null;
  };

  function generate(wordsCount) {
    if (!loadedDictionary) return null;

    var phrase = '';
    for (var i = 0; i < wordsCount; i++)
      phrase += getRandomWord() + ' ';

    return phrase.trim().toLowerCase();
  }

  // asynchronously builds dictionary cache for specified language
  function buildDict(lang) {
    if (loadedDictionary && loadedDictionary.lang === lang)
      return Promise.resolve();

    loadedDictionary = null;
    return loadDict(lang)
      .then(function (raw) {
        // normalizing words
        var words = raw.split('\n');
        for (var i = 0; i < words.length; i++) {
          // removing leading/trailing spaces and ensuring lower case
          words[i] = words[i].trim();
          // removing empty strings
          if (words[i] === '') {
            words.splice(i, 1);
            i--;
          }
        }
        loadedDictionary = {lang: lang, dict: words};
      });
  }

  // loads dict by lang and return plaintext in promise
  function loadDict(lang) {
    var url = base + lang + '.txt';
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      if (xhr.overrideMimeType)
        xhr.overrideMimeType('text/plain');

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0)
            resolve(xhr.responseText);
          else
            reject();
        }
      };

      xhr.open('GET', url);
      xhr.send('');
    });
  }

  function getRandomWord() {
    return loadedDictionary.dict[secureRandom(loadedDictionary.dict.length)];
  }

  function secureRandom(count) {
    var rand = new Uint32Array(1);
    var skip = 0x7fffffff - 0x7fffffff % count;
    var result;

    if (((count - 1) & count) === 0) {
      window.crypto.getRandomValues(rand);
      return rand[0] & (count - 1);
    }
    do {
      window.crypto.getRandomValues(rand);
      result = rand[0] & 0x7fffffff;
    } while (result >= skip);
    return result % count;
  }

};
