'use strict';

var Adapter = require('../base');

var LIKE_FORMAT = '%s LIKE %s ESCAPE \'\\\'';
var ILIKE_FORMAT = 'UPPER(%s) LIKE UPPER(%s) ESCAPE \'\\\'';

/**
* @protected
* @constructor
* @extends Adapter.Translator
*/
var SQLite3Translator = Adapter.Translator.extend();

SQLite3Translator.reopen(/** @lends SQLite3Adapter.Translator# */ {

  /**
   * Override of {@link Translator#predicateForIExact}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIExact}
   */
  predicateForIExact: function(p) {
    return this._super(p).using(ILIKE_FORMAT);
  },

  /**
   * Override of {@link Translator#predicateForContains}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForContains}
   */
  predicateForContains: function(p) {
    return this._super(p).using(LIKE_FORMAT).value('like', 'contains');
  },

  /**
   * Override of {@link Translator#predicateForIContains}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIContains}
   */
  predicateForIContains: function(p) {
    return this._super(p).using(ILIKE_FORMAT).value('like', 'contains');
  },

  /**
   * Override of {@link Translator#predicateForRegex}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForRegex}
   */
  predicateForRegex: function(p) {
    // without the escaping & concatenation this reads `%s REGEXP /%s/`
    return this._super(p)
      .using('%s REGEXP \'/\' || %s || \'/\'').value('regex');
  },

  /**
   * Override of {@link Translator#predicateForIRegex}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIRegex}
   */
  predicateForIRegex: function(p) {
    // without the escaping & concatenation this reads `%s REGEXP /%s/i`
    return this._super(p)
      .using('%s REGEXP \'/\' || %s || \'/i\'').value('regex');
  },

  /**
   * Override of {@link Translator#predicateForStartsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForStartsWith}
   */
  predicateForStartsWith: function(p) {
    return this._super(p).using(LIKE_FORMAT).value('like', 'startsWith');
  },

  /**
   * Override of {@link Translator#predicateForIStartsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIStartsWith}
   */
  predicateForIStartsWith: function(p) {
    return this._super(p).using(ILIKE_FORMAT).value('like', 'startsWith');
  },

  /**
   * Override of {@link Translator#predicateForEndsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForEndsWith}
   */
  predicateForEndsWith: function(p) {
    return this._super(p).using(LIKE_FORMAT).value('like', 'endsWith');
  },

  /**
   * Override of {@link Translator#predicateForIEndsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIEndsWith}
   */
  predicateForIEndsWith: function(p) {
    return this._super(p).using(ILIKE_FORMAT).value('like', 'endsWith');
  },

  /**
   * Serial type for SQLite3 database backend.
   *
   * Serial in SQLite3 are actually just integers. You need to make the
   * column also a primary key column and it will track the `ROWID` column.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   * @see https://www.sqlite.org/autoinc.html
   */
  typeForSerial: function() { return 'integer'; },

  /**
   * Float type for SQLite3 database backend.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForFloat: function() { return 'real'; },

  /**
   * Boolean type for SQLite3 database backend.
   *
   * Booleans in SQLite3 are actually stored as numbers. A value of 0 is
   * considered false. Nonzero values are considered true.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBool: function() { return this._super.apply(this, arguments); },

  /**
   * Date type for SQLite3 database backend.
   *
   * Dates in SQLite3 are stored as numeric timestamps since SQLite3 does not
   * have a date type.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDate: function() { return this._super.apply(this, arguments); },

  /**
   * Date-time type for SQLite3 database backend.
   *
   * Date-times in SQLite3 are stored as numeric timestamps since SQLite3
   * does not have a date-time type.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDateTime: function() { return this._super.apply(this, arguments); },

  /**
   * Decimal type for SQLite3 database backend.
   *
   * Decimals in SQLite3 do not support precision or scale.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDecimal: function() { return 'decimal'; },

});

module.exports = SQLite3Translator.reopenClass({
  __name__: 'SQLite3Translator',
});
