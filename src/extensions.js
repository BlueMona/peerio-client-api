/**
 * Various extensions to system/lib objects
 * ------------------------------------------------------
 */
(function () {
  'use strict';

  String.prototype.isEmpty = function() {
    return (this.length === 0 || !this.trim());
  };

  window.logfn = console.log.bind(console);
  window.noop = function(){};

}());
