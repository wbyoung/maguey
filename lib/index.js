'use strict';

var _ = require('lodash');

var Adapter = require('./adapters/base');
var Actionable = require('./util/actionable');
var Condition = require('./condition');

var BaseQuery = require('./query/base');
var EntryQuery = require('./query/entry');
var SelectQuery = require('./query/select');
var InsertQuery = require('./query/insert');
var UpdateQuery = require('./query/update');
var DeleteQuery = require('./query/delete');
var RawQuery = require('./query/raw');
var TransactionQuery = require('./query/transaction');
var Schema = require('./schema');

var adapters = require('./adapters');

/**
 * Create a new adapter.
 *
 * @public
 * @function
 * @param {Object} options The connection information.
 * @param {String} options.adapter The adapter to use. Possible choices are:
 * `pg`, `mysql`, or `sqlite3`.
 * @param {Object} options.connection The connection information to pass to the
 * adapter. This varies for each adapter. See each individual adapters for more
 * information.
 */
var adapter = function(options) {
  if (!options) { throw new Error('Missing connection information.'); }
  var adapter = options.adapter;
  var connection = options.connection;

  if (_.isString(adapter)) {
    var name = adapter;
    if (!adapters[name]) {
      throw new Error('No adapter found for ' + name);
    }
    adapter = adapters[name].create(connection);
  }
  if (!(adapter instanceof Adapter.__class__)) {
    throw new Error('Invalid adapter: ' + adapter);
  }

  return adapter;
};

/**
 * Create a new entry query object.
 *
 * @public
 * @function
 * @param {Object} options The connection information.
 * @see adapter
 */
var query = function(options) {
  return EntryQuery.create(adapter(options));
};

_.extend(query, {
  adapter: adapter,
  adapters: adapters,
  Adapter: Adapter,
  Condition: Condition,
  BaseQuery: BaseQuery,
  EntryQuery: EntryQuery,
  SelectQuery: SelectQuery,
  InsertQuery: InsertQuery,
  UpdateQuery: UpdateQuery,
  DeleteQuery: DeleteQuery,
  RawQuery: RawQuery,
  TransactionQuery: TransactionQuery,
  Actionable: Actionable,
  Schema: Schema,
});

module.exports = query;
