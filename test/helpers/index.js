'use strict';

var _ = require('lodash');
var maguey = require('../..');
var sinon = require('sinon');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

var createAdapter = require('maguey-chai').adapter;
var AdapterSpy = require('maguey-chai').AdapterSpy;
var EntryQuery = require('../..').EntryQuery;

chaiAsPromised.transferPromiseness = function (assertion, promise) {
  assertion.then = promise.then.bind(promise);
  assertion.meanwhile = function(value) {
    var result = promise.return(value);
    return _.extend(result, { should: result.should.eventually });
  };
};

chai.use(require('sinon-chai'));
chai.use(require('maguey-chai').reset(maguey));
chai.use(require('chai-as-promised'));

global.expect = chai.expect;
global.should = chai.should();
global.sinon = sinon;

global.__adapter = function(fn) {
  return function() {
    beforeEach(function() {
      global.adapter = createAdapter();
    });
    fn.call(this);
  };
};

global.__query = function(fn) {
  return __adapter(function() {
    beforeEach(function() {
      global.query = EntryQuery.create(global.adapter);
    });
    fn.call(this);
  });
};

global.__connect = function(config, fn) {
  return function() {
    var query = maguey(config);
    var adapter = query._adapter;
    var Adapter = adapter.__identity__;
    if (!_.contains(Adapter.__mixins__, AdapterSpy)) {
      Adapter.reopen(AdapterSpy);
      AdapterSpy.init.call(adapter);
    }

    before(function() {
      global.query = query;
      global.adapter = adapter;
      return query.raw('select 1');
    });
    after(function() {
      return adapter.disconnectAll();
    });
    beforeEach(function() { adapter.scope(); });
    afterEach(function() { adapter.unscope(); });

    fn.call(this);
  };
};
