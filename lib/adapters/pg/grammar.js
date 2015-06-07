'use strict';

var Adapter = require('../base');
var Fragment = require('../../types/fragment');

/**
 * @protected
 * @constructor
 * @extends Adapter.Grammar
 */
var PGGrammar = Adapter.Grammar.extend();

PGGrammar.reopen(/** @lends PGAdapter.Grammar# */ {

  /**
   * Override of {@link Grammar#value}.
   *
   * @method
   * @public
   * @see {@link Grammar#value}
   */
  value: function(value) {
    return Fragment.create('$1', [value]);
  },

  /**
   * Override of {@link Grammar#join}.
   *
   * @method
   * @public
   * @see {@link Grammar#join}
   */
  join: function(/*fragments*/) {
    var joined = this._super.apply(this, arguments);
    var position = 0;
    var sql = joined.sql.replace(/\$\d+/g, function() {
      return '$' + (position += 1);
    });
    return Fragment.create(sql, joined.args);
  },

});

module.exports = PGGrammar.reopenClass({ __name__: 'PGGrammar' });
