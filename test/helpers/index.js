'use strict';

require('../helpers');

var chai = require('chai');
var util = require('util');

var BaseQuery = require('../..').BaseQuery;
var EntryQuery = require('../..').EntryQuery;
var FakeAdapter = require('../fakes/adapter');
var lib = require('../..');

global.__query = function(fn) {
  var adapter = FakeAdapter.create({});
  var query = EntryQuery.create(adapter);
  return function() {
    fn.call(this, query, adapter);
  };
};

global.__connect = function(config, fn) {
  var query = lib(config);
  var adapter = query._adapter;
  return function() {
    before(function(done) {
      query.raw('select 1').execute().return().then(done, done);
    });
    after(function(done) { adapter.disconnectAll().then(done, done); });
    fn.call(this, query, adapter);
  };
};

chai.use(function (_chai, _) {
  var Assertion = _chai.Assertion;
  Assertion.addMethod('query', function(sql, args) {
    var obj = this._obj;
    new Assertion(this._obj).to.be.instanceof(BaseQuery.__class__);
    var pass =
      _.eql(obj.sql, sql) &&
      _.eql(obj.args, args || []);
    var fmt = function(s, a) {
      return util.format('%s ~[%s]', s, a.join(', '));
    };
    this.assert(pass,
      'expected #{this} to have SQL #{exp} but got #{act}',
      'expected #{this} to not have SQL of #{act}',
      fmt(sql, args || []), fmt(obj.sql, obj.args));
  });
});
