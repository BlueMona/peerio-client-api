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
      } else if (window.cryptoShim) {
        crypto = window.cryptoShim;
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
/**
 * Peerio passphrase generator
 *
 */


var Peerio = this.Peerio || {};
Peerio.PhraseGenerator = {};

Peerio.PhraseGenerator.init = function () {
  'use strict';

  var api = Peerio.PhraseGenerator = {};

  // dictionary for the language required will be loaded here
  var loadedDictionary = null;

  // building dictionary files list
  var base = Peerio.Config.apiFolder + 'dict/';

  /**
   * Generates passphrase
   * @param {string} lang - 2-letter language code
   * @param {Number} wordsCount - number of words in passphrase
   * @promise {string}
   */
  api.getPassPhrase = function (lang, wordsCount) {
    return buildDict(lang).then(function () {
      return generate(wordsCount);
    });
  };
  /**
   * Frees some RAM by cleaning cached dictionary.
   * Call this when PhraseGenerator is no longer needed.
   * PhraseGenerator is still usable after this call.
   */
  api.cleanup = function () {
    loadedDictionary = null;
  };

  function generate(wordsCount) {
    if (!loadedDictionary) return null;

    var phrase = '';
    for (var i = 0; i < wordsCount; i++)
      phrase += getRandomWord() + ' ';

    return phrase.trim().toLowerCase();
  }

  // asynchronously builds dictionary cache for specified language
  function buildDict(lang) {
    if (loadedDictionary && loadedDictionary.lang === lang)
      return Promise.resolve();

    loadedDictionary = null;
    return loadDict(lang)
      .then(function (raw) {
        // normalizing words
        var words = raw.split('\n');
        for (var i = 0; i < words.length; i++) {
          // removing leading/trailing spaces and ensuring lower case
          words[i] = words[i].trim();
          // removing empty strings
          if (words[i] === '') {
            words.splice(i, 1);
            i--;
          }
        }
        loadedDictionary = {lang: lang, dict: words};
      });
  }

  // loads dict by lang and return plaintext in promise
  function loadDict(lang) {
    var url = base + lang + '.txt';
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      if (xhr.overrideMimeType)
        xhr.overrideMimeType('text/plain');

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0)
            resolve(xhr.responseText);
          else
            reject();
        }
      };

      xhr.open('GET', url);
      xhr.send('');
    });
  }

  function getRandomWord() {
    return loadedDictionary.dict[secureRandom(loadedDictionary.dict.length)];
  }

  function secureRandom(count) {
    var rand = new Uint32Array(1);
    var skip = 0x7fffffff - 0x7fffffff % count;
    var result;

    if (((count - 1) & count) === 0) {
      window.crypto.getRandomValues(rand);
      return rand[0] & (count - 1);
    }
    do {
      window.crypto.getRandomValues(rand);
      result = rand[0] & 0x7fffffff;
    } while (result >= skip);
    return result % count;
  }

};

/**
 *  Crypto Hub
 *  ===========================================
 *  Provides access to N crypto worker instances, allowing to parallelise crypto operations.
 *  Crypto Hub functions use the same namespace and signatures
 *  as original Peerio.Crypto library does.
 *  This allows us to replace worker with regular UI-thread Peerio.Crypto library in no time.
 *
 */

// todo: throttle/queue high request rate might lead to:
// 1. randomBytesStock depletion (if shim is active)
// 2. overall performance degradation

var Peerio = this.Peerio || {};
Peerio.Crypto = {};

Peerio.Crypto.init = function () {
  'use strict';

  var self = this;

  Peerio.Crypto = {};
  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
  var workerScriptPath = Peerio.Config.apiFolder + 'crypto_worker_bundle.js';
  // web worker instance
  var workers = []; // todo: maybe add a limit
  // pending promises callbacks
  // id: {resolve: resolve callback, reject: reject callback}
  var callbacks = {};
  var workerCount = Peerio.Crypto.wokerInstanceCount = Math.min(Peerio.Config.cpuCount, 4);

  // when started, workers will report if they need random values provided to them
  var provideRandomBytes = false;
  // when worker reports that he has less then this number of random bytes left - we post more data to it
  var randomBytesThreshold = 3000;

  // worker message handler
  function messageHandler(index, message) {
    var data = message.data;
    if(Peerio.Util.processWorkerConsoleLog(data)) return;

    provideRandomBytes && ensureRandomBytesStock(index, data.randomBytesStock);

    var promise = callbacks[data.id];
    if(!promise) return;

    if (hasProp(data, 'error'))
      promise.reject(data.error);
    else
      promise.resolve(data.result);

    delete callbacks[data.id];
  }

  // starts a single worker instance and adds in to workers array at specified index
  function startWorker(index) {
    var worker = workers[index] = new Worker(workerScriptPath);
    // first message will be a feature report from worker
    worker.onmessage = function (message) {
      if(Peerio.Util.processWorkerConsoleLog(message.data)) return;
      // all next messages are for different handler
      worker.onmessage = messageHandler.bind(self, index);

      if (provideRandomBytes = message.data.provideRandomBytes){
        ensureRandomBytesStock(index, 0);
      }
    };
    worker.onerror = function(error){
      console.log('crypto worker error:', error);
    };

  }

  // this function is supposed to be called from worker.onmessage when worker reports it's random bytes stock
  // to make sure it has enough
  function ensureRandomBytesStock(index, currentStock) {
    if (currentStock >= randomBytesThreshold) return;
    var data = crypto.getRandomValues(new Uint8Array(randomBytesThreshold));
    workers[index].postMessage({randomBytes: data.buffer}, [data.buffer]);
  }

  // creating worker instances
  for (var n = 0; n < workerCount; n++) {
    startWorker(n);
  }

  // worker round-robin tracker var
  var lastUsedWorkerIndex = -1;

  // returns new worker instance in cycle
  function getWorker() {
    if (++lastUsedWorkerIndex === workers.length)
      lastUsedWorkerIndex = 0;
    return workers[lastUsedWorkerIndex];
  }

  // this two methods should execute on all workers
  // they don't expect a response from worker
  [
    'setDefaultUserData',
    'setDefaultContacts'
  ].forEach(function (fnName) {
      Peerio.Crypto[fnName] = function () {
        var args = [];
        for (var a = 0; a < arguments.length; a++)
          args[a] = arguments[a];

        for (var w = 0; w < workers.length; w++)
          workers[w].postMessage({fnName: fnName, args: args});
      };
    });

  // this methods will execute on one of the workers,
  // each of them expect response from worker
  [
    'getKeyPair',
    'getPublicKeyString',
    'getPublicKeyBytes',
    'secretBoxEncrypt',
    'secretBoxDecrypt',
    'getKeyFromPIN',
    'decryptAccountCreationToken',
    'decryptAuthToken',
    'getAvatar',
    'encryptMessage',
    'decryptMessage',
    'encryptFile',
    'decryptFile',
    'decryptFileName',
    'encryptReceipt',
    'decryptReceipt'
  ].forEach(function (fnName) {
      Peerio.Crypto[fnName] = function () {
        var id = uuid();
        // we copy arguments object data into array, because that's what worker is expecting to use it with apply()
        // don't change this to Array.slice() because it will prevent runtime optimisation
        var args = [];
        for (var i = 0; i < arguments.length; i++)
          args[i] = arguments[i];

        var ret = new Promise(function (resolve, reject) {
          callbacks[id] = {
            resolve: resolve,
            reject: reject
          };
        });
        getWorker().postMessage({id: id, fnName: fnName, args: args});
        return ret;
      };
    });

};

