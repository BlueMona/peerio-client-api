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

  afterAll(function(){
    db.clear();
    expect(localStorage.key(0)).toBe(null);
  });

  it('sets and deletes a string value', function () {
    var key = 'stringValKey';
    var val = 'stringVal';
    db.setVar(key, val);
    expect(db.getString(key)).toBe(val);
    db.removeItem(key);
    expect(db.getString(key)).toBe(null);
  });

  it('sets an integer number value', function () {
    var key = 'intValKey';
    var val = 42345;
    db.setVar(key, val);
    expect(db.getNumber(key)).toBe(val);
  });

  it('sets an float number value', function () {
    var key = 'floatValKey';
    var val = 423.234234;
    db.setVar(key, val);
    expect(db.getNumber(key)).toBe(val);
  });

  it('sets a bool value', function () {
    var key = 'boolValKey';
    var val = true;
    db.setVar(key, val);
    expect(db.getBool(key)).toBe(val);
  });

  it('sets an object value', function () {
    var key = 'objValKey';
    var val = {lalala: 'popopo', asdf: 111};
    db.setObject(key, val);
    expect(db.getObject(key)).toEqual(val);
  });

});