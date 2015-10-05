'use strict';

var Class = require('corazon/class');

/**
 * @class Operation
 * @classdesc
 *
 * The base operation class.
 */
var Operation = Class.extend(/** @lends Operation# */ {

  /**
   * Create an operation.
   *
   * @private
   * @constructor
   * @param {String} name The operation name/symbol.
   */
  init: function(name) {
    this._super();
    this.name = name;
  },
});

Operation.reopenClass(/** @lends Operation */ {

  /**
   * Unary operation.
   *
   * @private
   * @extends Operation
   * @constructor
   */
  Unary: Operation.extend({}, { __name__: 'Operation.Unary' }),

  /**
   * Binary operation.
   *
   * @private
   * @extends Operation
   * @constructor
   */
  Binary: Operation.extend({}, { __name__: 'Operation.Binary' }),

});

module.exports = Operation.reopenClass({ __name__: 'Operation' });
