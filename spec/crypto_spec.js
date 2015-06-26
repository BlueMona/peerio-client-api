/**
 * Peerio crypto lib tests
 * =======================
 * Does not require network, all test case data is embedded
 *
 */

describe('Crypto', function () {
  'use strict';

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

  // shortcut
  var C = Peerio.Crypto;

  // === test user data

  // === specs
  it('creates keypair from username and passphrase', function (done) {

    C.getKeyPair(testUser.passPhrase, testUser.username)
      .then(function (keyPair) {
        expect(keyPair).toEqual(testUser.keyPair);
        done();
      }).error(function (err) {
        done.fail(err);
      });
  });

  it('creates string representation from public key bytes', function () {
    var key = C.getPublicKeyString(testUser.keyPair.publicKey);
    expect(key).toEqual(testUser.publicKey);
  });

  it('extracts public key bytes from string representation', function () {
    var key = C.getPublicKeyBytes(testUser.publicKey);
    expect(key).toEqual(testUser.keyPair.publicKey);
  });

  it('encrypts and decrypts plaintext', function () {
    var original = 'wow such secret';
    var encrypted = C.secretBoxEncrypt(original, testUser.keyPair.secretKey);
    var decrypted = C.secretBoxDecrypt(encrypted.ciphertext, encrypted.nonce, testUser.keyPair.secretKey);

    expect(decrypted).toBe(original);
    expect(encrypted).not.toBe(original);
  });

  it('derives key from PIN', function (done) {
    C.getKeyFromPIN(testUser.PIN, testUser.username)
      .then(function (result) {
        expect(result).toEqual(testUser.PINKey);
        done();
      });
  });

  it('decrypts account creation token', function () {
    var serverResponse = {
      ephemeralServerID: 'G83PhNPP3VoupLVBQuEs7anYajkHo5upyGH17daXMBV7e',
      username: 'anritest2',
      accountCreationToken: {
        nonce: 'GcNzaruDKnZRop1e1ND4PJqPduTboB6J',
        token: 'doOr84MWfSZsGJszfDtFwPCDIuucdr01hAt60nuWwfdZ6PiR50QxsqKFAeUSIiJA'
      }
    };
    var keyPair = {
      publicKey: new Uint8Array([99, 36, 116, 200, 206, 158, 99, 156, 223, 247, 40, 97, 151, 198, 150, 137, 210, 39, 234, 222, 6, 25, 99, 98, 152, 48, 237, 30, 226, 127, 101, 72]),
      secretKey: new Uint8Array([70, 94, 4, 145, 178, 146, 208, 230, 128, 79, 124, 96, 250, 243, 14, 80, 156, 4, 3, 14, 38, 166, 141, 104, 201, 255, 55, 93, 138, 218, 143, 11])
    };
    var expectedToken = 'QUPREcTjtQ7xDbyH93EDO6ptjGVdukHPVMUX8AvL+FA=';

    var token = C.decryptAccountCreationToken(serverResponse, serverResponse.username, keyPair);

    expect(token).toBe(expectedToken);

  });

  it('decrypts auth token', function () {
    var serverResponse = {
      ephemeralServerID: 'G83PhNPP3VoupLVBQuEs7anYajkHo5upyGH17daXMBV7e',
      nonce: 'DOG+9ZFH1TlBR9OBMpdIQ9wyz7KU726K',
      token: 'WVMseSXvYmxdAtBlQH0Qrsy12bFN5vEjI6iCno+jQeEFRIRONDLkLM/0vjMrWuof'
    };

    var expectedToken = 'QVSYZSKTZAnzBa+exoax6WAQwN302+FvJwfOqaGnNsY=';

    var token = C.decryptAuthToken(serverResponse, testUser.keyPair);

    expect(token).toEqual(expectedToken);
  });

  it('creates avatar data', function () {
    var expected = ['9dbc492d105dde6a48c39eb788e2bdce0695114cbfddc74e267b7ff1b3cf288f',
      '5c756aa09ea4eb8df592a897ac7f7d1c04336b9dfa5e03d5d209f5e1d81e2dac'];

    var avatar = C.getAvatar(testUser.username, testUser.publicKey);

    expect(avatar).toEqual(expected);
  });


  it('encrypts and decrypts message', function (done) {
    var originalMessage = {subject: 'encryption test', message: 'this is an encryption unit test message'};

    // encrypting
    C.encryptMessage(originalMessage, [testUser.username], testUser,
      function (header, body, failed) {
        expect(failed).toEqual([]);
        // decrypting
        C.decryptMessage({header: header, body: body}, testUser,
          function (decrypted) {
            expect(decrypted).toEqual(originalMessage);
            done();
          });
      });
  });

  it('decrypts file name', function () {
    var original = 'skins.zip';
    var encrypted = 'xJXWu/2+QDvn6GxbZvz2gRmjVU8Vc8Jijh42BncM6xCriz6xJ/gnHF+MM7f3hxVerK3mNC4k6n0OokALrOqGA6vt9E0B1hiOBvqRidszjhFjQSxI4Nxo1znrS9jVPceGicMVShyxtW4uBmNXfozd29SvE9c2EfPe5L85WJeviuldk6n0Ko5lZEVU2geEDml+HF2I6DMtCIIVpoeDReatrWoHBu0BG7ygd8DUtXEhM9vjPph6mg/d2x8EXic/qa8pojT/AImaucBAPnv7W9M5v4k/UI6wwM4E3WtJj6MwoUakMdrfxbl6cL+wuHCbVSgbp8DVrpz3dbF9p529avjVaw908EfHqwFpwqarOMvm4Os=';
    var header = {
      decryptInfo: {
        '2sbl4pnLI4wykwmS1etgcvQmRd0wRB1c': '9JgVEi/GSm/ysMUWlSbi2dwKQ0zIG1Htt8GpsVOuSfP6qborXZNwi6aZQqT6qxHHg3fFGAYGSM0lrnLRVFUlUx/gNSwhgQwO4A9ge+ZXKqCNgaj+tAWBfX9g7FFAjKCCTCRLjrA6RELY2mmgjW/+AFIhsmtf8jSVS48dezhgdARcKQ9NLERvAMn6mdFDVo03w9dbhg4URox9cMcUFeWJ1CeH5b4frFB+pPNVT/s6v8kkClhWVHL5Sw14bvcGocuchOG01IjZLF4AlxUCW2uOAS7gswbHZm0CwSd/s7C3QypYz51Hifwccm1JxI0iagD+93IOPF8oRkWZKUKlBp+d2y9foQ/IG1EzKoaa8k0oatQSuRQTW6O9IcKew5XLhG58srvELGwQDVUWE+rkM6mTd+PEfxGaYmStwWTnKYeh6p2IIra4xV39sJoc+Z/ATNdUpbLfY/cgvf/x2rDc4j7+Z8c8brdIzh02B31PImaobzqCGvKZJyCieQ91sVO8',
        'QYjk+7ntDvBe8DBsrp7CvIORV9Gxp2yL': 'Tf+hHUJDbay6jByTkSVYvZOCAskZKa/OVrUUGebFbVud+tbqlnbOD1N6CmLwGUxdyPHbwbZk2rztPu6SuF0rCF55rpDNJvRxG5rrr+B/EXgDss/oLzhlWluql5N7MqabrCtDbO+3kdmqQKrdRBjf0UpUI4Q0tq6t8j+BzNi+vUhzwSQpQ+NbMl+uxVI40TH5KJv6nndsqfov+j1/QOlCS27fbSMUqtm3OLskzK8ctBXZnEfY1vK6eQq3RRi6b2ItBIhT9fWSxxb1HTSAk8dI2zG94fm/og1SUVuUt4NSnIinxjvvBEU0jJ4SPFQYRUMc1OKWgloC8UvzP7szz64dz0q+QeX7FquG3/DMyXnelA6rv7eLE4J440LFUvTkL96wQsPzdDaLmanPIePI03HsssJbdqd/siLDG/ds26wqXRLwzPFAhIzoNtwgX350c2j8iiTjwhH5/VBzYNGeNlN3KWRxM6jyXY7rv5XYApCcOhvBdOuCcsHnZTgJALk=',
        'XQpDMOcQYKir7NpQcD9to1cCYXJ/gjOk': 'qAMCK47aHgKNXrSmZs4NKvHHEYyFIbH/fM+bX03PBD+GIXan5e+K1XtyROWJ2ychq1qXlfrdY/IcGIb8T2ICXUYDaAv/WovAEQhyo5TLUnsEDe6/pqC2lyvV2eXihg2AKfnMug0hDJI0g/KkbZvmVtEEUQDGcAEnH7zCynDoFR8tyyrfXjoGMjQy+bXvGE8cYiS2oahn4dcTO1TLdgBQsMJKFuJoe3NfDCVV7dziNTPw+eZD8PM7ebEHRoM6iqkuuSpcPuPhve8SYRVxpc5QruKiRM6MAYEwDVI5b3wt9gAW6nWYMhffFzDi/TqAgjYboqHL6gHecZNk6FKKvuGqUPKC+gGaUorRVzeXV4e+usi/qdY0UlTqGW8C/hNbUeJJ23izVe4sVXOI8AsoJTFap0YvSexl7AP1Xs5waxAkMlEZZeqVgafqEAzXNXE+dvckfZkcyIfcDCPtVBNM5RZVLqgch/u6TUGCaaX0VBzbXDLmKgHtsWA+U4N6l2M='
      },
      ephemeral: 'WdFT3Wqb8SjR9KBMIU+YhJ15z3AvyveDFwMgUym2s0Q=',
      version: 1
    };
    var decrypted = C.decryptFileName(encrypted, header, testUser);

    expect(decrypted).toBe(original);
  });

  it('encrypts and decrypts file', function (done) {
    var file = new Blob([1, 2, 3]);
    file.name = 'test';
    var id;

    C.encryptFile(file, [testUser.username], testUser,
      function (filename) {
        expect(filename).toBeDefined();
        id = nacl.util.encodeBase64(filename.subarray(4));
      },
      function (header, chunks) {
        expect(header).toBeDefined();
        expect(chunks).toBeDefined();
        var blob = new Blob(chunks, {type: 'application/octet-stream'});

        C.decryptFile(id, blob, header, {sender: testUser.username}, testUser,
          function (decrypted) {
            expect(decrypted).toBeDefined();
            expect(file.size).toBe(decrypted.size);
            done();
          });
      });
  });

});