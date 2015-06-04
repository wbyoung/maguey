'use strict';

require('../helpers');

var EntryQuery = require('../../lib/query/entry');

describe('EntryQuery', __query(function() {
  /* global query, adapter */

  it('can be created directly', function() {
    expect(function() { EntryQuery.create(adapter); }).to.not.throw();
  });

  it('cannot generate sql', function() {
    expect(function() { query.statement; })
      .throw(/must first call.*`select`.*on query/i);
    expect(function() { query.statement; })
      .throw(/must first call.*`update`.*on query/i);
    expect(function() { query.statement; })
      .throw(/must first call.*`insert`.*on query/i);
    expect(function() { query.statement; })
      .throw(/must first call.*`delete`.*on query/i);
    expect(function() { query.statement; })
      .throw(/must first call.*`raw`.*on query/i);
  });
}));
