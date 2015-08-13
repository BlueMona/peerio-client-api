/**
 * Some libraries are not worker-aware, so we help them.
 * Everything you put here will be included into worker bundles.
 */

if(!this.window)
  this.window = self;