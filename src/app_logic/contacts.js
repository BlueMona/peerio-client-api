/**
 *  Peerio App Logic: Contacts
 */
var Peerio = this.Peerio || {};
Peerio.Contacts = {};

Peerio.Contacts.init = function () {
  'use strict';

  var api = Peerio.Contacts;
  delete Peerio.Contacts.init;
  var net = Peerio.Net;

  api.updateContacts = function () {
    return net.getContacts()
      .then(function (contacts) {
        var contactMap = [];

        contacts.contacts.forEach(function (c) {
          c.publicKey = c.miniLockID;// todo: remove after this gets renamed on server
          c.fullName = getFullName(c);
          c.fullNameAndUsername = getFullNameAndUsername(c);

          contactMap[c.username] = c;
          contactMap.push(c);
        });

        Peerio.Util.sortAsc(contactMap, 'fullNameAndUsername');

        return contactMap;
      })
      .then(function (contacts) {
        var u = Peerio.user;
        u.fullName = getFullName(u);
        u.fullNameAndUsername = getFullNameAndUsername(u);

        u.contacts = contacts;

        contacts[u.username] = u;
        contacts.unshift(u);

        Peerio.Crypto.setDefaultContacts(contacts);
        return contacts;
      }).then(function (contacts) {
        return buildIdenticons(contacts);
      });
  };

  function buildIdenticons(contacts) {
    var header = 'data:image/png;base64,';
    Promise.map(contacts, function (c) {
      if (!c.publicKey) return;

      return Peerio.Crypto.getAvatar(c.username, c.publicKey)
        .then(function (avatar) {

          var size = 12;
          c.icon12 = [];
          c.icon12.push(header + new Identicon(avatar[0].substring(0, 32), size, 0).toString());
          c.icon12.push(header + new Identicon(avatar[0].substring(32, 64), size, 0).toString());
          c.icon12.push(header + new Identicon(avatar[1].substring(0, 32), size, 0).toString());
          c.icon12.push(header + new Identicon(avatar[1].substring(32, 64), size, 0).toString());

          size = 18;
          c.icon18 = [];
          c.icon18.push(header + new Identicon(avatar[0].substring(0, 32), size, 0).toString());
          c.icon18.push(header + new Identicon(avatar[0].substring(32, 64), size, 0).toString());
          c.icon18.push(header + new Identicon(avatar[1].substring(0, 32), size, 0).toString());
          c.icon18.push(header + new Identicon(avatar[1].substring(32, 64), size, 0).toString());

        });

    }, Peerio.Crypto.recommendedConcurrency)
      .return(contacts);
  }

  function getFullName(user) {
    return ((user.firstName || '') + ' ' + (user.lastName || '')).trim();
  }

  function getFullNameAndUsername(user) {
    return (user.fullName + ' (' + user.username + ')').trim();
  }

};