// Peerio AccountInfo object

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

(function () {
  'use strict';

  /**
   * @param username
   * @param firstName
   * @param lastName
   * @param publicKey - base58 string
   * @param localeCode
   * @constructor
   */
  Peerio.Model.AccountInfo = function (username, firstName, lastName, publicKey, localeCode) {

    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.publicKeyString = publicKey;
    this.localeCode = localeCode || 'en';
  };

})();
/**
 * Custom js Error object.
 * Network layer creates this object on server errors.
 */

function PeerioServerError(code) {
  this.code = +code;
  this.message = this.getMessage(code);
  this.timestamp = Date.now();
  this.isOperational = true;
}

PeerioServerError.prototype = Object.create(Error.prototype);

PeerioServerError.prototype.getMessage = function (code) {
  return this.errorCodes[code] || 'Server error.';
};

PeerioServerError.prototype.errorCodes = {
  404: 'Resource does not exist or you are not allowed to access it.',
  413: 'Storage quota exceeded.',
  406: 'Malformed request.',
  423: 'Authentication error.',
  424: 'Two-factor authentication required.',
  425: 'The account has been throttled (sent too many requests that failed to authenticate).',
  426: 'User blacklisted.'
};
/**
 * Peerio User object
 *
 * todo: not sure if it is really needed, current idea is to put some validations and other simple user-related logic in here
 */

var Peerio = this.Peerio || {};
Peerio.Model = Peerio.Model || {};

(function () {
  'use strict';

  /**
   * Creates User object asynchronously populating it will keys.
   * Executes callback when User object
   * @param username
   * @param passphrase
   * @param callback
   * @constructor
   */
  var u = Peerio.Model.User = function (username, passphrase) {
    this.username = username;
    this.passphrase = passphrase;
    this.isMe = !!passphrase;

    if (this.isMe) {
      this.contacts = {};
      this.keyPair = {};
    }
  };

  /**
   * Generates keyPair and publicKeyString and fills corresponding properties
   * @promise {Peerio.Model.User}- resolved with self when ready
   */
  u.prototype.generateKeys = function () {
    var self = this;
    return Peerio.Crypto.getKeyPair(self.username, self.passphrase)
      .then(function (keys) {
        self.keyPair = keys;
        return Peerio.Crypto.getPublicKeyString(keys.publicKey);
      })
      .then(function (publicKey) {
        self.publicKey = publicKey;
      });
  };

})();
/**
 * Centralized place to collect and provide global application state information.
 * This is useful for components which were instantiated too late to be able to handle previous events.
 */

var Peerio = this.Peerio || {};
Peerio.AppState = {};

Peerio.AppState.init = function () {
  'use strict';

  var api = Peerio.AppState = {};
  var d = Peerio.Dispatcher;

  // initial state
  api.loading = false;     // is app currently transferring/waiting for data
  api.connected = false;   // is app connected to peerio server socket
  api.authenticated = false; // is current connection authenticated

  /**
   * Adds a custom state rule to AppState.
   * You can provide your own logic of how AppState properties change on Dispatcher events.
   * On *action* event, *property* will be set to *value* or to return value of the *value* function.
   * @param {string} action - action name that will trigger this rule
   * @param {string} property - app state property name (will be available as AppState.property)
   * @param {null|string|number|object|Function} value - the value to set to property. Or function that will return such value.
   */
  api.addStateRule = function (action, property, value) {
    var setFn;
    if (typeof(value) === 'function') {
      setFn = value.bind(api);
    } else {
      setFn = setState.bind(api, property, value);
    }
    d['on' + action](setFn);
  };
  /**
   * Executes specified function on specified action.
   * This is pretty much the same as addStateRule, but manipulates state inside of passed function.
   * @param {string} action - action name that will trigger handler execution
   * @param {function} handler - function that will handle the action event
   */
  api.addStateTrigger = function (action, handler) {
    d['on' + action](handler.bind(api));
  };

  function setState(prop, value) {
    this[prop] = value;
  }

  // subscribing to state-changing events
  d.onLoading(setState.bind(api, 'loading', true));
  d.onLoadingDone(setState.bind(api, 'loading', false));

  d.onSocketConnect(setState.bind(api, 'connected', true));
  d.onSocketDisconnect(function () {
    api.connected = false;
    api.authenticated = false;
  });

  d.onAuthenticated(setState.bind(api, 'authenticated', true));

};
/**
 * Peerio App Logic: Auth & Registration
 */


var Peerio = this.Peerio || {};
Peerio.Auth = {};

Peerio.Auth.init = function () {
  'use strict';

  var api = Peerio.Auth = {};
  var net = Peerio.Net;

  var lastLoginKey = 'lastLogin';

  // Peerio.Net is a low-level service and it does not know about event system, so we bridge events.
  net.addEventListener(net.EVENTS.onConnect, Peerio.Action.socketConnect);
  net.addEventListener(net.EVENTS.onDisconnect, Peerio.Action.socketDisconnect);
  // this events will be fired on automatic re-login attempts only
  net.addEventListener(net.EVENTS.onAuthenticated, Peerio.Action.loginSuccess);
  net.addEventListener(net.EVENTS.onAuthFail, Peerio.Action.loginFail);

  /**
   * Initiates session authentication
   * @param username
   * @param passphraseOrPIN
   * @promise
   */
  api.login = function (username, passphraseOrPIN) {
    return new Promise(function (resolve) {
      // todo PIN
      var passphrase = passphraseOrPIN;
      Peerio.user = new Peerio.Model.User(username, passphrase);
      resolve();
    })
      .then(function(){
        return Peerio.user.generateKeys();
      })
      .then(function () {
        return net.login(Peerio.user);
      })
      .then(function (user) {
        Peerio.Crypto.setDefaultUserData(user.username, user.keyPair, user.publicKey);
        return net.getSettings();
      })
      .then(function(settings){
        Peerio.user.settings = settings;
        Peerio.user.firstName = settings.firstName;
        Peerio.user.lastName = settings.lastName;
        return net.getContacts();
      })
      .then(function(contacts){
        var contactMap = {};
        contacts.contacts.forEach(function(c){
          c.publicKey = c.miniLockID;// todo: remove after this gets renamed on server
          c.fullName = (c.firstName||'') +' ' + (c.lastName||'');
          contactMap[c.username] = c;
        });
        contactMap[Peerio.user.username] = Peerio.user;
        Peerio.user.fullName = (Peerio.user.firstName||'') +' ' + (Peerio.user.lastName||'');
        Peerio.user.contacts = contactMap;
        Peerio.Crypto.setDefaultContacts(contactMap);
        return true;
      });
  };

  /**
   * Retrieves saved login (last successful one)
   * @promise {null|{username, firstName}}
   */
  api.getSavedLogin = function () {
    return Peerio.TinyDB.getObject(lastLoginKey);
  };

  /**
   * Saves last logged in user details for future login
   * @param username
   * @param firstName
   * @returns nothing
   */
  api.saveLogin = function (username, firstName) {
    if (!firstName) firstName = username;
    Peerio.TinyDB.setObject(lastLoginKey, {username: username, firstName: firstName})
      .catch(function (e) {
        alert('Failed to remember username. Error:' + e);
      });
  };

  /**
   * Removes saved login info
   */
  api.clearSavedLogin = function () {
    Peerio.TinyDB.removeItem(lastLoginKey);
  };

  api.signup = function (username, passphrase) {
    var keys;
    return Peerio.Crypto.getKeyPair(username, passphrase)
      .then(function (keyPair) {
        keys = keyPair;
        return Peerio.Crypto.getPublicKeyString(keyPair.publicKey);
      })
      .then(function (publicKeyString) {
        var info = new Peerio.Model.AccountInfo(username, username, username, publicKeyString, 'en');
        return net.registerAccount(info);
      })
      .then(function (creationToken) {
        return Peerio.Crypto.decryptAccountCreationToken(creationToken, username, keys);
      })
      .then(function (decryptedToken) {
        return net.activateAccount(decryptedToken);
      });
  };
};
/**
 * Peerio App Logic: messages
 */

