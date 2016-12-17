'use strict';

const expect = require('chai').expect,
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
});
