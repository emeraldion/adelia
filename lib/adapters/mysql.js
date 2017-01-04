'use strict';

const _ = require('lodash'),
  Promise = require('bluebird'),
  mysql = require('mysql'),
  sprintf = require('sprintf-js').sprintf,
  BaseAdapter = require('./_base');

const DEBUG = process.env.DEBUG;

// TODO: move to initialization
// e.g.:
//   const adelia = require('adelia')(CONFIG);
//   const model = new adelia.Model();
const CONFIG = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB
};

function MySQLAdapter() {
}

_.assign(MySQLAdapter.prototype, BaseAdapter.prototype, {
  /**
   *  @attr NAME
   *  @short Name of this adapter
   */
  NAME: 'mysql',

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
  connect: function() {
    if (_.isUndefined(this.connection) || this.connection === null) {
      this.connection = mysql.createConnection(CONFIG);
      this.connection.connect();
    }
    return Promise.resolve(this.connection);
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
    this.connection.end();
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
        let res, rej;

        const promise = new Promise(function(resolve, reject) {
          res = resolve;
          rej = reject;
        });
        self.result = self.connection.query(self.query, function(err, results) {
          if (err) {
            rej(err);
            return;
          }
          res(results);
        });
        self.queries_count++;

        return promise;
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
        return self.prepare(sprintf('DELETE FROM `{1}` WHERE `%s` = \'{2}\'%s',
          keyColumn, options.one ? ' LIMIT 1' : ''),
            tableName, keyValue);
      })
      .then(function() {
        return self.exec();
      })
      .then(function() {
        if (options.optimize) {
          return self.prepare('OPTIMIZE TABLE `{1}`', tableName)
            .then(function() {
              return self.exec();
            });
        }
      });
  },

  /**
   *  @fn getColumns
   *  @short Describes a table.
   */
  getColumns: function(tableName) {
    const self = this;

    return this.connect()
      .then(function() {
        return self.prepare('DESCRIBE `{1}`', tableName);
      })
      .then(function() {
        return self.exec();
      })
      .then(function(results) {
        return _.map(results, function(row) {
          return row['Field'];
        });
      });
  }
});

module.exports = MySQLAdapter;
