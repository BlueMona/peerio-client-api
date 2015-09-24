/**
 * Some libraries are not worker-aware, so we help them.
 * Everything you put here will be included into worker bundles.
 */

if (!this.window)
  this.window = self;

this.window.cryptoShim = {};

//if (!self.console || !self.console.log) {
  self.console = {
    log: function () {
      var args = [];
      for (var i = 0; i < arguments.length; i++)
        args[i] = typeof(arguments[i]) === 'undefined' ? 'undefined' : arguments[i].toString();
      self.postMessage({'console.log': args});
    }
    // error:function(){},
    // debug:function(){}
  };

//}