var Peerio = this.Peerio || {};
Peerio.Messages = {};

Peerio.Messages.init = function () {
  'use strict';

  var api = Peerio.Messages = {};
  var net = Peerio.Net;

  // Array, but contains same objects accessible both by index and by id
  api.cache = null;

  /**
   * Loads conversations list with 1 original message in each of them.
   * Loads and decrypts page by page, adds each page to the cache.
   * Calls progress callback for every page, passing entire cache array to it.
   * Resolves once everything is loaded and decrypted.
   * @promise
   * todo: resume support in case of disconnection/error in progress
   */
  api.getAllConversations = function (progress) {
    if (api.cache)
      return Promise.resolve(api.cache);

    api.cache = [];
    // temporary paging based on what getConversationIDs returns
    return net.getConversationIDs()
      .then(function (response) {

        // building array with arrays of requests to pull conversation with 1 message
        var ids = response.conversationID;
        var pages = [];
        for (var i = 0; i < ids.length; i++) {
          var request = [];
          for (var j = 0; j < 10 && i < ids.length; j++, i++) {
            request.push({id: ids[i], page: '-1'});
          }
          pages.push(request);
        }

        // Promise.each executes next function call after previous promise is resolved
        return Promise.each(pages, function (page) {
          return net.getConversationPages(page)
            .then(function (response) {
              return decryptConversations(response.conversations);
            })
            .then(addConversationsToCache)
            .then(function () {
              progress(api.cache);
            });
        });
      });
  };

  api.loadAllConversationMessages = function (conversationId) {
    var conversation = api.cache[conversationId];
    if (conversation._pendingLoadPromise) return conversation._pendingLoadPromise;

    return conversation._pendingLoadPromise = Peerio.Net.getConversationPages([{id: conversationId, page: '0'}])
      .then(function (response) {
        return decryptMessages(response.conversations[conversationId].messages);
      })
      .then(function (messages) {
        addMessagesToCache(conversation, messages);
        return conversation;
      });
  };

  /**
   * adds conversations to cache with duplicate checks
   * and re-sorts the cache array by lastTimestamp
   * @param conversations
   */
  function addConversationsToCache(conversations) {
    conversations.forEach(function (item) {
      if (api.cache[item.id]) return;
      api.cache.push(item);
      api.cache[item.id] = item;
    });

    api.cache.sort(function (a, b) {
      return a.lastTimestamp > b.lastTimestamp ? -1 : (a.lastTimestamp < b.lastTimestamp ? 1 : 0);
    });
  }

  function addMessagesToCache(conversation, messages) {
    var cachedMessages = conversation.messages;
    messages.forEach(function (item) {
      if (cachedMessages[item.id]) return;
      cachedMessages.push(item);
      cachedMessages[item.id] = item;
    });
    cachedMessages.sort(function (a, b) {
      return a.timestamp > b.timestamp ? -1 : (a.timestamp < b.timestamp ? 1 : 0);
    });
  }

  /**
   * Decrypts a list of conversations concurrently putting load on all available crypto workers.
   * It assumes there is only ONE message in conversation (original one).
   * @param {object} conversations - conversation objects list in {id: object} format
   * @returns {Promise<Array>} - array of decrypted conversation objects
   */
  function decryptConversations(conversations) {
    var decryptedConversations = [];
    var keys = Object.keys(conversations);

    // executes decryption with concurrency,
    // given the specific number of crypto workers running.
    // this makes sense because otherwise we have a chance to use too much resources on ui thread.
    return Promise.map(keys, function (convId) {
        var conv = conversations[convId];
        var encMessage = conv.messages[conv.original];
        // no original message in conversation?
        // not a normal case, but I think still exists somewhere in old conversations
        if (!encMessage) {
          console.log('Conversation misses original message', conv);
          return;
        }
        // both indexed and associative ways to store conversation
        decryptedConversations[convId] = conv;
        decryptedConversations.push(conv);
        // we will replace messages with decrypted ones
        conv.messages = [];
        conv.lastTimestamp = +conv.lastTimestamp;
        conv.lastMoment = moment(conv.lastTimestamp);

        return decryptMessage(encMessage)
          .then(function (message) {
            conv.messages.push(message);
            conv.messages[message.id] = message;
            conv.original = message;
          });
      },
      {
        // we use x2 concurrency so that workers always have one request in queue,
        // making execution as fast as possible
        concurrency: Peerio.Crypto.wokerInstanceCount * 2
      }
    ).return(decryptedConversations);

  }

  function decryptMessages(messages) {
    var keys = Object.keys(messages);

    return Promise.map(keys, function (msgId) {
        return decryptMessage(messages[msgId]);
      },
      {concurrency: Peerio.Crypto.wokerInstanceCount * 2});
  }

  /**
   * decrypts single message and all data in it, including receipts
   * @promise resolves with decrypted message object
   */
  function decryptMessage(encMessage) {
    return Peerio.Crypto.decryptMessage(encMessage)
      .then(function (message) {
        delete message.ack;
        message.id = encMessage.id;
        message.sender = encMessage.sender;
        message.timestamp = +encMessage.timestamp;
        message.moment = moment(message.timestamp);
        message.isModified = encMessage.isModified;
        return message;
      });
  }

};
/**
 * Peerio network protocol implementation
 */

// todo: socket should not attempt reconnection when device is offline

var Peerio = this.Peerio || {};
Peerio.Net = {};

