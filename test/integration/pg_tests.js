'use strict';

require('../helpers');

// $ createuser -s root
// $ psql -U root -d postgres
// > CREATE DATABASE maguey_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var _ = require('lodash');
var Promise = require('bluebird');

var shared = require('./shared_behaviors');
var config = {
  adapter: 'pg',
  connection: {
    user: process.env.PG_USER || 'root',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'maguey_test',
  },
};

var resetSequence = function(table) {
  return this.query.raw('ALTER SEQUENCE ' + table + '_id_seq restart');
};

var castDatabaseValue = function(type, value) {
  switch(type) {
    case 'integer64': // these numeric types are read from the db as strings
    case 'decimal': value = +value; break;
  }
  return value;
};

describe('PostgreSQL', __connect(config, function() {
  /* global query, adapter */

  before(function() { this.query = query; });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.castDatabaseValue = castDatabaseValue; });

  it('executes raw sql', function() {
    var queries = [
      ['CREATE TABLE maguey_raw_sql_test (id serial, name varchar(255))'],
      ['INSERT INTO maguey_raw_sql_test (name) VALUES (\'Azul\') RETURNING id'],
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
    var query = 'SELECT $1::int AS number';
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
    .should.eventually.be.rejectedWith(/syntax error/i);
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

    it('allows use of returning on non primary key', function() {
      return query.insert('maguey_test', { name: 'Azul' })
      .returning('name')
      .then(_.partial(_.omit, _, 'client'))
      .then(function(data) {
        expect(data).to.eql({ rows: [{ name: 'Azul' }], fields: ['name'] });
      });
    });

    it('allows use of returning for full row', function() {
      return resetSequence.call(this, 'maguey_test').then(function() {
        return query.insert('maguey_test', { name: 'Azul' }).returning('*');
      })
      .then(_.partial(_.omit, _, 'client'))
      .then(function(data) {
        expect(data).to.eql({
          rows: [{ id: 1, name: 'Azul' }],
          fields: ['id', 'name'],
        });
      });
    });
  });

  // run all shared examples
  _.each(shared(), function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
}));
