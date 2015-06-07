'use strict';

require('../helpers');

// $ createuser -s root
// $ psql -U root -d postgres
// > CREATE DATABASE maguey_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var EntryQuery = require('../../lib/query/entry');
var schema;

var config = {
  adapter: 'pg',
  connection: {
    user: process.env.PG_USER || 'root',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'maguey_test',
  },
};

describe('PostgreSQL schema', __connect(config, function() {
  /* global query, adapter */

  beforeEach(function() { schema = query.schema(); });

  describe('creating a table', function() {
    beforeEach(function() {
      this.create = schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id').default(1);
        table.index('best_friend_id');
      });
      return this.create.execute();
    });

    afterEach(function() {
      return schema.dropTable('people').execute();
    });

    it('was created with the right sql', function() {
      this.create.should.have.property('sql', '-- procedure for ' +
        'CREATE TABLE "people" (' +
        '"id" serial PRIMARY KEY NOT NULL, ' +
        '"first_name" varchar(255), ' +
        '"best_friend_id" integer DEFAULT 1 REFERENCES "people" ("id"), ' +
        'INDEX "people_best_friend_id_idx" ("best_friend_id"))');

      adapter.should.have.executed(
        'BEGIN',

        'CREATE TABLE "people" (' +
        '"id" serial PRIMARY KEY NOT NULL, ' +
        '"first_name" varchar(255), ' +
        '"best_friend_id" integer DEFAULT 1 REFERENCES "people" ("id"))',

        'CREATE INDEX "people_best_friend_id_idx" ' +
        'ON "people" ("best_friend_id")',

        'COMMIT')
      .and.used.oneClient;
    });

    describe('after creation', function() {
      beforeEach(function() { adapter.scope(); });
      afterEach(function() { adapter.unscope(); });

      it('can rename columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
        });
        var sql = 'ALTER TABLE "people" RENAME "first_name" TO "first"';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can drop and add columns at the same time', function() {
        var alter = schema.alterTable('people', function(table) {
          table.drop('first_name');
          table.text('bio');
        });
        var sql = 'ALTER TABLE "people" ' +
          'DROP COLUMN "first_name", ' +
          'ADD COLUMN "bio" text';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can rename two columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('id', 'identifier', 'integer');
          table.rename('first_name', 'first', 'string');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE "people" RENAME "id" TO "identifier", ' +
          'RENAME "first_name" TO "first"');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('BEGIN',
          'ALTER TABLE "people" RENAME "id" TO "identifier"',
          'ALTER TABLE "people" RENAME "first_name" TO "first"',
          'COMMIT')
        .and.used.oneClient;
      });

      it('can add an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.index('first_name');
        });
        var sql = 'CREATE INDEX "people_first_name_idx" '+
          'ON "people" ("first_name")';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can drop an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.dropIndex('best_friend_id');
        });
        var sql = 'DROP INDEX "people_best_friend_id_idx"';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can rename an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.renameIndex('people_best_friend_id_idx', 'bff_idx');
        });
        var sql = 'ALTER INDEX "people_best_friend_id_idx" ' +
          'RENAME TO "bff_idx"';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('rename and index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
          table.index(['first']);
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE "people" ' +
          'RENAME "first_name" TO "first", ' +
          'ADD INDEX "people_first_idx" ("first")');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('BEGIN',
          'ALTER TABLE "people" RENAME "first_name" TO "first"',
          'CREATE INDEX "people_first_idx" ON "people" ("first")',
          'COMMIT')
        .and.used.oneClient;
      });

      it('can add, rename, & index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last');
          table.rename('first_name', 'first', 'string');
          table.index(['first', 'last']);
          table.dropIndex('best_friend_id');
          table.renameIndex('people_first_last_idx', 'name_idx');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE "people" ADD COLUMN "last" varchar(255), ' +
          'RENAME "first_name" TO "first", ' +
          'DROP INDEX "people_best_friend_id_idx", ' +
          'ADD INDEX "people_first_last_idx" ("first", "last"), ' +
          'RENAME INDEX "people_first_last_idx" TO "name_idx"');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('BEGIN',
          'ALTER TABLE "people" ADD COLUMN "last" varchar(255)',
          'ALTER TABLE "people" RENAME "first_name" TO "first"',
          'DROP INDEX "people_best_friend_id_idx"',
          'CREATE INDEX "people_first_last_idx" ' +
            'ON "people" ("first", "last")',
          'ALTER INDEX "people_first_last_idx" RENAME TO "name_idx"',
          'COMMIT')
        .and.used.oneClient;
      });

      describe('with raw column rename queries causing problems', function() {
        beforeEach(function() {
          var raw = EntryQuery.__class__.prototype.raw;
          sinon.stub(EntryQuery.__class__.prototype, 'raw', function() {
            var result = raw.apply(this, arguments);
            var regex = /(RENAME "[^"]+)(" TO)/i;
            if (result.sql.match(regex)) {
              result = raw.apply(this,
                [result.sql.replace(regex, '$1_invalid$2'), result.args]);
            }
            return result;
          });
        });

        afterEach(function() {
          EntryQuery.__class__.prototype.raw.restore();
        });

        it('rolls back alter column', function() {
          return schema.alterTable('people', function(table) {
            table.string('last');
            table.rename('first_name', 'first', 'string');
          })
          .should.eventually.be.rejectedWith(/first_name_invalid.*not.*exist/i)
          .meanwhile(adapter).should.have.executed('BEGIN',
            'ALTER TABLE "people" ADD COLUMN "last" varchar(255)',
            'ROLLBACK')
          .meanwhile(adapter).should.have.attempted('BEGIN',
            /^/, // tested above, executed
            'ALTER TABLE "people" RENAME "first_name_invalid" TO "first"',
            'ROLLBACK')
          .and.used.oneClient;
        });
      });
    });
  });
}));
