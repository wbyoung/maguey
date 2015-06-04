'use strict';

require('../helpers');

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var schema;

var executedSQL, config = {
  adapter: 'mysql',
  connection: {
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'maguey_test'
  }
};

describe('MySQL schema', __connect(config, function() {
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
      return schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id');
        table.index('first_name');
      })
      .execute();
    });

    afterEach(function() {
      return schema.dropTable('people').execute();
    });

    it('was created with the right sql', function() {
      var c = executedSQL()[0][0];
      expect(executedSQL()).to.eql([
        [c, 'CREATE TABLE `people` (`id` integer AUTO_INCREMENT PRIMARY KEY NOT NULL, ' +
          '`first_name` varchar(255), `best_friend_id` integer, ' +
          'FOREIGN KEY (`best_friend_id`) REFERENCES `people` (`id`), ' +
          'INDEX `people_first_name_idx` (`first_name`))', []],
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

        expect(alter.sql).to.eql('ALTER TABLE `people` ' +
          'CHANGE `first_name` `first` varchar(255)');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER TABLE `people` CHANGE `first_name` `first` varchar(255)', []]
          ]);
        });
      });

      it('can add an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.index(['first_name', 'best_friend_id']);
        });

        expect(alter.sql).to.eql('CREATE INDEX ' +
          '`people_first_name_best_friend_id_idx` ON `people` ' +
          '(`first_name`, `best_friend_id`)');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'CREATE INDEX ' +
                '`people_first_name_best_friend_id_idx` ON `people` ' +
                '(`first_name`, `best_friend_id`)', []]
          ]);
        });
      });

      it('can drop an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.dropIndex('first_name');
        });

        expect(alter.sql).to
          .eql('DROP INDEX `people_first_name_idx` ON `people`');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'DROP INDEX `people_first_name_idx` ON `people`', []]
          ]);
        });
      });

      it('can rename an index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.renameIndex('people_first_name_idx', 'bff_idx');
        });

        expect(alter.sql).to
          .eql('-- procedure for ALTER INDEX `people_first_name_idx` ' +
            'RENAME TO `bff_idx`');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'BEGIN', []],
            [c, 'SHOW INDEX FROM `people` WHERE ' +
              'KEY_NAME = ?', ['people_first_name_idx']],
            [c, 'DROP INDEX `people_first_name_idx` ON `people`', []],
            [c, 'CREATE INDEX `bff_idx` ' +
              'USING BTREE ON `people` (`first_name`)', []],
            [c, 'COMMIT', []],
          ]);
        });
      });

      it('can add a column and named index', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last_name');
          table.index('last_name', { name: 'surname_index' });
        });
        var expectedSQL = 'ALTER TABLE `people` ' +
          'ADD COLUMN `last_name` varchar(255), ' +
          'ADD INDEX `surname_index` (`last_name`)';

        expect(alter.sql).to.eql(expectedSQL);

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, expectedSQL, []]
          ]);
        });
      });

      it('can add, rename, & index simultaneously', function() {
        var alter = schema.alterTable('people', function(table) {
          table.string('last');
          table.rename('first_name', 'first', 'string');
          table.index(['first', 'last']);
          table.dropIndex('first_name');
          table.renameIndex('people_first_last_idx', 'name_idx');
        });

        expect(alter.sql).to.eql('-- procedure for ' +
          'ALTER TABLE `people` ADD COLUMN `last` varchar(255), ' +
          'CHANGE `first_name` `first` varchar(255), ' +
          'DROP INDEX `people_first_name_idx`, ' +
          'ADD INDEX `people_first_last_idx` (`first`, `last`), ' +
          'RENAME INDEX `people_first_last_idx` TO `name_idx`');

        return alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'BEGIN', []],
            [c, 'ALTER TABLE `people` ADD COLUMN `last` varchar(255), ' +
              'CHANGE `first_name` `first` varchar(255), ' +
              'DROP INDEX `people_first_name_idx`, '+
              'ADD INDEX `people_first_last_idx` (`first`, `last`)', []],
            [c, 'SHOW INDEX FROM `people` WHERE ' +
              'KEY_NAME = ?', ['people_first_last_idx']],
            [c, 'DROP INDEX `people_first_last_idx` ON `people`', []],
            [c, 'CREATE INDEX `name_idx` ' +
              'USING BTREE ON `people` (`first`, `last`)', []],

            [c, 'COMMIT', []],
          ]);
        });
      });

      it('can add columns with foreign keys', function() {
        return schema.alterTable('people', function(table) {
          table.integer('worst_enemy_id').references('id');
        })
        .then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER TABLE `people` ADD COLUMN `worst_enemy_id` integer, ' +
              'ADD FOREIGN KEY (`worst_enemy_id`) REFERENCES `people` (`id`)', []],
          ]);
        });
      });
    });

  });

  describe('with a custom table', function() {
    beforeEach(function() {
      var sql = 'CREATE TABLE `people` (`id` integer ' +
        'PRIMARY KEY, `name` varchar(255), UNIQUE INDEX (`name`(2)))';
      return query.raw(sql)
      .then(function() {
        adapter._execute.restore();
        sinon.spy(adapter, '_execute');
      });
    });

    afterEach(function() {
      return schema.dropTable('people').execute();
    });

    it('can rename an index', function() {
      var alter = schema.alterTable('people', function(table) {
        table.renameIndex('name', 'name_idx');
      });

      expect(alter.sql).to
        .eql('-- procedure for ALTER INDEX `name` ' +
          'RENAME TO `name_idx`');

      return alter.then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'BEGIN', []],
          [c, 'SHOW INDEX FROM `people` WHERE ' +
            'KEY_NAME = ?', ['name']],
          [c, 'DROP INDEX `name` ON `people`', []],
          [c, 'CREATE UNIQUE INDEX `name_idx` ' +
            'USING BTREE ON `people` (`name`(2))', []],
          [c, 'COMMIT', []],
        ]);
      });
    });
  });

}));
