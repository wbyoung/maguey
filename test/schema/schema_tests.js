'use strict';

require('../helpers');

var expect = require('chai').expect;

var Schema = require('../../lib/schema');
var schema;

describe('Schema', __query(function(query) {
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
      var query = schema.createTable('users', function(table) {
        table.string('name');
      });
      expect(query).to.be.query(
        'CREATE TABLE "users" '+
        '("id" serial PRIMARY KEY, "name" varchar(255))', []
      );
    });

    it('generates the proper sql with multiple columns', function() {
      var query = schema.createTable('users', function(table) {
        table.serial('id');
        table.string('name');
      });
      expect(query).to.be.query(
        'CREATE TABLE "users" ("id" serial PRIMARY KEY, ' +
        '"name" varchar(255))', []
      );
    });

    it('supports #unlessExists()', function() {
      var query = schema.createTable('users', function(table) {
        table.serial('id');
      }).unlessExists();
      expect(query).to.be.query(
        'CREATE TABLE IF NOT EXISTS "users" ("id" serial PRIMARY KEY)', []
      );
    });

    describe('types', function() {
      it('handles serial', function() {
        var query = schema.createTable('users', function(table) {
          table.serial('id');
        });
        expect(query).to.be.query(
          'CREATE TABLE "users" ("id" serial PRIMARY KEY)', []
        );
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
      var query = schema.dropTable('users');
      expect(query).to.be.query(
        'DROP TABLE "users"', []
      );
    });

    it('supports #ifExists()', function() {
      var query = schema.dropTable('users').ifExists();
      expect(query).to.be.query(
        'DROP TABLE IF EXISTS "users"', []
      );
    });
  });

  describe('#renameTable', function() {

    it('generates the proper sql', function() {
      var query = schema.renameTable('users', 'accounts');
      expect(query).to.be.query(
        'ALTER TABLE "users" RENAME TO "accounts"', []
      );
    });

  });
}));
