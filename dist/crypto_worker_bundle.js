/**
 * Some libraries are not worker-aware, so we help them.
 * Everything you put here will be included into worker bundles.
 */

if(!this.window)
  this.window = self;

this.window.cryptoShim = {};


if(!self.console) self.console = {
  log:function(){
    var args = [];
    for(var i=0;i<arguments.length;i++)
    args[i]= typeof(arguments[i]) === 'undefined' ? 'undefined': arguments[i].toString();
    self.postMessage({'console.log':args});
  }
 // error:function(){},
 // debug:function(){}
};
var Base58 = {};

(function () {

  var BASE = 58;
  var BITS_PER_DIGIT = Math.log(BASE) / Math.log(2);
  var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var ALPHABET_MAP = {};

  for (var i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }

  function decodedLen(n) {
    return Math.floor(n * BITS_PER_DIGIT / 8);
  }

  function maxEncodedLen(n) {
    return Math.ceil(n / BITS_PER_DIGIT);
  }

  Base58.encode = function (buffer) {
    if (buffer.length === 0) return '';

    var i, j, digits = [0];
    for (i = 0; i < buffer.length; i++) {
      for (j = 0; j < digits.length; j++) digits[j] <<= 8;

      digits[0] += buffer[i];

      var carry = 0;
      for (j = 0; j < digits.length; ++j) {
        digits[j] += carry;
        carry = (digits[j] / BASE) | 0;
        digits[j] %= BASE;
      }

      while (carry) {
        digits.push(carry % BASE);
        carry = (carry / BASE) | 0;
      }
    }

    var zeros = maxEncodedLen(buffer.length * 8) - digits.length-1;
    // deal with leading zeros
    for (i = 0; i < zeros; i++) digits.push(0);

    return digits.reverse().map(function (digit) { return ALPHABET[digit]; }).join('');
  };

  Base58.decode = function (string) {
    if (string.length === 0) return [];

    var i, j, bytes = [0];
    for (i = 0; i < string.length; i++) {
      var c = string[i];
      if (!(c in ALPHABET_MAP)) throw new Error('Non-base58 character');

      for (j = 0; j < bytes.length; j++) bytes[j] *= BASE;
      bytes[0] += ALPHABET_MAP[c];

      var carry = 0;
      for (j = 0; j < bytes.length; ++j) {
        bytes[j] += carry;

        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }

      while (carry) {
        bytes.push(carry & 0xff);

        carry >>= 8;
      }
    }

    var zeros = decodedLen(string.length) - bytes.length;

    // deal with leading zeros
    for (i = 0; i < zeros; i++) bytes.push(0);

    return new Uint8Array(bytes.reverse());
  };
})();
// Source: http://code.google.com/p/gflot/source/browse/trunk/flot/base64.js?r=153

/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free. You can redistribute it and/or modify it.
 */

/*
 * Interfaces:
 * b64 = base64encode(data);
 * data = base64decode(b64);
 */

(function() {

  var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var base64DecodeChars = new Array(
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);

  function base64encode(str) {
    var out, i, len;
    var c1, c2, c3;

    len = str.length;
    i = 0;
    out = "";
    while(i < len) {
      c1 = str.charCodeAt(i++) & 0xff;
      if(i == len)
      {
        out += base64EncodeChars.charAt(c1 >> 2);
        out += base64EncodeChars.charAt((c1 & 0x3) << 4);
        out += "==";
        break;
      }
      c2 = str.charCodeAt(i++);
      if(i == len)
      {
        out += base64EncodeChars.charAt(c1 >> 2);
        out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
        out += base64EncodeChars.charAt((c2 & 0xF) << 2);
        out += "=";
        break;
      }
      c3 = str.charCodeAt(i++);
      out += base64EncodeChars.charAt(c1 >> 2);
      out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
      out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
      out += base64EncodeChars.charAt(c3 & 0x3F);
    }
    return out;
  }

  function base64decode(str) {
    var c1, c2, c3, c4;
    var i, len, out;

    len = str.length;
    i = 0;
    out = "";
    while(i < len) {
      /* c1 */
      do {
        c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
      } while(i < len && c1 == -1);
      if(c1 == -1)
        break;

      /* c2 */
      do {
        c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
      } while(i < len && c2 == -1);
      if(c2 == -1)
        break;

      out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));

      /* c3 */
      do {
        c3 = str.charCodeAt(i++) & 0xff;
        if(c3 == 61)
          return out;
        c3 = base64DecodeChars[c3];
      } while(i < len && c3 == -1);
      if(c3 == -1)
        break;

      out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));

      /* c4 */
      do {
        c4 = str.charCodeAt(i++) & 0xff;
        if(c4 == 61)
          return out;
        c4 = base64DecodeChars[c4];
      } while(i < len && c4 == -1);
      if(c4 == -1)
        break;
      out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
    }
    return out;
  }

  var scope = (typeof window !== "undefined") ? window : self;
  if (!scope.btoa) scope.btoa = base64encode;
  if (!scope.atob) scope.atob = base64decode;

})();
var BLAKE2s = (function() {

  var MAX_DIGEST_LENGTH = 32;
  var BLOCK_LENGTH = 64;
  var MAX_KEY_LENGTH = 32;

  var IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);

  function BLAKE2s(digestLength, key) {
    if (typeof digestLength === 'undefined')
      digestLength = MAX_DIGEST_LENGTH;

    if (digestLength <= 0 || digestLength > MAX_DIGEST_LENGTH)
      throw new Error('bad digestLength');

    this.digestLength = digestLength;

    if (typeof key === 'string')
      throw new TypeError('key must be a Uint8Array or an Array of bytes');

    var keyLength = key ? key.length : 0;
    if (keyLength > MAX_KEY_LENGTH) throw new Error('key is too long');

    this.isFinished = false;

    // Hash state.
    this.h = new Uint32Array(IV);

    // XOR part of parameter block.
    var param = [digestLength & 0xff, keyLength, 1, 1];
    this.h[0] ^= param[0] & 0xff | (param[1] & 0xff) << 8 | (param[2] & 0xff) << 16 | (param[3] & 0xff) << 24;

    // Buffer for data.
    this.x = new Uint8Array(BLOCK_LENGTH);
    this.nx = 0;

    // Byte counter.
    this.t0 = 0;
    this.t1 = 0;

    // Flags.
    this.f0 = 0;
    this.f1 = 0;

    // Fill buffer with key, if present.
    if (keyLength > 0) {
      for (var i = 0; i < keyLength; i++) this.x[i] = key[i];
      for (i = keyLength; i < BLOCK_LENGTH; i++) this.x[i] = 0;
      this.nx = BLOCK_LENGTH;
    }
  }

  BLAKE2s.prototype.processBlock = function(length) {
    this.t0 += length;
    if (this.t0 != this.t0 >>> 0) {
      this.t0 = 0;
      this.t1++;
    }

    var v0  = this.h[0],
        v1  = this.h[1],
        v2  = this.h[2],
        v3  = this.h[3],
        v4  = this.h[4],
        v5  = this.h[5],
        v6  = this.h[6],
        v7  = this.h[7],
        v8  = IV[0],
        v9  = IV[1],
        v10 = IV[2],
        v11 = IV[3],
        v12 = IV[4] ^ this.t0,
        v13 = IV[5] ^ this.t1,
        v14 = IV[6] ^ this.f0,
        v15 = IV[7] ^ this.f1;

    var x = this.x;
    var m0  = x[ 0] & 0xff | (x[ 1] & 0xff) << 8 | (x[ 2] & 0xff) << 16 | (x[ 3] & 0xff) << 24,
        m1  = x[ 4] & 0xff | (x[ 5] & 0xff) << 8 | (x[ 6] & 0xff) << 16 | (x[ 7] & 0xff) << 24,
        m2  = x[ 8] & 0xff | (x[ 9] & 0xff) << 8 | (x[10] & 0xff) << 16 | (x[11] & 0xff) << 24,
        m3  = x[12] & 0xff | (x[13] & 0xff) << 8 | (x[14] & 0xff) << 16 | (x[15] & 0xff) << 24,
        m4  = x[16] & 0xff | (x[17] & 0xff) << 8 | (x[18] & 0xff) << 16 | (x[19] & 0xff) << 24,
        m5  = x[20] & 0xff | (x[21] & 0xff) << 8 | (x[22] & 0xff) << 16 | (x[23] & 0xff) << 24,
        m6  = x[24] & 0xff | (x[25] & 0xff) << 8 | (x[26] & 0xff) << 16 | (x[27] & 0xff) << 24,
        m7  = x[28] & 0xff | (x[29] & 0xff) << 8 | (x[30] & 0xff) << 16 | (x[31] & 0xff) << 24,
        m8  = x[32] & 0xff | (x[33] & 0xff) << 8 | (x[34] & 0xff) << 16 | (x[35] & 0xff) << 24,
        m9  = x[36] & 0xff | (x[37] & 0xff) << 8 | (x[38] & 0xff) << 16 | (x[39] & 0xff) << 24,
        m10 = x[40] & 0xff | (x[41] & 0xff) << 8 | (x[42] & 0xff) << 16 | (x[43] & 0xff) << 24,
        m11 = x[44] & 0xff | (x[45] & 0xff) << 8 | (x[46] & 0xff) << 16 | (x[47] & 0xff) << 24,
        m12 = x[48] & 0xff | (x[49] & 0xff) << 8 | (x[50] & 0xff) << 16 | (x[51] & 0xff) << 24,
        m13 = x[52] & 0xff | (x[53] & 0xff) << 8 | (x[54] & 0xff) << 16 | (x[55] & 0xff) << 24,
        m14 = x[56] & 0xff | (x[57] & 0xff) << 8 | (x[58] & 0xff) << 16 | (x[59] & 0xff) << 24,
        m15 = x[60] & 0xff | (x[61] & 0xff) << 8 | (x[62] & 0xff) << 16 | (x[63] & 0xff) << 24;

    // Round 1.
    v0 += m0;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m2;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m4;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m6;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m5;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m7;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m3;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m1;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m8;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m10;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m12;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m14;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m13;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m15;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m11;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m9;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 2.
    v0 += m14;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m4;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m9;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m13;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m15;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m6;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m8;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m10;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m1;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m0;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m11;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m5;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m7;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m3;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m2;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m12;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 3.
    v0 += m11;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m12;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m5;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m15;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m2;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m13;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m0;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m8;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m10;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m3;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m7;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m9;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m1;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m4;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m6;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m14;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 4.
    v0 += m7;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m3;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m13;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m11;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m12;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m14;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m1;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m9;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m2;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m5;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m4;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m15;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m0;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m8;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m10;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m6;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 5.
    v0 += m9;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m5;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m2;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m10;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m4;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m15;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m7;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m0;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m14;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m11;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m6;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m3;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m8;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m13;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m12;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m1;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 6.
    v0 += m2;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m6;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m0;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m8;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m11;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m3;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m10;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m12;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m4;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m7;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m15;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m1;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m14;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m9;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m5;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m13;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 7.
    v0 += m12;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m1;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m14;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m4;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m13;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m10;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m15;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m5;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m0;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m6;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m9;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m8;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m2;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m11;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m3;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m7;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 8.
    v0 += m13;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m7;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m12;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m3;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m1;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m9;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m14;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m11;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m5;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m15;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m8;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m2;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m6;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m10;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m4;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m0;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 9.
    v0 += m6;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m14;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m11;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m0;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m3;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m8;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m9;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m15;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m12;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m13;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m1;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m10;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m4;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m5;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m7;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 += m2;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 10.
    v0 += m10;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 += m8;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 += m7;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 += m1;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 += m6;
    v2 += v6;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 += v14;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 += m5;
    v3 += v7;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 += v15;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 += m4;
    v1 += v5;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 += v13;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 += m2;
    v0 += v4;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 += v12;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 += m15;
    v0 += v5;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 += v15;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 += m9;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 += v12;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 += m3;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 += m13;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 += m12;
    v2 += v7;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 += v13;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 += m0;
    v3 += v4;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 += v14;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 += m14;
    v1 += v6;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 += v12;
    v6 ^= v11;
    v6 = (v6 << (32 - 7)) | (v6 >>> 7);
    v0 += m11;
    v0 += v5;
    v15 ^= v0;
    v15 = (v15 << (32 - 8)) | (v15 >>> 8);
    v10 += v15;
    v5 ^= v10;
    v5 = (v5 << (32 - 7)) | (v5 >>> 7);

    this.h[0] ^= v0 ^ v8;
    this.h[1] ^= v1 ^ v9;
    this.h[2] ^= v2 ^ v10;
    this.h[3] ^= v3 ^ v11;
    this.h[4] ^= v4 ^ v12;
    this.h[5] ^= v5 ^ v13;
    this.h[6] ^= v6 ^ v14;
    this.h[7] ^= v7 ^ v15;
  };

  BLAKE2s.prototype.update = function(p, offset, length) {
    if (typeof p === 'string')
      throw new TypeError('update() accepts Uint8Array or an Array of bytes');
    if (this.isFinished)
      throw new Error('update() after calling digest()');

    if (typeof offset === 'undefined') { offset = 0; }
    if (typeof length === 'undefined') { length = p.length - offset; }

    if (length === 0) return;


    var i, left = 64 - this.nx;

    // Finish buffer.
    if (length > left) {
      for (i = 0; i < left; i++) {
        this.x[this.nx + i] = p[offset + i];
      }
      this.processBlock(64);
      offset += left;
      length -= left;
      this.nx = 0;
    }

    // Process message blocks.
    while (length > 64) {
      for (i = 0; i < 64; i++) {
        this.x[i] = p[offset + i];
      }
      this.processBlock(64);
      offset += 64;
      length -= 64;
      this.nx = 0;
    }

    // Copy leftovers to buffer.
    for (i = 0; i < length; i++) {
      this.x[this.nx + i] = p[offset + i];
    }
    this.nx += length;
  };

  BLAKE2s.prototype.digest = function() {
    var i;

    if (this.isFinished) return this.result;

    for (i = this.nx; i < 64; i++) this.x[i] = 0;

    // Set last block flag.
    this.f0 = 0xffffffff;

    //TODO in tree mode, set f1 to 0xffffffff.
    this.processBlock(this.nx);

    var d = new Uint8Array(32);
    for (i = 0; i < 8; i++) {
      var h = this.h[i];
      d[i * 4 + 0] = (h >>> 0) & 0xff;
      d[i * 4 + 1] = (h >>> 8) & 0xff;
      d[i * 4 + 2] = (h >>> 16) & 0xff;
      d[i * 4 + 3] = (h >>> 24) & 0xff;
    }
    this.result = new Uint8Array(d.subarray(0, this.digestLength));
    this.isFinished = true;
    return this.result;
  };

  BLAKE2s.prototype.hexDigest = function() {
    var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    var out = [];
    var d = this.digest();
    for (var i = 0; i < d.length; i++) {
      out.push(hex[(d[i] >> 4) & 0xf]);
      out.push(hex[d[i] & 0xf]);
    }
    return out.join('');
  };

  BLAKE2s.digestLength = MAX_DIGEST_LENGTH;
  BLAKE2s.blockLength = BLOCK_LENGTH;
  BLAKE2s.keyLength = MAX_KEY_LENGTH;

  return BLAKE2s;

})();

