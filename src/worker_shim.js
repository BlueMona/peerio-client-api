/**
 * Some libraries are not worker-aware, so we help them
 */

if(!this.window)
  this.window = self;