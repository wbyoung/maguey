'use strict';

require('../helpers');

var InsertQuery = require('../../lib/query/insert');
var insert;

describe('InsertQuery', __query(function() {
  /* global query */

  beforeEach(function() { insert = query.insert.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      InsertQuery.create();
    }).to.throw(/InsertQuery must be spawned/i);
  });

  it('inserts data', function() {
    insert('users', { name: 'Whitney' })
    .should.be.a.query('INSERT INTO "users" ("name") ' +
      'VALUES (?)', ['Whitney']);
  });

  it('inserts data via #values', function() {
    insert('users').values({ name: 'Whitney' })
    .should.be.a.query('INSERT INTO "users" ("name") ' +
      'VALUES (?)', ['Whitney']);
  });

  it('inserts multiple data sets via #values', function() {
    insert('users')
    .values({ name: 'Whitney' }, { name: 'Brittany' })
    .values({ name: 'Milo' })
    .should.be.a.query('INSERT INTO "users" ("name") ' +
      'VALUES (?), (?), (?)', ['Whitney', 'Brittany', 'Milo']);
  });

  it('inserts multiple sets of data', function() {
    insert('users', [{ name: 'Whitney' }, { name: 'Brittany'}])
    .should.be.a.query('INSERT INTO "users" ("name") ' +
      'VALUES (?), (?)', ['Whitney', 'Brittany']);
  });

  it('inserts multiple sets of with different keys', function() {
    insert('users', [
      { name: 'Whitney',  address: 'Portland' },
      { name: 'Brittany'}
    ])
    .should.be.a.query('INSERT INTO "users" ("name", "address") ' +
      'VALUES (?, ?), (?, ?)', ['Whitney', 'Portland', 'Brittany', undefined]);
  });

  it('allows specifying the return value', function() {
    insert('users', [{ name: 'Whitney' }]).returning('id')
    .should.be.a.query('INSERT INTO "users" ("name") ' +
      'VALUES (?) RETURNING "id"', ['Whitney']);
  });

  it('throws when no attrs are given', function() {
    expect(function() {
      insert('users', {}).sql;
    }).to.throw(/insert.*missing values/i);
  });

  it('allows some value specification to be null', function() {
    insert('users').values({ name: 'Whitney' }).values({})
    .should.be.a.query('INSERT INTO "users" ("name") ' +
      'VALUES (?), (?)', ['Whitney', undefined]);
  });
}));
