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

  api.addContact = function (username) {
    Peerio.Net.addContact(username);
  };


  function removeContact(data) {
    delete Peerio.user.contacts[data.contact];
    var i = _.findIndex(Peerio.user.contacts, function(c){ return c.username === data.contact;});
    Peerio.user.contacts.splice(i, 1);
    Peerio.Action.contactsUpdated();
  }

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
        u.isMe = true;
        contacts[u.username] = u;
        contacts.unshift(u);

        Peerio.Crypto.setDefaultContacts(contacts);
        return contacts;
      }).then(function (contacts) {
        return buildIdenticons(contacts);
      }).then(function () {
        return net.getSentContactRequests();
      }).then(function (data) {
        data.contactRequests.forEach(function (username) {
          var c = {username: username, isRequest: true};
          Peerio.user.contacts.push(c);
          Peerio.user.contacts[username] = c;
        });
        return net.getReceivedContactRequests();
      }).then(function (data) {
        data.contactRequests.forEach(function (c) {
          c.isRequest= true;
          c.isReceivedRequest= true;
          c.publicKey = c.miniLockID;// todo: remove after this gets renamed on server
          c.fullName = getFullName(c);
          c.fullNameAndUsername = getFullNameAndUsername(c);

          Peerio.user.contacts.push(c);
          Peerio.user.contacts[c.username] = c;
        });
      }).then(function () {
        Peerio.Action.contactsUpdated();
      });
  };

  api.removeContact = function(username){
    var c = Peerio.user.contacts[username];
    if(c.isRequest && !c.isReceivedRequest)
      net.cancelContactRequest(username);
    else
      net.removeContact(username);
  };

  api.acceptContact =function(username){
    var c = Peerio.user.contacts[username];
    if(c.isRequest && c.isReceivedRequest){
      net.acceptContactRequest(username);
    }
  };
  api.rejectContact =function(username){
    var c = Peerio.user.contacts[username];
    if(c.isRequest && c.isReceivedRequest){
      net.declineContactRequest(username);
    }
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

  net.injectPeerioEventHandler('contactAdded', api.updateContacts);
  net.injectPeerioEventHandler('contactRequestSent', api.updateContacts);
  net.injectPeerioEventHandler('contactRequestReceived', api.updateContacts);
  net.injectPeerioEventHandler('receivedContactRequestRemoved', removeContact);
  net.injectPeerioEventHandler('sentContactRequestRemoved', removeContact);
  net.injectPeerioEventHandler('contactRemoved', removeContact);

};