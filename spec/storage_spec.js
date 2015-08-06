/**
 * Storage specs
 */

describe('TinyDB storage', function () {
  var db;
  beforeAll(function () {
    localStorage.clear();
    expect(localStorage.key(0)).toBe(null);
    db = Peerio.TinyDB;
  });

  afterAll(function () {
    db.clear();
    expect(localStorage.key(0)).toBe(null);
  });

  it('sets and deletes a string value', function (done) {
    var key = 'stringValKey';
    var val = 'stringVal';

    db.setVar(key, val)
      .then(function () {
        return db.getString(key);
      })
      .then(function (retval) {
        expect(retval).toBe(val);
        db.removeItem(key);
        return db.getString(key);
      })
      .then(function (retval) {
        expect(retval).toBe(null);
        done();
      })
      .catch(done.fail);
  });

  it('sets an integer number value', function (done) {
    var key = 'intValKey';
    var val = 42345;
    db.setVar(key, val)
      .then(function () {
        return db.getNumber(key);
      })
      .then(function (retval) {
        expect(retval).toBe(val);
        done();
      })
      .catch(done.fail);
  });

  it('sets an float number value', function (done) {
    var key = 'floatValKey';
    var val = 423.234234;
    db.setVar(key, val)
      .then(function () {
        return db.getNumber(key);
      })
      .then(function (retval) {
        expect(retval).toBe(val);
        done();
      })
      .catch(done.fail);
  });

  it('sets a bool value', function (done) {
    var key = 'boolValKey';
    var val = true;
    db.setVar(key, val)
      .then(function () {
        return db.getBool(key);
      })
      .then(function (retval) {
        expect(retval).toBe(val);
        done();
      })
      .catch(done.fail);
  });

  it('sets an object value', function (done) {
    var key = 'objValKey';
    var val = {lalala: 'popopo', asdf: 111};
    db.setObject(key, val)
      .then(function () {
        return db.getObject(key);
      })
      .then(function (retval) {
        expect(retval).toEqual(val);
        done();
      })
      .catch(done.fail);
  });

});