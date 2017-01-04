'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('base model', function() {
  describe('save', function() {
    let id;

    afterEach(function(done) {
      if (_.isUndefined(id)) {
        done();
        return;
      }

      Model.find(id)
        .then(function(model) {
          return model.delete();
        })
        .then(function() {
          id = undefined;
          done();
        });
    });

    afterEach(function(done) {
      Model.find(99)
        .then(function(model) {
          return model.delete();
        })
        .then(function() {
          done();
        })
        .catch(function() {
          done();
        });
    });

    it('persists a new model', function(done) {
      const model = new Model({
        name: 'King'
      });

      model.save()
        .then(function(model) {
          return model.get('id');
        })
        .then(function(value) {
          id = value;
          return Model.find(value);
        })
        .then(function(model) {
          expect(model).to.not.be.null;
          done();
        });
    });

    it('updates an existing model', function(done) {
      Model.find(1)
        .then(function(model) {
          return model.save();
        })
        .then(function(model) {
          return Promise.all([
            model.get('id'),
            model.get('name')
          ]);
        })
        .then(function(arr) {
          const id = arr[0];
          const name = arr[1];

          expect(id).to.equal(1);
          expect(name).to.equal('Adelia');

          done();
        });
    });

    it('opts.force inserts a model when primary key is set', function(done) {
      new Model({
          id: 99,
          name: 'Puffin'
        }).save({
          force: true
        })
        .then(function(model) {
          return Promise.all([
            model.get('id'),
            model.get('name')
          ]);
        })
        .then(function(arr) {
          const id = arr[0];
          const name = arr[1];

          expect(id).to.equal(99);
          expect(name).to.equal('Puffin');

          done();
        });
    });

    it('opts.ignore inserts ignore a model', function(done) {
      new Model({
          id: 99,
          name: 'Puffin'
        }).save({
          force: true
        }).then(function(model) {
          return model.save({
            force: true,
            ignore: true
          });
        })
        .then(function(model) {
          return Promise.all([
            model.get('id'),
            model.get('name')
          ]);
        })
        .then(function(arr) {
          const id = arr[0];
          const name = arr[1];

          expect(id).to.equal(99);
          expect(name).to.equal('Puffin');

          done();
        })
        .catch(function(err) {
          console.error(err);
          done();
        });
    });
  });

  describe('delete', function() {
    let id;

    afterEach(function(done) {
      Model.find(id)
        .then(function(model) {
          return model.delete();
        })
        .then(function() {
          done();
        }, function() {
          done();
        });
    });

    it('deletes a persisted model', function(done) {
      const model = new Model({
        name: 'Pen-Pen'
      });

      model.save()
        .then(function(model) {
          return model.get('id');
        })
        .then(function(value) {
          id = value;
          return model.delete();
        })
        .then(function() {
          return Model.find(id);
        })
        .catch(function(err) {
          expect(err).to.not.be.undefined;
          expect(err.code).to.equal('ENOTFOUND');
          done();
        });
    });

    it('resolves false an ephemeral model', function(done) {
      const model = new Model({
        name: 'Agata'
      });

      model.delete()
        .then(function(result) {
          expect(result).to.be.false;
          done();
        });
    });
  });
});