if (typeof module !== 'undefined' && module.exports) module.exports = BLAKE2s;

/*!
 * Fast "async" scrypt implementation in JavaScript.
 * Copyright (c) 2013-2015 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/scrypt-async-js
 */

/*
 * Limitation: doesn't support parallelization parameter greater than 1.
 */

/**
 * scrypt(password, salt, logN, r, dkLen, [interruptStep], callback, [encoding])
 *
 * Derives a key from password and salt and calls callback
 * with derived key as the only argument.
 *
 * Calculations are interrupted with zero setTimeout at the given
 * interruptSteps to avoid freezing the browser. If interruptStep is not given,
 * it defaults to 1000. If it's zero, the callback is called immediately after
 * calculation, avoiding setTimeout.
 *
 * @param {string|Array.<number>} password Password.
 * @param {string|Array.<number>} salt Salt.
 * @param {number}  logN  CPU/memory cost parameter (1 to 31).
 * @param {number}  r     Block size parameter.
 * @param {number}  dkLen Length of derived key.
 * @param {number?} interruptStep (optional) Steps to split calculation with timeouts (default 1000).
 * @param {function(string|Array.<number>)} callback Callback function.
 * @param {string?} encoding (optional) Result encoding ("base64", "hex", or null).
 *
 */
function scrypt(password, salt, logN, r, dkLen, interruptStep, callback, encoding) {
  'use strict';

  function SHA256(m) {
    /** @const */ var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
      0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
      0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
      0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
      0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
      0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
      0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
      0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
      0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
        h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19,
        w = new Array(64);

    function blocks(p) {
      var off = 0, len = p.length;
      while (len >= 64) {
        var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7,
            u, i, j, t1, t2;

        for (i = 0; i < 16; i++) {
          j = off + i*4;
          w[i] = ((p[j] & 0xff)<<24) | ((p[j+1] & 0xff)<<16) |
                 ((p[j+2] & 0xff)<<8) | (p[j+3] & 0xff);
        }

        for (i = 16; i < 64; i++) {
          u = w[i-2];
          t1 = ((u>>>17) | (u<<(32-17))) ^ ((u>>>19) | (u<<(32-19))) ^ (u>>>10);

          u = w[i-15];
          t2 = ((u>>>7) | (u<<(32-7))) ^ ((u>>>18) | (u<<(32-18))) ^ (u>>>3);

          w[i] = (((t1 + w[i-7]) | 0) + ((t2 + w[i-16]) | 0)) | 0;
        }

        for (i = 0; i < 64; i++) {
          t1 = ((((((e>>>6) | (e<<(32-6))) ^ ((e>>>11) | (e<<(32-11))) ^
               ((e>>>25) | (e<<(32-25)))) + ((e & f) ^ (~e & g))) | 0) +
               ((h + ((K[i] + w[i]) | 0)) | 0)) | 0;

          t2 = ((((a>>>2) | (a<<(32-2))) ^ ((a>>>13) | (a<<(32-13))) ^
               ((a>>>22) | (a<<(32-22)))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;

          h = g;
          g = f;
          f = e;
          e = (d + t1) | 0;
          d = c;
          c = b;
          b = a;
          a = (t1 + t2) | 0;
        }

        h0 = (h0 + a) | 0;
        h1 = (h1 + b) | 0;
        h2 = (h2 + c) | 0;
        h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0;
        h5 = (h5 + f) | 0;
        h6 = (h6 + g) | 0;
        h7 = (h7 + h) | 0;

        off += 64;
        len -= 64;
      }
    }

    blocks(m);

    var i, bytesLeft = m.length % 64,
        bitLenHi = (m.length / 0x20000000) | 0,
        bitLenLo = m.length << 3,
        numZeros = (bytesLeft < 56) ? 56 : 120,
        p = m.slice(m.length - bytesLeft, m.length);

    p.push(0x80);
    for (i = bytesLeft + 1; i < numZeros; i++) p.push(0);
    p.push((bitLenHi>>>24) & 0xff);
    p.push((bitLenHi>>>16) & 0xff);
    p.push((bitLenHi>>>8)  & 0xff);
    p.push((bitLenHi>>>0)  & 0xff);
    p.push((bitLenLo>>>24) & 0xff);
    p.push((bitLenLo>>>16) & 0xff);
    p.push((bitLenLo>>>8)  & 0xff);
    p.push((bitLenLo>>>0)  & 0xff);

    blocks(p);

    return [
      (h0>>>24) & 0xff, (h0>>>16) & 0xff, (h0>>>8) & 0xff, (h0>>>0) & 0xff,
      (h1>>>24) & 0xff, (h1>>>16) & 0xff, (h1>>>8) & 0xff, (h1>>>0) & 0xff,
      (h2>>>24) & 0xff, (h2>>>16) & 0xff, (h2>>>8) & 0xff, (h2>>>0) & 0xff,
      (h3>>>24) & 0xff, (h3>>>16) & 0xff, (h3>>>8) & 0xff, (h3>>>0) & 0xff,
      (h4>>>24) & 0xff, (h4>>>16) & 0xff, (h4>>>8) & 0xff, (h4>>>0) & 0xff,
      (h5>>>24) & 0xff, (h5>>>16) & 0xff, (h5>>>8) & 0xff, (h5>>>0) & 0xff,
      (h6>>>24) & 0xff, (h6>>>16) & 0xff, (h6>>>8) & 0xff, (h6>>>0) & 0xff,
      (h7>>>24) & 0xff, (h7>>>16) & 0xff, (h7>>>8) & 0xff, (h7>>>0) & 0xff
    ];
  }

  function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
    // compress password if it's longer than hash block length
    password = password.length <= 64 ? password : SHA256(password);

    var i, innerLen = 64 + salt.length + 4,
        inner = new Array(innerLen),
        outerKey = new Array(64),
        dk = [];

    // inner = (password ^ ipad) || salt || counter
    for (i = 0; i < 64; i++) inner[i] = 0x36;
    for (i = 0; i < password.length; i++) inner[i] ^= password[i];
    for (i = 0; i < salt.length; i++) inner[64+i] = salt[i];
    for (i = innerLen - 4; i < innerLen; i++) inner[i] = 0;

    // outerKey = password ^ opad
    for (i = 0; i < 64; i++) outerKey[i] = 0x5c;
    for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];

    // increments counter inside inner
    function incrementCounter() {
      for (var i = innerLen-1; i >= innerLen-4; i--) {
        inner[i]++;
        if (inner[i] <= 0xff) return;
        inner[i] = 0;
      }
    }

    // output blocks = SHA256(outerKey || SHA256(inner)) ...
    while (dkLen >= 32) {
      incrementCounter();
      dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
      dkLen -= 32;
    }
    if (dkLen > 0) {
      incrementCounter();
      dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen));
    }
    return dk;
  }

  function salsaXOR(tmp, B, bin, bout) {
    var j0  = tmp[0]  ^ B[bin++],
        j1  = tmp[1]  ^ B[bin++],
        j2  = tmp[2]  ^ B[bin++],
        j3  = tmp[3]  ^ B[bin++],
        j4  = tmp[4]  ^ B[bin++],
        j5  = tmp[5]  ^ B[bin++],
        j6  = tmp[6]  ^ B[bin++],
        j7  = tmp[7]  ^ B[bin++],
        j8  = tmp[8]  ^ B[bin++],
        j9  = tmp[9]  ^ B[bin++],
        j10 = tmp[10] ^ B[bin++],
        j11 = tmp[11] ^ B[bin++],
        j12 = tmp[12] ^ B[bin++],
        j13 = tmp[13] ^ B[bin++],
        j14 = tmp[14] ^ B[bin++],
        j15 = tmp[15] ^ B[bin++],
        u, i;

    var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
        x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
        x15 = j15;

    for (i = 0; i < 8; i += 2) {
      u =  x0 + x12;   x4 ^= u<<7  | u>>>(32-7);
      u =  x4 +  x0;   x8 ^= u<<9  | u>>>(32-9);
      u =  x8 +  x4;  x12 ^= u<<13 | u>>>(32-13);
      u = x12 +  x8;   x0 ^= u<<18 | u>>>(32-18);

      u =  x5 +  x1;   x9 ^= u<<7  | u>>>(32-7);
      u =  x9 +  x5;  x13 ^= u<<9  | u>>>(32-9);
      u = x13 +  x9;   x1 ^= u<<13 | u>>>(32-13);
      u =  x1 + x13;   x5 ^= u<<18 | u>>>(32-18);

      u = x10 +  x6;  x14 ^= u<<7  | u>>>(32-7);
      u = x14 + x10;   x2 ^= u<<9  | u>>>(32-9);
      u =  x2 + x14;   x6 ^= u<<13 | u>>>(32-13);
      u =  x6 +  x2;  x10 ^= u<<18 | u>>>(32-18);

      u = x15 + x11;   x3 ^= u<<7  | u>>>(32-7);
      u =  x3 + x15;   x7 ^= u<<9  | u>>>(32-9);
      u =  x7 +  x3;  x11 ^= u<<13 | u>>>(32-13);
      u = x11 +  x7;  x15 ^= u<<18 | u>>>(32-18);

      u =  x0 +  x3;   x1 ^= u<<7  | u>>>(32-7);
      u =  x1 +  x0;   x2 ^= u<<9  | u>>>(32-9);
      u =  x2 +  x1;   x3 ^= u<<13 | u>>>(32-13);
      u =  x3 +  x2;   x0 ^= u<<18 | u>>>(32-18);

      u =  x5 +  x4;   x6 ^= u<<7  | u>>>(32-7);
      u =  x6 +  x5;   x7 ^= u<<9  | u>>>(32-9);
      u =  x7 +  x6;   x4 ^= u<<13 | u>>>(32-13);
      u =  x4 +  x7;   x5 ^= u<<18 | u>>>(32-18);

      u = x10 +  x9;  x11 ^= u<<7  | u>>>(32-7);
      u = x11 + x10;   x8 ^= u<<9  | u>>>(32-9);
      u =  x8 + x11;   x9 ^= u<<13 | u>>>(32-13);
      u =  x9 +  x8;  x10 ^= u<<18 | u>>>(32-18);

      u = x15 + x14;  x12 ^= u<<7  | u>>>(32-7);
      u = x12 + x15;  x13 ^= u<<9  | u>>>(32-9);
      u = x13 + x12;  x14 ^= u<<13 | u>>>(32-13);
      u = x14 + x13;  x15 ^= u<<18 | u>>>(32-18);
    }

    B[bout++] = tmp[0]  = (x0  + j0)  | 0;
    B[bout++] = tmp[1]  = (x1  + j1)  | 0;
    B[bout++] = tmp[2]  = (x2  + j2)  | 0;
    B[bout++] = tmp[3]  = (x3  + j3)  | 0;
    B[bout++] = tmp[4]  = (x4  + j4)  | 0;
    B[bout++] = tmp[5]  = (x5  + j5)  | 0;
    B[bout++] = tmp[6]  = (x6  + j6)  | 0;
    B[bout++] = tmp[7]  = (x7  + j7)  | 0;
    B[bout++] = tmp[8]  = (x8  + j8)  | 0;
    B[bout++] = tmp[9]  = (x9  + j9)  | 0;
    B[bout++] = tmp[10] = (x10 + j10) | 0;
    B[bout++] = tmp[11] = (x11 + j11) | 0;
    B[bout++] = tmp[12] = (x12 + j12) | 0;
    B[bout++] = tmp[13] = (x13 + j13) | 0;
    B[bout++] = tmp[14] = (x14 + j14) | 0;
    B[bout++] = tmp[15] = (x15 + j15) | 0;
  }

  function blockCopy(dst, di, src, si, len) {
    while (len--) dst[di++] = src[si++];
  }

  function blockXOR(dst, di, src, si, len) {
    while (len--) dst[di++] ^= src[si++];
  }

  function blockMix(tmp, B, bin, bout, r) {
    blockCopy(tmp, 0, B, bin + (2*r-1)*16, 16);
    for (var i = 0; i < 2*r; i += 2) {
      salsaXOR(tmp, B, bin + i*16,      bout + i*8);
      salsaXOR(tmp, B, bin + i*16 + 16, bout + i*8 + r*16);
    }
  }

  function integerify(B, bi, r) {
    return B[bi+(2*r-1)*16];
  }

  function stringToUTF8Bytes(s) {
      var arr = [];
      for (var i = 0; i < s.length; i++) {
          var c = s.charCodeAt(i);
          if (c < 128) {
              arr.push(c);
          } else if (c > 127 && c < 2048) {
              arr.push((c>>6) | 192);
              arr.push((c & 63) | 128);
          } else {
              arr.push((c>>12) | 224);
              arr.push(((c>>6) & 63) | 128);
              arr.push((c & 63) | 128);
          }
      }
      return arr;
  }

  function bytesToHex(p) {
    /** @const */
    var enc = '0123456789abcdef'.split('');

    var len = p.length,
        arr = [],
        i = 0;

    for (; i < len; i++) {
        arr.push(enc[(p[i]>>>4) & 15]);
        arr.push(enc[(p[i]>>>0) & 15]);
    }
    return arr.join('');
  }

  function bytesToBase64(p) {
    /** @const */
    var enc = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
              '0123456789+/').split('');

    var len = p.length,
        arr = [],
        i = 0,
        a, b, c, t;

    while (i < len) {
      a = i < len ? p[i++] : 0;
      b = i < len ? p[i++] : 0;
      c = i < len ? p[i++] : 0;
      t = (a << 16) + (b << 8) + c;
      arr.push(enc[(t >>> 3 * 6) & 63]);
      arr.push(enc[(t >>> 2 * 6) & 63]);
      arr.push(enc[(t >>> 1 * 6) & 63]);
      arr.push(enc[(t >>> 0 * 6) & 63]);
    }
    if (len % 3 > 0) {
      arr[arr.length-1] = '=';
      if (len % 3 === 1) arr[arr.length-2] = '=';
    }
    return arr.join('');
  }


  // Generate key.

  // Set parallelization parameter to 1.
  var p = 1;

  if (logN < 1 || logN > 31)
    throw new Error('scrypt: logN not be between 1 and 31');

  var MAX_INT = (1<<31)>>>0,
      N = (1<<logN)>>>0,
      XY, V, B, tmp;

  if (r*p >= 1<<30 || r > MAX_INT/128/p || r > MAX_INT/256 || N > MAX_INT/128/r)
    throw new Error('scrypt: parameters are too large');

  // Decode strings.
  if (typeof password === 'string')
    password = stringToUTF8Bytes(password);
  if (typeof salt === 'string')
    salt = stringToUTF8Bytes(salt);

  if (typeof Int32Array !== 'undefined') {
    //XXX We can use Uint32Array, but Int32Array is faster in Safari.
    XY = new Int32Array(64*r);
    V = new Int32Array(32*N*r);
    tmp = new Int32Array(16);
  } else {
    XY = [];
    V = [];
    tmp = new Array(16);
  }
  B = PBKDF2_HMAC_SHA256_OneIter(password, salt, p*128*r);

  var xi = 0, yi = 32 * r;

  function smixStart() {
    for (var i = 0; i < 32*r; i++) {
      var j = i*4;
      XY[xi+i] = ((B[j+3] & 0xff)<<24) | ((B[j+2] & 0xff)<<16) |
                 ((B[j+1] & 0xff)<<8)  | ((B[j+0] & 0xff)<<0);
    }
  }

  function smixStep1(start, end) {
    for (var i = start; i < end; i += 2) {
      blockCopy(V, i*(32*r), XY, xi, 32*r);
      blockMix(tmp, XY, xi, yi, r);

      blockCopy(V, (i+1)*(32*r), XY, yi, 32*r);
      blockMix(tmp, XY, yi, xi, r);
    }
  }

  function smixStep2(start, end) {
    for (var i = start; i < end; i += 2) {
      var j = integerify(XY, xi, r) & (N-1);
      blockXOR(XY, xi, V, j*(32*r), 32*r);
      blockMix(tmp, XY, xi, yi, r);

      j = integerify(XY, yi, r) & (N-1);
      blockXOR(XY, yi, V, j*(32*r), 32*r);
      blockMix(tmp, XY, yi, xi, r);
    }
  }

  function smixFinish() {
    for (var i = 0; i < 32*r; i++) {
      var j = XY[xi+i];
      B[i*4+0] = (j>>>0)  & 0xff;
      B[i*4+1] = (j>>>8)  & 0xff;
      B[i*4+2] = (j>>>16) & 0xff;
      B[i*4+3] = (j>>>24) & 0xff;
    }
  }

  function interruptedFor(start, end, step, fn, donefn) {
    (function performStep() {
      setTimeout(function() {
        fn(start, start + step < end ? start + step : end);
        start += step;
        if (start < end)
          performStep();
        else
          donefn();
        }, 0);
    })();
  }

  function getResult(enc) {
      var result = PBKDF2_HMAC_SHA256_OneIter(password, B, dkLen);
      if (enc === 'base64')
        return bytesToBase64(result);
      else if (enc === 'hex')
        return bytesToHex(result);
      else
        return result;
  }

  if (typeof interruptStep === 'function') {
    // Called as: scrypt(...,      callback, [encoding])
    //  shifting: scrypt(..., interruptStep,  callback, [encoding])
    encoding = callback;
    callback = interruptStep;
    interruptStep = 1000;
  }

  if (interruptStep <= 0) {
    //
    // Blocking async variant, calls callback.
    //
    smixStart();
    smixStep1(0, N);
    smixStep2(0, N);
    smixFinish();
    callback(getResult(encoding));

  } else {
    //
    // Async variant with interruptions, calls callback.
    //
    smixStart();
    interruptedFor(0, N, interruptStep*2, smixStep1, function() {
      interruptedFor(0, N, interruptStep*2, smixStep2, function () {
        smixFinish();
        callback(getResult(encoding));
      });
    });
  }
}

