'use strict';

require('../helpers');

var chai = require('chai');
var expect = chai.expect;

var InsertQuery = require('../../lib/query/insert');
var insert;

describe('InsertQuery', __query(function(query) {
  beforeEach(function() { insert = query.insert.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      InsertQuery.create();
    }).to.throw(/InsertQuery must be spawned/i);
  });

  it('inserts data', function() {
    expect(insert('users', { name: 'Whitney' }))
      .to.be.query('INSERT INTO "users" ("name") VALUES (?)', ['Whitney']);
  });

  it('inserts data via #values', function() {
    expect(insert('users').values({ name: 'Whitney' }))
      .to.be.query('INSERT INTO "users" ("name") VALUES (?)', ['Whitney']);
  });

  it('inserts multiple data sets via #values', function() {
    var query = insert('users')
      .values({ name: 'Whitney' }, { name: 'Brittany' })
      .values({ name: 'Milo' });
    expect(query).to.be.query(
      'INSERT INTO "users" ("name") VALUES (?), (?), (?)', [
        'Whitney',
        'Brittany',
        'Milo'
      ]
    );
  });

  it('inserts multiple sets of data', function() {
    var query = insert('users', [{ name: 'Whitney' }, { name: 'Brittany'}]);
    expect(query).to.be.query(
      'INSERT INTO "users" ("name") VALUES (?), (?)', ['Whitney', 'Brittany']
    );
  });

  it('inserts multiple sets of with different keys', function() {
    var query = insert('users', [
      { name: 'Whitney',  address: 'Portland' },
      { name: 'Brittany'}
    ]);
    expect(query).to.be.query(
      'INSERT INTO "users" ("name", "address") VALUES (?, ?), (?, ?)', [
        'Whitney',
        'Portland',
        'Brittany',
        undefined
      ]
    );
  });

  it('allows specifying the return value', function() {
    var query = insert('users', [{ name: 'Whitney' }]).returning('id');
    expect(query).to.be.query(
      'INSERT INTO "users" ("name") VALUES (?) RETURNING "id"', ['Whitney']
    );
  });

  it('throws when no attrs are given', function() {
    expect(function() {
      insert('users', {}).sql;
    }).to.throw(/insert.*missing values/i);
  });

  it('allows some value specification to be null', function() {
    var query = insert('users').values({ name: 'Whitney' }).values({});
    expect(query).to.be.query(
      'INSERT INTO "users" ("name") VALUES (?), (?)', ['Whitney', undefined]
    );
  });
}));
