[![Build Status](https://travis-ci.org/emeraldion/adelia.svg?branch=master)](https://travis-ci.org/emeraldion/adelia)

# adelia

Antarctic-friendly ORM for Node

## Design Principles

Adelia is meant to be a fast, simple, promise-based ORM for Node, loosely inspired to Martin Fowler's [ActiveRecord](http://www.martinfowler.com/eaaCatalog/activeRecord.html) pattern popularized by [Ruby on Rails](http://rubyonrails.org/). Due to the async IO nature of Node and DB clients, the API must be async. Adelia uses [Promises](https://promisesaplus.com/) to offer a clean, uncluttered API that's easy to compose and reason about.

## Features

* Accessors: `has`, `get`, `set`, `unset`.
* Persistence: `save`, `delete`.
* Query: `find`, `findById`, `findAll`, `findByQuery`, `countAll`.
* Relationships: `hasOne`, `hasMany`, `belongsTo`, `hasAndBelongsToMany`.
* Specialization: `create`.

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2016, Claudio Procida
