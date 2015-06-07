'use strict';

require('../helpers');

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var _ = require('lodash');
var Promise = require('bluebird');
var returning = require('../../lib/adapters/mixins/returning');
var PseudoReturn = returning.PseudoReturn;

var shared = require('./shared_behaviors');
var config = {
  adapter: 'sqlite3',
  connection: {
    filename: '',
  },
};

var resetSequence = Promise.method(function(/*table*/) {
  // no need to reset
});

var castDatabaseValue = function(type, value, options) {
  switch (type) {
    case 'date': // dates are converted & stored as timestamps
    case 'dateTime': value = new Date(value); break;
    case 'bool': value = Boolean(value); break; // bool is stored as number
    case 'decimal': // precision & scale not supported, so fake it here
      value = _.size(options) ? +value.toFixed(options.scale) : value;
      break;
  }
  return value;
};

describe('SQLite3', __connect(config, function() {
  /* global query, adapter */

  before(function() { this.query = query; });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.castDatabaseValue = castDatabaseValue; });

  it('executes raw sql', function() {
    var returnId = PseudoReturn.create('id');
    var queries = [
      [
        'CREATE TABLE maguey_raw_sql_test ' +
        '(id integer primary key autoincrement, name varchar(255))',
      ],
      ['INSERT INTO maguey_raw_sql_test (name) VALUES (\'Azul\')', [returnId]],
      ['SELECT * FROM maguey_raw_sql_test'],
      ['DROP TABLE maguey_raw_sql_test'],
    ];
    return Promise.reduce(queries, function(array, info) {
      var query = info[0], args = info[1] || [];
      return adapter.execute(query, args).then(function(result) {
        return array.concat([result]);
      });
    }, [])
    .map(_.partial(_.omit, _, 'client'))
    .spread(function(result1, result2, result3, result4) {
      expect(result1).to.eql({ rows: [], fields: [] });
      expect(result2).to.eql({
        rows: [{ id: 1 }], fields: ['id'],
      });
      expect(result3).to.eql({
        rows: [{ id: 1, name: 'Azul' }],
        fields: ['id', 'name'],
      });
      expect(result4).to.eql({ rows: [], fields: [] });
    });
  });

  it('receives rows from raw sql', function() {
    var query = 'SELECT CAST(? AS INTEGER) AS number';
    var args = ['1'];
    return adapter.execute(query, args)
    .then(function(result) {
      expect(result.rows).to.eql([{ number: 1 }]);
    });
  });

  it('reports errors', function() {
    var query = 'SELECT & FROM ^';
    var args = [];
    return adapter.execute(query, args)
    .should.eventually.be.rejectedWith(/SQLITE_ERROR.*syntax/i);
  });

  describe('with simple table', function() {
    before(function() {
      return adapter
        .execute('CREATE TABLE maguey_test (id serial, name varchar(255))', []);
    });

    after(function() {
      return adapter
        .execute('DROP TABLE maguey_test', []);
    });

    it('returning does not work on non primary key', function() {
      return query.insert('maguey_test', { name: 'Azul' })
      .returning('name')
      .then(function(data) {
        expect(data.rows[0].name).to.not.eql('Azul');
      });
    });
  });

  // run all shared examples
  var skip = /`i?regex|year|month|day|weekday|hour|minute|second`/i;
  _.each(shared({ skip: skip }), function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
}));
