'use strict';

require('../helpers');

var Adapter = require('../..').Adapter;
var adapter;

describe('Adapter', function() {
  beforeEach(function() { adapter = Adapter.create({}); });

  it('requires a subclass to implement #_connect', function() {
    return adapter._connect()
    .should.eventually.be.rejectedWith(/_connect.*subclass/i);
  });

  it('requires a subclass to implement #_disconnect', function() {
    return adapter._disconnect()
    .should.eventually.be.rejectedWith(/_disconnect.*subclass/i);
  });

  it('requires a subclass to implement #_execute', function() {
    return adapter._execute()
    .should.eventually.be.rejectedWith(/_execute.*subclass/i);
  });
});
