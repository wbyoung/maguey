'use strict';

var chai = require('chai');
var expect = chai.expect;
var helpers = require('../helpers');

var EntryQuery = require('../../lib/query/entry');
var test = helpers.withEntry;

describe('EntryQuery', test(function(query, adapter) {
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
