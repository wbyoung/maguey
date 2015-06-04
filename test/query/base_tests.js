'use strict';

require('../helpers');

var BaseQuery = require('../../lib/query/base');
var query;

describe('BaseQuery', __adapter(function() {
  /* global adapter */

  beforeEach(function() {
    query = BaseQuery.create(adapter);
  });

  it('cannot generate sql', function() {
    expect(function() { query.statement; })
      .throw(/BaseQuery.*cannot be used/i);
  });

  it('can be cloned', function() {
    var clone = query.clone();
    expect(clone).to.not.equal(query);
  });

  it('cannot be executed', function() {
    return query.should.eventually.be.rejectedWith(/cannot be used/i);
  });
}));
