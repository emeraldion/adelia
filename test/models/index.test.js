'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('base model', function() {
  it('is defined', function() {
    expect(Model).to.be.defined;
  });

  it('can be instantiated', function() {
    expect(function() { new Model(); }).not.to.throw;
    let model = new Model();
    expect(model).to.not.be.null;
  });

  describe('constructor', function() {
    it('populates the model setting values', function(done) {
      let model = new Model({
        name: 'King'
      });

      model.has('name').then(function(value) {
        expect(value).to.be.true;
        done();
      });
    });

    it('populates the model assigning values', function(done) {
      let model = new Model({
        name: 'King'
      });

      model.get('name').then(function(value) {
        expect(value).to.equal('King');
        done();
      });
    });
  });

  describe('get', function() {
    it('returns the value if set', function(done) {
      let model = new Model({
        name: 'King'
      });

      model.get('name').then(function(value) {
        expect(value).to.equal('King');
        done();
      });
    });

    it('returns null if not set', function(done) {
      let model = new Model({
        name: 'King'
      });

      model.get('foo').then(function(value) {
        expect(value).to.be.null;
        done();
      });
    });
  });

  describe('findById', function() {
    it('populates the model from DB', function(done) {
      let model = new Model();

      model.findById(1)
        .then(function() {
          Promise.all([
            model.get('id').then(function(value) {
              expect(value).to.equal(1);
            }),
            model.get('name').then(function(value) {
              expect(value).to.equal('Adelia');
            })
          ]).then(function() {
            done();
          });
        });
    });

    it('handles missing data DB', function(done) {
      let model = new Model();

      model.findById(-1)
        .catch(function(err) {
          expect(err.code).to.equal('ENOTFOUND');
          done();
        });
    });
  });
});
