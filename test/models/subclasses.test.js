'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('model subclasses', function() {
  describe('Model.create', function() {
    it('creates a subclass', function() {
      const Cat = Model.create('cat');

      expect(Cat).to.be.defined;
      expect(Cat).to.not.be.null;
    });
  });

  describe('a subclass', function() {
    const Cat = Model.create('cat');

    it('can be instantiated', function() {
      expect(function() { new Cat(); }).not.to.throw;
      const cat = new Cat();
      expect(cat).to.not.be.null;
    });

    describe('findById', function() {
      it('populates the model from DB', function(done) {
        const cat = new Cat();

        cat.findById(1)
          .then(function() {
            return Promise.all([
              cat.get('id'),
              cat.get('name')
            ]);
          })
          .then(function(values) {
            const id = _.first(values),
              name = _.last(values);

            expect(id).to.equal(1);
            expect(name).to.equal('Duchess');
            done();
          });
      });

      it('handles missing model in the DB', function(done) {
        const cat = new Cat();

        cat.findById(-1)
          .catch(function(err) {
            expect(err.code).to.equal('ENOTFOUND');
            done();
          });
      });
    });
  });

  describe('subclass find', function() {
    const Cat = Model.create('cat');

    it('is defined', function() {
      expect(Cat.find).to.be.defined;
    });

    it('finds a model', function(done) {
      Cat.find(1)
        .then(function(cat) {
          expect(cat).to.not.be.null;
          done();
        });
    });

    it('handles missing model in the DB', function(done) {
      Cat.find(-1)
        .catch(function(err) {
          expect(err.code).to.equal('ENOTFOUND');
          done();
        });
    });
  });
});
