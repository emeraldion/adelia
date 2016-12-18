'use strict';

const expect = require('chai').expect,
  path = require('path'),
  SQLiteAdapter = require('../../lib/adapters/sqlite');

describe('SQLite adapter', function() {
  it('is defined', function() {
    expect(SQLiteAdapter).to.be.defined;
  });

  it('can be instantiated', function() {
    expect(function() { new SQLiteAdapter(); }).not.to.throw;
    const adapter = new SQLiteAdapter();
    expect(adapter).to.not.be.null;
  });

  describe('getColumns', function() {
    it('returns a list of columns', function(done) {
      const adapter = new SQLiteAdapter();

      adapter.connect(path.join(__dirname, '../../db/sqlite/adelia_test.sqlite'))
        .then(function() {
          return adapter.getColumns('models');
        })
        .then(function(columns) {
          expect(columns).to.eql(['id', 'name']);
          done();
        });
    });
  });
});
