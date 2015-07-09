/**
 * Peerio test utilities
 */

TestUtil = {};

(function () {
  'use strict';

  // mailinator api
  var m = TestUtil.Mailinator = {};

  m.apiToken = 'f72c93a9b5e04f73af8197f42192cec8';
  m.apiUrl = 'https://api.mailinator.com/api';

  /**
   * Gets email list from mailinator inbox
   * @param {string} email - mailinator email
   * @promise {Object[]} - message array
   */
  m.getInbox = function (email) {
    return axios.get(m.apiUrl + '/inbox', {params: {to: email, token: m.apiToken}})
      .then(function (resp) {
        return resp && resp.data && resp.data.messages || [];
      }).catch(console.log.bind(console));
  };

  /**
   * Extracts id of the last message in inbox
   * @param {Object[]} inbox - message array
   */
  m.getLastEmailId = function (inbox) {
    return inbox.length > 0 ? inbox[inbox.length - 1].id : null;
  };

  /**
   * Requests and returns email body from mailinator
   * @param {string} emailId - mailinator email id
   */
  m.getEmailBody = function (emailId) {
    return axios.get(m.apiUrl + '/email', {params: {id: emailId, token: m.apiToken}})
      .then(function (resp) {
        return resp && resp.data && resp.data.data.parts[0].body || '';
      }).catch(console.log.bind(console));
  };
  //
  TestUtil.getConfirmCodeFromMailinator = function (email) {
    m.getInbox(email).then(function (inbox) {
      var id = m.getLastEmailId(inbox);
      return id ? m.getEmailBody(id) : Promise.reject();
    }).then(function (body) {
      console.log(body);
    }).catch(console.log.bind(console));
  };

})();