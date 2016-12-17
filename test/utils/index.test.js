'use strict';

const expect = require('chai').expect,
  utils = require('../../lib/utils');

describe('utils', function() {
  describe('pluralize', function() {
  	let pluralize = utils.pluralize;

    it('is defined', function() {
      expect(utils.pluralize).to.be.defined;
    });

    it('pluralizes arbitrary words', function() {
      expect(pluralize('cat')).to.equal('cats');
      expect(pluralize('dog')).to.equal('dogs');
      expect(pluralize('ant')).to.equal('ants');
      expect(pluralize('penguin')).to.equal('penguins');
      expect(pluralize('whale')).to.equal('whales');
      expect(pluralize('panda')).to.equal('pandas');
    });

    it('pluralizes listed irregular words', function() {
      expect(pluralize('person')).to.equal('people');
      expect(pluralize('child')).to.equal('children');
      expect(pluralize('man')).to.equal('men');
      expect(pluralize('woman')).to.equal('women');
    });

    it('pluralizes compound listed irregular words', function() {
      expect(pluralize('grandchild')).to.equal('grandchildren');
      expect(pluralize('layperson')).to.equal('laypeople');
      expect(pluralize('policeman')).to.equal('policemen');
      expect(pluralize('firewoman')).to.equal('firewomen');
    });

    it('pluralizes unlisted irregular words', function() {
      expect(pluralize('tomato')).to.equal('tomatoes');
      expect(pluralize('cargo')).to.equal('cargoes');
      expect(pluralize('fry')).to.equal('fries');
      expect(pluralize('lullaby')).to.equal('lullabies');
      expect(pluralize('wallaby')).to.equal('wallabies');
    });
  });

  describe('singularize', function() {
  	let singularize = utils.singularize;

    it('is defined', function() {
      expect(utils.singularize).to.be.defined;
    });

    it('singularizes arbitrary words', function() {
      expect(singularize('cats')).to.equal('cat');
      expect(singularize('dogs')).to.equal('dog');
      expect(singularize('ants')).to.equal('ant');
      expect(singularize('penguins')).to.equal('penguin');
      expect(singularize('whales')).to.equal('whale');
      expect(singularize('pandas')).to.equal('panda');
    });

    it('singularizes listed irregular words', function() {
      expect(singularize('people')).to.equal('person');
      expect(singularize('children')).to.equal('child');
      expect(singularize('men')).to.equal('man');
      expect(singularize('women')).to.equal('woman');
    });

    it('singularizes compound listed irregular words', function() {
      expect(singularize('grandchildren')).to.equal('grandchild');
      expect(singularize('laypeople')).to.equal('layperson');
      expect(singularize('policemen')).to.equal('policeman');
      expect(singularize('firewomen')).to.equal('firewoman');
    });

    it('singularizes unlisted irregular words', function() {
      expect(singularize('tomatoes')).to.equal('tomato');
      expect(singularize('cargoes')).to.equal('cargo');
      expect(singularize('fries')).to.equal('fry');
      expect(singularize('lullabies')).to.equal('lullaby');
      expect(singularize('wallabies')).to.equal('wallaby');
    });
  });

  describe('table_name_to_class_name', function() {
  	let table_name_to_class_name = utils.table_name_to_class_name;

    it('is defined', function() {
      expect(utils.table_name_to_class_name).to.be.defined;
    });

    it('works as expected on simple words', function() {
      expect(table_name_to_class_name('lions')).to.equal('Lion');
      expect(table_name_to_class_name('cats')).to.equal('Cat');
      expect(table_name_to_class_name('penguins')).to.equal('Penguin');
    });

    it('works as expected on compound words', function() {
      expect(table_name_to_class_name('mountain_lions')).to.equal('MountainLion');
      expect(table_name_to_class_name('emperor_penguins')).to.equal('EmperorPenguin');
    });
  });

  describe('camel_case_to_joined_lower', function() {
  	let camel_case_to_joined_lower = utils.camel_case_to_joined_lower;

    it('is defined', function() {
      expect(utils.camel_case_to_joined_lower).to.be.defined;
    });

    it('works as expected on simple words', function() {
      expect(camel_case_to_joined_lower('Lion')).to.equal('lion');
      expect(camel_case_to_joined_lower('Cat')).to.equal('cat');
      expect(camel_case_to_joined_lower('Penguin')).to.equal('penguin');
    });

    it('works as expected on compound words', function() {
      expect(camel_case_to_joined_lower('MountainLion')).to.equal('mountain_lion');
      expect(camel_case_to_joined_lower('EmperorPenguin')).to.equal('emperor_penguin');
    });
  });
});
