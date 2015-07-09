/**
 * Various Peerio utility functions
 */

var Peerio = this.Peerio || {};
Peerio.Util = {};

(function () {
  'use strict';

  var api = Peerio.Util;

  var emailExp = new RegExp('^([-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20})$');
  var phoneExp = new RegExp('^\\+?(\\d|\\s|\\-|\\(|\\)){6,20}$');

  /**
   * Parses an address and returns its type and parsed format.
   * In the case of phone numbers, the number is stripped from any non-digits.
   * @param {string} address - Address to parse.
   * @return {object} {type:'email||phone', address:'parsed address'}
   */
  api.parseAddress = function (address) {
    if (emailExp.test(address)) {
      return {
        type: 'email',
        value: address.match(emailExp)[0]
      };
    }

    if (phoneExp.test(address)) {
      var phone = address.match(phoneExp)[0].split('');

      for (var i = 0; i < phone.length; i++) {
        if (!phone[i].match(/\d/))
          phone.splice(i, 1);
      }

      return {
        type: 'phone',
        value: phone.join('')
      };
    }

    return false;
  };

})();