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

    it('returns one model associated with the given model', function(done) {
      expect(person).to.be.defined;
      expect(person).to.not.be.null;

      Promise.all([
        person.hasOne('cat'),
        person.hasOne('bird')
      ])
      .then(function(pets) {
        expect(pets.length).to.equal(2);
        _.forEach(pets, function(pet, i) {
          if (i === 0) {
            cat = pet;
          } else {
            bird = pet;
          }
          expect(pet).to.be.defined;
          expect(pet).to.not.be.null;
        });
        done();
      });
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

    it('returns two models associated with the given model', function(done) {
      expect(person).to.be.defined;
      expect(person).to.not.be.null;

      person.hasMany('cats')
        .then(function(cats) {
          expect(cats.length).to.equal(2);
          _.forEach(cats, function(cat) {
            expect(cat).to.be.defined;
            expect(cat).to.not.be.null;
          });

          return Promise.all(_.map(cats, function(cat) {
            return cat.get('person');
          }));
        })
        .then(function(people) {
          return Promise.all(_.map(people, function(person) {
            return person.get('name');
          }));
        })
        .then(function(names) {
          _.forEach(names, function(name) {
            expect(name).to.equal('Sue');
          });
          done();
        });
    });
  });

  describe('belongsTo', function() {
    let cat, person;

    beforeEach(function(done) {
      new (Model.create('person'))({
        name: 'Jim'
      }).save()
        .then(function(p) {
          person = p;
          return p.get('id');
        })
        .then(function(person_id) {
          return Promise.resolve(new (Model.create('cat'))({
              name: 'Socks',
              color: 'black',
              person_id: person_id
            }))
            .then(function(cat) {
              return cat.save();
            });
        })
        .then(function(c) {
          cat = c;
          done();
        });
    });

    afterEach(function(done) {
      Promise.all([
        person.delete(),
        cat.delete()
      ])
      .then(function() {
        person = undefined;
        cat = undefined;
        done();
      });
    });

    it('returns a model who owns the given model', function(done) {
      expect(cat).to.be.defined;
      expect(cat).to.not.be.null;

      cat.belongsTo('person')
        .then(function(person) {
          expect(person).to.be.defined;
          expect(person).to.not.be.null;

          return person.get('cat');
        })
        .then(function(cat) {
          return cat.get('name');
        })
        .then(function(name) {
          expect(name).to.equal('Socks');
          done();
        });
    });
  });
});
