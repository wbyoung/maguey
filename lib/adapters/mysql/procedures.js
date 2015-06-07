'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var Statement = require('../../types/statement');
var Promise = require('bluebird');
var util = require('util');

/**
 * @protected
 * @constructor
 * @extends Adapter.Procedures
 */
var MySQLProcedures = Adapter.Procedures.extend();

MySQLProcedures.reopen(/** @lends MySQLAdapter.Procedures# */ {

  /**
   * Override of {@link Procedure#alterTable}.
   *
   * @method
   * @public
   * @see {@link Procedure#alterTable}.
   */
  alterTable: function(data) {
    /* jscs:disable jsDoc */

    // we know the phrasing is capable of handling everything other than index
    // renaming. we need to create a procedure if any index renames occur.
    var procedure;
    var operations =
      data.renamedIndexes.length;

    if (operations > 0) {
      procedure = this._inTransaction(function(query) {
        var table = data.name;
        var fmt = util.format;
        var quote = this._grammar.field.bind(this._grammar);
        var join = this._grammar.join.bind(this._grammar);
        var delimit = this._grammar.delimit.bind(this._grammar);
        var group = this._grammar.group.bind(this._grammar);
        var camelKeys = function(obj) {
          return _.transform(obj, function(obj, value, key) {
            obj[_.camelCase(key)] = value;
          });
        };

        var promise = Promise.bind({});

        // create a base statement that does not include renames of indexes.
        var statement = this._phrasing.alterTable(_.extend({}, data, {
          renamedIndexes: [],
        }));

        if (statement) {
          promise = promise.then(function() {
            return query.raw(statement);
          });
        }

        data.renamedIndexes.forEach(function(index) {

          promise = promise.then(function() {
            return query.raw(fmt('SHOW INDEX FROM %s WHERE KEY_NAME = ?',
              quote(table)), [index.from]).fetch();
          })
          .tap(function() {
            return query.raw(fmt('DROP INDEX %s ON %s', quote(index.from),
              quote(table)));
          })
          .map(camelKeys)
          .then(_).call('sortBy', 'seqInIndex').call('value')
          .then(function(info) {
            var columns = _.map(info, function(col) {
              var result = quote(col.columnName);
              if (col.subPart) {
                result += fmt('(%d)', col.subPart);
              }
              return result;
            });
            var unique = !_.all(info, 'nonUnique');
            var type = _(info).map('indexType').filter().first();

            var fragments = []
            .concat(['CREATE '])
            .concat(unique ? ['UNIQUE '] : [])
            .concat(['INDEX ', quote(index.to)])
            .concat([' USING ', type])
            .concat([' ON ', quote(table), ' '])
            .concat(group(join(delimit(columns))));

            return query.raw(Statement.create(join(fragments)));
          });
        });

        return promise;
      }.bind(this));
    }

    return procedure; /* jscs:enable jsDoc */
  },

});

module.exports = MySQLProcedures.reopenClass({ __name__: 'MySQLProcedures' });
