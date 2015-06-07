'use strict';

require('../helpers');

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var _ = require('lodash');
var EntryQuery = require('../../lib/query/entry');
var schema;
var anySQL = _.partial(_.times, _, _.constant(/^/));

var config = {
  adapter: 'sqlite3',
  connection: {
    filename: ''
  }
};

describe('SQLite3 schema', __connect(config, function() {
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
      return this.create.execute().return();
    });

    afterEach(function() {
      return schema.dropTable('people').execute();
    });

    it('was created with the right sql', function() {
      this.create.should.have.property('sql', '-- procedure for ' +
        'CREATE TABLE "people" (' +
        '"id" integer PRIMARY KEY NOT NULL, ' +
        '"first_name" varchar(255), ' +
        '"best_friend_id" integer DEFAULT 1 REFERENCES "people" ("id"), ' +
        'INDEX "people_best_friend_id_idx" ("best_friend_id"))');

      adapter.should.have.executed('SAVEPOINT AZULJS_1',
        'CREATE TABLE "people" (' +
        '"id" integer PRIMARY KEY NOT NULL, ' +
        '"first_name" varchar(255), ' +
        '"best_friend_id" integer DEFAULT 1 ' +
        'REFERENCES "people" ("id"))',

        'CREATE INDEX "people_best_friend_id_idx" ' +
        'ON "people" ("best_friend_id")',

        'RELEASE AZULJS_1')
      .and.used.oneClient;
    });

    describe('after creation', function() {
      beforeEach(function() { adapter.scope(); });
      afterEach(function() { adapter.unscope(); });

      it('can add columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last_name');
        });
        var sql = 'ALTER TABLE "people" ADD COLUMN "last_name" varchar(255)';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can add an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.index(['first_name', 'best_friend_id']);
        });
        var sql = 'CREATE INDEX ' +
          '"people_first_name_best_friend_id_idx" ON "people" ' +
          '("first_name", "best_friend_id")';

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

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER INDEX "people_best_friend_id_idx" ' +
          'RENAME TO "bff_idx"');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('SAVEPOINT AZULJS_1',
          'PRAGMA index_info("people_best_friend_id_idx")',
          'DROP INDEX "people_best_friend_id_idx"',
          'CREATE INDEX "bff_idx" ON "people" ("best_friend_id")',
          'RELEASE AZULJS_1')
        .and.used.oneClient;
      });

      it('can rename columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE "people" RENAME "first_name" TO "first"');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('SAVEPOINT AZULJS_1',
          'PRAGMA defer_foreign_keys=1',
          'PRAGMA table_info("people")',
          'PRAGMA index_list("people")',
          'PRAGMA index_info("people_best_friend_id_idx")',
          'PRAGMA foreign_key_list("people")',
          'ALTER TABLE "people" RENAME TO "people_old"',

          'CREATE TABLE "people" (' +
          '"id" integer PRIMARY KEY NOT NULL, ' +
          '"first" varchar(255), ' +
          '"best_friend_id" integer DEFAULT 1, ' +
          'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
          'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)',

          'INSERT INTO "people" ("id", "first", "best_friend_id") ' +
          'SELECT "id", "first_name", "best_friend_id" FROM "people_old"',

          'DROP TABLE "people_old"',

          'CREATE INDEX "people_best_friend_id_idx" ' +
          'ON "people" ("best_friend_id")',

          'RELEASE AZULJS_1')
        .and.used.oneClient;
      });

      it('drops a column once when procedure is repeated', function() {
        var alter = schema.alterTable('people', function(table) {
          table.drop('first_name');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE "people" DROP COLUMN "first_name"');

        return alter.then(function() { return alter; }).should.eventually.exist
        .meanwhile(adapter).should.have.executed('SAVEPOINT AZULJS_1',
          'PRAGMA defer_foreign_keys=1',
          'PRAGMA table_info("people")',
          'PRAGMA index_list("people")',
          'PRAGMA index_info("people_best_friend_id_idx")',
          'PRAGMA foreign_key_list("people")',
          'ALTER TABLE "people" RENAME TO "people_old"',

          'CREATE TABLE "people" (' +
          '"id" integer PRIMARY KEY NOT NULL, ' +
          '"best_friend_id" integer DEFAULT 1, ' +
          'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
          'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)',

          'INSERT INTO "people" ("id", "best_friend_id") ' +
          'SELECT "id", "best_friend_id" FROM "people_old"',

          'DROP TABLE "people_old"',

          'CREATE INDEX "people_best_friend_id_idx" ' +
          'ON "people" ("best_friend_id")',

          'RELEASE AZULJS_1')
        .and.used.oneClient;
      });

      describe('with raw table rename queries causing problems', function() {
        beforeEach(function() {
          var raw = EntryQuery.__class__.prototype.raw;
          sinon.stub(EntryQuery.__class__.prototype, 'raw', function(query) {
            if (query.match(/RENAME TO/)) {
              arguments[0] = query.replace(/"$/, '_wrongname"');
            }
            return raw.apply(this, arguments);
          });
        });

        afterEach(function() {
          EntryQuery.__class__.prototype.raw.restore();
        });

        it('rolls back alter table', function() {
          return schema.alterTable('people', function(table) {
            table.drop('first_name');
          })
          .should.eventually.be.rejectedWith(/no.*table.*people_old/i)
          .meanwhile(adapter).should.have.executed('SAVEPOINT AZULJS_1',
            'PRAGMA defer_foreign_keys=1',
            'PRAGMA table_info("people")',
            'PRAGMA index_list("people")',
            'PRAGMA index_info("people_best_friend_id_idx")',
            'PRAGMA foreign_key_list("people")',
            'ALTER TABLE "people" RENAME TO "people_old_wrongname"',

            'CREATE TABLE "people" (' +
            '"id" integer PRIMARY KEY NOT NULL, ' +
            '"best_friend_id" integer DEFAULT 1, ' +
            'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
            'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)',

            'ROLLBACK TO AZULJS_1')
          .meanwhile(adapter).should.have
          .attempted(anySQL(8), [
            'INSERT INTO "people" ("id", "best_friend_id") ' +
            'SELECT "id", "best_friend_id" FROM "people_old"',
          ], anySQL(1))
          .and.used.oneClient;
        });
      });

      it('can add, drop, and index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.drop('first_name');
          table.string('name');
          table.index('name');
          table.renameIndex('people_best_friend_id_idx', 'bff_idx');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE "people" DROP COLUMN "first_name", ' +
          'ADD COLUMN "name" varchar(255), ' +
          'ADD INDEX "people_name_idx" ("name"), ' +
          'RENAME INDEX "people_best_friend_id_idx" TO "bff_idx"');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('SAVEPOINT AZULJS_1',
          'PRAGMA defer_foreign_keys=1',
          'PRAGMA table_info("people")',
          'PRAGMA index_list("people")',
          'PRAGMA index_info("people_best_friend_id_idx")',
          'PRAGMA foreign_key_list("people")',
          'ALTER TABLE "people" RENAME TO "people_old"',

          'CREATE TABLE "people" (' +
          '"id" integer PRIMARY KEY NOT NULL, ' +
          '"best_friend_id" integer DEFAULT 1, ' +
          '"name" varchar(255), ' +
          'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
          'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)',

          'INSERT INTO "people" ("id", "best_friend_id") ' +
          'SELECT "id", "best_friend_id" FROM "people_old"',

          'DROP TABLE "people_old"',

          'CREATE INDEX "bff_idx" ' +
          'ON "people" ("best_friend_id")',

          'CREATE INDEX "people_name_idx" ON "people" ("name")',
          'RELEASE AZULJS_1')
        .and.used.oneClient;
      });
    });
  });
}));
