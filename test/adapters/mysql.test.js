'use strict';

const expect = require('chai').expect,
  MySQLAdapter = require('../../lib/adapters/mysql');

describe('MySQL adapter', function() {
  it('is defined', function() {
    expect(MySQLAdapter).to.be.defined;
  });

  it('can be instantiated', function() {
    expect(function() { new MySQLAdapter(); }).not.to.throw;
    const adapter = new MySQLAdapter();
    expect(adapter).to.not.be.null;
  });

  describe('getColumns', function() {
    it('returns a list of columns', function(done) {
      const adapter = new MySQLAdapter();

      adapter.connect()
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
