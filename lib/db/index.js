'use strict';

const extend = require('xtend'),
	MySQLAdapter = require('../adapters/mysql');

const Db = extend({
	getConnection: function() {
		return new MySQLAdapter();
	},

	closeConnection: function(conn) {

	}
});

module.exports = Db;
