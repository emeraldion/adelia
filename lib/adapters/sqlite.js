'use strict';

require('babel-polyfill');

const _ = require('lodash'),
  Promise = require('bluebird'),
  sprintf = require('sprintf-js').sprintf,
  sqlite = require('sqlite/legacy'),
  BaseAdapter = require('./_base');

const DEBUG = process.env.DEBUG;

const MAX_RETRIES = 10;

function isInsertOrUpdate(query) {
  return _.startsWith(query, 'INSERT') ||
    _.startsWith(query, 'UPDATE');
}

// TODO: move to initialization
// e.g.:
//   const adelia = require('adelia')(CONFIG);
//   const model = new adelia.Model();
const CONFIG = {
  database: process.env.SQLITE_DB
};

function SQLiteAdapter() {
}

_.assign(SQLiteAdapter.prototype, BaseAdapter.prototype, {
  /**
   *  @attr NAME
   *  @short Name of this adapter
   */
  NAME: 'sqlite',

  /**
   *  @attr queries_count
   *  @short Counter for queries executed.
   */
  queries_count: 0,

  /**
   *  @attr connection
   *  @short Connection link to the database.
   */
  connection: null,

  /**
   *  @attr query
   *  @short Query for the database.
   */
  query: null,

  /**
   *  @attr result
   *  @short The result of the last query.
   */
  result: null,

  /**
   *  @fn connect
   *  @short Connects to the database.
   */
  connect: function(database) {
    if (_.isUndefined(this.connection) || this.connection === null) {
      const db = _.defaultTo(database, CONFIG.database);

      this.connection = sqlite.open(db);
    }

    return this.connection;
  },

  /**
   *  @fn select_db(database_name)
   *  @short Selects the desired database.
   *  @param database_name The name of the database.
   */
  // select_db: function(database_name) {
  //   this.connect();
  //   return mysql_select_db(database_name, this.link);
  // },

  /**
   *  @fn close
   *  @short Closes the connection to the database.
   */
  close: function() {
    // const ret = this.connection.close();

    // this.connection = null;
    // return ret;
  },

  /**
   *  @fn prepare(query)
   *  @short Prepares a query for execution
   *  @param query The query to execute.
   */
  prepare: function(query) {
    const self = this;
    const args = arguments;
    const args_len = arguments.length;

    return this.connect()
      .then(function() {
        if (args_len > 1) {
          for (let i = 1; i < args_len; i++) {
            // query = query.replace('{' + i + '}', mysql.escape(args[i]));
            query = query.replace('{' + i + '}', args[i]);
          }
        }
        self.query = query;

        if (DEBUG) {
          self._printQuery();
        }

        return query;
      });
  },

  /**
   *  @fn exec
   *  @short Executes a query.
   */
  exec: function() {
    const self = this;

    return this.connect()
      .then(function() {
        if (isInsertOrUpdate(self.query)) {
          self.result = sqlite.run(self.query)
            .then(function(result) {
              if (!_.isUndefined(result.lastID) && result.lastID !== 0) {
                result.insertId = result.lastID;
              }
              return result;
            });
        } else {
          self.result = sqlite.all(self.query);
        }
        self.queries_count++;

        return self.result;
      });
  },

  /**
   *  @fn deleteOne
   *  @short Deletes one row
   *  @param tableName Name of table
   *  @param keyColumn Name of key column
   *  @param keyValue Value of key column
   *  @param options Misc options
   */
  deleteOne: function(tableName, keyColumn, keyValue, options) {
    return this.delete(tableName, keyColumn, keyValue, _.merge(options, {
      one: true
    }));
  },

  /**
   *  @fn delete
   *  @short Deletes rows
   *  @param tableName Name of table
   *  @param keyColumn Name of key column
   *  @param keyValue Value of key column
   *  @param options Misc options
   */
  delete: function(tableName, keyColumn, keyValue, options) {
    const self = this;

    return this.connect()
      .then(function() {
        return self.prepare(sprintf("DELETE FROM `{1}` WHERE `%s` = '{2}'", keyColumn),
          tableName, keyValue);
      })
      .then(function() {
        let ex,
          retry = true,
          ret = self.exec()
            .catch(function(e) {
              if (e.code === 'SQLITE_BUSY') {
                if (_.isNumber(options.retryCount)) {
                  options.retryCount++;
                } else {
                  options.retryCount = 1;
                }

                if (options.retryCount < MAX_RETRIES) {
                  ret = self.delete(tableName, keyColumn, keyValue, options);
                  return;
                }
                console.warn('[SQLiteAdapter] max retryCount exceeded:', options.retryCount);
              }
              ex = e;
            });

        if (!_.isUndefined(ex)) {
          throw ex;
        }
        return ret;
      })
      .catch(function(e) {
        console.error('[SQLiteAdapter] delete:error:', e);
      });
  },

  /**
   *  @fn getColumns
   *  @short Describes a table.
   */
  getColumns: function(tableName) {
    const CONSTRAINT_KEYWORDS = ['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'CHECK', 'FOREIGN'];

    return this.connect()
      .then(function() {
        return sqlite.get(sprintf("SELECT sql FROM sqlite_master WHERE name = '%s'", tableName));
      })
      .then(function(result) {
        const sql = result.sql;
        const matches = sql.match(/\(([^]+)\)/m);
        let columns = [];

        if (matches) {
          columns = matches[1]
            .replace(/\([^)]+\)/m, '')
            .split(',')
            .map(function(el) {
              return el
                .trim()
                .split(' ')[0]
                .replace(/["']/g, '');
            })
            .filter(function(el) {
              return !_.includes(CONSTRAINT_KEYWORDS, el);
            });
        }

        return Promise.resolve(columns);
      });
  }
});

module.exports = SQLiteAdapter;
