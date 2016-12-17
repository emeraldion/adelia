'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('base model', function() {
  describe('save', function() {
    it('persists a model to the DB', function(done) {
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
  });
});
