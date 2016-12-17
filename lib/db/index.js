'use strict';

const _ = require('lodash'),
  MySQLAdapter = require('../adapters/mysql');

const Db = _.assign({}, {
  getConnection: function() {
    return new MySQLAdapter();
  },

  closeConnection: function(conn) {}
});

module.exports = Db;
