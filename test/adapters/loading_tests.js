'use strict';

require('../helpers');

var base = '../../';
var azul = base + '.';
var adapters = base + 'lib/adapters';
var pg = base + 'lib/adapters/pg';
var mysql = base + 'lib/adapters/mysql';
var sqlite3 = base + 'lib/adapters/sqlite3';

// paths leading to the inclusion of adapters need to be cleared so they
// actually re-load the adapters module.
var leading = ['.', 'lib', 'lib/adapters'];

describe('Adapter loading', function() {
  beforeEach(function() {
    leading.forEach(function(path) {
      delete require.cache[require.resolve(base + path)];
    });
    delete require.cache[require.resolve(pg)];
    delete require.cache[require.resolve(mysql)];
    delete require.cache[require.resolve(sqlite3)];
  });

  it('does not immediately load any adapter', function() {
    require(azul);
    expect(require.cache[require.resolve(pg)]).to.not.exist;
    expect(require.cache[require.resolve(mysql)]).to.not.exist;
    expect(require.cache[require.resolve(sqlite3)]).to.not.exist;

    // these should be loaded now
    expect(require.cache[require.resolve(azul)]).to.exist;
    expect(require.cache[require.resolve(adapters)]).to.exist;
  });

  it('can load via azul export', function() {
    require(azul).adapters.pg;
    expect(require.cache[require.resolve(pg)]).to.exist;
    expect(require.cache[require.resolve(azul)]).to.exist;
    expect(require.cache[require.resolve(adapters)]).to.exist;

    // these should remain not loaded
    expect(require.cache[require.resolve(mysql)]).to.not.exist;
    expect(require.cache[require.resolve(sqlite3)]).to.not.exist;
  });

  it('can load via adapters export', function() {
    require(adapters).pg;
    expect(require.cache[require.resolve(pg)]).to.exist;
    expect(require.cache[require.resolve(adapters)]).to.exist;

    // these should remain not loaded
    expect(require.cache[require.resolve(mysql)]).to.not.exist;
    expect(require.cache[require.resolve(sqlite3)]).to.not.exist;
  });

  it('can load pg', function() {
    require(azul).adapters.pg;
    expect(require.cache[require.resolve(pg)]).to.exist;
  });

  it('can load pg via postgresql', function() {
    require(azul).adapters.postgresql;
    expect(require.cache[require.resolve(pg)]).to.exist;
  });

  it('can load pg via postgres', function() {
    require(azul).adapters.postgres;
    expect(require.cache[require.resolve(pg)]).to.exist;
  });

  it('can load mysql', function() {
    require(azul).adapters.mysql;
    expect(require.cache[require.resolve(mysql)]).to.exist;
  });

  it('can load sqlite3', function() {
    require(azul).adapters.sqlite3;
    expect(require.cache[require.resolve(sqlite3)]).to.exist;
  });

  it('can load sqlite3 via sqlite', function() {
    require(azul).adapters.sqlite;
    expect(require.cache[require.resolve(sqlite3)]).to.exist;
  });

});