Peerio.Net.init = function () {
  'use strict';
  var API_VERSION = '2.0.0';
  var api = Peerio.Net = {};
  var hasProp = Peerio.Util.hasProp;
  //-- SOCKET EVENT HANDLING, AUTH & CONNECTION STATE ------------------------------------------------------------------
  var connected = false;
  var authenticated = false;
  var user = null;

  // some events, Peerio.Net consumer might be interested in
  api.EVENTS = {
    onConnect: 'onConnect',
    onDisconnect: 'onDisconnect',
    onAuthenticated: 'onAuthenticated',
    onAuthFail: 'onAuthFail'
  };

  // Peerio.Net.EVENT handlers grouped by event types
  // - subscription is available through public api
  // - there is no way to unsubscribe atm, it's not needed
  var netEventHandlers = {};
  _.forOwn(api.EVENTS, function (val) {
    netEventHandlers[val] = [];
  });

  // calls Peerio.Net.EVENTS handlers
  function fireEvent(name) {
    netEventHandlers[name].forEach(function (handler) {
      window.setTimeout(function () {
        try {
          handler();
        } catch (e) {
          console.error(e);
        }
      }, 0);
    });
  }

  var socketEventHandlers = {
    connect: onConnect,
    disconnect: onDisconnect
  };

  // this listens to socket.io events
  Peerio.Socket.injectEventHandler(function (eventName) {
    var handler = socketEventHandlers[eventName];
    if (handler) {
      handler();
    } else {
      console.log('unknown socket event ', eventName);
    }

  });

  function onConnect() {
    sendToSocket('setApiVersion', {version: API_VERSION}, true)
      .then(function () {
        connected = true;
        fireEvent(api.EVENTS.onConnect);
        api.login(user, true)
          .catch(function(err){
            console.log('Auto re-login failed. No new attempts will be made until reconnect.', err);
          });
      })
      .timeout(15000)// no crazy science behind this magic number, just common sense
      .catch(function (err) {
        // todo: this should not really happen
        // todo: if it does and it's a server problem, we should limit the number of attempts, or make them sparse
        console.error('setApiVersion ' + API_VERSION + ' failed', err);
        Peerio.Socket.reconnect();
      });
  }

  function onDisconnect() {
    // in case of errors disconnect events might be fired without 'connect' event between them
    // so we make sure we handle first event only
    if (!connected) return;

    rejectAllPromises();
    connected = false;
    authenticated = false;
    fireEvent(api.EVENTS.onDisconnect);
  }

  /**
   * Authenticates current socket session.
   * Stores user object to re-login automatically in case of reconnection.
   * @param {Peerio.Model.User} userObj
   * @param {bool} [autoLogin] - true when login was called automatically after reconnect
   * @promise {Peerio.Model.User} - resolves with authenticated user object
   */
  api.login = function (userObj, autoLogin) {
    if (!userObj) return Promise.reject();
    user = userObj;

    return sendToSocket('getAuthenticationToken', {
      username: user.username,
      publicKeyString: user.publicKey
    })
      .then(function (encryptedAuthToken) {
        return Peerio.Crypto.decryptAuthToken(encryptedAuthToken, user.keyPair);
      })
      .then(function (authToken) {
        return sendToSocket('login', {authToken: authToken});
      })
      .then(function () {
        authenticated = true;
        console.log('authenticated');
        if (autoLogin)
          fireEvent(api.EVENTS.onAuthenticated);

        return user;
      })
      .timeout(60000) // magic number based on common sense
      .catch(function (err) {
        // if it was a call from login page, we don't want to use wrong credentials upon reconnect
        console.log('authentication failed.', err);
        if (!autoLogin) user = null;
        else fireEvent(api.EVENTS.onAuthFail);
        return Promise.reject(err);
      });
  };

  //-- PROMISE MANAGEMENT ----------------------------------------------------------------------------------------------
  // here we store all pending promises by unique id
  var pending = {};
  // safe max promise id under 32-bit integer. Once we reach maximum, id resets to 0.
  var maxId = 4000000000;
  var currentId = 0;

  // registers new promise reject function and returns a unique id for it
  function addPendingPromise(rejectFn) {
    if (++currentId > maxId) currentId = 0;
    pending[currentId] = rejectFn;
    return currentId;
  }

  // removes previously registered promise rejection fn by id
  function removePendingPromise(id) {
    delete pending[id];
  }

  // rejects all pending promises. useful in case of socket errors, logout.
  function rejectAllPromises() {
    _.forOwn(pending, function (reject) {
      reject();
    });
    pending = {};
    currentId = 0;
  }

  //-- HELPERS ---------------------------------------------------------------------------------------------------------
  /**
   *  generalized DRY function to use from public api functions
   *  @param {string} name - message name
   *  @param {Object} [data] - object to send
   *  @param {bool} [ignoreConnectionState] - only setApiVersion needs it, couldn't find more elegant way
   *  @promise
   */
  function sendToSocket(name, data, ignoreConnectionState) {
    if(!connected && !ignoreConnectionState) return Promise.reject('Not connected.');
    // unique (within reasonable time frame) promise id
    var id = null;

    return new Promise(function (resolve, reject) {
      id = addPendingPromise(reject);
      Peerio.Socket.send(name, data, resolve);
    })
      // we want to catch all exceptions, log them and reject promise
      .catch(function (error) {
        console.log(error);
        return Promise.reject();
      })
      // if we got response, let's check it for 'error' property and reject promise if it exists
      .then(function (response) {
        return hasProp(response, 'error')
          ? Promise.reject(new PeerioServerError(response.error))
          : Promise.resolve(response);
      })
      .finally(removePendingPromise.bind(this, id));
  }

  //-- PUBLIC API ------------------------------------------------------------------------------------------------------

  /**
   * Subscribes a handler to network event
   * @param {string} eventName - one of the Peerio.Net.EVENTS values
   * @param {function} handler - event handler, no arguments will be passed
   */
  api.addEventListener = function (eventName, handler) {
    netEventHandlers[eventName].push(handler);
  };

  /**
   * Asks the server to validate a username.
   * @param {string}  username - Username to validate.
   * @promise {Boolean} - true if username is valid (free)
   */
  api.validateUsername = function (username) {
    if (!username) { return Promise.resolve(false); }
    return sendToSocket('validateUsername', {username: username})
      .return(true)
      .catch(PeerioServerError, function (error) {
        if (error.code === 400) return Promise.resolve(false);
        else return Promise.reject();
      });
  };

  /**
   * Asks the server to validate an address(email or phone).
   * @param {string} address  - Address to validate.
   * @promise {Boolean} - true if address is valid and not yet registered, false otherwise
   */
  api.validateAddress = function (address) {
    var parsed = Peerio.Util.parseAddress(address);
    if (!parsed) return Promise.resolve(false);
    return sendToSocket('validateAddress', {address: parsed})
      .return(true)
      .catch(PeerioServerError, function (error) {
        if (error.code === 400) return Promise.resolve(false);
        else return Promise.reject();
      });
  };

  /**
   * Begins an account registration challenge with the server.
   * @param {Peerio.Model.AccountInfo} accountInfo - Contains account information.
   * @promise {{
   *            username: 'Username this challenge is for (String)',
   *            accountCreationToken: {
   *              token: 'Encrypted token (Base64 String)',
   *              nonce: 'Nonce used to encrypt the token (Base64 string)'
   *            },
   *            ephemeralServerPublicKey: 'server's public key (Base58 String)'
   *          }} - server response
   */
  api.registerAccount = function (accountInfo) {
    return sendToSocket('register', accountInfo);
  };

  /**
   * Begins an account registration challenge with the server.
   * @param {string} decryptedToken - Contains account information.
   * @promise {Boolean} - always returns true or throws a PeerioServerError
   */
  api.activateAccount = function (decryptedToken) {
    return sendToSocket('activateAccount', {accountCreationToken: decryptedToken})
      .return(true);
  };

  /**
   * Sends back an address confirmation code for the user's email/phone number.
   * @param {string} username
   * @param {number} confirmationCode - 8 digit number.
   * @promise {Boolean}
   */
  api.confirmAddress = function (username, confirmationCode) {
    return sendToSocket('confirmAddress', {username: username, confirmationCode: confirmationCode})
      .return(true);
  };

  /**
   * Gets user settings and some personal data
   * @promise {{todo}}
   */
  api.getSettings = function () {
    return sendToSocket('getSettings');
  };

  /**
   * Change settings.
   * @param {object} settings
   * @promise
   */
  api.updateSettings = function (settings) {
    return sendToSocket('updateSettings', settings);
  };

  /**
   * Adds a new user address. Requires confirmation to make changes permanent.
   * @param {{type: 'email'||'phone', value: address }} address
   * @promise
   */
  api.addAddress = function (address) {
    return sendToSocket('addAddress', address);
  };

  /**
   * Confirms an address using confirmation code.
   * @param {string} code
   * @promise
   */
  api.confirmAddress = function (code) {
    return sendToSocket('confirmAddress', {confirmationCode: code});
  };

  /**
   * Sets an address as the primary address.
   * @param {string} address
   * @promise
   */
  api.setPrimaryAddress = function (address) {
    return sendToSocket('setPrimaryAddress', {address: address});
  };

  /**
   * Removes an address from user's account.
   * @param {string} address
   * @promise
   */
  api.removeAddress = function (address) {
    return sendToSocket('removeAddress', {address: address});
  };

  /**
   * Gets a publicKey for a user.
   * @param {string} username
   * @promise
   */
  api.getPublicKey = function (username) {
    return sendToSocket('getUserPublicKey', {username: username});
  };

  /**
   * Retrieves all contacts for the user.
   * @promise
   */
  api.getContacts = function () {
    return sendToSocket('getContacts');
  };

  /**
   * Retrieves all sent contact requests.
   * @promise
   */
  api.getSentContactRequests = function () {
    return sendToSocket('getSentContactRequests');
  };

  /**
   * Retrieves all received contact requests.
   * @promise
   */
  api.getReceivedContactRequests = function () {
    return sendToSocket('getReceivedContactRequests');
  };

  /**
   * Retrieves a Peerio username from an address.
   * @param {Object} address
   * @promise
   */
  api.addressLookup = function (address) {
    return sendToSocket('addressLookup', address);
  };

  /**
   * Sends a contact request to a username.
   * @param {array} contacts - Contains objects which either have a `username` or `address` property
   * @promise
   */
  api.addContact = function (contacts) {
    return sendToSocket('addContact', {contacts: contacts});
  };

  /**
   * Cancel a contact request previously sent to a username.
   * @param {string} username
   * @promise
   */
  api.cancelContactRequest = function (username) {
    return sendToSocket('cancelContactRequest', {username: username});
  };

  /**
   * Accept a contact request from a username.
   * @param {string} username
   * @promise
   */
  api.acceptContactRequest = function (username) {
    return sendToSocket('acceptContactRequest', {username: username});
  };

  /**
   * Decline a contact request from a username.
   * @param {string} username
   * @promise
   */
  api.declineContactRequest = function (username) {
    return sendToSocket('declineContactRequest', {username: username});
  };

  /**
   * Removes a username as a contact.
   * @param {string} username
   * @promise
   */
  api.removeContact = function (username) {
    return sendToSocket('removeContact', {username: username});
  };

  /**
   * Send a Peerio invitation to an address.
   * @param {Object} address
   * @promise
   */
  Peerio.Net.inviteUserAddress = function (address) {
    return sendToSocket('inviteUserAddress', {address: address});
  };

  /**
   * Send a Peerio message to contacts.
   * @param {Object} msg
   * @promise
   */
  Peerio.Net.createMessage = function (msg) {
    var socketMsg = {
      isDraft: msg.isDraft,
      recipients: msg.recipients,
      header: msg.header,
      body: msg.body,
      files: msg.files
    };
    if (hasProp(msg, 'conversationID'))
      socketMsg.conversationID = msg.conversationID;

    return sendToSocket('createMessage', socketMsg);
  };

  /**
   * Retrieve a list of all user messages.
   * @promise
   */
  api.getAllMessages = function () {
    return sendToSocket('getAllMessages');
  };

  /**
   * Retrieve a message by its ID.
   * @param {array} ids - Array of all message IDs.
   * @promise
   */
  api.getMessages = function (ids) {
    return sendToSocket('getMessages', {ids: ids});
  };

  /**
   * Retrieve a list of all user message IDs.
   * @promise
   */
  api.getMessageIDs = function () {
    return sendToSocket('getMessageIDs');
  };

  /**
   * Retrieve a list of all unopened/modified IDs.
   * @promise
   */
  api.getModifiedMessageIDs = function () {
    return sendToSocket('getModifiedMessageIDs');
  };

  /**
   * Retrieve list of conversation IDs only.
   * @promise
   */
  api.getConversationIDs = function () {
    return sendToSocket('getConversationIDs');
  };

  /**
   * Retrieve list of conversations.
   * @promise
   */
  api.getAllConversations = function () {
    return sendToSocket('getAllConversations', {});
  };

  /**
   * Retrieve entire conversations.
   * @param {[]} conversations - Contains objects in format {id, page}
   * @promise
   */
  api.getConversationPages = function (conversations) {
    return sendToSocket('getConversationPages', {conversations: conversations});
  };

  /**
   * Mark a message as read.
   * @param {array} read - array containing {id, encryptedReturnReceipt} objects
   * @promise
   */
  api.readMessages = function (read) {
    return sendToSocket('readMessages', {read: read});
  };

  /**
   * Remove a conversation and optionally also remove files.
   * @param {array} ids
   * @promise
   */
  api.removeConversation = function (ids) {
    return sendToSocket('removeConversation', {ids: ids});
  };

  /**
   * Initiate a file upload.
   * @param {object} uploadFileObject - containing:
   {object} header,
   {string} ciphertext,
   {number} totalChunks,
   {string} clientFileID,
   {string} parentFolder (optional)
   * @promise
   */
  api.uploadFile = function (uploadFileObject) {
    return sendToSocket('uploadFile', uploadFileObject);
  };

  /**
   * Uploads a file chunk.
   * @param {object} chunkObject - containing:
   {string} ciphertext,
   {number} chunkNumber,
   {string} clientFileID,
   * @promise
   */
  api.uploadFileChunk = function (chunkObject) {
    return sendToSocket('uploadFileChunk', chunkObject);
  };

  /**
   * Retrieve information about a single file.
   * @param {string} id
   * @promise
   */
  api.getFile = function (id) {
    return sendToSocket('getFile', {id: id});
  };

  /**
   * Retrieve a list of all user files.
   * @promise
   */
  api.getFiles = function () {
    return sendToSocket('getFiles');
  };

  /**
   * Retrieve file download information.
   * @param {string} id
   * @promise
   */
  api.downloadFile = function (id) {
    return sendToSocket('downloadFile', {id: id});
  };

  /**
   * Delete a file.
   * @param {array} ids - Contains id strings.
   * @promise
   */
  api.removeFile = function (ids) {
    return sendToSocket('removeFile', {ids: ids});
  };

  /**
   * Nuke a file.
   * @param {array} ids - Contains id strings.
   * @promise
   */
  api.nukeFile = function (ids) {
    return sendToSocket('nukeFile', {ids: ids});
  };

  /**
   * Set up 2FA. Returns a TOTP shared secret.
   * @promise
   */
  api.setUp2FA = function () {
    return sendToSocket('setUp2FA');
  };

  /**
   * Confirm 2FA. Send a code to confirm the shared secret.
   * @param {number} code
   * @promise
   */
  api.confirm2FA = function (code) {
    return sendToSocket('confirm2FA', {twoFACode: code});
  };

  /**
   * Generic 2FA. Send a code to auth.
   * @param {number} code
   * @param {string} username
   * @param {string} publicKey
   * @promise
   */
  api.validate2FA = function (code, username, publicKey) {
    return sendToSocket('validate2FA', {
      twoFACode: code,
      username: username,
      publicKeyString: publicKey
    });
  };

  /**
   * Delete account.
   * @promise
   */
  api.closeAccount = function () {
    return sendToSocket('closeAccount');
  };

};
/**
 *  Portion of web socket handling code that runs in UI thread.
 *  This code provides a thin layer between socket instance in web worker
 *  and networking layer.
 */