if (typeof module !== 'undefined') module.exports = scrypt;

(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

/* jshint newcap: false */

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (g[9] >>> ((2 * 8) - 1)) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254;i>=0;--i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = (x[j] + 128) >> 8;
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i, mlen;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  mlen = -1;
  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  mlen = n;
  return mlen;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor : crypto_stream_xor,
  crypto_stream : crypto_stream,
  crypto_stream_salsa20_xor : crypto_stream_salsa20_xor,
  crypto_stream_salsa20 : crypto_stream_salsa20,
  crypto_onetimeauth : crypto_onetimeauth,
  crypto_onetimeauth_verify : crypto_onetimeauth_verify,
  crypto_verify_16 : crypto_verify_16,
  crypto_verify_32 : crypto_verify_32,
  crypto_secretbox : crypto_secretbox,
  crypto_secretbox_open : crypto_secretbox_open,
  crypto_scalarmult : crypto_scalarmult,
  crypto_scalarmult_base : crypto_scalarmult_base,
  crypto_box_beforenm : crypto_box_beforenm,
  crypto_box_afternm : crypto_box_afternm,
  crypto_box : crypto_box,
  crypto_box_open : crypto_box_open,
  crypto_box_keypair : crypto_box_keypair,
  crypto_hash : crypto_hash,
  crypto_sign : crypto_sign,
  crypto_sign_keypair : crypto_sign_keypair,
  crypto_sign_open : crypto_sign_open,

  crypto_secretbox_KEYBYTES : crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES : crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES : crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES : crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES : crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES : crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES : crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES : crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES : crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES : crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES : crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES : crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES : crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES : crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES : crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES : crypto_hash_BYTES
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  var t, i;
  for (i = 0; i < arguments.length; i++) {
     if ((t = Object.prototype.toString.call(arguments[i])) !== '[object Uint8Array]')
       throw new TypeError('unexpected type ' + t + ', use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

nacl.util = {};

nacl.util.decodeUTF8 = function(s) {
  var i, d = unescape(encodeURIComponent(s)), b = new Uint8Array(d.length);
  for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
  return b;
};

nacl.util.encodeUTF8 = function(arr) {
  var i, s = [];
  for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
  return decodeURIComponent(escape(s.join('')));
};

nacl.util.encodeBase64 = function(arr) {
  if (typeof btoa === 'undefined') {
    return (new Buffer(arr)).toString('base64');
  } else {
    var i, s = [], len = arr.length;
    for (i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]));
    return btoa(s.join(''));
  }
};

nacl.util.decodeBase64 = function(s) {
  if (typeof atob === 'undefined') {
    return new Uint8Array(Array.prototype.slice.call(new Buffer(s, 'base64'), 0));
  } else {
    var i, d = atob(s), b = new Uint8Array(d.length);
    for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
    return b;
  }
};

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return false;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  if (arguments.length !== 2)
    throw new Error('nacl.sign.open accepts 2 arguments; did you mean to use nacl.sign.detached.verify?');
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto;
  if (typeof window !== 'undefined') {
    // Browser.
    if (window.crypto && window.crypto.getRandomValues) {
      crypto = window.crypto; // Standard
    } else if (window.msCrypto && window.msCrypto.getRandomValues) {
      crypto = window.msCrypto; // Internet Explorer 11+
    }
    if (crypto) {
      nacl.setPRNG(function(x, n) {
        var i, v = new Uint8Array(n);
        crypto.getRandomValues(v);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  } else if (typeof require !== 'undefined') {
    // Node.js.
    crypto = require('crypto');
    if (crypto) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (window.nacl = window.nacl || {}));

/*
 * nacl-stream: streaming encryption based on TweetNaCl.js
 * Written by Dmitry Chestnykh in 2014. Public domain.
 * <https://github.com/dchest/nacl-stream-js>
 */
(function(root, f) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) module.exports.stream = f(require('tweetnacl/nacl-fast'));
  else root.nacl.stream = f(root.nacl);

}(this, function(nacl) {
  'use strict';

  if (!nacl) throw new Error('tweetnacl not loaded');

  var DEFAULT_MAX_CHUNK = 65535;

  var ZEROBYTES = nacl.lowlevel.crypto_secretbox_ZEROBYTES;
  var BOXZEROBYTES = nacl.lowlevel.crypto_secretbox_BOXZEROBYTES;
  var crypto_secretbox = nacl.lowlevel.crypto_secretbox;
  var crypto_secretbox_open = nacl.lowlevel.crypto_secretbox_open;

  function incrementChunkCounter(fullNonce) {
    for (var i = 16; i < 24; i++) {
      fullNonce[i]++;
      if (fullNonce[i]) break;
    }
  }

  function setLastChunkFlag(fullNonce) {
    fullNonce[23] |= 0x80;
  }

  function clean() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      for (var j = 0; j < arg.length; j++) arg[j] = 0;
    }
  }

  function readChunkLength(data, offset) {
    offset |= 0;
    if (data.length < offset + 4) return -1;
    return data[offset] | data[offset+1] << 8 |
           data[offset+2] << 16 | data[offset+3] << 24;
  };


  function checkArgs(key, nonce, maxChunkLength) {
    if (key.length !== 32) throw new Error('bad key length, must be 32 bytes');
    if (nonce.length !== 16) throw new Error('bad nonce length, must be 16 bytes');
    if (maxChunkLength >= 0xffffffff) throw new Error('max chunk length is too large');
    if (maxChunkLength < 16) throw new Error('max chunk length is too small');
  }

  function StreamEncryptor(key, nonce, maxChunkLength) {
    checkArgs(key, nonce, maxChunkLength);
    this._key = key;
    this._fullNonce = new Uint8Array(24);
    this._fullNonce.set(nonce);
    this._maxChunkLength = maxChunkLength || DEFAULT_MAX_CHUNK;
    this._in = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._out = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._done = false;
  }

  StreamEncryptor.prototype.encryptChunk = function(chunk, isLast) {
    if (this._done) throw new Error('called encryptChunk after last chunk');
    var chunkLen = chunk.length;
    if (chunkLen > this._maxChunkLength)
      throw new Error('chunk is too large: ' + chunkLen + ' / ' + this._maxChunkLength);
    for (var i = 0; i < ZEROBYTES; i++) this._in[i] = 0;
    this._in.set(chunk, ZEROBYTES);
    if (isLast) {
      setLastChunkFlag(this._fullNonce);
      this._done = true;
    }
    crypto_secretbox(this._out, this._in, chunkLen + ZEROBYTES, this._fullNonce, this._key);
    incrementChunkCounter(this._fullNonce);
    var encryptedChunk = this._out.subarray(BOXZEROBYTES-4, BOXZEROBYTES-4 + chunkLen+16+4);
    encryptedChunk[0] = (chunkLen >>>  0) & 0xff;
    encryptedChunk[1] = (chunkLen >>>  8) & 0xff;
    encryptedChunk[2] = (chunkLen >>> 16) & 0xff;
    encryptedChunk[3] = (chunkLen >>> 24) & 0xff;
    return new Uint8Array(encryptedChunk);
  };

  StreamEncryptor.prototype.clean = function() {
    clean(this._fullNonce, this._in, this._out);
  };

  function StreamDecryptor(key, nonce, maxChunkLength) {
    checkArgs(key, nonce, maxChunkLength);
    this._key = key;
    this._fullNonce = new Uint8Array(24);
    this._fullNonce.set(nonce);
    this._maxChunkLength = maxChunkLength || DEFAULT_MAX_CHUNK;
    this._in = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._out = new Uint8Array(ZEROBYTES + this._maxChunkLength);
    this._failed = false;
    this._done = false;
  }

  StreamDecryptor.prototype._fail = function() {
    this._failed = true;
    this.clean();
    return null;
  };

  StreamDecryptor.prototype.decryptChunk = function(encryptedChunk, isLast) {
    if (this._failed) return null;
    if (this._done) throw new Error('called decryptChunk after last chunk');
    var encryptedChunkLen = encryptedChunk.length;
    if (encryptedChunkLen < 4 + BOXZEROBYTES) return this._fail();
    var chunkLen = readChunkLength(encryptedChunk);
    if (chunkLen < 0 || chunkLen > this._maxChunkLength) return this._fail();
    if (chunkLen + 4 + BOXZEROBYTES !== encryptedChunkLen) return this._fail();
    for (var i = 0; i < BOXZEROBYTES; i++) this._in[i] = 0;
    for (i = 0; i < encryptedChunkLen-4; i++) this._in[BOXZEROBYTES+i] = encryptedChunk[i+4];
    if (isLast) {
      setLastChunkFlag(this._fullNonce);
      this._done = true;
    }
    if (crypto_secretbox_open(this._out, this._in, encryptedChunkLen+BOXZEROBYTES-4,
                this._fullNonce, this._key) !== 0) return this._fail();
    incrementChunkCounter(this._fullNonce);
    return new Uint8Array(this._out.subarray(ZEROBYTES, ZEROBYTES + chunkLen));
  };

  StreamDecryptor.prototype.clean = function() {
    clean(this._fullNonce, this._in, this._out);
  };

  return {
    createEncryptor: function(k, n, c) { return new StreamEncryptor(k, n, c); },
    createDecryptor: function(k, n, c) { return new StreamDecryptor(k, n, c); },
    readChunkLength: readChunkLength
  };

}));

