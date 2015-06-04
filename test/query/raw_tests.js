'use strict';

require('../helpers');

var _ = require('lodash');
var RawQuery = require('../../lib/query/raw');
var Statement = require('../../lib/types/statement');
var Promise = require('bluebird');
var raw;

describe('RawQuery', __query(function() {
  /* global query, adapter */

  beforeEach(function() { raw = query.raw.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      RawQuery.create();
    }).to.throw(/RawQuery must be spawned/i);
  });

  it('can be created with a statement', function() {
    var statement = Statement.create('SELECT * FROM "jobs"', []);
    raw(statement).statement.should.eql(statement);
  });

  it('cannot be created with a statement and args', function() {
    var statement = Statement.create('SELECT * FROM "jobs"', []);
    expect(function() { raw(statement, []); })
      .to.throw(/not provide.*statement.*args/i);
  });

  it('can be created without args', function() {
    raw('SELECT * FROM "jobs"').should.be.a.query('SELECT * FROM "jobs"');
  });

  it('can be created args', function() {
    raw('SELECT * FROM "jobs" where "id" = ?', [1])
    .should.be.a.query('SELECT * FROM "jobs" where "id" = ?', [1]);
  });

  it('can be duplicated', function() {
    var query = raw('SELECT * FROM "jobs" where "id" = ?', [1]);
    var dup = query._dup();
    _.pick(query, '_sql', '_args')
      .should.eql(_.pick(dup, '_sql', '_args'));
    query._args.should.not.equal(dup._args);
    query.should.not.equal(dup);
  });

  describe('while spying on adapter', function() {
    beforeEach(function() { sinon.spy(adapter, 'execute'); });
    afterEach(function() { adapter.execute.restore(); });

    it('will not execute more than once', function() {
      var query = raw('select * from "jobs"');
      return Promise.settle([
        query.execute(),
        query.execute(),
        query.execute()
      ]).then(function() {
        query._adapter.execute.should.have.been.calledOnce;
      });
    });
  });

}));
