'use strict';

const _ = require('lodash'),
  MySQLAdapter = require('../adapters/mysql'),
  SQLiteAdapter = require('../adapters/sqlite');

const DB = _.defaultTo(process.env.DB, 'mysql');

const Db = _.assign({}, {
  getConnection: function() {
    switch (DB) {
      case 'mysql':
        return new MySQLAdapter();
      case 'sqlite':
        return new SQLiteAdapter();
    }
    return null;
  },

  closeConnection: function(conn) {
    conn.close();
  }
});

module.exports = Db;
