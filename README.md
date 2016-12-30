[![Build Status](https://travis-ci.org/emeraldion/adelia.svg?branch=master)](https://travis-ci.org/emeraldion/adelia)

# adelia

:penguin: Antarctic-friendly ORM for Node

[![Adélie penguins on an iceberg](https://c3.staticflickr.com/4/3426/3212303306_aed5d043e5_z.jpg)](https://www.flickr.com/photos/10004136@N05/3212303306)

_<small>Photo (c) by Jason Auch</small>_

## Design Principles

Adelia is meant to be a fast, simple, promise-based ORM for Node, loosely inspired to Martin Fowler's [ActiveRecord](http://www.martinfowler.com/eaaCatalog/activeRecord.html) pattern popularized by [Ruby on Rails](http://rubyonrails.org/). Due to the async IO nature of Node and DB clients, the API must be async. Adelia uses [Promises](https://promisesaplus.com/) to offer a clean, uncluttered API that's easy to compose and reason about.

## Features

* Accessors: `has`, `get`, `set`, `unset`.
* Persistence: `save`, `delete`.
* Query: `find`, `findById`, `findAll`, `findByQuery`, `countAll`.
* Relationships: `hasOne`, `hasMany`, `belongsTo`, `hasAndBelongsToMany`.
* Specialization: `create`.

## Configuration

Set these environment variables in your script:

* `DB` one of the supported databases: `mysql` (default), or `sqlite` (experimental).

### MySQL

Set these variables to configure Adelia to use a MySQL database server: 

* `MYSQL_HOST` host of the MySQL database server.
* `MYSQL_PORT` port of the MySQL database server.
* `MYSQL_USER` username to connect to the MySQL database server.
* `MYSQL_PASSWORD` password of the user of the MySQL database server.
* `MYSQL_DB` name of the MySQL database.

### SQLite

Set this variable to configure Adelia to use a SQLite database:

* `SQLITE_DB` path to the SQLite database file.

## Usage

Adelia has a concise, promise-based API that allows you to perform chained operations to query and fetch model objects, access their properties, persist, and delete them. Here's an example:

```js
const Model = require('adelia').Model;

// Creates a specialized model class
const Penguin = Model.create('penguin');

// Instantiates a penguin
const emperor = new Penguin({
  species: 'Emperor'
});

let emperor_id;

// Saves the penguin to DB
emperor.save()
	.then(model => model.get('id'))
	.then(id => { emperor_id = id; });

// Fetches a model from the DB
Penguin.find(emperor_id)
	.then(model => model.get('species'))
	.then(name => console.log(`My species is ${name}`));
// => My species is Emperor
```

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2016, Claudio Procida
