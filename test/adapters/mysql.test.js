'use strict';

const expect = require('chai').expect,
  MySQLAdapter = require('../../lib/adapters/mysql');

describe('MySQL adapter', function() {
  it('is defined', function() {
    expect(MySQLAdapter).to.be.defined;
  });

  it('can be instantiated', function() {
    expect(function() { new MySQLAdapter(); }).not.to.throw;
    let adapter = new MySQLAdapter();
    expect(adapter).to.not.be.null;
  });
});
