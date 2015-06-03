'use strict';

var expect = require('chai').expect;

var Promise = require('bluebird');
var Adapter = require('../../lib/adapters/base');
var EntryQuery = require('../../lib/query/entry');
var returning = require('../../lib/adapters/mixins/returning'),
  EmbedPseudoReturn = returning.EmbedPseudoReturn,
  ExtractPseudoReturn = returning.ExtractPseudoReturn;

var CustomAdapter,
  query,
  adapter;

describe('Adapter with PseudoReturn', function() {
  beforeEach(function() {
    this.fns = {};
    CustomAdapter = Adapter.extend({
      _connect: Promise.method(function() {}),
      _disconnect: Promise.method(function() {}),
      _execute: Promise.method(function() {
        return this.fns.execute.apply(this, arguments);
      }.bind(this))
    });
    CustomAdapter.reopenClass({ Phrasing: Adapter.Phrasing.extend() });
    CustomAdapter.Phrasing.reopen(EmbedPseudoReturn);
    CustomAdapter.reopen(ExtractPseudoReturn);
    adapter = CustomAdapter.create({});
    query = EntryQuery.create(adapter);
  });

  describe('when returning is called with no arguments', function() {
    beforeEach(function() {
      this.fns.execute = function(connection, sql, args, returning) {
        returning();
        return { rows: [], fields: [] };
      };
    });

    it('adds the an undefined value to the result', function(done) {
      query.insert('users', { username: 'wbyoung' }).returning('identifier')
      .then(function(result) {
        expect(result.rows[0]).to.haveOwnProperty('identifier');
        expect(result.rows[0].identifier).to.not.exist;
      })
      .then(done, done);
    });
  });

});
