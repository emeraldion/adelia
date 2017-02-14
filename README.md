[![Build Status](https://travis-ci.org/emeraldion/adelia.svg?branch=master)](https://travis-ci.org/emeraldion/adelia)
[![Coverage Status](https://coveralls.io/repos/github/emeraldion/adelia/badge.svg?branch=master)](https://coveralls.io/github/emeraldion/adelia?branch=master)

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

This assumes you already have a MySQL server to use. For local development, see the [Development](https://github.com/emeraldion/adelia/blob/master/README.md#development) section below.

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

## Status

* MySQL support: **STABLE**
* SQLite support: **EXPERIMENTAL**

MySQL support is currently stable, with some known issues.
SQLite support is currently experimental. Tests are failing locally and in TravisCI. If you'd like to use Adelia on SQLite and can contribute fixes and enhancements, please submit a PR!

## Contributing

Thank you for your interest in Adelia! Feel free to open issues or submit a PR. See the [Contributing Guidelines](https://github.com/emeraldion/adelia/blob/master/CONTRIBUTING.md) for detailed instructions.

## Development

Adelia is a Node module. If you are unsure what to do, follow these steps:

### Installing a local MySQL server

For development, it's best to use a [local MySQL server](https://dev.mysql.com/doc/mysql-getting-started/). I use [MAMP](https://www.mamp.info/) on Mac OS X, but you can also run MySQL server in [a Docker container](https://hub.docker.com/r/mysql/mysql-server/).

### Install dependencies

```sh
npm install
```

### Run tests

The default test target should be sufficient for most contributors:

```sh
npm test
```

If you want to run tests for MySQL alone, run:

```sh
npm run test-mysql
```

There are also SQLite specific tests:

```sh
npm run test-sqlite
```

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](https://github.com/emeraldion/adelia/blob/master/CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2016, Claudio Procida
