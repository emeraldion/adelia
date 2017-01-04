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

    it('returns a list of columns with table constraints', function(done) {
      const adapter = new SQLiteAdapter();

      adapter.connect(path.join(__dirname, '../../db/sqlite/adelia_test.sqlite'))
        .then(function() {
          return adapter.getColumns('books_people');
        })
        .then(function(columns) {
          expect(columns).to.eql(['person_id', 'book_id']);
          done();
        });
    });
  });

  describe('escape', function() {
    it('escapes the argument', function() {
      const adapter = new SQLiteAdapter();

      expect(adapter.escape('foo')).to.equal('foo');
      expect(adapter.escape('foo\'bar')).to.equal('foo\\\'bar');
      expect(adapter.escape('foo.bar')).to.equal('foo.bar');
    });
  });

  describe('escapeId', function() {
    it('escapes the argument', function() {
      const adapter = new SQLiteAdapter();

      expect(adapter.escapeId('foo')).to.equal('foo');
      expect(adapter.escapeId('foo\'bar')).to.equal('foo\'bar');
      expect(adapter.escapeId('foo.bar')).to.equal('foo`.`bar');
    });
  });
});
