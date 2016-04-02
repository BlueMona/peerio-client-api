var Peerio = this.Peerio || {};
Peerio.Translator = {};

(function () {
    'use strict';

    var api = Peerio.Translator;

    // currently loaded translation dictionary
    var translation = null;
    // regexps cache for substituting variables in translation strings
    var regexpCache = {};
    var base = '/locales/';

    api.loadLocale = function (locale) {
        translation = null;
        regexpCache = {};
        return loadTranslationFile(locale)
            .then(text => {
                translation = JSON.parse(text);
                compileTranslation();
            });
    };

    api.t = api.translate = function (id, params) {
        var ret = translation[id] || id;
        if (params) {
            for (var varName in params) {
                var regex = regexpCache[varName];
                if (!regex) continue;
                ret = ret.replace(regex, params[varName]);
            }
        }
        return ret;
    };

    function compileTranslation() {
        for (var key in translation) {
            substituteReferences(key);
        }
        buildRegexpCache();
    }

    // for specified key, finds if there are any references to other keys
    // and replaces original references with referenced strings, recursively
    function substituteReferences(key) {
        var str = api.t(key);
        var match, replacements = {};
        var refExp = /\{#([a-zA-Z0-9]+)\}/g;

        while ((match = refExp.exec(str)) !== null) {
            // found reference key
            var ref = match[1];
            // processing it first, so we don't use unprocessed string
            substituteReferences(ref);
            if (replacements[ref]) continue;
            // saving ref string to replace later
            replacements[ref] = api.t(ref);
        }
        // replacing all referenced strings
        for (var r in replacements) {
            str = str.replace(new RegExp('\{#' + r + '\}', 'g'), replacements[r]);
        }
        // saving processed string
        translation[key] = str;
    }

    function buildRegexpCache() {
        var varExp = /\{([a-zA-Z0-9]+)\}/g;
        var match;
        for (var key in translation) {
            var str = api.t(key);
            while ((match = varExp.exec(str)) !== null) {
                // found variable name for future substitutions
                var varName = match[1];
                if (regexpCache[varName]) continue;
                // generating replacement regexp
                regexpCache[varName] = new RegExp('\{' + varName + '\}', 'g');
            }
        }
    }

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
