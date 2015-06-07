'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var mysql = require('mysql');

/**
 * @protected
 * @constructor
 * @extends Adapter.Grammar
 */
var MySQLGrammar = Adapter.Grammar.extend();

MySQLGrammar.reopen(/** @lends MySQLAdapter.Grammar# */ {

  /**
   * Override of {@link Grammary#quote}.
   *
   * @method
   * @public
   * @see {@link Grammary#quote}
   */
  quote: function(string) {
    return mysql.escapeId(string);
  },

  /**
   * Override of {@link Grammary#escape}.
   *
   * @method
   * @public
   * @see {@link Grammary#escape}
   */
  escape: function(value) {
    value = _.isString(value) ? value.replace('\\', '\\\\') : value;
    return this._super(value);
  },

});

module.exports = MySQLGrammar.reopenClass({ __name__: 'MySQLGrammar' });