var Peerio = this.Peerio || {};
Peerio.Socket = {};
/**
 * Initialises Peerio Socket handling code
 */
Peerio.Socket.init = function () {
  'use strict';

  Peerio.Socket = {};
  // malicious server safe hasOwnProperty function;
  var hasProp = Function.call.bind(Object.prototype.hasOwnProperty);
  // webworker instance
  var worker;
  // socket events handler
  var eventHandler;
  // pending callbacks id:function
  var callbacks = {};

  /**
   *  Subscribes a callback to socket events and server push notifications.
   *  This method exists to provide better layer decoupling
   *  and is supposed to be called only once, there is no need for multiple handlers in current app design.
   *  @param {function(string)} handler - callback will be called with string parameter - event name.
   */
  Peerio.Socket.injectEventHandler = function (handler) {
    if (eventHandler) throw new Error('Socket event handler already injected.');
    eventHandler = handler;
  };

  Peerio.Socket.start = function () {
    // worker instance holding the actual web socket
    worker = new Worker(Peerio.Config.apiFolder + 'socket_worker_bundle.js');
    // handles messages from web socket containing worker
    worker.onmessage = messageHandler;

    // initializing worker
    worker.postMessage(Peerio.Config);
  };

  function messageHandler(message) {
    var data = message.data;
    if(Peerio.Util.processWorkerConsoleLog(data)) return;

    if (hasProp(data, 'callbackID') && data.callbackID) {
      callbacks[data.callbackID](data.data);
      delete callbacks[data.callbackID];
      return;
    }

    if (eventHandler && hasProp(data, 'socketEvent')) {
      eventHandler(data.socketEvent);
    }
  }

  /**
   * Sends message to the serve
   *
   * @param {string} name - message name
   * @param {Object} [data] - message data
   * @param {Function} [callback] - server response
   */
  Peerio.Socket.send = function (name, data, callback) {

    // registering the callback, if provided
    var callbackID = null;
    if (typeof(callback) === 'function') {
      callbackID = uuid();
      callbacks[callbackID] = callback;
    }

    // object to send
    var message = {
      name: name,
      data: data,
      callbackID: callbackID
    };

    // for file upload we want to transfer ownership of the chunk data
    // so it won't get copied
    var transfer = null;
    if (name === 'uploadFileChunk') {
      transfer = [message.ciphertext];
    }

    worker.postMessage(message, transfer);
  };
  /**
   * Breaks current connection and reconnects
   */
  Peerio.Socket.reconnect = function () {
    worker.postMessage({name: 'reconnectSocket'});
  };
};