/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2015 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 2.10.0
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, cancel, using, filter, any, each, timers
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var util = _dereq_("./util.js");

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.enableTrampoline = function() {
    if (!this._trampolineEnabled) {
        this._trampolineEnabled = true;
        this._schedule = function(fn) {
            setTimeout(fn, 0);
        };
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._normalQueue.length() > 0;
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    if (schedule.isStatic) {
        schedule = function(fn) { setTimeout(fn, 0); };
    }
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = new Async();
module.exports.firstLineError = firstLineError;

},{"./queue.js":28,"./schedule.js":31,"./util.js":38}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise) {
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (this._isPending()) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, ret._progress, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, ret._progress, ret, context);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 131072;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~131072);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 131072) === 131072;
};

Promise.bind = function (thisArg, value) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        maybePromise._then(function() {
            ret._resolveCallback(value);
        }, ret._reject, ret._progress, ret, null);
    } else {
        ret._resolveCallback(value);
    }
    return ret;
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise.js")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise.js":23}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util.js":38}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function (reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== undefined &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    this._unsetCancellable();
    promiseToReject._target()._rejectCallback(reason, false, true);
};

Promise.prototype.cancel = function (reason) {
    if (!this.isCancellable()) return this;
    if (reason === undefined) reason = new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function () {
    if (this._cancellable()) return this;
    async.enableTrampoline();
    this._setCancellable();
    this._cancellationParent = undefined;
    return this;
};

Promise.prototype.uncancellable = function () {
    var ret = this.then();
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork = function (didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         undefined, undefined);

    ret._setCancellable();
    ret._cancellationParent = undefined;
    return ret;
};
};

},{"./async.js":2,"./errors.js":13}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](main|debug|zalgo|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var warn;

function CapturedTrace(parent) {
    this._parent = parent;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.parent = function() {
    return this._parent;
};

CapturedTrace.prototype.hasParent = function() {
    return this._parent !== undefined;
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = CapturedTrace.parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = stackFramePattern.test(line) ||
            "    (No stack trace)" === line;
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

CapturedTrace.parseStackAndMessage = function(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
};

CapturedTrace.formatAndLogError = function(error, title) {
    if (typeof console !== "undefined") {
        var message;
        if (typeof error === "object" || typeof error === "function") {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof warn === "function") {
            warn(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.unhandledRejection = function (reason) {
    CapturedTrace.formatAndLogError(reason, "^--- With additional stack trace: ");
};

CapturedTrace.isSupported = function () {
    return typeof captureStackTrace === "function";
};

CapturedTrace.fireRejectionEvent =
function(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        CapturedTrace.formatAndLogError(reason, "Unhandled rejection ");
    }
};

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}
CapturedTrace.setBounds = function(firstLineError, lastLineError) {
    if (!CapturedTrace.isSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit = Error.stackTraceLimit + 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    warn = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        warn = function(message) {
            process.stderr.write("\u001b[31m" + message + "\u001b[39m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        warn = function(message) {
            console.warn("%c" + message, "color: red");
        };
    }
}

return CapturedTrace;
};

},{"./async.js":2,"./util.js":38}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch(predicate).call(safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function (e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundValue();
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch(cb).call(boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = safePredicate(item, e);
            if (shouldHandle === errorObj) {
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch(cb).call(boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace, isDebugging) {
var contextStack = [];
function Context() {
    this._trace = new CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.pop();
    }
};

function createContext() {
    if (isDebugging()) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}

Promise.prototype._peekContext = peekContext;
Promise.prototype._pushContext = Context.prototype._pushContext;
Promise.prototype._popContext = Context.prototype._popContext;

return createContext;
};

},{}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var Warning = _dereq_("./errors.js").Warning;
var util = _dereq_("./util.js");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var debugging = false || (util.isNode &&
                    (!!process.env["BLUEBIRD_DEBUG"] ||
                     process.env["NODE_ENV"] === "development"));

if (util.isNode && process.env["BLUEBIRD_DEBUG"] == 0) debugging = false;

if (debugging) {
    async.disableTrampolineIfNecessary();
}

Promise.prototype._ignoreRejections = function() {
    this._unsetRejectionIsUnhandled();
    this._bitField = this._bitField | 16777216;
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 16777216) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    CapturedTrace.fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._getCarriedStackTrace() || this._settledValue;
        this._setUnhandledRejectionIsNotified();
        CapturedTrace.fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setCarriedStackTrace = function (capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._isCarryingStackTrace = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace = function () {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : undefined;
};

Promise.prototype._captureStackTrace = function () {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext());
    }
    return this;
};

Promise.prototype._attachExtraTrace = function (error, ignoreSelf) {
    if (debugging && canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = CapturedTrace.parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
};

Promise.prototype._warn = function(message) {
    var warning = new Warning(message);
    var ctx = this._peekContext();
    if (ctx) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = CapturedTrace.parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    CapturedTrace.formatAndLogError(warning, "");
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.longStackTraces = function () {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
    }
    debugging = CapturedTrace.isSupported();
    if (debugging) {
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return debugging && CapturedTrace.isSupported();
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

return function() {
    return debugging;
};
};

},{"./async.js":2,"./errors.js":13,"./util.js":38}],11:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;

module.exports = function(Promise) {
var returner = function () {
    return this;
};
var thrower = function () {
    throw this;
};
var returnUndefined = function() {};
var throwUndefined = function() {
    throw undefined;
};

var wrapper = function (value, action) {
    if (action === 1) {
        return function () {
            throw value;
        };
    } else if (action === 2) {
        return function () {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value === undefined) return this.then(returnUndefined);

    if (isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            undefined,
            undefined,
            undefined,
            undefined
       );
    } else if (value instanceof Promise) {
        value._ignoreRejections();
    }
    return this._then(returner, undefined, undefined, value, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    if (reason === undefined) return this.then(throwUndefined);

    if (isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(thrower, undefined, undefined, reason, undefined);
};
};

},{"./util.js":38}],12:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],13:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5.js":14,"./util.js":38}],14:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, NEXT_FILTER, tryConvertToPromise) {
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function() {
        return r;
    };
}
function throw$(r) {
    return function() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, undefined, reasonOrValue, undefined);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue())
                    : handler();

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue(), value)
                    : handler(value);

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler = function (handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : undefined, undefined,
            promiseAndHandler, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function (handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":38}],17:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise) {
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._next(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    if (result === errorObj) {
        return this._promise._rejectCallback(result.e, false, true);
    }

    var value = result.value;
    if (result.done === true) {
        this._promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._throw(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            undefined,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function (reason) {
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._next = function (value) {
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        spawn._generator = generator;
        spawn._next(undefined);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":13,"./util.js":38}],18:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [undefined];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            promise._pushContext();
            var ret = tryCatch(handler)(this);
            promise._popContext();
            if (ret === errorObj) {
                promise._rejectCallback(ret.e, false, true);
            } else {
                promise._resolveCallback(ret);
            }
        } else {
            this.now = now;
        }
    };

    var reject = function (reason) {
        this._reject(reason);
    };
}
}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last < 6 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var holder = new Holder(last, fn);
                var callbacks = thenCallbacks;
                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        if (maybePromise._isPending()) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                        } else if (maybePromise._isFulfilled()) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else {
                            ret._reject(maybePromise._reason());
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util.js":38}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    async.invoke(init, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);
function init() {this._init$(undefined, -2);}

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundValue();
        this._promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        this._promise._popContext();
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function (fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

    return map(this, fn, options, null).promise();
};

Promise.map = function (promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./async.js":2,"./util.js":38}],20:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        ret._popContext();
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value = util.isArray(args)
        ? tryCatch(fn).apply(ctx, args)
        : tryCatch(fn).call(ctx, args);
    ret._popContext();
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false, true);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util.js":38}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var target = promise._target();
        var newReason = target._getCarriedStackTrace();
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback =
Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./async.js":2,"./util.js":38}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

Promise.prototype.progressed = function (handler) {
    return this._then(undefined, undefined, handler, undefined, undefined);
};

Promise.prototype._progress = function (progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._target()._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt = function (index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith = function (progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    var ret = tryCatch(handler).call(receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = util.canAttachTrace(ret.e)
                ? ret.e : new Error(util.toString(ret.e));
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, undefined);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked = function (progressValue) {
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof PromiseArray &&
                       !receiver._isResolved()) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":2,"./util.js":38}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
};
var reflect = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};

var util = _dereq_("./util.js");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var UNDEFINED_BINDING = {};
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};
var tryConvertToPromise = _dereq_("./thenables.js")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array.js")(Promise, INTERNAL,
                                    tryConvertToPromise, apiRejection);
var CapturedTrace = _dereq_("./captured_trace.js")();
var isDebugging = _dereq_("./debuggability.js")(Promise, CapturedTrace);
 /*jshint unused:false*/
var createContext =
    _dereq_("./context.js")(Promise, CapturedTrace, isDebugging);
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");
var nodebackForPromise = PromiseResolver._nodebackForPromise;
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function\u000a\u000a    See http://goo.gl/EC22Yn\u000a");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._progressHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settledValue = undefined;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(
                    new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a"));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(undefined, catchFilter.doFilter, undefined,
            catchFilter, undefined);
    }
    return this._then(undefined, fn, undefined, undefined, undefined);
};

