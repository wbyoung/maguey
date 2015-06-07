'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var date = require('../../util/date');

/**
 * @protected
 * @constructor
 * @extends Adapter.Translator
 */
var MySQLTranslator = Adapter.Translator.extend();

MySQLTranslator.reopen(/** @lends MySQLAdapter.Translator# */ {

  /**
   * Override of {@link Translator#predicateForIExact}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIExact}
   */
  predicateForIExact: function(p) {
    return this._super(p).using('%s LIKE %s');
  },

  /**
   * Override of {@link Translator#predicateForContains}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForContains}
   */
  predicateForContains: function(p) {
    return this._super(p).using('%s LIKE BINARY %s')
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
    return this._super(p).using('%s LIKE %s').value('like', 'contains');
  },

  /**
   * Override of {@link Translator#predicateForRegex}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForRegex}
   */
  predicateForRegex: function(p) {
    return this._super(p).using('%s REGEXP BINARY %s').value('regex');
  },

  /**
   * Override of {@link Translator#predicateForIRegex}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForIRegex}
   */
  predicateForIRegex: function(p) {
    return this._super(p).using('%s REGEXP %s').value('regex');
  },

  /**
   * Override of {@link Translator#predicateForStartsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForStartsWith}
   */
  predicateForStartsWith: function(p) {
    return this._super(p).using('%s LIKE BINARY %s')
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
    return this._super(p).using('%s LIKE %s').value('like', 'startsWith');
  },

  /**
   * Override of {@link Translator#predicateForEndsWith}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForEndsWith}
   */
  predicateForEndsWith: function(p) {
    return this._super(p).using('%s LIKE BINARY %s')
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
    return this._super(p).using('%s LIKE %s').value('like', 'endsWith');
  },

  /**
   * Override of {@link Translator#predicateForWeekday}.
   *
   * @method
   * @public
   * @see {@link Translator#predicateForWeekday}
   */
  predicateForWeekday: function(p) {
    var parseWeekday = date.parseWeekdayToInt;
    /** local */
    var shift = function(n) { return (n + 6) % 7; };
    return this._super(p).using('WEEKDAY(%s) = %s')
      .value(parseWeekday, shift);
  },

  /**
   * Serial type for MySQL database backend.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForSerial: function() { return 'integer AUTO_INCREMENT'; },

  /**
   * Binary type for MySQL database backend.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBinary: function() { return 'longblob'; },

  /**
   * Boolean type for MySQL database backend.
   *
   * Booleans in MySQL are actually stored as numbers. A value of 0 is
   * considered false. Nonzero values are considered true.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBool: function() { return this._super.apply(this, arguments); },

  /**
   * Decimal type for MySQL database backend.
   *
   * The decimal type for MySQL applies default values of `precision: 64` and
   * `scale: 30` if no precision is given.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDecimal: function(options) {
    var opts = _.clone(options || {});
    if (!opts.precision) {
      opts.precision = 64;
      opts.scale = 30;
    }
    return this._super(opts);
  },

});

module.exports = MySQLTranslator.reopenClass({ __name__: 'MySQLTranslator' });
