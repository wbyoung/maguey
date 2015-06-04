'use strict';

require('../helpers');

// $ createuser -s root
// $ psql -U root -d postgres
// > CREATE DATABASE maguey_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var EntryQuery = require('../../lib/query/entry');
var schema;

var executedSQL, config = {
  adapter: 'pg',
  connection: {
    user: process.env.PG_USER || 'root',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'maguey_test'
  }
};

describe('PostgreSQL schema', __connect(config, function() {
  /* global query, adapter */

  beforeEach(function() { schema = query.schema(); });
  beforeEach(function() {
    sinon.spy(adapter, '_execute');
    executedSQL = function() {
      var result = [];
      adapter._execute.getCalls().forEach(function(call) {
        result.push(call.args.slice(0,3));
      });
      return result;
    };
  });

  afterEach(function() {
    adapter._execute.restore();
  });

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
      expect(this.create.sql).to.eql('-- procedure for ' +
        'CREATE TABLE "people" (' +
          '"id" serial PRIMARY KEY NOT NULL, ' +
          '"first_name" varchar(255), ' +
          '"best_friend_id" integer DEFAULT 1 REFERENCES "people" ("id"), ' +
          'INDEX "people_best_friend_id_idx" ("best_friend_id"))');

      var c = executedSQL()[0][0];
      expect(executedSQL()).to.eql([
        [c, 'BEGIN', []],
        [c, 'CREATE TABLE "people" (' +
          '"id" serial PRIMARY KEY NOT NULL, ' +
          '"first_name" varchar(255), ' +
          '"best_friend_id" integer DEFAULT 1 REFERENCES "people" ("id"))', []],
        [c, 'CREATE INDEX "people_best_friend_id_idx" ' +
          'ON "people" ("best_friend_id")', []],
        [c, 'COMMIT', []],
      ]);
    });

    describe('after creation', function() {
      beforeEach(function() {
        adapter._execute.restore();
        sinon.spy(adapter, '_execute');
      });

      it('can rename columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
        });

        expect(alter.sql).to
          .eql('ALTER TABLE "people" RENAME "first_name" TO "first"');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []]
          ]);
        });
      });

      it('can drop and add columns at the same time', function() {
        var alter = schema.alterTable('people', function(table) {
          table.drop('first_name');
          table.text('bio');
        });

        expect(alter.sql).to.eql('ALTER TABLE "people" ' +
          'DROP COLUMN "first_name", ' +
          'ADD COLUMN "bio" text');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER TABLE "people" DROP COLUMN "first_name", ' +
              'ADD COLUMN "bio" text', []],
          ]);
        });
      });

      it('can rename two columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('id', 'identifier', 'integer');
          table.rename('first_name', 'first', 'string');
        });

        expect(alter.sql).to.eql('-- procedure for ' +
          'ALTER TABLE "people" RENAME "id" TO "identifier", ' +
          'RENAME "first_name" TO "first"');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'BEGIN', []],
            [c, 'ALTER TABLE "people" RENAME "id" TO "identifier"', []],
            [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []],
            [c, 'COMMIT', []],
          ]);
        });
      });

      it('can add an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.index('first_name');
        });

        expect(alter.sql).to
          .eql('CREATE INDEX "people_first_name_idx" '+
            'ON "people" ("first_name")');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'CREATE INDEX "people_first_name_idx" ' +
              'ON "people" ("first_name")', []]
          ]);
        });
      });

      it('can drop an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.dropIndex('best_friend_id');
        });

        expect(alter.sql).to
          .eql('DROP INDEX "people_best_friend_id_idx"');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'DROP INDEX "people_best_friend_id_idx"', []]
          ]);
        });
      });

      it('can rename an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.renameIndex('people_best_friend_id_idx', 'bff_idx');
        });

        expect(alter.sql).to
          .eql('ALTER INDEX "people_best_friend_id_idx" ' +
            'RENAME TO "bff_idx"');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER INDEX "people_best_friend_id_idx" ' +
              'RENAME TO "bff_idx"', []]
          ]);
        });
      });

      it('rename and index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
          table.index(['first']);
        });

        expect(alter.sql).to.eql('-- procedure for ' +
          'ALTER TABLE "people" ' +
          'RENAME "first_name" TO "first", ' +
          'ADD INDEX "people_first_idx" ("first")');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'BEGIN', []],
            [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []],
            [c, 'CREATE INDEX "people_first_idx" ON "people" ("first")', []],
            [c, 'COMMIT', []],
          ]);
        });
      });

      it('can add, rename, & index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last');
          table.rename('first_name', 'first', 'string');
          table.index(['first', 'last']);
          table.dropIndex('best_friend_id');
          table.renameIndex('people_first_last_idx', 'name_idx');
        });

        expect(alter.sql).to.eql('-- procedure for ' +
          'ALTER TABLE "people" ADD COLUMN "last" varchar(255), ' +
          'RENAME "first_name" TO "first", ' +
          'DROP INDEX "people_best_friend_id_idx", ' +
          'ADD INDEX "people_first_last_idx" ("first", "last"), ' +
          'RENAME INDEX "people_first_last_idx" TO "name_idx"');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'BEGIN', []],
            [c, 'ALTER TABLE "people" ADD COLUMN "last" varchar(255)', []],
            [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []],
            [c, 'DROP INDEX "people_best_friend_id_idx"', []],
            [c, 'CREATE INDEX "people_first_last_idx" ' +
              'ON "people" ("first", "last")', []],
            [c, 'ALTER INDEX "people_first_last_idx" RENAME TO "name_idx"', []],
            [c, 'COMMIT', []],
          ]);
        });
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
          .execute()
          .throw(new Error('Expected alter to fail'))
          .catch(function(e) {
            expect(e).to.match(/first_name_invalid.*not.*exist/i);
            var c = executedSQL()[0][0];
            expect(executedSQL()).to.eql([
              [c, 'BEGIN', []],
              [c, 'ALTER TABLE "people" ADD COLUMN "last" varchar(255)', []],
              [c, 'ALTER TABLE "people" RENAME "first_name_invalid" TO "first"', []],
              [c, 'ROLLBACK', []],
            ]);
          });
        });
      });
    });
  });
}));
