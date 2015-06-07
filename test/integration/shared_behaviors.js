'use strict';

require('../helpers');

var _ = require('lodash');
var util = require('util');
var Promise = require('bluebird');
var Condition = require('../../lib/condition'),
  w = Condition.w;

var shared = {};

shared.shouldSupportStandardTypes = function(it) {
  var query; before(function() { query = this.query; });
  var schema; before(function() { schema = query.schema(); });

  // shared behavior for type tests
  var viaOptions = function(type, data, expected, options, equal, fn) {
    var table = util.format('maguey_type_%s', type);
    var cast = function(result) {
      return this.castDatabaseValue(type, result, options);
    };
    equal = equal || 'equal';
    fn = fn || _.noop;
    return function() {
      return Promise.bind(this)
      .then(function() {
        return schema.createTable(table).pk(null).with(function(table) {
          fn(table[type]('column', options));
        });
      })
      .then(function() { return query.insert(table, { column: data }); })
      .then(function() { return query.select(table); })
      .get('rows')
      .get('0')
      .get('column')
      .then(cast)
      .then(function(result) {
        expect(result).to[equal](expected);
      })
      .finally(function() { return schema.dropTable(table).ifExists(); });
    };
  };
  var via = function(type, data, equal) {
    return viaOptions(type, data, data, undefined, equal);
  };

  describe('types', function() {

    it('supports `auto.pk`',
      viaOptions('auto', 1, 1, { primaryKey: true }));
    it('supports `increments.pk`',
      viaOptions('increments', 1, 1, { primaryKey: true }));
    it('supports `serial.pk`',
      viaOptions('serial', 1, 1, { primaryKey: true }));
    it('supports `integer`', via('integer', 1));
    it('supports `integer64`', via('integer64', 1));
    it('supports `string`', via('string', 'hello world'));
    it('supports `text`', via('text', 'hello world'));
    it('supports `binary`', via('binary', new Buffer('hello world'), 'eql'));
    it('supports `bool`', via('bool', true));
    it('supports `date`', via('date', new Date(2014, 10-1, 31), 'eql'));
    it('supports `time`', via('time', '11:57:23'));
    it('supports `dateTime`', via('dateTime', new Date(2014, 10-1, 31), 'eql'));
    it('supports `float`', via('float', 3.14159));
    it('supports `decimal`', via('decimal', 3.14159));

    it('supports `string` length', viaOptions('string', 'val', 'val', {
      length: 3,
    }));

    it('supports `decimal`', viaOptions('decimal', 3.14159, 3.14159));

    it('supports `decimal` precision', viaOptions('decimal', 3.14159, 3, {
      precision: 3,
    }));

    it('supports `decimal` options', viaOptions('decimal', 3.14159, 3.14, {
      precision: 4,
      scale: 2,
    }));

    it('supports `pk`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.pk(); }));

    it('supports `primaryKey`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.primaryKey(); }));

    it('supports `default`', function() {
      var table = 'maguey_default';
      var value = 'maguey\'s default\\\n\t\b\r\x1a"';
      return Promise.bind(this)
      .then(function() {
        return schema.createTable(table).pk(null).with(function(table) {
          table.string('required');
          table.string('string').default(value);
          table.integer('integer').default(3);
        });
      })
      .then(function() { return query.insert(table, { required: '' }); })
      .then(function() { return query.select(table); })
      .get('rows')
      .get('0')
      .then(function(result) {
        expect(result).to.eql({ required: '', string: value, integer: 3 });
      })
      .finally(function() { return schema.dropTable(table).ifExists(); });
    });

    it('supports `notNull`', function() {
      var table = 'maguey_not_null';
      return Promise.bind(this)
      .then(function() {
        return schema.createTable(table).pk(null).with(function(table) {
          table.string('column').notNull();
        });
      })
      .then(function() { return query.insert(table, { column: null }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/(cannot|violates|constraint).*null/i);
      })
      .finally(function() { return schema.dropTable(table).ifExists(); });
    });

    it('supports `unique`', function() {
      var table = 'maguey_unique';
      return Promise.bind(this)
      .then(function() {
        return schema.createTable(table).pk(null).with(function(table) {
          table.string('column').unique();
        });
      })
      .then(function() { return query.insert(table, { column: 'val' }); })
      .then(function() { return query.insert(table, { column: 'val' }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/duplicate|unique constraint/i);
      })
      .finally(function() { return schema.dropTable(table).ifExists(); });
    });
  });
};

shared.shouldSupportTransactions = function(it) {
  var query; before(function() { query = this.query; });
  var schema; before(function() { schema = query.schema(); });

  describe('transactions', function() {
    beforeEach(function() {
      return schema.createTable('people').pk(null).with(function(table) {
        table.string('name');
      })
      .execute();
    });

    afterEach(function() {
      return schema.dropTable('people').ifExists().execute();
    });

    it('works when nested', function() {
      var transaction = query.transaction();
      var q = query.transaction(transaction);
      return transaction.begin()
      .then(function() {
        return q.insert('people').values({ name: 'Susan' });
      })
      .then(function() { return transaction.begin(); })
      .then(function() {
        return q.insert('people').values({ name: 'Jake' });
      })
      .then(function() { return transaction.commit(); })
      .then(function() { return transaction.begin(); })
      .then(function() {
        return q.insert('people').values({ name: 'Brad' });
      })
      .then(function() { return transaction.rollback(); })
      .then(function() {
        return q.select('people').fetch();
      })
      .then(function(people) {
        expect(people).to.eql([{ name: 'Susan' }, { name: 'Jake' }]);
      })
      .then(function() { return transaction.commit(); })
      .catch(function(e) { return transaction.rollback().execute().throw(e); });
    });
  });
};

shared.shouldSupportStandardConditions = function(it) {
  var query; before(function() { query = this.query; });
  var schema; before(function() { schema = query.schema(); });

  describe('conditions', function() {
    beforeEach(function() {
      return schema.createTable('people').pk(null).with(function(table) {
        table.string('name');
        table.integer('height');
        table.dateTime('dob');
      })
      .then(function() {
        return query.insert('people')
          .values({ name: 'Brad' })
          .values({ name: 'Jim', height: 69, dob: new Date(1968, 2-1, 14) })
          .values({ name: 'Kristen', height: 65, dob: new Date(1982, 12-1, 20, 20, 31, 43) })
          .values({ name: 'Sarah', height: 64, dob: new Date(1991, 9-1, 1) })
          .values({ name: 'Tim', height: 72, dob: new Date(1958, 4-1, 14) });
      });
    });

    afterEach(function() {
      return schema.dropTable('people').ifExists().execute();
    });

    it('supports `exact`', function() {
      return query.select('people').where(w({
        name$exact: 'Jim',
        height$exact: 69,
        dob$exact: new Date(1968, 2-1, 14),
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      });
    });

    it('supports `iexact`', function() {
      return query.select('people').where(w({
        name$iexact: 'kristen',
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `in`', function() {
      return query.select('people').where(w({
        name$in: ['Sarah', 'Tim'],
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah', 'Tim']);
      });
    });

    it('supports `gt`', function() {
      return query.select('people').where(w({
        height$gt: 64,
        dob$gt: new Date(1968, 2-1, 14),
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `gte`', function() {
      return query.select('people').where(w({
        height$gte: 69,
        dob$gte: new Date(1958, 4-1, 14),
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Tim']);
      });
    });

    it('supports `lt`', function() {
      return query.select('people').where(w({
        height$lt: 69,
        dob$lt: new Date(1991, 9-1, 1),
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `lte`', function() {
      return query.select('people').where(w({
        height$lte: 69,
        dob$lte: new Date(1991, 9-1, 1),
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen', 'Sarah']);
      });
    });

    it('supports `between` with numbers', function() {
      return query.select('people').where(w({
        height$between: [65, 69],
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      });
    });

    it('supports `between` with dates', function() {
      return query.select('people').where(w({
        dob$between: [new Date(1968, 2-1, 14), new Date(1982, 12-1, 20, 20, 31, 43)],
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      });
    });

    it('supports `isull`', function() {
      return query.select('people').where(w({
        height$isnull: true,
        dob$isnull: true,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Brad']);
      });
    });

    it('supports `contains` with uppercase value', function() {
      return query.select('people').where(w({
        name$contains: 'T',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      });
    });

    it('supports `contains` with lowercase value', function() {
      return query.select('people').where(w({
        name$contains: 't',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `icontains`', function() {
      return query.select('people').where(w({
        name$icontains: 'RA',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Brad', 'Sarah']);
      });
    });

    it('supports `startsWith`', function() {
      return query.select('people').where(w({
        name$startsWith: 'T',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      });
    });

    it('supports `istartsWith`', function() {
      return query.select('people').where(w({
        name$istartsWith: 'k',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `endsWith`', function() {
      return query.select('people').where(w({
        name$endsWith: 'm',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Tim']);
      });
    });

    it('supports `iendsWith`', function() {
      return query.select('people').where(w({
        name$iendsWith: 'N',
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `regex`', function() {
      return query.select('people').where(w({
        name$regex: /Jim|Kristen/,
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      });
    });

    it('supports `iregex`', function() {
      return query.select('people').where(w({
        name$iregex: /jim|kristen/i,
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      });
    });

    it('supports `year`', function() {
      return query.select('people').where(w({
        dob$year: 1958,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      });
    });

    it('supports `month`', function() {
      return query.select('people').where(w({
        dob$month: 12,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `day`', function() {
      return query.select('people').where(w({
        dob$day: 1,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah']);
      });
    });

    it('supports `weekday`', function() {
      return query.select('people').where(w({
        dob$weekday: 'wed',
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      });
    });

    it('supports `hour`', function() {
      return query.select('people').where(w({
        dob$hour: 20,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `minute`', function() {
      return query.select('people').where(w({
        dob$minute: 31,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });

    it('supports `second`', function() {
      return query.select('people').where(w({
        dob$second: 43,
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      });
    });
  });
};

module.exports = function(options) {
  var opts = options || {};
  var skip = opts.skip;
  var replacementIt = function(description) {
    var args = _.toArray(arguments);
    if (skip && description && description.match(skip)) {
      args.splice(1);
    }
    it.apply(this, args);
  };
  _.extend(replacementIt, it);

  return _.mapValues(shared, function(fn) {
    return _.partial(fn, replacementIt);
  });
};
