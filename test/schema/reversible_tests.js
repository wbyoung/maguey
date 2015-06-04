'use strict';

require('../helpers');

var _ = require('lodash');
var ReversibleSchema = require('../../lib/schema/reversible');
var Schema = require('../../lib/schema');
var schema;

describe('ReversibleSchema', __query(function() {
  /* global query */

  beforeEach(function() { schema = query.schema().reversible(); });

  it('cannot be created directly', function() {
    expect(function() {
      ReversibleSchema.create();
    }).to.throw(/ReversibleSchema must be spawned/i);
  });

  it('cannot generate sql', function() {
    expect(function() {
      schema.statement;
    }).to.throw(/must first call/i);
  });

  describe('#createTable', function() {

    it('is reversible', function() {
      schema.createTable('users', function(table) {
        table.string('name');
      })
      .should.be.a.query('CREATE TABLE "users" '+
        '("id" serial PRIMARY KEY, "name" varchar(255))');
    });

  });

  describe('#alterTable', function() {

    it('is reversible', function() {
      schema.alterTable('users', function(table) {
        table.string('name');
      })
      .should.be.a.query('ALTER TABLE "users" ' +
        'ADD COLUMN "name" varchar(255)');
    });

    it('is not reversible when columns are dropped', function() {
      expect(function() {
        schema.alterTable('users', function(table) {
          table.drop('name');
        }).sql;
      }).to.throw(/reversible.*cannot.*drop/i);
    });

    it('is not reversible when indexes are dropped', function() {
      expect(function() {
        schema.alterTable('users', function(table) {
          table.dropIndex('name');
        }).sql;
      }).to.throw(/reversible.*cannot.*drop/i);
    });

  });

  describe('#renameTable', function() {

    it('is reversible', function() {
      schema.renameTable('users', 'accounts')
      .should.be.a.query('ALTER TABLE "users" RENAME TO "accounts"');
    });

  });

  describe('#dropTable', function() {

    it('is not reversible', function() {
      expect(function() {
        schema.dropTable('users').sql;
      }).to.throw(/drop.*not reversible/i);
    });

  });

  it('overrides all schema methods', function() {
    var mixins = function(cls) {
      return _(cls.__identity__.__mixins__)
      .transform(function(array, mixin) { array.push(_.keys(mixin)); })
      .flatten().unique()
      .value();
    };
    var methods = function(cls) {
      return _(cls.__class__.prototype).map(function(value, name) {
        return _.isFunction(value) && name;
      })
      .filter()
      .value();
    };

    var defined = methods(ReversibleSchema);
    var notOverridden = _(methods(Schema))
      .difference(mixins(Schema)) // ignore methods mixed in to schema
      .difference(defined) // remove any methods defined on reverse
      .difference(['reversible', 'reverse']) // whitelist
      .value();
    notOverridden.should.eql([]);
  });
}));
