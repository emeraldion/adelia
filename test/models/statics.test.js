'use strict';

const expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('static method', function() {
  describe('Model.find', function() {
    it('is defined', function() {
      expect(Model.find).to.be.defined;
    });

    it('finds a model', function(done) {
      Model.find(1, 'model').then(function(model) {
        expect(model).to.not.be.null;
        done();
      });
    });

    it('finds an existing subclass', function(done) {
      let Cat = Model.create('cat');

      Model.find(1, 'cat').then(function(cat) {
        expect(cat).to.not.be.null;
        done();
      });
    });

    it('finds a synthesized subclass', function(done) {
      Model.find(1, 'bird').then(function(cat) {
        expect(cat).to.not.be.null;
        done();
      });
    });
  });
});
