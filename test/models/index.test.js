'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model;

describe('base model', function() {
  it('is defined', function() {
    expect(Model).to.be.defined;
  });

  it('can be instantiated', function() {
    expect(function() { new Model(); }).not.to.throw;
    let model = new Model();
    expect(model).to.not.be.null;
  });

  console.log(typeof Model);
});
