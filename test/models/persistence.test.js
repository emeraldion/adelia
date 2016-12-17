'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('base model', function() {
  describe('save', function() {
    it('persists a new model', function(done) {
      let model = new Model({
        name: 'King'
      });

      model.save().then(function(model) {
        model.get('id').then(function(value) {
          Model.find(value).then(function(model) {
            expect(model).to.not.be.null;
            done();
          });
        });
      });
    });

    it('updates an existing model', function(done) {
      Model.find(1).then(function(model) {
        model.save().then(function(model) {
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
    });
  });
});
