'use strict';

var chai = require('chai');
var expect = chai.expect;

var DropTableQuery = require('../../lib/schema/table/drop');

describe('DropTableQuery', function() {
  it('cannot be created directly', function() {
    expect(function() {
      DropTableQuery.create();
    }).to.throw(/DropTableQuery must be spawned/i);
  });
});
