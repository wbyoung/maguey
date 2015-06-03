'use strict';

var chai = require('chai');
var expect = chai.expect;
var helpers = require('../helpers');

var RenameTableQuery = require('../../lib/schema/table/rename');
var test = helpers.withEntry;
var schema;

describe('RenameTableQuery', test(function(query) {
  beforeEach(function() { schema = query.schema(); });

  it('cannot be created directly', function() {
    expect(function() {
      RenameTableQuery.create();
    }).to.throw(/RenameTableQuery must be spawned/i);
  });

  it('generates the proper query', function() {
    var query = schema.renameTable('users', 'profiles');
    expect(query.sql).to.eql('ALTER TABLE "users" RENAME TO "profiles"');
    expect(query.args).to.eql([]);
  });

  it('generates the proper query when cloned', function() {
    var query = schema.renameTable('users', 'profiles').clone();
    expect(query.sql).to.eql('ALTER TABLE "users" RENAME TO "profiles"');
    expect(query.args).to.eql([]);
  });
}));
