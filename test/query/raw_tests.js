'use strict';

require('../helpers');

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var RawQuery = require('../../lib/query/raw');
var Statement = require('../../lib/types/statement');
var Promise = require('bluebird');
var raw;

describe('RawQuery', __query(function(query, adapter) {
  beforeEach(function() { raw = query.raw.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      RawQuery.create();
    }).to.throw(/RawQuery must be spawned/i);
  });

  it('can be created with a statement', function() {
    var statement = Statement.create('SELECT * FROM "jobs"', []);
    expect(raw(statement).statement).to.eql(statement);
  });

  it('cannot be created with a statement and args', function() {
    var statement = Statement.create('SELECT * FROM "jobs"', []);
    expect(function() { raw(statement, []); })
      .to.throw(/not provide.*statement.*args/i);
  });

  it('can be created without args', function() {
    expect(raw('SELECT * FROM "jobs"')).to.be.query(
      'SELECT * FROM "jobs"', []
    );
  });

  it('can be created args', function() {
    var query = raw('SELECT * FROM "jobs" where "id" = ?', [1]);
    expect(query).to.be.query(
      'SELECT * FROM "jobs" where "id" = ?', [1]
    );
  });

  it('can be duplicated', function() {
    var query = raw('SELECT * FROM "jobs" where "id" = ?', [1]);
    var dup = query._dup();
    expect(_.pick(query, '_sql', '_args'))
      .to.eql(_.pick(dup, '_sql', '_args'));
    expect(query._args).to.not.equal(dup._args);
    expect(query).to.not.equal(dup);
  });

  describe('while spying on adapter', function() {
    beforeEach(function() { sinon.spy(adapter, 'execute'); });
    afterEach(function() { adapter.execute.restore(); });

    it('will not execute more than once', function(done) {
      var query = raw('select * from "jobs"');
      Promise.settle([
        query.execute(),
        query.execute(),
        query.execute()
      ]).then(function() {
        expect(query._adapter.execute).to.have.been.calledOnce;
      })
      .done(done, done);
    });
  });

}));
