'use strict';

const expect = require('chai').expect,
  utils = require('../../lib/utils');

describe('utils', function() {
  describe('pluralize', function() {
  	let pluralize = utils.pluralize;

    it('is defined', function() {
      expect(utils.pluralize).to.be.defined;
    });

    it('pluralizes simple terms', function() {
      expect(pluralize('person')).to.equal('people');
      expect(pluralize('child')).to.equal('children');
      expect(pluralize('man')).to.equal('men');
      expect(pluralize('woman')).to.equal('women');
    });

    it('pluralizes compound terms', function() {
      expect(pluralize('grandchild')).to.equal('grandchildren');
      expect(pluralize('layperson')).to.equal('laypeople');
      expect(pluralize('policeman')).to.equal('policemen');
      expect(pluralize('firewoman')).to.equal('firewomen');
    });

    it('pluralizes irregular words', function() {
      expect(pluralize('tomato')).to.equal('tomatoes');
      expect(pluralize('cargo')).to.equal('cargoes');
      expect(pluralize('fry')).to.equal('fries');
      expect(pluralize('lullaby')).to.equal('lullabies');
      expect(pluralize('wallaby')).to.equal('wallabies');
    });
  });
});
