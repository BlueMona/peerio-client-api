/**
 * Peerio server communication protocol tests
 * ==========================================
 * It was supposed to be pure protocol methods test,
 * but the nature of protocol flow makes it more of an integration test.
 * - Requires network connection
 * - Depends on Peerio.Crypto
 */

xdescribe('Peerio network protocol', function () {
  'use strict';

  function generateUsername() {
    return 'test' + Math.round(Math.random() * 1000000000000);
  }

  it('validates username', function (done) {
    Peerio.Net.validateUsername('avmpeqrfkgpqpr').then(function (data) {
      // this random username most likely is free
      expect(data).toBe(true);
      done();
    }).catch(done.fail);
  });

  it('validates email', function (done) {
    Peerio.Net.validateAddress('avmpeqrf@kgpqpr.com').then(function (data) {
      // this random email most likely is free
      expect(data).toBe(true);
      done();
    }).catch(done.fail);
  });

  it('validates phone', function (done) {
    Peerio.Net.validateAddress('+99999999999999').then(function (data) {
      // this phone most likely is free
      expect(data).toBe(true);
      done();
    }).catch(done.fail);
  });

  // spec order matters
  describe('registration', function () {
    var self = this;

    beforeAll(function (done) {
      self.serverResponses = {};
      self.user = {};
      self.user.firstName = 'Test';
      self.user.lastName = 'User';
      self.user.username = generateUsername();
      self.user.email = self.user.username + '@mailinator.com';
      Peerio.Crypto.getKeyPair(self.user.username, 'lalalala').then(function (keys) {
        self.user.keyPair = keys;
        self.user.publicKey = Peerio.Crypto.getPublicKeyString(self.user.keyPair.publicKey);
        self.accountInfo = new Peerio.Model.AccountInfo(self.user.username, self.user.firstName,
          self.user.lastName, self.user.email, self.user.publicKey, 'en');
        done();
      });
    });

    afterAll(function () {
      self.user = null;
      self.serverResponses = null;
    });

    it('requests account registration', function (done) {

      Peerio.Net.registerAccount(self.accountInfo).then(function (response) {
        expect(response).toBeDefined();
        self.serverResponses.creationToken = response;
        done();
      }).catch(done.fail);
    });

    it('sends back account creation token', function (done) {
      expect(self.serverResponses.creationToken).toBeDefined();
      if (!self.serverResponses.creationToken) {
        done();
        return;
      }

      var token = Peerio.Crypto.decryptAccountCreationToken(self.serverResponses.creationToken, self.user.username, self.user.keyPair);
      expect(token).not.toBe(false);

      Peerio.Net.returnAccountCreationToken(token).then(function () {
        done();
      }).catch(done.fail);

    });

    // this spec does a few attempts to read peerio server email with mailinator api
    // delays make sure message has a chance to arrive
    it('confirms account address', function (done) {

      var actualTest = function() {
        TestUtil.getConfirmCodeFromMailinator(self.user.email);
      };


    });

  });
  it('authenticates session', function (done) {});

  it('checks account information', function (done) {
    //expect(response.username).toBe(self.user.username);
    //expect(response.firstName).toBe(self.user.firstName);
    //expect(response.lastName).toBe(self.user.lastName);
    //expect(response.address).toEqual(self.accountInfo.address);
    //expect(response.miniLockID).toBe(self.user.publicKey);
  });

});