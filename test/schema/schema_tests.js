'use strict';

require('../helpers');

var Schema = require('../../lib/schema');
var schema;

describe('Schema', __query(function() {
  /* global query */

  beforeEach(function() { schema = query.schema(); });

  it('cannot be created directly', function() {
    expect(function() {
      Schema.create();
    }).to.throw(/Schema must be spawned/i);
  });

  it('cannot generate sql', function() {
    expect(function() {
      schema.statement;
    }).to.throw(/must first call/i);
  });

  describe('#createTable', function() {

    it('generates the proper sql', function() {
      schema.createTable('users', function(table) {
        table.string('name');
      })
      .should.be.a.query('CREATE TABLE "users" ' +
        '("id" serial PRIMARY KEY, "name" varchar(255))');
    });

    it('generates the proper sql with multiple columns', function() {
      schema.createTable('users', function(table) {
        table.serial('id');
        table.string('name');
      })
      .should.be.a.query('CREATE TABLE "users" ' +
        '("id" serial PRIMARY KEY, "name" varchar(255))');
    });

    it('supports #unlessExists()', function() {
      schema.createTable('users', function(table) {
        table.serial('id');
      })
      .unlessExists()
      .should.be.a.query('CREATE TABLE IF NOT EXISTS "users" ' +
        '("id" serial PRIMARY KEY)');
    });

    describe('types', function() {
      it('handles serial', function() {
        schema.createTable('users', function(table) {
          table.serial('id');
        })
        .should.be.a.query('CREATE TABLE "users" ("id" serial PRIMARY KEY)');
      });
    });

    it('is thenable', function() {
      var query = schema.createTable('users', function(table) {
        table.string('name');
      });
      expect(query.then).to.exist;
    });

  });

  describe('#dropTable', function() {

    it('generates the proper sql', function() {
      schema.dropTable('users').should.be.a.query('DROP TABLE "users"');
    });

    it('supports #ifExists()', function() {
      schema.dropTable('users').ifExists()
      .should.be.a.query('DROP TABLE IF EXISTS "users"');
    });
  });

  describe('#renameTable', function() {

    it('generates the proper sql', function() {
      schema.renameTable('users', 'accounts')
      .should.be.a.query('ALTER TABLE "users" RENAME TO "accounts"');
    });

  });
}));
