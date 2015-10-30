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

  var self = this;
  // spec order matters
  describe('registration & auth', function () {

    beforeAll(function (done) {
      self.serverResponses = {};
      self.user = {};
      self.user.firstName = 'Test';
      self.user.lastName = 'User';
      self.user.username = generateUsername();
      self.user.email = self.user.username + '@mailinator.com';
      self.user.passphrase = 'lalalala';
      Peerio.Crypto.getKeyPair(self.user.username, self.user.passphrase).then(function (keys) {
        self.user.keyPair = keys;
        return Peerio.Crypto.getPublicKeyString(self.user.keyPair.publicKey);
      })
        .then(function (publicKey) {
          self.user.publicKey = publicKey;
          self.accountInfo = new Peerio.AccountInfo(self.user.username, self.user.firstName,
            self.user.lastName, self.user.publicKey, 'en');
          done();
        })
        .catch(done.fail);
    });

    afterAll(function () {
      self.serverResponses = null;
    });

    it('requests account registration', function (done) {
      Peerio.Net.registerAccount(self.accountInfo)
        .then(function (response) {
          expect(response).toBeDefined();
          self.serverResponses.creationToken = response;
          done();
        }).catch(done.fail);
    });

    it('activates account', function (done) {
        if (!self.serverResponses.creationToken) {
          done.fail();
          return;
        }

        Peerio.Crypto.decryptAccountCreationToken(self.serverResponses.creationToken, self.user.username, self.user.keyPair)
          .then(function (token) {
            expect(token).not.toBe(false);
            return Peerio.Net.activateAccount(token);
          })
          .then(function () {
            done();
          })
          .catch(done.fail);
    });

    it('authenticates session', function () {
        Peerio.Net.setCredentials(self.user.username, self.user.passphrase);
    });

  });

  xit('checks account information', function (done) {
    //expect(response.username).toBe(self.user.username);
    //expect(response.firstName).toBe(self.user.firstName);
    //expect(response.lastName).toBe(self.user.lastName);
    //expect(response.address).toEqual(self.accountInfo.address);
    //expect(response.miniLockID).toBe(self.user.publicKey);
  });

});;

});