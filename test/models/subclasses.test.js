'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('model subclasses', function() {
  describe('Model.create', function() {
    it('creates a subclass', function() {
      let Cat = Model.create('cat');
      expect(Cat).to.be.defined;
      expect(Cat).to.not.be.null;
    });
  });

  describe('a subclass', function() {
    let Cat = Model.create('cat');

    it('can be instantiated', function() {
      expect(function() { new Cat(); }).not.to.throw;
      let cat = new Cat();
      expect(cat).to.not.be.null;
    });

    describe('findById', function() {
      it('populates the model from DB', function(done) {
        let cat = new Cat();

        cat.findById(1)
          .then(function() {
            Promise.all([
              cat.get('id').then(function(value) {
                expect(value).to.equal(1);
              }),
              cat.get('name').then(function(value) {
                expect(value).to.equal('Duchess');
              })
            ]).then(function() {
              done();
            });
          });
      });

      it('handles missing data DB', function(done) {
        let cat = new Cat();

        cat.findById(-1)
          .catch(function(err) {
            expect(err.code).to.equal('ENOTFOUND');
            done();
          });
      });
    });
  })
});
