'use strict';

require('../helpers');

var DeleteQuery = require('../../lib/query/delete');
var del;

describe('DeleteQuery', __query(function() {
  /* global query */

  beforeEach(function() { del = query.delete.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      DeleteQuery.create();
    }).to.throw(/DeleteQuery must be spawned/i);
  });

  it('deletes data', function() {
    del('users').should.be.a.query('DELETE FROM "users"');
  });

  it('can be filtered', function() {
    del('users').where({ id: 1 })
    .should.be.a.query('DELETE FROM "users" WHERE "id" = ?', [1]);
  });
}));
