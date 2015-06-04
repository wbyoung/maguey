'use strict';

require('../helpers');

var UpdateQuery = require('../../lib/query/update');
var l = require('../../lib/types/literal').l;
var f = require('../../lib/types/field').f;
var update;

describe('UpdateQuery', __query(function() {
  /* global query */

  beforeEach(function() { update = query.update.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      UpdateQuery.create();
    }).to.throw(/UpdateQuery must be spawned/i);
  });

  it('updates data', function() {
    update('users', { name: 'Whitney' })
    .should.be.a.query('UPDATE "users" SET "name" = ?', ['Whitney']);
  });

  it('can be filtered', function() {
    update('users', { name: 'Whitney' }).where({ id: 1 })
    .should.be.a.query('UPDATE "users" SET "name" = ? '+
      'WHERE "id" = ?', ['Whitney', 1]);
  });

  it('updates multiple values', function() {
    update('users', { first: 'Whitney', last: 'Young' })
    .should.be.a.query('UPDATE "users" SET "first" = ?, "last" = ?',
      ['Whitney', 'Young']);
  });

  it('updates data via #set', function() {
    update('users').set({ name: 'Whitney' })
      .should.be.a.query('UPDATE "users" SET "name" = ?', ['Whitney']);
  });

  it('multiple calls to #set merge in new values', function() {
    update('users')
    .set({ first: 'Whitney', last: 'Young' })
    .set({ first: 'Whit' })
    .should.be.a.query('UPDATE "users" SET "first" = ?, "last" = ?',
      ['Whit', 'Young']);
  });

  it('works with literal based statements', function() {
    update('users', { name: l('"first" + "last"') })
    .should.be.a.query('UPDATE "users" SET "name" = "first" + "last"');
  });

  it('works with field based statements', function() {
    update('users', { name: f('first') })
    .should.be.a.query('UPDATE "users" SET "name" = "first"');
  });

  it('cannot be used without values to set', function() {
    var query = update('users');
    expect(function() {
      query.statement;
    }).to.throw(/must specify values to set/i);
  });

}));
