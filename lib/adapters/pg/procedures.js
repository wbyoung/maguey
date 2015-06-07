'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var PullIndexProcedure = require('../mixins/pull_index');
var Promise = require('bluebird');
var util = require('util');

/**
 * @protected
 * @constructor
 * @extends Adapter.Procedures
 * @mixes PullIndexProcedure
 */
var PGProcedures = Adapter.Procedures.extend(PullIndexProcedure);

PGProcedures.reopen(/** @lends PGAdapter.Procedures# */ {

  /**
   * Override of {@link Procedure#alterTable}.
   *
   * @method
   * @public
   * @see {@link Procedure#alterTable}.
   */
  alterTable: function(data) {
    // create a base statement that does not include renames, addition of
    // indexes, dropped indexes, or renamed indexes.
    var statement = this._phrasing.alterTable(_.extend({}, data, {
      renamed: [],
      addedIndexes: [],
      droppedIndexes: [],
      renamedIndexes: [],
    }));

    // we know the phrasing is capable of handling thing. that one thing could
    // be any one of:
    //
    //    - a single column rename
    //    - a single add index
    //    - a single drop index
    //    - a single combined action w/ items not listed above (adds & drops)
    //
    // we need to create a procedure if there are more operations required than
    // the phrasing is able to represent in a single query.
    var procedure;
    var operations = (statement ? 1 : 0) +
      data.renamed.length +
      data.addedIndexes.length +
      data.droppedIndexes.length +
      data.renamedIndexes.length;

    if (operations > 1) {
      procedure = this._inTransaction(function(query) {
        var table = data.name;
        var fmt = util.format;
        var quote = this._grammar.field.bind(this._grammar);
        var createIndex = this._phrasing.createIndex.bind(this._phrasing);
        var dropIndex = this._phrasing.dropIndex.bind(this._phrasing);
        var renameIndex = this._phrasing.renameIndex.bind(this._phrasing);
        var promise = Promise.bind({});

        if (statement) {
          promise = promise.then(function() {
            return query.raw(statement);
          });
        }

        data.renamed.forEach(function(rename) {
          promise = promise.then(function() {
            return query.raw(fmt('ALTER TABLE %s RENAME %s TO %s',
              quote(table), quote(rename.from), quote(rename.to)));
          });
        });

        data.droppedIndexes.forEach(function(index) {
          promise = promise.then(function() {
            return query.raw(dropIndex(data.name, index));
          });
        }, this);

        data.addedIndexes.forEach(function(index) {
          promise = promise.then(function() {
            return query.raw(createIndex(data.name, index));
          });
        }, this);

        data.renamedIndexes.forEach(function(index) {
          promise = promise.then(function() {
            return query.raw(renameIndex(data.name, index));
          });
        }, this);

        return promise;
      }.bind(this));
    }

    return procedure;
  },

});

module.exports = PGProcedures.reopenClass({ __name__: 'PGProcedures' });
