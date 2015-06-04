'use strict';

require('../helpers');

var CreateTable = require('../../lib/schema/table/create');
var schema;

describe('CreateTable', __query(function() {
  /* global query */

  beforeEach(function() { schema = query.schema(); });

  it('cannot be created directly', function() {
    expect(function() {
      CreateTable.create();
    }).to.throw(/CreateTable must be spawned/i);
  });

  it('must provide a callback', function() {
    expect(function() {
      schema.createTable('users').sql;
    }).to.throw(/missing callback/i);
  });

  it('generates primary key columns via `pk`', function() {
    schema.createTable('users', function(table) {
      table.integer('identifier').pk();
    })
    .should.be.a.query('CREATE TABLE "users" ' +
      '("identifier" integer PRIMARY KEY)');
  });

  it('generates primary key columns via `primarykey`', function() {
    schema.createTable('users', function(table) {
      table.integer('id').primaryKey();
    })
    .should.be.a.query('CREATE TABLE "users" ("id" integer PRIMARY KEY)');
  });

  it('does not allow more than one primary key', function() {
    expect(function() {
      schema.createTable('users', function(table) {
        table.integer('id').pk();
        table.integer('id2').pk();
      }).sql;
    }).to.throw(/only.*one primary key/);
  });

  it('does not allow more than one primary key w/ explicit table `pk`', function() {
    expect(function() {
      schema.createTable('users').pk('id').with(function(table) {
        table.integer('id2').pk();
      }).sql;
    }).to.throw(/only.*one primary key/);
  });

  it('generates not null columns', function() {
    schema.createTable('users', function(table) {
      table.integer('id').notNull(); // pk will be automatically added
      table.string('username').notNull();
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"id" integer PRIMARY KEY NOT NULL, ' +
      '"username" varchar(255) NOT NULL)');
  });

  it('automatically adds a primary key', function() {
    schema.createTable('users', function(table) {
      table.string('username');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"id" serial PRIMARY KEY, ' +
      '"username" varchar(255))');
  });

  it('can add a named primary key', function() {
    schema.createTable('users').pk('uid').with(function(table) {
      table.string('username');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"uid" serial PRIMARY KEY, ' +
      '"username" varchar(255))');
  });

  it('can skip adding a primary key', function() {
    schema.createTable('users')
    .primaryKey(null).with(function(table) {
      table.string('username');
    })
    .should.be.a.query('CREATE TABLE "users" ("username" varchar(255))');
  });

  it('generates indexed columns', function() {
    schema.createTable('users')
    .primaryKey(null).with(function(table) {
      table.string('username');
      table.index('username');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"username" varchar(255), ' +
      'INDEX "users_username_idx" ("username"))');
  });

  it('generates unique columns', function() {
    schema.createTable('users', function(table) {
      table.integer('id').unique();
      table.integer('age').unique();
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"id" integer PRIMARY KEY UNIQUE, ' +
      '"age" integer UNIQUE)');
  });

  it('generates columns with defaults', function() {
    schema.createTable('users', function(table) {
      table.integer('id').default(0);
      table.string('name').default('anonymous');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"id" integer PRIMARY KEY DEFAULT 0, ' +
      '"name" varchar(255) DEFAULT \'anonymous\')');
  });

  it('generates columns with default of string', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('name').default('Anonymous');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"name" integer DEFAULT \'Anonymous\')');
  });

  it('generates columns using foreign keys', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"profile_id" integer REFERENCES "profiles" ("id"))');
  });

  it('generates columns using foreign key on self', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('boss_id').references('id');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"boss_id" integer REFERENCES "users" ("id"))');
  });

  it('gives error when foreign key is invalid', function() {
    expect(function() {
      schema.createTable('users', function(table) {
        table.integer('foreign_id').references('bad.foreign.key');
      })
      .statement;
    }).to.throw(/invalid.*"bad\.foreign\.key"/i);
  });

  it('generates columns using foreign keys that specify delete actions', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id').onDelete('cascade');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"profile_id" integer REFERENCES "profiles" ("id") ON DELETE CASCADE)');
  });

  it('generates columns using foreign keys that specify update actions', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id').onUpdate('nullify');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"profile_id" integer REFERENCES "profiles" ("id") ON UPDATE SET NULL)');
  });

  it('generates columns using foreign keys that specify both actions', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id')
        .references('profiles.id')
        .onDelete('restrict')
        .onUpdate('cascade');
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"profile_id" integer ' +
      'REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)');
  });

  it('give an error for unsupported foreign key delete actions', function() {
    expect(function() {
      schema.createTable('users').pk(null).with(function(table) {
        table.integer('profile_id').references('profiles.id').onDelete('bogus');
      }).sql;
    }).throw(/unknown.*foreign key.*action.*bogus/i);
  });

  it('give an error for unsupported foreign key update actions', function() {
    expect(function() {
      schema.createTable('users').pk(null).with(function(table) {
        table.integer('profile_id').references('profiles.id').onUpdate('bogus');
      }).sql;
    }).throw(/unknown.*foreign key.*action.*bogus/i);
  });

  it('can combine options', function() {
    schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id').notNull().unique();
    })
    .should.be.a.query('CREATE TABLE "users" (' +
      '"profile_id" integer NOT NULL UNIQUE REFERENCES "profiles" ("id"))');
  });
}));
