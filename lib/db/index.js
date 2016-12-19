'use strict';

const _ = require('lodash'),
  MySQLAdapter = require('../adapters/mysql'),
  SQLiteAdapter = require('../adapters/sqlite');

const DB = _.defaultTo(process.env.DB, 'mysql');

let sqliteAdapter;

const Db = _.assign({}, {
  getConnection: function() {
    switch (DB) {
    case 'mysql':
      return new MySQLAdapter();
    case 'sqlite':
      if (_.isUndefined(sqliteAdapter)) {
        sqliteAdapter = new SQLiteAdapter();
      }
      return sqliteAdapter;
    }
    return null;
  },

  closeConnection: function(conn) {
    conn.close();
  }
});

module.exports = Db;
