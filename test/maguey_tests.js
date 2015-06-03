'use strict';

require('./helpers');

var chai = require('chai');
var expect = chai.expect;

var maguey = require('..');

describe('maguey', function() {

  it('fails with an invalid adapter', function() {
    var config = {
      adapter: 'invalid_adapter',
      connection: {
        username: 'root',
        password: '',
        database: 'maguey_test'
      }
    };
    expect(function() {
      maguey(config);
    }).to.throw(/no adapter.*invalid_adapter/i);
  });

  it('fails with an object that is not an adapter', function() {
    var config = {
      adapter: {},
    };
    expect(function() {
      maguey(config);
    }).to.throw(/invalid adapter/i);
  });

  it('loads adapters based on alias names', function() {
    expect(function() {
      maguey({ adapter: 'postgres' });
    }).to.not.throw();
  });

  it('fails with when no configuration is given', function() {
    expect(function() {
      maguey();
    }).to.throw(/missing connection/i);
  });

});