/**
 * Tiny permanent storage abstraction/wrapper.
 * Use it for storing small (few megabytes) data only.
 * All values are encrypted with device-specific key.
 */

var Peerio = this.Peerio || {};
Peerio.TinyDB = {};

Peerio.TinyDB.init = function () {
  'use strict';

  var api = Peerio.TinyDB = {};
  // currently, localStorage is fine for all platforms
  var db = window.localStorage;

  var keySize = 32;

  var secretKey = function () {
    var strKey = '';

    while (strKey.length < keySize)
      strKey += Peerio.Config.lowImportanceDeviceKey;

    var ret = nacl.util.decodeUTF8(strKey);

    return ret.subarray(0, keySize);
  }();

  function encrypt(str) {
    return Peerio.Crypto.secretBoxEncrypt(str, secretKey)
      .then(function (decInfo) {
        decInfo.ciphertext = nacl.util.encodeBase64(decInfo.ciphertext);
        decInfo.nonce = nacl.util.encodeBase64(decInfo.nonce);
        return JSON.stringify(decInfo);
      });
  }

  function decrypt(str) {
    if (str === null) return Promise.resolve(null);

    var decInfo = JSON.parse(str);
    decInfo.ciphertext = nacl.util.decodeBase64(decInfo.ciphertext);
    decInfo.nonce = nacl.util.decodeBase64(decInfo.nonce);

    return Peerio.Crypto.secretBoxDecrypt(decInfo.ciphertext, decInfo.nonce, secretKey);
  }

  /**
   * Saves scalar value to storage.
   * @param {string} key - unique key. Existing value with the same key will be overwritten.
   * @param {string|number|boolean|null} value - should have toString() function, because storage accepts only strings.
   * @promise
   */
  api.setVar = function (key, value) {
    return encrypt(value.toString())
      .then(function (encryptedStr) {
        db.setItem(key, encryptedStr);
        return true;
      });
  };

  /**
   * Saves object or array to storage.
   * @param {string} key - unique key. Existing value with the same key will be overwritten.
   * @param {object|Array} value - Will be serialized with JSON.stringify(), because storage accepts only strings.
   * @promise
   */
  api.setObject = function (key, value) {
    return encrypt(JSON.stringify(value))
      .then(function (encryptedStr) {
        db.setItem(key, encryptedStr);
        return true;
      });
  };

  /**
   * Removes item from storage
   * @param {string} key
   */
  api.removeItem = db.removeItem.bind(db);

  /**
   * Removes all items from storage
   */
  api.clearStorage = db.clear.bind(db);

  /**
   * Retrieves value as string
   * @params {string} key - unique key
   * @promise {string|null} value
   */
  api.getString = function (key) {
    return decrypt(db.getItem(key));
  };

  /**
   * Retrieves value as number
   * @params {string} key - unique key
   * @promise {number|null} value
   */
  api.getNumber = function (key) {
    return api.getString(key)
      .then(function (val) {
        return val == null ? null : +val;
      });
  };

  /**
   * Retrieves value as boolean
   * @params {string} key - unique key
   * @promise {boolean|null} value
   */
  api.getBool = function (key) {
    return api.getString(key)
      .then(function (val) {
        return val == null ? null : val === 'true';
      });
  };

  /**
   * Retrieves value as parsed object using JSON.parse()
   * @params {string} key - unique key
   * @promise {object|null} value
   */
  api.getObject = function (key) {
    return api.getString(key)
      .then(function (val) {
        return val == null ? null : JSON.parse(val);
      });
  };

};
/**
 *  Peerio Actions to use with Dispatcher
 *  -------------------------------------
 *
 *  use Peerio.Action.ACTION_NAME to reference action name string
 *  use Peerio.Action.ACTION_NAME([params]) to execute action function (first letter of the method is in lower case)
 *  use Peerio.Dispatcher.onACTION_NAME(callback) to subscribe to action
 */

