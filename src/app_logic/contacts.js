/**
 *  Peerio App Logic: Contacts
 */
var Peerio = this.Peerio || {};
Peerio.Contacts = {};

Peerio.Contacts.init = function () {
  'use strict';

  L.verbose('Peerio.Contacts.init() start');

  var api = Peerio.Contacts;
  delete Peerio.Contacts.init;
  var net = Peerio.Net;

  api.getFullName = function (username) {
    var c = Peerio.user.contacts[username];
    if (!c) return username;
    return c.fullName;
  };

  api.getFullNameAndUsername = function (username) {
    var c = Peerio.user.contacts[username];
    if (!c) return username;
    return c.fullNameAndUsername;
  };

  // todo: proof of request, error handling
  api.addContact = function (username) {
    L.info('Peerio.Contacts.addContact({0})', username);
    Peerio.Net.addContact(username);
  };

  function removeContact(data) {
    L.info('Removing contact from cache. {0}', data);
    try {
      // calling this for logging purposes only
      getCachedContact(data.contact);
      delete Peerio.user.contacts[data.contact];
      var i = _.findIndex(Peerio.user.contacts, function (c) { return c.username === data.contact;});
      L.verbose('Contact index in cache: {0}', i);
      Peerio.user.contacts.splice(i, 1);
      Peerio.Action.contactsUpdated();
    } catch (e) {
      L.error('Error removing contact from cache: {0}', e);
    }
  }

  api.updateContacts = function () {
    L.info('Peerio.Contacts.updateContacts()');
    return net.getContacts()
      .then(function (response) {
        L.info('{0} contacts received', response.contacts.length);
        var contactMap = [];

        response.contacts.forEach(function (c) {
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
        u.isMe = true;
        contacts[u.username] = u;
        contacts.unshift(u);
        L.info('Setting default contacts for crypto.');
        Peerio.Crypto.setDefaultContacts(contacts);
        return contacts;
      })
      .then(function (contacts) {
        return buildIdenticons(contacts);
      })
      .then(function () {
        return net.getSentContactRequests();
      })
      .then(function (response) {
        L.info('{0} sent contact requests received.', response.contactRequests.length);
        response.contactRequests.forEach(function (username) {
          var c = {username: username, isRequest: true};
          Peerio.user.contacts.push(c);
          Peerio.user.contacts[username] = c;
        });
        return net.getReceivedContactRequests();
      })
      .then(function (response) {
        L.info('{0} incoming contact requests received.', response.contactRequests.length);
        response.contactRequests.forEach(function (c) {
          c.isRequest = true;
          c.isReceivedRequest = true;
          c.publicKey = c.miniLockID;// todo: remove after this gets renamed on server
          c.fullName = getFullName(c);
          c.fullNameAndUsername = getFullNameAndUsername(c);

          Peerio.user.contacts.push(c);
          Peerio.user.contacts[c.username] = c;
        });
      })
      .then(function () {
        L.info('Done loading contacts');
        Peerio.Action.contactsUpdated();
      })
      .catch(function (e) {
        L.error('Error loading contacts: {0}', e);
        return Promise.reject();
      });
  };

  // todo request proof
  api.removeContact = function (username) {
    L.info('Peerio.Contacts.removeContact({0})', username);
    try {
      var c = getCachedContact(username);
      if (!c) return;
      if (c.isRequest && !c.isReceivedRequest)
        net.cancelContactRequest(username);
      else
        net.removeContact(username);

      L.info('Contact removal request sent.');
    } catch (e) {
      L.error('Failed to remove contact. {0}', e);
    }
  };

  // todo request proof
  api.acceptContact = function (username) {
    L.info('Peerio.Contacts.acceptContact({0})', username);
    var c = getCachedContact(username);
    if (c && c.isRequest && c.isReceivedRequest) {
      net.acceptContactRequest(username);
      L.info('Accept request sent');
    }
  };

  // todo request proof
  api.rejectContact = function (username) {
    L.info('Peerio.Contacts.rejectContact({0})', username);
    var c = getCachedContact(username);
    if (c && c.isRequest && c.isReceivedRequest) {
      net.declineContactRequest(username);
      L.info('Reject request sent');
    }
  };

  function getCachedContact(username) {
    var c = Peerio.user.contacts[username];
    if (c) {
      L.verbose('Found contact {0}', c);
      return c;
    }
    L.error('Contact {0} not found in cache', username);
    return false;
  }

  function buildIdenticons(contacts) {
    L.info('Building identicons');
    L.B.start('identicons', 'Identicons build time');
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
      .then(function () {
        L.info('Identicons built');
        L.B.stop('identicons');
        return contacts;
      });
  }

  function getFullName(user) {
    return ((user.firstName || '') + ' ' + (user.lastName || '')).trim();
  }

  function getFullNameAndUsername(user) {
    return (user.fullName + ' (' + user.username + ')').trim();
  }

  net.injectPeerioEventHandler('contactAdded', api.updateContacts);
  net.injectPeerioEventHandler('contactRequestSent', api.updateContacts);
  net.injectPeerioEventHandler('contactRequestReceived', api.updateContacts);
  net.injectPeerioEventHandler('receivedContactRequestRemoved', removeContact);
  net.injectPeerioEventHandler('sentContactRequestRemoved', removeContact);
  net.injectPeerioEventHandler('contactRemoved', removeContact);

  L.verbose('Peerio.Contacts.init() end');

};