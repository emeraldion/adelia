'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('base model', function() {
  describe('save', function() {
    it('persists a new model', function(done) {
      const model = new Model({
        name: 'King'
      });

      model.save()
        .then(function(model) {
          return model.get('id');
        })
        .then(function(value) {
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
  });

  describe('delete', function() {
    it('deletes a persisted model', function(done) {
      const model = new Model({
        name: 'Pen-Pen'
      });
      let id;

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