Promise.prototype.reflect = function () {
    return this._then(reflect, reflect, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject, didProgress) {
    if (isDebugging() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (didFulfill, didReject) {
    return this.all()._then(didFulfill, didReject, undefined, APPLY, undefined);
};

Promise.prototype.isCancellable = function () {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = function(fn) {
    var ret = new Promise(INTERNAL);
    var result = tryCatch(fn)(nodebackForPromise(ret));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true, true);
    }
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.defer = Promise.pending = function () {
    var promise = new Promise(INTERNAL);
    return new PromiseResolver(promise);
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._fulfillUnchecked(val);
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        ret._propagateFrom(this, 4 | 1);
        ret._captureStackTrace();
    }

    var target = this._target();
    if (target !== this) {
        if (receiver === undefined) receiver = this._boundTo;
        if (!haveInternalData) ret._setIsMigrated();
    }

    var callbackIndex = target._addCallbacks(didFulfill,
                                             didReject,
                                             didProgress,
                                             ret,
                                             receiver,
                                             getDomain());

    if (target._isResolved() && !target._isSettlePromisesQueued()) {
        async.invoke(
            target._settlePromiseAtPostResolution, target, callbackIndex);
    }

    return ret;
};

Promise.prototype._settlePromiseAtPostResolution = function (index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    this._settlePromiseAt(index);
};

Promise.prototype._length = function () {
    return this._bitField & 131071;
};

Promise.prototype._isFollowingOrFulfilledOrRejected = function () {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -131072) |
        (len & 131071);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function () {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function () {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setIsMigrated = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetIsMigrated = function () {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isMigrated = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0
        ? this._receiver0
        : this[
            index * 5 - 5 + 4];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return index === 0
        ? this._promise0
        : this[index * 5 - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return index === 0
        ? this._fulfillmentHandler0
        : this[index * 5 - 5 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return index === 0
        ? this._rejectionHandler0
        : this[index * 5 - 5 + 1];
};

Promise.prototype._boundValue = function() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
};

Promise.prototype._migrateCallbacks = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var progress = follower._progressHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (promise instanceof Promise) promise._setIsMigrated();
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, progress, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    progress,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== undefined) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this._progressHandler0 =
                domain === null ? progress : domain.bind(progress);
        }
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this[base + 2] =
                domain === null ? progress : domain.bind(progress);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers = function (receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false, true);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    var propagationFlags = 1 | (shouldBind ? 4 : 0);
    this._propagateFrom(maybePromise, propagationFlags);
    var promise = maybePromise._target();
    if (promise._isPending()) {
        var len = this._length();
        for (var i = 0; i < len; ++i) {
            promise._migrateCallbacks(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (promise._isFulfilled()) {
        this._fulfillUnchecked(promise._value());
    } else {
        this._rejectUnchecked(promise._reason(),
            promise._getCarriedStackTrace());
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, shouldNotMarkOriginatingFromRejection) {
    if (!shouldNotMarkOriginatingFromRejection) {
        util.markAsOriginatingFromRejection(reason);
    }
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason, hasStack ? undefined : trace);
};

Promise.prototype._resolveFromResolver = function (resolver) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = tryCatch(resolver)(function(value) {
        if (promise === null) return;
        promise._resolveCallback(value);
        promise = null;
    }, function (reason) {
        if (promise === null) return;
        promise._rejectCallback(reason, synchronous);
        promise = null;
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined && r === errorObj && promise !== null) {
        promise._rejectCallback(r.e, true, true);
        promise = null;
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    if (promise._isRejected()) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY && !this._isRejected()) {
        x = tryCatch(handler).apply(this._boundValue(), value);
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    promise._popContext();

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false, true);
    } else {
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._cleanValues = function () {
    if (this._cancellable()) {
        this._cancellationParent = undefined;
    }
};

Promise.prototype._propagateFrom = function (parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
};

Promise.prototype._fulfill = function (value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject = function (reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function (index) {
    var promise = this._promiseAt(index);
    var isPromise = promise instanceof Promise;

    if (isPromise && promise._isMigrated()) {
        promise._unsetIsMigrated();
        return async.invoke(this._settlePromiseAt, this, index);
    }
    var handler = this._isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var carriedStackTrace =
        this._isCarryingStackTrace() ? this._getCarriedStackTrace() : undefined;
    var value = this._settledValue;
    var receiver = this._receiverAt(index);
    this._clearCallbackDataAtIndex(index);

    if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof PromiseArray) {
        if (!receiver._isResolved()) {
            if (this._isFulfilled()) {
                receiver._promiseFulfilled(value, promise);
            }
            else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (this._isFulfilled()) {
            promise._fulfill(value);
        } else {
            promise._reject(value, carriedStackTrace);
        }
    }

    if (index >= 4 && (index & 31) === 4)
        async.invokeLater(this._setLength, this, 0);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    if (index === 0) {
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = undefined;
        }
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._receiver0 =
        this._promise0 = undefined;
    } else {
        var base = index * 5 - 5;
        this[base + 3] =
        this[base + 4] =
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = undefined;
    }
};

Promise.prototype._isSettlePromisesQueued = function () {
    return (this._bitField &
            -1073741824) === -1073741824;
};

Promise.prototype._setSettlePromisesQueued = function () {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetSettlePromisesQueued = function () {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueSettlePromises = function() {
    async.settlePromises(this);
    this._setSettlePromisesQueued();
};

Promise.prototype._fulfillUnchecked = function (value) {
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, undefined);
    }
    this._setFulfilled();
    this._settledValue = value;
    this._cleanValues();

    if (this._length() > 0) {
        this._queueSettlePromises();
    }
};

Promise.prototype._rejectUncheckedCheckError = function (reason) {
    var trace = util.ensureErrorObject(reason);
    this._rejectUnchecked(reason, trace === reason ? undefined : trace);
};

Promise.prototype._rejectUnchecked = function (reason, trace) {
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._setRejected();
    this._settledValue = reason;
    this._cleanValues();

    if (this._isFinal()) {
        async.throwLater(function(e) {
            if ("stack" in e) {
                async.invokeFirst(
                    CapturedTrace.unhandledRejection, undefined, e);
            }
            throw e;
        }, trace === undefined ? reason : trace);
        return;
    }

    if (trace !== undefined && trace !== reason) {
        this._setCarriedStackTrace(trace);
    }

    if (this._length() > 0) {
        this._queueSettlePromises();
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._settlePromises = function () {
    this._unsetSettlePromisesQueued();
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./progress.js")(Promise, PromiseArray);
_dereq_("./method.js")(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_("./bind.js")(Promise, INTERNAL, tryConvertToPromise);
_dereq_("./finally.js")(Promise, NEXT_FILTER, tryConvertToPromise);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./synchronous_inspection.js")(Promise);
_dereq_("./join.js")(Promise, PromiseArray, tryConvertToPromise, INTERNAL);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./cancel.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
_dereq_('./nodeify.js')(Promise);
_dereq_('./call_get.js')(Promise);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./settle.js')(Promise, PromiseArray);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._progressHandler0 = value;                                         
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
        p._settledValue = value;                                             
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    CapturedTrace.setBounds(async.firstLineError, util.lastLineError);       
    return Promise;                                                          

};

},{"./any.js":1,"./async.js":2,"./bind.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./context.js":9,"./debuggability.js":10,"./direct_resolve.js":11,"./each.js":12,"./errors.js":13,"./filter.js":15,"./finally.js":16,"./generators.js":17,"./join.js":18,"./map.js":19,"./method.js":20,"./nodeify.js":21,"./progress.js":22,"./promise_array.js":24,"./promise_resolver.js":25,"./promisify.js":26,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":33,"./synchronous_inspection.js":34,"./thenables.js":35,"./timers.js":36,"./using.js":37,"./util.js":38}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection) {
var util = _dereq_("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        this._values = values;
        if (values._isFulfilled()) {
            values = values._value();
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
                this.__hardReject__(err);
                return;
            }
        } else if (values._isPending()) {
            values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            this._reject(values._reason());
            return;
        }
    } else if (!isArray(values)) {
        this._promise._reject(apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a")._reason());
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var promise = this._promise;
    for (var i = 0; i < len; ++i) {
        var isResolved = this._isResolved();
        var maybePromise = tryConvertToPromise(values[i], promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (isResolved) {
                maybePromise._ignoreRejections();
            } else if (maybePromise._isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                this._promiseFulfilled(maybePromise._value(), i);
            } else {
                this._promiseRejected(maybePromise._reason(), i);
            }
        } else if (!isResolved) {
            this._promiseFulfilled(maybePromise, i);
        }
    }
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false, true);
};

PromiseArray.prototype._promiseProgressed = function (progressValue, index) {
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected = function (reason, index) {
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util.js":38}],25:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise) {
    return function(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    };
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function (promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function (promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function () {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._resolveCallback(value);
};

PromiseResolver.prototype.reject = function (reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._rejectCallback(reason);
};

PromiseResolver.prototype.progress = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._progress(value);
};

PromiseResolver.prototype.cancel = function (err) {
    this.promise.cancel(err);
};

PromiseResolver.prototype.timeout = function () {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function () {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function () {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],26:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";

    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL","'use strict';                            \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise);                      \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
        "
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode))(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            util.tryCatch,
            util.errorObj,
            util.notEnumerableProp,
            INTERNAL
        );
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        obj[promisifiedKey] = promisifier === makeNodePromisified
                ? makeNodePromisified(key, THIS, key, fn, suffix)
                : promisifier(fn, function() {
                    return makeNodePromisified(key, THIS, key, fn, suffix);
                });
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, undefined, callback);
}

Promise.promisify = function (fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    var ret = promisify(fn, arguments.length < 2 ? THIS : receiver);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./errors":13,"./promise_resolver.js":25,"./util.js":38}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var isObject = util.isObject;
var es5 = _dereq_("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {
    this._init$(undefined, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed = function (value, index) {
    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5.js":14,"./util.js":38}],28:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],29:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var isArray = _dereq_("./util.js").isArray;

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 4 | 1);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util.js":38}],30:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._preservedValues = _each === INTERNAL ? [] : null;
    this._zerothIsAccum = (accum === undefined);
    this._gotAccum = false;
    this._reducingIndex = (this._zerothIsAccum ? 1 : 0);
    this._valuesPhase = undefined;
    var maybePromise = tryConvertToPromise(accum, this._promise);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        maybePromise = maybePromise._target();
        if (maybePromise._isPending()) {
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise._isFulfilled()) {
            accum = maybePromise._value();
            this._gotAccum = true;
        } else {
            this._reject(maybePromise._reason());
            rejected = true;
        }
    }
    if (!(isPromise || this._zerothIsAccum)) this._gotAccum = true;
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._accum = accum;
    if (!rejected) async.invoke(init, this, undefined);
}
function init() {
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init = function () {};

ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    if (this._gotAccum || this._zerothIsAccum) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    values[index] = value;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    var gotAccum = this._gotAccum;
    var valuesPhase = this._valuesPhase;
    var valuesPhaseIndex;
    if (!valuesPhase) {
        valuesPhase = this._valuesPhase = new Array(length);
        for (valuesPhaseIndex=0; valuesPhaseIndex<length; ++valuesPhaseIndex) {
            valuesPhase[valuesPhaseIndex] = 0;
        }
    }
    valuesPhaseIndex = valuesPhase[index];

    if (index === 0 && this._zerothIsAccum) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
        valuesPhase[index] = ((valuesPhaseIndex === 0)
            ? 1 : 2);
    } else if (index === -1) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
    } else {
        if (valuesPhaseIndex === 0) {
            valuesPhase[index] = 1;
        } else {
            valuesPhase[index] = 2;
            this._accum = value;
        }
    }
    if (!gotAccum) return;

    var callback = this._callback;
    var receiver = this._promise._boundValue();
    var ret;

    for (var i = this._reducingIndex; i < length; ++i) {
        valuesPhaseIndex = valuesPhase[i];
        if (valuesPhaseIndex === 2) {
            this._reducingIndex = i + 1;
            continue;
        }
        if (valuesPhaseIndex !== 1) return;
        value = values[i];
        this._promise._pushContext();
        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch(callback).call(receiver, value, i, length);
        }
        else {
            ret = tryCatch(callback)
                .call(receiver, this._accum, value, i, length);
        }
        this._promise._popContext();

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                valuesPhase[i] = 4;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }

        this._reducingIndex = i + 1;
        this._accum = ret;
    }

    this._resolve(isEach ? preservedValues : this._accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./async.js":2,"./util.js":38}],31:[function(_dereq_,module,exports){
"use strict";
var schedule;
var util = _dereq_("./util");
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
};
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            window.navigator.standalone)) {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":38}],32:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return new SettledPromiseArray(this).promise();
};
};

},{"./util.js":38}],33:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
var AggregateError = _dereq_("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors.js":13,"./util.js":38}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValue = promise._settledValue;
    }
    else {
        this._bitField = 0;
        this._settledValue = undefined;
    }
}

PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isFulfilled =
Promise.prototype._isFulfilled = function () {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype._isRejected = function () {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype._isPending = function () {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.isResolved =
Promise.prototype._isResolved = function () {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.isPending = function() {
    return this._target()._isPending();
};

Promise.prototype.isRejected = function() {
    return this._target()._isRejected();
};

Promise.prototype.isFulfilled = function() {
    return this._target()._isFulfilled();
};

Promise.prototype.isResolved = function() {
    return this._target()._isResolved();
};

Promise.prototype._value = function() {
    return this._settledValue;
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue;
};

Promise.prototype.value = function() {
    var target = this._target();
    if (!target.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return target._settledValue;
};

Promise.prototype.reason = function() {
    var target = this._target();
    if (!target.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    target._unsetRejectionIsUnhandled();
    return target._settledValue;
};


Promise.PromiseInspection = PromiseInspection;
};

},{}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            return ret;
        }
        var then = util.tryCatch(getThen)(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function getThen(obj) {
    return obj.then;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x,
                                        resolveFromThenable,
                                        rejectFromThenable,
                                        progressFromThenable);
    synchronous = false;
    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolveFromThenable(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function rejectFromThenable(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }

    function progressFromThenable(value) {
        if (!promise) return;
        if (typeof promise._progress === "function") {
            promise._progress(value);
        }
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util.js":38}],36:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message) {
    if (!promise.isPending()) return;
    if (typeof message !== "string") {
        message = "operation timed out";
    }
    var err = new TimeoutError(message);
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (value, ms) {
    if (ms === undefined) {
        ms = value;
        value = undefined;
        var ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, ms);
        return ret;
    }
    ms = +ms;
    return Promise.resolve(value)._then(afterValue, null, null, ms, undefined);
};

Promise.prototype.delay = function (ms) {
    return delay(this, ms);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret = this.then().cancellable();
    ret._cancellationParent = this;
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util.js":38}],37:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext) {
    var TypeError = _dereq_("./errors.js").TypeError;
    var inherits = _dereq_("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection._settledValue;
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var promise = Promise.settle(resources)
            .then(inspectionMapper)
            .then(function(vals) {
                promise._pushContext();
                var ret;
                try {
                    ret = spreadArgs
                        ? fn.apply(undefined, vals) : fn.call(undefined,  vals);
                } finally {
                    promise._popContext();
                }
                return ret;
            })
            ._then(
                disposerSuccess, disposerFail, undefined, resources, undefined);
        resources.promise = promise;
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~262144);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors.js":13,"./util.js":38}],38:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var canEvaluate = typeof navigator == "undefined";
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function f() {}
    f.prototype = obj;
    var l = 8;
    while (l--) new f();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]"
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5.js":14}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
/**
 * Peerio crypto library.
 * Partially based on https://github.com/kaepora/miniLock.
 * ======================
 * Functions accessible via window.Peerio.Crypto object.
 *
 * Depends on libraries:
 * - tweetnacl-js
 * - nacl_stream
 * - blake2s-js
 * - scrypt-async
 * - base58
 * - bluebird
 *
 *
 * All public functions return promises for consistency
 */

// todo: 1. probably replace "throw" with return values
// todo: 2. "contacts" dependency is not nice, is there a better way?
// todo: 3. using blobs forces us to use html5 file api, don't think it's optimal, see if can be changed
// todo: 4. encrypt/decrypt functions reduce nesting and promisify further

var Peerio = this.Peerio || {};
Peerio.Crypto = {};

Peerio.Crypto.init = function () {
  'use strict';

  var api = Peerio.Crypto;
  delete Peerio.Crypto.init;
  //-- PRIVATE ---------------------------------------------------------------------------------------------------------

  var base58Match = new RegExp('^[1-9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$');
  var base64Match = new RegExp('^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$');
  // shortcuts
  var decodeB64 = nacl.util.decodeBase64;
  var encodeB64 = nacl.util.encodeBase64;
  var decodeUTF8 = nacl.util.decodeUTF8;
  var encodeUTF8 = nacl.util.encodeUTF8;

  var keySize = 32;
  var decryptInfoNonceSize = 24;
  var blobNonceSize = 16;
  var numberSize = 4; // integer
  var signatureSize = 8;
  var headerStart = numberSize + signatureSize;
  var fileNameSize = 256;
  var timestampLength = 13; // Date.now().toString().length
  // DO NOT CHANGE, it will change crypto output
  var scryptResourceCost = 14;
  var scryptBlockSize = 8;
  var scryptStepDuration = 1000;
  var signature = '.peerio.'; // has to be 8 bytes, don't change

  // todo: move to global helper
  // malicious server safe hasOwnProperty function
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
  // optional cache of user data,
  // mostly to prevent passing the same data to worker over and over again
  var defaultUser;

  function hasAllProps(obj, props) {
    for (var i = 0; i > props.length; i++)
      if (!hasProp(obj, props[i])) return false;

    return true;
  }

  //-- PUBLIC API ------------------------------------------------------------------------------------------------------

  api.chunkSize = 1024 * 1024;

  /**
   * Sets default user data for crypto operations to prevent repeated passing it to functions (and to workers)
   * @param {string} username
   * @param {object} keyPair
   * @param {string} publicKey
   * @promise resolves with no value in case of success
   */
  api.setDefaultUserData = function (username, keyPair, publicKey) {
    defaultUser = defaultUser || {};
    defaultUser.username = username;
    defaultUser.keyPair = keyPair;
    defaultUser.publicKey = publicKey;
  };

  /**
   * Sets default user contacts for crypto operations to prevent repeated passing it to functions (and to workers)
   * @param {object} contacts - username-indexed dictionary
   * @promise resolves with no value in case of success
   */
  api.setDefaultContacts = function (contacts) {
    defaultUser = defaultUser || {};
    defaultUser.contacts = contacts;
  };

  /**
   * Generates keypair from string key and salt (passphrase and username)
   * @param {string} username - salt
   * @param {string} passphrase - key
   * @promise { publicKey: Uint8Array - Public encryption key, secretKey: Uint8Array - Secret encryption key }
   */
  api.getKeyPair = function (username, passphrase) {
    return new Promise(function (resolve) {
      var keyHash = new BLAKE2s(keySize);
      keyHash.update(decodeUTF8(passphrase));
      username = decodeUTF8(username);

      // Generates 32 bytes of key material in a Uint8Array with scrypt
      scrypt(keyHash.digest(), username, scryptResourceCost, scryptBlockSize, keySize, scryptStepDuration, resolve);

    }).then(function (keyBytes) {
        return nacl.box.keyPair.fromSecretKey(new Uint8Array(keyBytes));
      });
  };

  /**
   * Generates public key in string representation from key bytes
   * @param {Uint8Array} publicKeyBytes
   * @promise {string} Base58 encoded key
   */
  api.getPublicKeyString = function (publicKeyBytes) {
    var key = new Uint8Array(keySize + 1);
    for (var i = 0; i < publicKeyBytes.length; i++)
      key[i] = publicKeyBytes[i];

    var hash = new BLAKE2s(1);
    hash.update(publicKeyBytes);
    key[keySize] = hash.digest()[0];

    return Promise.resolve(Base58.encode(key));
  };

  /**
   * Extracts byte array from public key string representation
   * @param {string} publicKey
   * @promise {Uint8Array} publicKeyBytes
   */
  api.getPublicKeyBytes = function (publicKey) {
    return Promise.resolve(
      getPublicKeyBytesSync(publicKey)
    );
  };

  function getPublicKeyBytesSync(publicKey) {
    return Base58.decode(publicKey).subarray(0, keySize);
  }

  /**
   * Encrypts a plaintext using `nacl.secretbox` and returns the ciphertext and a random nonce.
   * @param {string} plaintext
   * @param {Uint8Array} key
   * @promise {object} ciphertext - Contains ciphertext and nonce in Uint8Array format.
   */
  api.secretBoxEncrypt = function (plaintext, key) {
    var nonce = nacl.randomBytes(decryptInfoNonceSize);
    var ciphertext = nacl.secretbox(decodeUTF8(plaintext), nonce, key);
    return Promise.resolve({
      ciphertext: ciphertext,
      nonce: nonce
    });
  };

  /**
   * Decrypts a ciphertext using `nacl.secretbox` and returns the plaintext.
   * @param {Uint8Array} ciphertext
   * @param {Uint8Array} nonce
   * @param {Uint8Array} key
   * @promise {string} plaintext
   */
  api.secretBoxDecrypt = function (ciphertext, nonce, key) {
    if(typeof ciphertext === 'string')
     ciphertext = decodeUTF8(ciphertext);

    return Promise.resolve(
      encodeUTF8(nacl.secretbox.open(ciphertext, nonce, key))
    );
  };

  /**
   * Derive actual encryption key from a PIN using scrypt and BLAKE2s.
   * Key is used to encrypt long-term passphrase locally.
   * @param {string} PIN
   * @param {string} username
   * @promise {Uint8Array}
   */
  api.getKeyFromPIN = function (PIN, username) {
    return new Promise(function (resolve) {
      var hash = new BLAKE2s(keySize);
      hash.update(decodeUTF8(PIN));
      scrypt(hash.hexDigest(), decodeUTF8(username), scryptResourceCost, scryptBlockSize,
        keySize, scryptStepDuration, resolve);
    }).then(function (keyBytes) {
        return new Uint8Array(keyBytes);
      });
  };

  /**
   * Decrypts an account creation token.
   * Does not use cached user data.
   * @param {{ username: string,
   *           ephemeralServerPublicKey: string,
   *           accountCreationToken: {token: string, nonce: string}
   *         }} data - account creation challenge JSON as received from server.
   * @param {string} username - username
   * @param {object} keyPair - keys
   * @promise {string} decryptedToken
   */
  api.decryptAccountCreationToken = function (data, username, keyPair) {
    if (!hasAllProps(data, ['username', 'accountCreationToken', 'ephemeralServerPublicKey'])
      || !hasAllProps(data.accountCreationToken, ['token', 'nonce'])) {
      console.log('Invalid account creation token.');
      return false;
    }

    if (data.username !== username) {
      console.log('Username did not match the one in account creation token.');
      return false;
    }

    return api.getPublicKeyBytes(data.ephemeralServerPublicKey)
      .then(function (serverKey) {
        var token = nacl.box.open(
          decodeB64(data.accountCreationToken.token),
          decodeB64(data.accountCreationToken.nonce),
          serverKey,
          keyPair.secretKey
        );

        //todo: explain magic numbers
        if (token && token.length === 0x20 && token[0] === 0x41 && token[1] === 0x43)
          return Promise.resolve(encodeB64(token));

        console.log('Decryption of account creation token failed.');
        return Promise.reject();
      });
  };

  /**
   * Decrypts authToken.
   * Uses cached user data.
   * @param {{ephemeralServerPublicKey:string, token:string, nonce:string}} data - authToken data as received from server.
   * @param {object} [keyPair]
   * @promise {object} decrypted token
   */
  api.decryptAuthToken = function (data, keyPair) {
    keyPair = keyPair || getCachedKeyPair();
    if (hasProp(data, 'error')) {
      console.error(data.error);
      return Promise.reject(data.error);
    }

    return api.getPublicKeyBytes(data.ephemeralServerPublicKey)
      .then(function (serverKey) {
        var dToken = nacl.box.open(
          decodeB64(data.token),
          decodeB64(data.nonce),
          serverKey,
          keyPair.secretKey
        );
        //todo: explain magic numbers
        if (dToken && dToken.length === 0x20 && dToken[0] === 0x41 && dToken[1] === 0x54)
          return Promise.resolve(encodeB64(dToken));

        return Promise.reject();
      });
  };

  /**
   * Gets a user's avatar using their username and publicKey.
   * The avatar consists of two 256-bit BLAKE2 hashes spread across 4 identicons:
   * Identicon 1: First 128 bits of BLAKE2(username||publicKey).
   * Identicon 2:  Last 128 bits of BLAKE2(username||publicKey).
   * Identicon 3: First 128 bits of BLAKE2(publicKey||username).
   * Identicon 4:  Last 128 bits of BLAKE2(publicKey||username).
   * @param {string} username
   * @param {string} publicKey
   * @promise {Array|Boolean} [hash1 (Hex string), hash2 (Hex string)]
   */
  api.getAvatar = function (username, publicKey) {
    username = username || getCachedUsername();
    publicKey = publicKey || getCachedPublicKey();

    if (!username || !publicKey) {
      return Promise.reject();
    }

    var hash1 = new BLAKE2s(keySize);
    hash1.update(decodeUTF8(username));
    hash1.update(Base58.decode(publicKey));

    var hash2 = new BLAKE2s(keySize);
    hash2.update(Base58.decode(publicKey));
    hash2.update(decodeUTF8(username));

    return Promise.resolve([hash1.hexDigest(), hash2.hexDigest()]);
  };

  /**
   * Encrypt a message to recipients, return header JSON and body.
   * @param {object} message - message object.
   * @param {string[]} recipients - Array of usernames of recipients.
   * @param {User} [sender]
   * @promise {object}  With header, body parameters, and array of failed recipients.
   */
  api.encryptMessage = function (message, recipients, sender) {
    sender = sender || defaultUser;
    // recipients should send this back
    message.receipt = encodeB64(nacl.randomBytes(32));
    return new Promise(function (resolve, reject) {

      var validatedRecipients = validateRecipients(recipients, sender);

      encryptBlob(
        new Blob([decodeUTF8(JSON.stringify(message))]),
        validatedRecipients.publicKeys,
        sender,
        function (encryptedChunks, header) {
          if (!encryptedChunks) {
            reject();
            return;
          }
          var encryptedBlob = new Blob(encryptedChunks);
          encryptedChunks = null;
          var reader = new FileReader();
          reader.onload = function (readerEvent) {
            var encryptedBuffer = new Uint8Array(readerEvent.target.result);
            var headerLength = byteArrayToNumber(encryptedBuffer.subarray(signatureSize, headerStart));
            header = JSON.parse(header);
            var body = encodeB64(
              encryptedBuffer.subarray(headerStart + headerLength)
            );
            resolve({header: header, body: body, failed: validatedRecipients.failed});
          };
          reader.readAsArrayBuffer(encryptedBlob);
        }
      );
    });
  };

  /**
   * Encrypt a file to recipients, return UTF8 Blob and header (separate).
   * @param {object} file - File object to encrypt.
   * @param {string[]} recipients - Array of usernames of recipients.
   * @param {User} [sender]
   * @promise {object} fileName(base64 encoded), header, body and failedRecipients parameters.
   */
  api.encryptFile = function (file, name, recipients, sender) {
    sender = sender || defaultUser;
    return new Promise(function (resolve, reject) {
      var validatedRecipients = validateRecipients(recipients, sender);

      file.name = name;
      encryptBlob(
        file,
        validatedRecipients.publicKeys,
        sender,
        function (encryptedChunks, header, fileName) {
          if (!encryptedChunks) {
            reject();
            return;
          }
          encryptedChunks.splice(0, numberSize);
          resolve({
            fileName: encodeB64(fileName.subarray(4)),
            header: JSON.parse(header),
            chunks: encryptedChunks,
            failed: validatedRecipients.failed
          });
        }
      );
    });
  };

  /**
   * Decrypt a message.
   * @param {object} encMessage - As received from server.
   * @param {User} [user] - decrypting user
   * @promise {object} plaintext object.
   */
  api.decryptMessage = function (encMessage, user) {
    user = defaultUser || user;
    var decrypted;
    return new Promise(function (resolve, reject) {

      var header = JSON.stringify(encMessage.header);

      var messageBlob = new Blob([
        signature,
        numberToByteArray(header.length),
        header,
        decodeB64(encMessage.body)
      ]);

      decryptBlob(messageBlob, user,
        function (decryptedBlob, senderID) {
          if (!decryptedBlob) {
            reject();
            return;
          }
          // validating sender public key
          if (hasProp(user.contacts, encMessage.sender)
            && user.contacts[encMessage.sender].publicKey !== senderID) {
            reject();
            return;
          }

          var decryptedBuffer;
          var reader = new FileReader();
          reader.onload = function (readerEvent) {
            decryptedBuffer = encodeUTF8(
              new Uint8Array(readerEvent.target.result)
            );

            var message = JSON.parse(decryptedBuffer);

            resolve(message);
          };

          reader.readAsArrayBuffer(decryptedBlob);
        }
      );
    })
      .then(function (message) {
        decrypted = message;
        decrypted.receipts = [];

        return Promise.each(encMessage.recipients, function (recipient) {
          if (recipient.username === user.username || !recipient.receipt || !recipient.receipt.encryptedReturnReceipt) return;

          return api.decryptReceipt(recipient.username, recipient.receipt.encryptedReturnReceipt)
            .then(function (decReceipt) {
              if (decrypted.receipt === decReceipt.substring(0, decReceipt.length - timestampLength)) {
                //todo parse and store receipt timestamp
                decrypted.receipts.push(recipient.username);
              }
            })
            .catch(function (err) {
              console.log(err);
            });
        });

      })
      .then(function () {
        return decrypted;
      });
  };

  /**
   * Decrypt a file.
   * @param {string} id - File ID in base64
   * @param {object} blob - File ciphertext as blob
   * @param {object} header
   * @param {object} file
   * @param {User} [user] - decrypting user
   * @promise {object} plaintext blob
   */
  api.decryptFile = function (id, blob, header, file, user) {
    user = user || defaultUser;
    return new Promise(function (resolve, reject) {

      var headerString = JSON.stringify(header);
      var headerStringLength = decodeUTF8(headerString).length;
      var peerioBlob = new Blob([
        signature,
        numberToByteArray(headerStringLength),
        headerString,
        numberToByteArray(fileNameSize),
        decodeB64(id),
        blob
      ]);

      decryptBlob(peerioBlob, user,
        function (decryptedBlob, senderID) {
          if (!decryptedBlob) {
            reject();
            return;
          }

          var claimedSender = hasProp(file, 'sender') ? file.sender : file.creator;
          // this looks strange that we call success callback when sender is not in contacts
          // but it can be the case and we skip public key verification,
          // because we don't have sender's public key
          if (hasProp(user.contacts, claimedSender) && user.contacts[claimedSender].publicKey !== senderID)
            reject();
          else
            resolve(decryptedBlob);
        }
      );
    });
  };

  /**
   * Decrypt a filename from a file's ID given by the Peerio server.
   * @param {string} id - File ID (Base64)
   * @param {object} header - encryption header for file
   * @param {User} [user]
   * @promise {string} file name
   */
  api.decryptFileName = function (id, header, user) {
    user = user || defaultUser;
    var fileInfo = decryptHeader(header, user).fileInfo;

    fileInfo.fileNonce = decodeB64(fileInfo.fileNonce);
    fileInfo.fileKey = decodeB64(fileInfo.fileKey);

    var nonce = new Uint8Array(decryptInfoNonceSize);
    nonce.set(fileInfo.fileNonce);

    var decrypted = nacl.secretbox.open(decodeB64(id), nonce, fileInfo.fileKey);
    decrypted = encodeUTF8(decrypted);

    while (decrypted[decrypted.length - 1] === '\0')
      decrypted = decrypted.slice(0, -1);

    return Promise.resolve(decrypted);
  };

  /**
   * Encrypts read receipt to send it as acknowledgement
   * @param {string} receipt - utf8 receipt string
   * @param {string} recipientUsername
   * @param [user]
   * @promise {string} encrypted and base64 encoded receipt and nonce in 'receipt:nonce' format
   */
  api.encryptReceipt = function (receipt, recipientUsername, user) {
    user = user || defaultUser;

    var recipient = getContact(recipientUsername, user);
    if (!recipient) return Promise.reject();

    var nonce = nacl.randomBytes(decryptInfoNonceSize);
    var encReceipt = nacl.box(
      decodeUTF8(receipt),
      nonce,
      recipient.publicKeyBytes,
      user.keyPair.secretKey
    );

    encReceipt = encodeB64(encReceipt) + ':' + encodeB64(nonce);
    return Promise.resolve(encReceipt);
  };

  /**
   * Decrypts received read receipt
   * @param {string} username - receipt sender
   * @param {string} receipt
   * @param [user]
   * @promise
   */
  api.decryptReceipt = function (username, receipt, user) {
    user = user || defaultUser;
    var receiptParts;

    if (typeof(receipt) !== 'string' || (receiptParts = receipt.split(':')).length !== 2)
      return Promise.reject('Invalid receipt value.');

    var sender = getContact(username, user);
    if (!sender) return Promise.reject();

    var decrypted = nacl.box.open(
      decodeB64(receiptParts[0]),
      decodeB64(receiptParts[1]),
      sender.publicKeyBytes,
      user.keyPair.secretKey
    );

    if (!decrypted) return Promise.reject('Failed to decrypt receipt.');

    decrypted = encodeUTF8(decrypted);//.substring(0, decrypted.length - timestampLength);
    return Promise.resolve(decrypted);
  };

  api.recreateHeader = function (publicKeys, header) {
    return new Promise(function (resolve) {
      var decryptInfo = decryptHeader(header, defaultUser);

      var newHeader = createHeader(publicKeys, defaultUser,
        decryptInfo.fileInfo.fileKey,
        decryptInfo.fileInfo.fileNonce,
        decryptInfo.fileInfo.fileHash);

      resolve(newHeader);
    });
  };
  //-- INTERNALS -------------------------------------------------------------------------------------------------------

  function getContact(username, user) {
    user = user || defaultUser;

    var contact = user.contacts[username];
    if (!contact || !contact.publicKey)
      return false;

    if (!contact.publicKeyBytes)
      contact.publicKeyBytes = getPublicKeyBytesSync(contact.publicKey);

    return contact;
  }

  /**
   * Validates and builds a list of recipient public keys
   * @param {string[]} recipients - recipient usernames
   * @param {User} sender - username
   * @returns { { publicKeys:string[], failed:string[] } } - list of qualified public keys and usernames list
   *                                                         that failed to qualify as recipients
   */
  function validateRecipients(recipients, sender) {
    var publicKeys = [sender.publicKey];
    var failed = [];

    recipients.forEach(function (recipient) {

      var contact = sender.contacts[recipient];
      if (hasProp(contact, 'publicKey') && publicKeys.indexOf(contact.publicKey) < 0)
        publicKeys.push(contact.publicKey);
      else if (recipient != sender.username)
        failed.push(recipient);
    });

    return {publicKeys: publicKeys, failed: failed};
  }

  /**
   * Validates public key string
   * @param {string} publicKey
   * @returns {boolean} - true for valid public key string
   */
  function validatePublicKey(publicKey) {
    if (publicKey.length > 55 || publicKey.length < 40)
      return false;

    if (!base58Match.test(publicKey))
      return false;

    var bytes = Base58.decode(publicKey);
    if (bytes.length !== (keySize + 1))
      return false;

    var hash = new BLAKE2s(1);
    hash.update(bytes.subarray(0, keySize));
    if (hash.digest()[0] !== bytes[keySize])
      return false;

    return true;
  }

  /**
   * Validates nonce
   * @param {string} nonce - Base64 encoded nonce
   * @param {Number} expectedLength - expected nonce bytes length
   * @returns {boolean}
   */
  function validateNonce(nonce, expectedLength) {
    if (nonce.length > 40 || nonce.length < 10)
      return false;

    if (base64Match.test(nonce))
      return decodeB64(nonce).length === expectedLength;

    return false;
  }

  /**
   * Validates symmetric key.
   * @param {string} key - Base64 encoded key
   * @returns {boolean} - true for valid key
   */
  function validateKey(key) {
    if (key.length > 50 || key.length < 40)
      return false;

    if (base64Match.test(key))
      return decodeB64(key).length === keySize;

    return false;
  }

  /**
   * Converts 4-byte little-endian byte array to number
   * @param {Uint8Array} byteArray
   * @returns {Number}
   */
  function byteArrayToNumber(byteArray) {
    var n = 0;
    for (var i = 3; i >= 0; i--) {
      n += byteArray[i];
      if (i > 0) {
        n = n << 8;
      }
    }
    return n;
  }

  /**
   * Converts number to 4-byte little-endian byte array
   * @param {Number} n
   * @returns {Uint8Array}
   */
  function numberToByteArray(n) {
    var byteArray = new Uint8Array(4);
    for (var i = 0; i < byteArray.length; i++) {
      byteArray[i] = n & 255;
      n = n >> 8;
    }
    return byteArray;
  }

  /**
   * Creates encrypted data header
   *  @param {string[]} publicKeys - recepients
   *  @param {User} sender
   *  @param {Uint8Array} fileKey
   *  @param {Uint8Array} fileNonce
   *  @param {Uint8Array} fileHash
   *  @returns {object} header
   */
  function createHeader(publicKeys, sender, fileKey, fileNonce, fileHash) {
    var ephemeral = nacl.box.keyPair();

    var header = {
      version: 1,
      ephemeral: encodeB64(ephemeral.publicKey),
      decryptInfo: {}
    };

    var decryptInfoNonces = [];

    for (var i = 0; i < publicKeys.length; i++) {
      decryptInfoNonces.push(nacl.randomBytes(decryptInfoNonceSize));

      var decryptInfo = {
        senderID: sender.publicKey,
        recipientID: publicKeys[i],
        fileInfo: {
          fileKey: typeof(fileKey) === 'string'? fileKey : encodeB64(fileKey),
          fileNonce: typeof(fileNonce) === 'string'? fileNonce : encodeB64(fileNonce),
          fileHash: typeof(fileHash) === 'string'? fileHash : encodeB64(fileHash)
        }
      };

      decryptInfo.fileInfo = encodeB64(nacl.box(
        decodeUTF8(JSON.stringify(decryptInfo.fileInfo)),
        decryptInfoNonces[i],
        Base58.decode(publicKeys[i]).subarray(0, keySize),
        sender.keyPair.secretKey
      ));

      decryptInfo = encodeB64(nacl.box(
        decodeUTF8(JSON.stringify(decryptInfo)),
        decryptInfoNonces[i],
        Base58.decode(publicKeys[i]).subarray(0, keySize),
        ephemeral.secretKey
      ));

      header.decryptInfo[encodeB64(decryptInfoNonces[i])] = decryptInfo;
    }

    return header;
  }

  /**
   * Decrypts encrypted data header
   * @param {object} header - encrypted header
   * @param {User} user - decrypting user
   * @returns {object} header - decrypted decryptInfo object containing decrypted fileInfo object.
   */
  function decryptHeader(header, user) {
    if (!hasProp(header, 'version') || header.version !== 1)
      return false;

    if (!hasProp(header, 'ephemeral') || !validateKey(header.ephemeral))
      return false;

    // Attempt decryptInfo decryptions until one succeeds
    var actualDecryptInfo = null;
    var actualDecryptInfoNonce = null;
    var actualFileInfo = null;

    for (var i in header.decryptInfo) {
      if (hasProp(header.decryptInfo, i) && validateNonce(i, decryptInfoNonceSize)) {
        actualDecryptInfo = nacl.box.open(
          decodeB64(header.decryptInfo[i]),
          decodeB64(i),
          decodeB64(header.ephemeral),
          user.keyPair.secretKey
        );

        if (actualDecryptInfo) {
          actualDecryptInfo = JSON.parse(encodeUTF8(actualDecryptInfo));
          actualDecryptInfoNonce = decodeB64(i);
          break;
        }
      }
    }

    if (!actualDecryptInfo || !hasProp(actualDecryptInfo, 'recipientID')
      || actualDecryptInfo.recipientID !== user.publicKey)
      return false;

    if (!hasAllProps(actualDecryptInfo, 'fileInfo', 'senderID') || !validatePublicKey(actualDecryptInfo.senderID))
      return false;

    try {
      actualFileInfo = nacl.box.open(
        decodeB64(actualDecryptInfo.fileInfo),
        actualDecryptInfoNonce,
        Base58.decode(actualDecryptInfo.senderID).subarray(0, keySize),
        user.keyPair.secretKey
      );
      actualFileInfo = JSON.parse(encodeUTF8(actualFileInfo));
    }
    catch (err) {
      return false;
    }
    actualDecryptInfo.fileInfo = actualFileInfo;
    return actualDecryptInfo;

  }

  /**
   * Convenience method to read from blobs
   */
  function readBlob(blob, start, end, callback, errorCallback) {
    var reader = new FileReader();

    reader.onload = function (readerEvent) {
      callback({
        name: blob.name,
        size: blob.size,
        data: new Uint8Array(readerEvent.target.result)
      });
    };

    reader.onerror = function () {
      if (typeof(errorCallback) === 'function')
        errorCallback();

    };

    reader.readAsArrayBuffer(blob.slice(start, end));
  }

  /**
   * Encrypts blob
   * @param {{name: string, size: Number, data: ArrayBuffer}} blob
   * @param {string[]} publicKeys
   * @param {User} user
   * @param {Function} fileNameCallback - A callback with the encrypted fileName.
   * @param {Function} callback - Callback function to which encrypted result is passed.
   */
  function encryptBlob(blob, publicKeys, user, callback) {
    var blobKey = nacl.randomBytes(keySize);
    var blobNonce = nacl.randomBytes(blobNonceSize);
    var streamEncryptor = nacl.stream.createEncryptor(
      blobKey,
      blobNonce,
      api.chunkSize
    );

    var paddedFileName = new Uint8Array(256);
    var fileNameBytes = decodeUTF8(blob.name);
    if (fileNameBytes.length > paddedFileName.length) {
      //blob name is too long
      callback(false);
      return false;
    }
    paddedFileName.set(fileNameBytes);

    var hashObject = new BLAKE2s(keySize);
    var encryptedChunk = streamEncryptor.encryptChunk(paddedFileName, false);

    if (!encryptedChunk) {
      //general encryption error'
      callback(false);
      return false;
    }

    var fileName = encryptedChunk;

    var encryptedChunks = [encryptedChunk];
    hashObject.update(encryptedChunk);

    encryptNextChunk({
      fileName: fileName,
      blob: blob, streamEncryptor: streamEncryptor, hashObject: hashObject,
      encryptedChunks: encryptedChunks, dataPosition: 0, fileKey: blobKey, fileNonce: blobNonce,
      publicKeys: publicKeys, user: user, callbackOnComplete: callback
    });
  }

  /**
   * Decrypts blob
   * @param {{name: string, size: Number, data: ArrayBuffer}}blob
   * @param {User} user - decrypting user
   * @param {Function} callback - function to which decrypted result is passed.
   */
  function decryptBlob(blob, user, callback) {
    readBlob(blob, 8, 12, function (headerLength) {
      headerLength = byteArrayToNumber(headerLength.data);

      readBlob(blob, 12, headerLength + 12, function (header) {
        try {
          header = encodeUTF8(header.data);
          header = JSON.parse(header);
        }
        catch (error) {
          callback(false);
          return false;
        }
        var actualDecryptInfo = decryptHeader(header, user);
        if (!actualDecryptInfo) {
          callback(false, blob.name, false);
          return false;
        }

        // Begin actual ciphertext decryption
        var dataPosition = headerStart + headerLength;
        var streamDecryptor = nacl.stream.createDecryptor(
          decodeB64(actualDecryptInfo.fileInfo.fileKey),
          decodeB64(actualDecryptInfo.fileInfo.fileNonce),
          api.chunkSize
        );
        var hashObject = new BLAKE2s(keySize);
        decryptNextChunk({
          firstChunk: true,
          blob: blob,
          fileName: '',
          streamDecryptor: streamDecryptor,
          hashObject: hashObject,
          decryptedChunks: [],
          dataPosition: dataPosition,
          fileInfo: actualDecryptInfo.fileInfo,
          senderPublicKey: actualDecryptInfo.senderID,
          headerLength: headerLength,
          callbackOnComplete: callback
        });
      });
    });
  }

  /**
   * Encrypts next chunk of data
   * @param {object} e - encrypt data object
   * @param {{name: string, size: Number, data: ArrayBuffer}} e.blob
   * @param {object} e.streamEncryptor - nacl stream encryptor instance
   * @param {object} e.hashObject - blake2 hash object instance
   * @param {Uint8Array[]} e.encryptedChunks
   * @param {Number} e.dataPosition
   * @param {Uint8Array} e.fileKey
   * @param {Uint8Array} e.fileNonce
   * @param {string[]} e.publicKeys
   * @param {User} e.user
   * @param {Function} e.callbackOnComplete {file, header, fileName, senderID}
   */
  function encryptNextChunk(e) {
    readBlob(
      e.blob,
      e.dataPosition,
      e.dataPosition + api.chunkSize,
      function (chunk) {
        chunk = chunk.data;
        var isLast = e.dataPosition >= (e.blob.size - api.chunkSize);

        var encryptedChunk = e.streamEncryptor.encryptChunk(chunk, isLast);
        if (!encryptedChunk) {
          e.callbackOnComplete(false);
          return false;
        }

        e.hashObject.update(encryptedChunk);
        e.encryptedChunks.push(encryptedChunk);

        if (isLast) {
          e.streamEncryptor.clean();
          var header = createHeader(e.publicKeys, e.user, e.fileKey, e.fileNonce, e.hashObject.digest());
          header = JSON.stringify(header);
          e.encryptedChunks.unshift(signature, numberToByteArray(header.length), header);

          return e.callbackOnComplete(e.encryptedChunks, header, e.fileName, e.user.publicKey);
        }

        e.dataPosition += api.chunkSize;

        return encryptNextChunk(e);
      }
    );
  }

  /**
   * Decrypts next chunk of data
   * @param {object} d - decrypt data object
   * @param {boolean} d.firstChunk - does position point to the first chunk or not
   * @param {{name: string, size: Number, data: ArrayBuffer}} d.blob
   * @param {string} d.fileName
   * @param {object} d.streamDecryptor - nacl stream decryptor instance
   * @param {object} d.hashObject - blake2 hash object instance
   * @param {Uint8Array[]} d.decryptedChunks
   * @param {Number} d.dataPosition
   * @param {object} d.fileInfo
   * @param {string} d.senderPublicKey
   * @param {Number} d.headerLength
   * @param {Function} d.callbackOnComplete {file, senderID}
   */
  function decryptNextChunk(d) {
    readBlob(
      d.blob,
      d.dataPosition,
      d.dataPosition + numberSize + blobNonceSize + api.chunkSize,
      function (chunk) {
        chunk = chunk.data;
        var chunkLength = byteArrayToNumber(chunk.subarray(0, numberSize));

        if (chunkLength > chunk.length) {
          d.callbackOnComplete(false);
          throw new Error('Invalid chunk length read while decrypting.');
        }

        chunk = chunk.subarray(0, chunkLength + numberSize + blobNonceSize);

        var decryptedChunk;
        var isLast = d.dataPosition >= ((d.blob.size) - (numberSize + blobNonceSize + chunkLength));

        if (d.firstChunk) {
          d.firstChunk = false;

          decryptedChunk = d.streamDecryptor.decryptChunk(chunk, isLast);
          if (!decryptedChunk) {
            d.callbackOnComplete(false);
            return false;
          }

          var fileName = encodeUTF8(decryptedChunk.subarray(0, fileNameSize));
          var trimStart = fileName.indexOf('\0');
          d.fileName = trimStart >= 0 ? fileName.slice(trimStart) : fileName;

          d.hashObject.update(chunk.subarray(0, fileNameSize + numberSize + blobNonceSize));
        } else { // if not first chunk
          decryptedChunk = d.streamDecryptor.decryptChunk(chunk, isLast);

          if (!decryptedChunk) {
            d.callbackOnComplete(false);
            throw new Error('Failed to decrypt chunk');
          }

          d.decryptedChunks.push(decryptedChunk);
          d.hashObject.update(chunk);
        }

        d.dataPosition += chunk.length;
        if (!isLast) return decryptNextChunk(d);

        if (!nacl.verify(new Uint8Array(d.hashObject.digest()), decodeB64(d.fileInfo.fileHash))) {
          d.callbackOnComplete(false);
          throw new Error('Failed to verify decrypted data hash');
        }

        d.streamDecryptor.clean();
        d.callbackOnComplete(new Blob(d.decryptedChunks), d.senderPublicKey);

      }
    );
  }

  function getCachedUsername() {
    return (defaultUser && defaultUser.username) || null;
  }

  function getCachedKeyPair() {
    return (defaultUser && defaultUser.keyPair) || null;
  }

  function getCachedPublicKey() {
    return (defaultUser && defaultUser.publicKey) || null;
  }

};
/**
 * Worker script that imports crypto library and provides interface to it to UI thread
 */


(function () {
  'use strict';

  Peerio.Crypto.init();

  // service functions are there for performance reasons and they don't provide response
  var serviceFunctions = ['setDefaultUserData', 'setDefaultContacts'];

  // if getRandomValues polyfill will be needed, here we will stock our random bytes received from UI thread
  var randomBytesStock = [];

  // expects message in following format:
  // {
  //   id:      unique message id. Will be sent back as is
  //   fnName:  crypto function name
  //   args:    arguments to pass to crypto function
  // }
  //
  // response is sent in following format:
  // {
  //   id:       the one from original request
  //   response: whatever crypto function returns
  //   error:    in case of error only
  // }
  self.onmessage = function (payload) {
    var message = payload.data;

    if (message.randomBytes) {
      console.log(message.randomBytes.length, 'random bytes received');
      var newArray = Array.prototype.slice.call(new Uint8Array(message.randomBytes));
      Array.prototype.push.apply(randomBytesStock, newArray);
      console.log(randomBytesStock.length,'randombytes now in stock');
      return;
    }

    if (serviceFunctions.indexOf(message.fnName) >= 0) {
      Peerio.Crypto[message.fnName].apply(Peerio.Crypto, message.args);
      return;
    }

    var response = {id: message.id};

    try {

      Peerio.Crypto[message.fnName].apply(Peerio.Crypto, message.args)
        .then(function (result) {
          response.result = result;
        })
        .catch(function (err) {
          response.error = (err && err.toString()) || 'Unknown error';
        })
        .finally(function () {
          self.postMessage(response);
        });

    } catch (e) {
      // warning, don't try to postMessage(e), error object can't be cloned automatically
      response.error = (e && e.toString()) || 'Unknown error';
      self.postMessage(response);
    }
  };

  var randomBytesNeeded = !self.crypto;
  if (randomBytesNeeded) {
    var nativePostFn = self.postMessage;
    // overriding postMessage to attach stock report
    self.postMessage = function (message) {
      message.randomBytesStock = randomBytesStock.length;
      nativePostFn(message);
    };

    // getRandomValues partial polyfill
    self.cryptoShim.getRandomValues = function (arr) {
      console.log(arr.length, 'random bytes requested', randomBytesStock.length, 'is in stock');
      if (arr.length > randomBytesStock.length) throw 'Not enough random bytes in polyfill stock.';

      for (var i = 0; i < arr.length; i++)
        arr[i] = randomBytesStock[i];

      randomBytesStock.splice(0, arr.length);
      return arr;
    };
  }

  // informing UI thread on getRandomValues situation
  self.postMessage({provideRandomBytes: randomBytesNeeded});

})();