var Peerio = this.Peerio || {};
Peerio.Action = {};

Peerio.Action.init = function () {
  'use strict';

  Peerio.Action = {};

  /**
   * Adds an action to Event System. Creates convenience functions.
   * Use this at any time to add a new action type.
   * There is no way to remove action type atm, as it is not needed.
   * @param {string} actionName - the name of new action. Important: PascalCase.
   */
  Peerio.Action.add = function(actionName){
    if(Peerio.Action[actionName]) throw 'Illegal attempt to register existing Action. Or other property with same name exists.';

    Peerio.Action[actionName] = actionName;

    var actionMethodName = actionName[0].toLowerCase() + actionName.substring(1);
    // creating action function
    Peerio.Action[actionMethodName] = Peerio.Dispatcher.notify.bind(null, actionName);
    Peerio.Dispatcher.addActionType(actionName);
  };

  // Default actions list with parameter information
  // preferable naming style: "Action", "ObjectAction" or "ActionDetail"
  // IMPORTANT NOTE ABOUT NAMING:
  // 1. Action names should always
  //      * Be longer then 1 symbol
  //      * Start from upper case letter
  //      * Example: MyAction
  // 2. Dispatcher subscription methods will be named in following pattern
  //      Peerio.Dispatcher.onMyAction(...subscriber)
  //      e.g. action name will be prefixed with "on"
  // 3. Action names will be available as properties on Actions object like so:
  //      Peerio.Action.MyAction
  //      value of the property === Action name ("MyAction")
  // 4. Action execution methods will have action name but with first letter in lower case
  //      Peerio.Action.myAction(...params)
  [
    //------- ACTIONS EMITTED BY CORE -------
    'SocketConnect',       // WebSocket reported successful connect
    'SocketDisconnect',    // WebSocket reported disconnected(and reconnecting) state
    'Authenticated',       // WebSocket connection was authenticated
    'Loading',             // Data transfer is in process
    'LoadingDone',         // Data transfer ended
    'LoginSuccess',        // login attempt succeeded
    'LoginFail'            // login attempt failed

  ].forEach(function (action) {
      Peerio.Action.add(action);
    });

  // Enums
  Peerio.Action.Statuses = {
    Pending: 0,
    Success: 1,
    Fail: 2
  };

};


/**
 *  Dispatcher manages system-wide events
 *  --------------------------------------------------------------
 *  1. It provides a set of Peerio.Action.*([args]) functions which can be called
 *  by different components to notify other interested components.
 *  (see separate actions.js file).
 *
 *  2. It provides subscription/unsubscription mechanism to allow components to be notified when action happen
 *  Peerio.Dispatcher.subscribe(Peerio.Action.ACTION_NAME, callback_function)
 *  or use syntactic sugar: Peerio.Dispatcher.onACTION_NAME(callback_function)
 *  Peerio.Dispatcher.unsubscribe(subscription_id or callback_function,...)
 *
 *  Subscribers are being called synchronously in reversed order
 *  (last subscriber is called first)
 *  If subscriber returns true (===) processing stops (a la preventDefault).
 *
 *  No other logic is performed here, just dispatching.
 *  In some special cases custom dispatching logic is implemented, see overrides.js
 *
 */

var Peerio = this.Peerio || {};
Peerio.Dispatcher = {};

Peerio.Dispatcher.init = function () {
  'use strict';

  var api = Peerio.Dispatcher = {};

  // subscribers container
  // KEY: action. VALUE: [{id, handler},..] objects array
  var subscribers = {};

  /**
   * subscribes callback to action
   * @param {string} action - one of the events enum values
   * @param {function} handler - action handler
   * @returns {number} - subscription uuid. You can use this id, or the same callback to unsubscribe later.
   */
  api.subscribe = function (action, handler) {
    var id = uuid.v4();
    subscribers[action].push({
      id: id,
      handler: handler
    });
    return id;
  };

  /**
   * Unsubscribes from action
   * @param {...number|...function|[]} arguments -  subscription id or the actual subscribed callback.
   * You can pass one or more parameters with ids or callbacks or arrays containing mixed ids and callbacks
   * Note that if callback is passed, it will be unsubscribed from all actions.
   */
  api.unsubscribe = function () {
    var removeSubscriber = function (subscriber) {
      var predicate = typeof (subscriber) === 'function' ? {handler: subscriber} : {id: subscriber};
      _.forIn(subscribers, function (value) {
        _.remove(value, predicate);
      });
    };
    // if array is passed, we will iterate it. If not, we will iterate arguments.
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (Array.isArray(a)) a.forEach(removeSubscriber);
      else removeSubscriber(a);
    }
  };

  /**
   * Notifies subscribers on action and passes optional arguments.
   * This is an abstract function, more convenient specialized functions
   * from Peerio.Action namespace should be used by components
   * @param {string} action - one of Peerio.Action names
   * @param arguments - any additional arguments will be passed to subscribers
   */
  api.notify = function (action) {
    var args = _.rest(arguments);
    var subs = subscribers[action];
    for (var i = subs.length - 1; i >= 0; i--) {
      if (subs[i].handler.apply(null, args) === true) break;
    }
  };

  /**
   * Registers new Action with dispatcher.
   * Adds a onActionName convenience function to Peerio.Dispatcher.
   * YOU SHOULD NOT NORMALLY USE THIS FUNCTION.
   * Instead, register new actions with Peerio.Action.add(actionName).
   * @param {string} actionName - the name of new action. Important: PascalCase.
   */
  api.addActionType = function(actionName){
    if(subscribers[actionName]) throw 'Illegal attempt to register existing Action';
    // pre-creating action subscribers array
    subscribers[actionName] = [];
    // creating syntactic sugar method wrapping Peerio.Dispatcher.subscribe
    api['on' + actionName] = function (handler) {
      return api.subscribe(actionName, handler);
    };
  };

};
/**
 * Special cases for some of the standard action dispatching.
 * You can do the same for your custom actions,
 * just override Peerio.Action.actionName function.
 */


