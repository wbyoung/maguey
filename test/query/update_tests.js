'use strict';

require('../helpers');

var chai = require('chai');
var expect = chai.expect;

var UpdateQuery = require('../../lib/query/update');
var l = require('../../lib/types/literal').l;
var f = require('../../lib/types/field').f;
var update;

describe('UpdateQuery', __query(function(query) {
  beforeEach(function() { update = query.update.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      UpdateQuery.create();
    }).to.throw(/UpdateQuery must be spawned/i);
  });

  it('updates data', function() {
    expect(update('users', { name: 'Whitney' }))
      .to.be.query('UPDATE "users" SET "name" = ?', ['Whitney']);
  });

  it('can be filtered', function() {
    expect(update('users', { name: 'Whitney' }).where({ id: 1 }))
      .to.be.query('UPDATE "users" SET "name" = ? '+
        'WHERE "id" = ?', ['Whitney', 1]);
  });

  it('updates multiple values', function() {
    expect(update('users', { first: 'Whitney', last: 'Young' }))
      .to.be.query('UPDATE "users" SET "first" = ?, "last" = ?',
        ['Whitney', 'Young']);
  });

  it('updates data via #set', function() {
    expect(update('users').set({ name: 'Whitney' }))
      .to.be.query('UPDATE "users" SET "name" = ?', ['Whitney']);
  });

  it('multiple calls to #set merge in new values', function() {
    var query = update('users')
      .set({ first: 'Whitney', last: 'Young' })
      .set({ first: 'Whit' });
    expect(query)
      .to.be.query('UPDATE "users" SET "first" = ?, "last" = ?',
        ['Whit', 'Young']);
  });

  it('works with literal based statements', function() {
    expect(update('users', { name: l('"first" + "last"') }))
      .to.be.query('UPDATE "users" SET "name" = "first" + "last"');
  });

  it('works with field based statements', function() {
    expect(update('users', { name: f('first') }))
      .to.be.query('UPDATE "users" SET "name" = "first"');
  });

  it('cannot be used without values to set', function() {
    var query = update('users');
    expect(function() {
      query.statement;
    }).to.throw(/must specify values to set/i);
  });

}));
