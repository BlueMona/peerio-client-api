/**
 * Passphrase generator tests
 */

describe('Passphrase generator', function () {
  'use strict';

  var langs = ['br', 'de', 'en', 'es', 'fr', 'it', 'ru'];
  var minWords = 5, maxWords = 10;

  langs.forEach(function (lang) {
    for (var i = minWords; i <= maxWords; i++) {
      it('generates ' + i + ' word passphrase in ' + lang, function (done) {
        var l = lang;
        var c = i;
        Peerio.PhraseGenerator.getPassPhrase(l,c)
          .then(function(phrase){
            expect(phrase).toBeDefined();
            expect(phrase.split(' ').length).toBe(c);
            done();
          })
          .catch(done.fail);
      });
    }
  });

});
