'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('model relationships', function() {
  describe('hasOne', function() {
    let bird, cat, person;

    beforeEach(function(done) {
      new (Model.create('person'))({
        name: 'Joel'
      }).save()
        .then(function(p) {
          person = p;
          return p.get('id');
        })
        .then(function(person_id) {
          return Promise.all([
            Promise.resolve(new (Model.create('bird'))({
              name: 'Canary',
              person_id: person_id
            }))
            .then(function(model) {
              return model.save();
            }),
            Promise.resolve(new (Model.create('cat'))({
              name: 'Bizet',
              color: 'black',
              person_id: person_id
            }))
            .then(function(model) {
              return model.save();
            })
          ]);
        })
        .then(function(arr) {
          bird = arr[0];
          cat = arr[1];
          done();
        });
    });

    afterEach(function(done) {
      Promise.all([
        person.delete(),
        cat.delete(),
        bird.delete()
      ])
      .then(function() {
        person = undefined;
        bird = undefined;
        cat = undefined;
        done();
      });
    });

    it('returns one model associated with the given model', function() {
      expect(person).to.be.defined;
      expect(person).to.not.be.null;

      expect(cat).to.be.defined;
      expect(cat).to.not.be.null;

      expect(bird).to.be.defined;
      expect(bird).to.not.be.null;
    });
  });

  describe('hasMany', function() {
    let cat1, cat2, person;

    beforeEach(function(done) {
      new (Model.create('person'))({
        name: 'Sue'
      }).save()
        .then(function(p) {
          person = p;
          return p.get('id');
        })
        .then(function(person_id) {
          return Promise.all([
            Promise.resolve(new (Model.create('cat'))({
              name: 'Mario',
              color: 'red',
              person_id: person_id
            }))
            .then(function(model) {
              return model.save();
            }),
            Promise.resolve(new (Model.create('cat'))({
              name: 'Luigi',
              color: 'black',
              person_id: person_id
            }))
            .then(function(model) {
              return model.save();
            })
          ]);
        })
        .then(function(arr) {
          cat1 = arr[0];
          cat2 = arr[1];
          done();
        });
    });

    afterEach(function(done) {
      Promise.all([
        person.delete(),
        cat1.delete(),
        cat2.delete()
      ])
      .then(function() {
        person = undefined;
        cat1 = undefined;
        cat2 = undefined;
        done();
      });
    });

    it('returns one model associated with the given model', function(done) {
      expect(person).to.be.defined;
      expect(person).to.not.be.null;

      person.hasMany('cats')
        .then(function(cats) {
          expect(cats.length).to.equal(2);
          _.forEach(cats, function(cat) {
            expect(cat).to.be.defined;
            expect(cat).to.not.be.null;
          });
          done();
        });
    });
  });
});
