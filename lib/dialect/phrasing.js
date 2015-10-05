'use strict';

var Class = require('corazon/class');

/**
 * @class Phrasing
 * @classdesc
 *
 * The phrasing class is used to build full statements to send to the database.
 * It is responsible for the ordering & overall structure of the queries, and
 * should use the {@link Grammar} and {@link Translator} classes to take care
 * of basic formatting & quick translations.
 */
var Phrasing = Class.extend(/** @lends Phrasing# */ {

  /**
   * Create a phrasing.
   *
   * @public
   * @constructor
   * @param {Grammar} grammar The grammar to use when building phrases.
   */
  init: function(grammar, translator) {
    this._super();
    this._grammar = grammar;
    this._translator = translator;
  },
});

Phrasing.reopen(require('./phrasing_select'));
Phrasing.reopen(require('./phrasing_insert'));
Phrasing.reopen(require('./phrasing_update'));
Phrasing.reopen(require('./phrasing_delete'));
Phrasing.reopen(require('./phrasing_table'));
Phrasing.reopen(require('./phrasing_index'));
Phrasing.reopen(require('./phrasing_transaction'));

module.exports = Phrasing.reopenClass({ __name__: 'Phrasing' });
