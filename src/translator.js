var Peerio = this.Peerio || {};
Peerio.Translator = {};

(function () {
    'use strict';

    var api = Peerio.Translator;

    // currently loaded translation dictionary
    var translation = null;

    var base = '/locales/';

    api.loadLocale = function (locale) {
        return loadTranslationFile(locale)
            .then(text => {
                translation = JSON.parse(text);
            });s
    };

    api.t = api.translate = function (id) {
        return translation[id] || id;
    };

    function loadTranslationFile(locale) {
        var url = base + locale + '.json';
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

})();
