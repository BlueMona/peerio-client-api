/**
 * Peerio server communication protocol tests
 * ==========================================
 * Requires network connection
 */

xdescribe('Peerio network protocol', function () {
  'use strict';

  beforeAll(function () {
  });

  afterAll(function () {
  });

  it('validates username', function (done) {
    Peerio.Socket.send('test', {}, function (data) {
      console.log('callback', data);
    });
  });

});