// IMMUTABLE global spec data

// this test user is(might be) unregistered, it's used to test crypto and contains all the needed data for that
testUser = new Peerio.Model.User();
testUser.username = 'anritest1';
testUser.publicKey = '24yZSy2gDbBbY9MV5fxD4krLEK3M7S74BcD4EwSz4RVCMS';
testUser.passphrase = 'titular dragoon tornado leapfrog unworthy pantiled';
testUser.keyPair = {
  publicKey: new Uint8Array([208, 160, 130, 194, 82, 74, 173, 111, 60, 210, 196, 19, 254, 104, 231, 218, 206, 98, 246, 55, 156, 11, 40, 37, 180, 109, 240, 108, 230, 48, 164, 26]),
  secretKey: new Uint8Array([206, 219, 186, 31, 223, 65, 199, 22, 78, 108, 26, 234, 225, 27, 215, 104, 228, 25, 26, 128, 20, 244, 134, 225, 138, 138, 177, 27, 225, 202, 64, 219])
};
testUser.PIN = '123456';
testUser.PINKey = new Uint8Array([184, 135, 222, 32, 70, 141, 21, 108, 37, 106, 53, 55, 39, 165, 110, 115, 220, 211, 162, 252, 249, 102, 214, 124, 156, 103, 75, 48, 177, 94, 62, 73]);
testUser.contacts = {};
testUser.contacts[testUser.username] = testUser;


Peerio.initAPI();