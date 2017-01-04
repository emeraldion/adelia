'use strict';

const _ = require('lodash');

function BaseAdapter() {
  throw 'Cannot be instantiated directly';
}

_.assign(BaseAdapter.prototype, {
  /**
   *  @fn escape(value)
   *  @short Escapes the given value to avoid SQL injections.
   *  @param value The value to escape.
   */
  escape: function(value) {
    return value.replace(/'/g, '\\\'');
  },

  /**
   *  @fn escapeId(value)
   *  @short Escapes the given identifier to avoid SQL injections.
   *  @param value The identifier to escape.
   *  @param ignoreDots Does not treat dots as identifier separators if true
   */
  escapeId: function(value, ignoreDots) {
    const ret = value.replace(/`/g, '\`');

    if (ignoreDots) {
      return ret;
    }
    return ret.split('.').join('`.`');
  },

  /**
   *  @fn _printQuery
   *  @short Prints the query to the console.
   */
  _printQuery: function() {
    console.log(this.query);
  }
});

module.exports = BaseAdapter;
