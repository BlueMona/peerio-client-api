/**
 * Passphrase generator tests
 */

describe('Passphrase generator', function () {
  'use strict';

  var langs = ['br', 'de', 'en', 'es', 'fr', 'it', 'ru'];

  langs.forEach(function (lang) {
    [5, 7, 10].forEach(function (i) {
      it('generates ' + i + ' word passphrase in ' + lang, function (done) {
        var l = lang;
        var c = i;
        Peerio.PhraseGenerator.getPassPhrase(l, c)
          .then(function (phrase) {
            expect(phrase).toBeDefined();
            expect(phrase.split(' ').length).toBe(c);
            done();
          })
          .catch(done.fail);
      });
    });
  });

});
