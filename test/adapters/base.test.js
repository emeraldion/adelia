'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  BaseAdapter = require('../../lib/adapters/_base');

function BaseAdapterSubclass() {
}

_.assign(BaseAdapterSubclass.prototype, BaseAdapter.prototype, {});

describe('Base adapter', function() {
  it('is defined', function() {
    expect(BaseAdapter).to.be.defined;
  });

  it('can not be instantiated', function() {
    expect(function() { new BaseAdapter(); }).to.throw;
  });

  describe('escapeId', function() {
    it('escapes the id', function() {
      const adapter = new BaseAdapterSubclass();

      expect(adapter.escapeId('foo')).to.equal('foo');
      expect(adapter.escapeId('foo.bar')).to.equal('foo`.`bar');
      expect(adapter.escapeId('foo`bar')).to.equal('foo\`bar');
    });

    it('leaves dots alone when ignoreDots is true', function() {
      const adapter = new BaseAdapterSubclass();

      expect(adapter.escapeId('foo', true)).to.equal('foo');
      expect(adapter.escapeId('foo.bar', true)).to.equal('foo.bar');
      expect(adapter.escapeId('foo`bar', true)).to.equal('foo\`bar');
    });
  });
});
