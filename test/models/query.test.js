'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  Model = require('../../lib').Model,
  Promise = require('bluebird');

describe('base model query', function() {
  describe('findById', function() {
    it('populates the model from DB', function(done) {
      const model = new Model();

      model.findById(1)
        .then(function() {
          return Promise.all([
            model.get('id'),
            model.get('name')
          ]);
        })
        .then(function(values) {
          const id = values[0];
          const name = values[1];

          expect(id).to.equal(1);
          expect(name).to.equal('Adelia');

          done();
        });
    });

    it('handles missing data DB', function(done) {
      const model = new Model();

      model.findById(-1)
        .catch(function(err) {
          expect(err.code).to.equal('ENOTFOUND');
          done();
        });
    });
  });
});

describe('model subclass query', function() {
  const Person = Model.create('person');
  let id_ada, id_carrie;
  
  beforeEach(function(done) {
    Promise.all([
      new Person({
        name: 'Ada',
        age: 60
      }).save(),
      new Person({
        name: 'Carrie',
        age: 60
      }).save()
    ])  
    .then(function(people) {
      return Promise.all(
        _.map(people, person => person.get('id'))
      );
    })
    .then(function(ids) {
      id_ada = ids[0];
      id_carrie = ids[1];
      done();
    });
  });

  afterEach(function(done) {
    Promise.all([
      Person.find(id_ada),
      Person.find(id_carrie)
    ])
    .then(function(people) {
      return Promise.all(_.map(people, person => person.delete()));
    })
    .then(function() {
      id_carrie = undefined;
      id_ada = undefined;
      done();
    });
  });

  describe('findByQuery', function() {
    it('finds a person by name', function(done) {
      const person = new Person();

      person.findByQuery('SELECT * FROM `people` WHERE `name` = \'Ada\'')
      .then(function(people) {
        expect(people.length).to.equal(1);
        const person = people[0];
        return person.get('id');
      })
      .then(function(value) {
        expect(value).to.equal(id_ada);
        done();
      });
    });

    it('finds people by age', function(done) {
      const person = new Person();

      person.findByQuery('SELECT * FROM `people` WHERE `age` = 60')
      .then(function(people) {
        expect(people.length).to.equal(2);
        return Promise.all(_.map(people, person => person.get('id')));
      })
      .then(function(values) {
        expect(values).to.be.an.instanceof(Array);
        expect(values.length).to.equal(2);

        expect(_.includes(values, id_carrie)).to.be.true;
        expect(_.includes(values, id_ada)).to.be.true;

        done();
      });
    });

    it('finds a person by name and age', function(done) {
      const person = new Person();

      person.findByQuery('SELECT * FROM `people` WHERE `name`= \'Carrie\' AND `age` = 60')
      .then(function(people) {
        expect(people.length).to.equal(1);
        const person = people.pop();
        return person.get('id');
      })
      .then(function(value) {
        expect(value).to.equal(id_carrie);
        done();
      });
    });

    it('handles no results', function(done) {
      const person = new Person();

      person.findByQuery('SELECT * FROM `people` WHERE `name`= \'Chewbacca\'')
      .then(function(people) {
        expect(people).to.be.null;
        done();
      });
    });
  });

  describe('findAll', function() {
    it('finds a person by name', function(done) {
      const person = new Person();

      person.findAll({
        whereClause: '`name` = \'Ada\''
      })
      .then(function(people) {
        expect(people.length).to.equal(1);
        const person = people[0];
        return person.get('id');
      })
      .then(function(value) {
        expect(value).to.equal(id_ada);
        done();
      });
    });

    it('finds people by age', function(done) {
      const person = new Person();

      person.findAll({
        whereClause: '`age` = 60'
      })
      .then(function(people) {
        expect(people.length).to.equal(2);
        return Promise.all(_.map(people, person => person.get('id')));
      })
      .then(function(values) {
        expect(values).to.be.an.instanceof(Array);
        expect(values.length).to.equal(2);

        expect(_.includes(values, id_carrie)).to.be.true;
        expect(_.includes(values, id_ada)).to.be.true;

        done();
      });
    });

    it('finds a person by name and age', function(done) {
      const person = new Person();

      person.findAll({
        whereClause: '`name`= \'Carrie\' AND `age` = 60'
      })
      .then(function(people) {
        expect(people.length).to.equal(1);
        const person = people.pop();
        return person.get('id');
      })
      .then(function(value) {
        expect(value).to.equal(id_carrie);
        done();
      });
    });

    it('handles no results', function(done) {
      const person = new Person();

      person.findAll({
        whereClause: '`name`= \'Chewbacca\''
      })
      .then(function(people) {
        expect(people).to.be.null;
        done();
      });
    });
  });

  describe('countAll', function() {
    it('counts people by name', function(done) {
      const person = new Person();

      person.countAll({
        whereClause: '`name` = \'Ada\''
      })
      .then(function(count) {
        expect(count).to.equal(1);
        done();
      });
    });

    it('counts people by age', function(done) {
      const person = new Person();

      person.countAll({
        whereClause: '`age` = 60'
      })
      .then(function(count) {
        expect(count).to.equal(2);
        done();
      });
    });

    it('counts people by name and age', function(done) {
      const person = new Person();

      person.countAll({
        whereClause: '`name`= \'Carrie\' AND `age` = 60'
      })
      .then(function(count) {
        expect(count).to.equal(1);
        done();
      });
    });

    it('handles no results', function(done) {
      const person = new Person();

      person.countAll({
        whereClause: '`name`= \'Chewbacca\''
      })
      .then(function(count) {
        expect(count).to.equal(0);
        done();
      });
    });
  });
});
