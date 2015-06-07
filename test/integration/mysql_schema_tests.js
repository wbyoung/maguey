'use strict';

require('../helpers');

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var schema;

var config = {
  adapter: 'mysql',
  connection: {
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'maguey_test',
  },
};

describe('MySQL schema', __connect(config, function() {
  /* global query, adapter */

  beforeEach(function() { schema = query.schema(); });

  describe('creating a table', function() {
    beforeEach(function() {
      return schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id');
        table.index('first_name');
      });
    });

    afterEach(function() {
      return schema.dropTable('people');
    });

    it('was created with the right sql', function() {
      adapter.should.have.executed('CREATE TABLE `people` (' +
        '`id` integer AUTO_INCREMENT PRIMARY KEY NOT NULL, ' +
        '`first_name` varchar(255), `best_friend_id` integer, ' +
        'FOREIGN KEY (`best_friend_id`) REFERENCES `people` (`id`), ' +
        'INDEX `people_first_name_idx` (`first_name`))')
      .and.used.oneClient;
    });

    describe('after creation', function() {
      beforeEach(function() { adapter.scope(); });
      afterEach(function() { adapter.unscope(); });

      it('can rename columns', function() {
        var alter = schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
        });
        var sql = 'ALTER TABLE `people` ' +
          'CHANGE `first_name` `first` varchar(255)';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can add an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.index(['first_name', 'best_friend_id']);
        });
        var sql = 'CREATE INDEX `people_first_name_best_friend_id_idx` ' +
          'ON `people` (`first_name`, `best_friend_id`)';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can drop an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.dropIndex('first_name');
        });
        var sql = 'DROP INDEX `people_first_name_idx` ON `people`';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can rename an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.renameIndex('people_first_name_idx', 'bff_idx');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER INDEX `people_first_name_idx` RENAME TO `bff_idx`');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('BEGIN',
          'SHOW INDEX FROM `people` ' +
          'WHERE KEY_NAME = ?', ['people_first_name_idx'],
          'DROP INDEX `people_first_name_idx` ON `people`',
          'CREATE INDEX `bff_idx` USING BTREE ON `people` (`first_name`)',
          'COMMIT')
        .and.used.oneClient;
      });

      it('can add a column and named index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last_name');
          table.index('last_name', { name: 'surname_index' });
        });
        var sql = 'ALTER TABLE `people` ' +
          'ADD COLUMN `last_name` varchar(255), ' +
          'ADD INDEX `surname_index` (`last_name`)';

        alter.should.have.property('sql', sql);
        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed(sql)
        .and.used.oneClient;
      });

      it('can add, rename, & index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last');
          table.rename('first_name', 'first', 'string');
          table.index(['first', 'last']);
          table.dropIndex('first_name');
          table.renameIndex('people_first_last_idx', 'name_idx');
        });

        alter.should.have.property('sql', '-- procedure for ' +
          'ALTER TABLE `people` ADD COLUMN `last` varchar(255), ' +
          'CHANGE `first_name` `first` varchar(255), ' +
          'DROP INDEX `people_first_name_idx`, ' +
          'ADD INDEX `people_first_last_idx` (`first`, `last`), ' +
          'RENAME INDEX `people_first_last_idx` TO `name_idx`');

        return alter.should.eventually.exist
        .meanwhile(adapter).should.have.executed('BEGIN',
          'ALTER TABLE `people` ADD COLUMN `last` varchar(255), ' +
          'CHANGE `first_name` `first` varchar(255), ' +
          'DROP INDEX `people_first_name_idx`, '+
          'ADD INDEX `people_first_last_idx` (`first`, `last`)',

          'SHOW INDEX FROM `people` WHERE ' +
          'KEY_NAME = ?', ['people_first_last_idx'],

          'DROP INDEX `people_first_last_idx` ON `people`',
          'CREATE INDEX `name_idx` USING BTREE ON `people` (`first`, `last`)',
          'COMMIT')
        .and.used.oneClient;
      });

      it('can add columns with foreign keys', function() {
        return schema.alterTable('people', function(table) {
          table.integer('worst_enemy_id').references('id');
        })
        .should.eventually.exist
        .meanwhile(adapter).should.have.executed('ALTER TABLE `people` ' +
          'ADD COLUMN `worst_enemy_id` integer, ' +
          'ADD FOREIGN KEY (`worst_enemy_id`) REFERENCES `people` (`id`)')
        .and.used.oneClient;
      });
    });

  });

  describe('with a custom table', function() {
    beforeEach(function() {
      return query.raw('CREATE TABLE `people` (`id` integer ' +
        'PRIMARY KEY, `name` varchar(255), UNIQUE INDEX (`name`(2)))');
    });

    afterEach(function() {
      return schema.dropTable('people');
    });

    beforeEach(function() { adapter.scope(); });
    afterEach(function() { adapter.unscope(); });

    it('can rename an index', function() {
      var alter = schema.alterTable('people', function(table) {
        table.renameIndex('name', 'name_idx');
      });

      alter.should.have.property('sql', '-- procedure for ' +
        'ALTER INDEX `name` RENAME TO `name_idx`');

      return alter.should.eventually.exist
      .meanwhile(adapter).should.have.executed('BEGIN',
        'SHOW INDEX FROM `people` WHERE KEY_NAME = ?', ['name'],
        'DROP INDEX `name` ON `people`',
        'CREATE UNIQUE INDEX `name_idx` USING BTREE ON `people` (`name`(2))',
        'COMMIT')
      .and.used.oneClient;
    });
  });

}));
