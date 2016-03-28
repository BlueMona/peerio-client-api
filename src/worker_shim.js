/**
 * Some libraries are not worker-aware, so we help them.
 * Everything you put here will be included into worker bundles.
 */

if(!self.crypto || !self.crypto.getRandomValues) {
    self.cryptoShim = {getRandomValues: function(){}};
}