var Peerio = this.Peerio || {};
Peerio.ActionOverrides = {};

Peerio.ActionOverrides.init = function () {
  'use strict';

  Peerio.ActionOverrides = {};

  // Following overrides make sure that Loading action will be dispatched only once until LoadingDone will be called.
  // And LoadingDone will only be dispatched if it corresponds to the number of previously called Loading actions.
  // We need this because consumers are interested in knowing when the app is busy and not when individual tasks are starting and ending.
  (function () {
    var i = Peerio.Action.internal = {};
    i.loadingCounter = 0;
    Peerio.Action.loading = function () {
      if (++i.loadingCounter === 1) Peerio.Dispatcher.notify('Loading');
    };
    Peerio.Action.loadingDone = function () {
      if (--i.loadingCounter === 0) Peerio.Dispatcher.notify('LoadingDone');
      i.loadingCounter = Math.max(i.loadingCounter, 0);
    };
  }());

};

/**
 * Various Peerio utility functions
 */

var Peerio = this.Peerio || {};
Peerio.Util = {};

Peerio.Util.init = function () {
  'use strict';

  var api = Peerio.Util = {};

  /**
   *  malicious server safe hasOwnProperty function
   *  @param {object} object to test for property existence, can be null or undefined
   *  @param {string} property name
   */
  api.hasProp = Function.call.bind(Object.prototype.hasOwnProperty);

  var emailExp = new RegExp('^([-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20})$');
  var phoneExp = new RegExp('^\\+?(\\d|\\s|\\-|\\(|\\)){6,20}$');

  /**
   * Parses an address and returns its type and parsed format.
   * In the case of phone numbers, the number is stripped from any non-digits.
   * @param {string} address - Address to parse.
   * @return {object} {type:'email||phone', address:'parsed address'}
   */
  api.parseAddress = function (address) {
    if (emailExp.test(address)) {
      return {
        type: 'email',
        value: address.match(emailExp)[0]
      };
    }

    if (phoneExp.test(address)) {
      var phone = address.match(phoneExp)[0].split('');

      for (var i = 0; i < phone.length; i++) {
        if (!phone[i].match(/\d/))
          phone.splice(i, 1);
      }

      return {
        type: 'phone',
        value: phone.join('')
      };
    }

    return false;
  };

  /**
   *  1. detects if message from worker contains 'console.log' property
   *  2. if it does, prints out value array
   *  @param {Object} data - object passed by worker
   *  @returns {boolean} true if it was a 'console.log' message
   */
  api.processWorkerConsoleLog = function (data) {
    if (!data.hasOwnProperty('console.log')) return false;
    var args = data['console.log'];
    args.unshift('WORKER:');
    console.log.apply(console, args);
    return true;
  };

};
/**
 * Various extensions to system/lib objects
 * ------------------------------------------------------
 */
(function () {
  'use strict';

  String.prototype.isEmpty = function() {
    return (this.length === 0 || !this.trim());
  };

}());

/**
 * Starts Error interceptor and reporter.
 *
 * This script should ideally use vanilla js only,
 * so it won't fail in case of errors in some lib it uses.
 *
 * It also tries to minimize performance impact and be unobtrusive,
 * not reporting the same errors more then once and not caching too much while offline.
 *
 */

var Peerio = this.Peerio || {};
Peerio.ErrorReporter = {};

Peerio.ErrorReporter.init = function () {
  'use strict';

  // Cache of reported errors.
  var reported = {};
  // How many reports are awaiting transmission.
  var queueLength = 0;
  // How many reports are allowed to await transmission.
  var maxQueueLength = 100;
  // in case there is already a handler, we'll save it here
  var oldHandler;

  /**
   * Allows error reporting
   */
  Peerio.ErrorReporter.enable = function () {
    oldHandler = window.onerror;
    window.onerror = errorHandler;
  };

  /**
   * Disables error reporting
   */
  Peerio.ErrorReporter.disable = function () {
    window.onerror = oldHandler;
  };

  function errorHandler(aMessage, aUrl, aRow, aCol, aError) {
    if (oldHandler) oldHandler(aMessage, aUrl, aRow, aCol, aError);

    if (queueLength >= maxQueueLength) return false;
    // check if this error was already reported
    var known = reported[aUrl];
    if (known && known.row === aRow && known.col === aCol) return false;

    // cache this report to prevent reporting it again
    reported[aUrl] = {row: aRow, col: aCol};

    var report = {
      ts: Math.floor(getUTCTimeStamp() / 1000),
      url: aUrl,
      row: aRow,
      col: aCol,
      msg: aMessage,
      version: Peerio.Config.appVersion
    };

    if (aError != null) {
      report.msg = aError.message;
      report.errType = aError.name;
      report.stack = aError.stack;
    }
    queueLength++;
    sendWhenOnline(JSON.stringify(report));
    return false;
  }

  // Forever delays report for 5 minutes while device is offline.
  // Attempts sending the report when device is online.
  function sendWhenOnline(msg) {
    if (navigator.onLine === false) {
      window.setTimeout(sendWhenOnline.bind(window, msg), 5 * 60 * 1000);
      return;
    }
    queueLength--;
    var request = new XMLHttpRequest();
    request.open('POST', Peerio.Config.errorReportServer);
    request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    request.send(msg);
  }

  function getUTCTimeStamp() {
    var now = new Date();
    return now.valueOf() + now.getTimezoneOffset() * 60000;
  }


};
/**
 * Main library file, contains initialisation code
 */

var Peerio = this.Peerio || {};

/**
 * Initializes all API modules.
 * This should be called whenever DOM/Device is ready.
 * Init order matters.
 */
Peerio.initAPI = function () {
  return Peerio.Config.init()
    .then(function () {
      Peerio.Config.apiFolder = Peerio.apiFolder;
      delete Peerio.apiFolder;
      Peerio.ErrorReporter.init(); // this does not enable error reporting, just initializes.
      Peerio.TinyDB.init();
      Peerio.Util.init();
      Peerio.Crypto.init();
      Peerio.PhraseGenerator.init();
      Peerio.Socket.init();
      Peerio.Net.init();
      Peerio.Dispatcher.init();
      Peerio.Action.init();
      Peerio.ActionOverrides.init();
      Peerio.AppState.init();
      Peerio.Auth.init();
      Peerio.Messages.init();

      Peerio.Socket.start();

      delete Peerio.initAPI;
    });
};

// detecting api folder, this has to be done at script's first evaluation,
// and assumes there are no async scripts
(function () {
  'use strict';

  var path = document.currentScript && document.currentScript.getAttribute('src')
    || document.scripts[document.scripts.length - 1].getAttribute('src');
  // temporary saving api folder in root namespace until Config is initalized
  Peerio.apiFolder = path.substring(0, path.lastIndexOf('/')) + '/';
}());
