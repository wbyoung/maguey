'use strict';

require('../helpers');

var chai = require('chai');
var expect = chai.expect;

var DeleteQuery = require('../../lib/query/delete');
var del;

describe('DeleteQuery', __query(function(query) {
  beforeEach(function() { del = query.delete.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      DeleteQuery.create();
    }).to.throw(/DeleteQuery must be spawned/i);
  });

  it('deletes data', function() {
    expect(del('users')).to.be.query('DELETE FROM "users"', []);
  });

  it('can be filtered', function() {
    expect(del('users').where({ id: 1 }))
      .to.be.query('DELETE FROM "users" WHERE "id" = ?', [1]);
  });
}));
