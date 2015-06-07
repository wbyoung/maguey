'use strict';

var Adapter = require('../base');
var date = require('../../util/date');

/**
 * @protected
 * @constructor
 * @extends Adapter.Translator
 */
var PGTranslator = Adapter.Translator.extend();

PGTranslator.reopen(/** @lends PGAdapter.Translator# */ {

  /**
   * Override of {@link Translator#predicateForIExact}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIExact}
   */
  predicateForIExact: function(p) {
    return this._super(p).using('UPPER(%s::text) = UPPER(%s)');
  },

  /**
   * Override of {@link Translator#predicateForContains}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForContains}
   */
  predicateForContains: function(p) {
    return this._super(p).using('%s::text LIKE %s')
      .value('like', 'contains');
  },

  /**
   * Override of {@link Translator#predicateForIContains}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIContains}
   */
  predicateForIContains: function(p) {
    return this._super(p).using('UPPER(%s::text) LIKE UPPER(%s)')
      .value('like', 'contains');
  },

  /**
   * Override of {@link Translator#predicateForStartsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForStartsWith}
   */
  predicateForStartsWith: function(p) {
    return this._super(p).using('%s::text LIKE %s')
      .value('like', 'startsWith');
  },

  /**
   * Override of {@link Translator#predicateForIStartsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIStartsWith}
   */
  predicateForIStartsWith: function(p) {
    return this._super(p).using('UPPER(%s::text) LIKE UPPER(%s)')
      .value('like', 'startsWith');
  },

  /**
   * Override of {@link Translator#predicateForEndsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForEndsWith}
   */
  predicateForEndsWith: function(p) {
    return this._super(p).using('%s::text LIKE %s')
      .value('like', 'endsWith');
  },

  /**
   * Override of {@link Translator#predicateForIEndsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIEndsWith}
   */
  predicateForIEndsWith: function(p) {
    return this._super(p).using('UPPER(%s::text) LIKE UPPER(%s)')
      .value('like', 'endsWith');
  },

  /**
   * Override of {@link Translator#predicateForYear}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForYear}
   */
  predicateForYear: function(p) {
    return this._super(p).using('EXTRACT(\'year\' FROM %s) = %s');
  },

  /**
   * Override of {@link Translator#predicateForMonth}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForMonth}
   */
  predicateForMonth: function(p) {
    return this._super(p).using('EXTRACT(\'month\' FROM %s) = %s');
  },

  /**
   * Override of {@link Translator#predicateForDay}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForDay}
   */
  predicateForDay: function(p) {
    return this._super(p).using('EXTRACT(\'day\' FROM %s) = %s');
  },

  /**
   * Override of {@link Translator#predicateForWeekday}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForWeekday}
   */
  predicateForWeekday: function(p) {
    return this._super(p).using('EXTRACT(\'dow\' FROM %s) = %s')
      .value(date.parseWeekdayToInt);
  },

  /**
   * Override of {@link Translator#predicateForHour}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForHour}
   */
  predicateForHour: function(p) {
    return this._super(p).using('EXTRACT(\'hour\' FROM %s) = %s');
  },

  /**
   * Override of {@link Translator#predicateForMinute}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForMinute}
   */
  predicateForMinute: function(p) {
    return this._super(p).using('EXTRACT(\'minute\' FROM %s) = %s');
  },

  /**
   * Override of {@link Translator#predicateForSecond}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForSecond}
   */
  predicateForSecond: function(p) {
    return this._super(p).using('EXTRACT(\'second\' FROM %s) = %s');
  },

  /**
   * Binary type for PostgreSQL database backend.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBinary: function() { return 'bytea'; },

  /**
   * 64 bit integer type for PostgreSQL database backend.
   *
   * Values returned when executing queries for 64 bit integer values in
   * PostgreSQL will result in strings since JavaScript does not have a
   * numeric type that can represent the same range as the PG 64 bit integer.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForInteger64: function() {
    return this._super.apply(this, arguments);
  },

  /**
   * Bool type for PostgreSQL database backend.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBool: function() { return 'boolean'; },

  /**
   * Date-time type for PostgreSQL database backend.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDateTime: function() { return 'timestamp'; },

  /**
   * Decimal type for PostgreSQL database backend.
   *
   * Values returned when executing queries for decimal values in PostgreSQL
   * will result in strings since JavaScript does not support a numeric type
   * that can represent the same range and precision as the PG decimal.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDecimal: function() {
    return this._super.apply(this, arguments);
  },

});

module.exports = PGTranslator.reopenClass({ __name__: 'PGTranslator' });
