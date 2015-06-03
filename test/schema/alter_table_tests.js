'use strict';

require('../helpers');

var chai = require('chai');
var expect = chai.expect;

var AlterTable = require('../../lib/schema/table/alter');
var schema;

describe('AlterTable', __query(function(query) {
  beforeEach(function() { schema = query.schema(); });

  it('cannot be created directly', function() {
    expect(function() {
      AlterTable.create();
    }).to.throw(/AlterTable must be spawned/i);
  });

  it('must provide a callback', function() {
    expect(function() {
      schema.alterTable('users').sql;
    }).to.throw(/missing callback/i);
  });

  it('generates primary key columns via `pk`', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('id').pk();
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY', []
    );
  });

  it('can add multiple columns', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('id').pk();
      table.integer('age');
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY, ' +
      'ADD COLUMN "age" integer', []
    );
  });

  it('generates primary key columns via `primarykey`', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('id').primaryKey();
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY', []
    );
  });

  it('does not allow more than one primary key', function() {
    expect(function() {
      schema.alterTable('users', function(table) {
        table.integer('id').pk();
        table.integer('id2').pk();
      }).sql;
    }).to.throw(/only.*one primary key/);
  });

  it('generates not null columns', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('id').notNull();
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "id" integer NOT NULL', []
    );
  });

  it('generates unique columns', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('id').unique();
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "id" integer UNIQUE', []
    );
  });

  it('generates columns with defaults', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('id').default(0);
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "id" integer DEFAULT 0', []
    );
  });

  it('generates columns using foreign keys', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('profile_id').references('profiles.id');
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "profile_id" integer REFERENCES "profiles" ("id")', []
    );
  });

  it('generates columns using foreign key on self', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('boss_id').references('id');
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" ADD COLUMN "boss_id" integer REFERENCES "users" ("id")', []
    );
  });

  it('gives error when foreign key is invalid', function() {
    expect(function() {
      schema.alterTable('users', function(table) {
        table.integer('foreign_id').references('bad.foreign.key');
      })
      .statement;
    }).to.throw(/invalid.*"bad\.foreign\.key"/i);
  });

  it('can drop columns', function() {
    var query = schema.alterTable('users', function(table) {
      table.drop('name');
    });
    expect(query).to.be.query(
      'ALTER TABLE "users" DROP COLUMN "name"', []
    );
  });

  it('can add indexes', function() {
    var query = schema.alterTable('users', function(table) {
      table.index('name');
    });
    expect(query).to.be.query(
      'CREATE INDEX "users_name_idx" ON "users" ("name")', []
    );
  });

  it('can drop indexes', function() {
    var query = schema.alterTable('users', function(table) {
      table.dropIndex('name');
    });
    expect(query).to.be.query(
      'DROP INDEX "users_name_idx"', []
    );
  });

  it('can drop indexes by name', function() {
    var query = schema.alterTable('users', function(table) {
      table.dropIndex({ name: 'myindex' });
    });
    expect(query).to.be.query(
      'DROP INDEX "myindex"', []
    );
  });

  it('can rename indexes', function() {
    var query = schema.alterTable('users', function(table) {
      table.renameIndex('a', 'b');
    });
    expect(query).to.be.query(
      'ALTER INDEX "a" RENAME TO "b"', []
    );
  });


  it('can be cloned', function() {
    var query = schema.alterTable('users', function(table) {
      table.drop('id');
    }).clone();
    expect(query).to.be.query(
      'ALTER TABLE "users" DROP COLUMN "id"', []
    );
  });

  it('can combine options', function() {
    var query = schema.alterTable('users', function(table) {
      table.integer('profile_id')
        .references('profiles.id')
        .onDelete('cascade')
        .notNull()
        .unique();
      table.drop('age');
    });

    expect(query).to.be.query(
      'ALTER TABLE "users" ' +
        'DROP COLUMN "age", ' +
        'ADD COLUMN "profile_id" integer NOT NULL UNIQUE ' +
        'REFERENCES "profiles" ("id") ON DELETE CASCADE', []
    );
  });
}));
