'use strict';

var _ = require('lodash');
var util = require('util');
var expect = require('chai').expect;
var Promise = require('bluebird');
var Condition = require('../../lib/condition'),
  w = Condition.w;

var shared = {};

shared.shouldSupportStandardTypes = function(it) {
  var db; before(function() { db = this.db; });

  // shared behavior for type tests
  var viaOptions = function(type, data, expected, options, equal, fn) {
    var table = util.format('azul_type_%s', type);
    var cast = function(result) {
      return this.castDatabaseValue(type, result, options);
    };
    equal = equal || 'equal';
    fn = fn || _.noop;
    return function(done) {
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          fn(table[type]('column', options));
        });
      })
      .then(function() { return db.insert(table, { column: data }); })
      .then(function() { return db.select(table); })
      .get('rows')
      .get('0')
      .get('column')
      .then(cast)
      .then(function(result) {
        expect(result).to[equal](expected);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
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
      length: 3
    }));

    it('supports `decimal`', viaOptions('decimal', 3.14159, 3.14159));

    it('supports `decimal` precision', viaOptions('decimal', 3.14159, 3, {
      precision: 3
    }));

    it('supports `decimal` options', viaOptions('decimal', 3.14159, 3.14, {
      precision: 4,
      scale: 2
    }));

    it('supports `pk`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.pk(); }));

    it('supports `primaryKey`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.primaryKey(); }));

    it('supports `default`', function(done) {
      var table = 'azul_default';
      var value = 'azul\'s default\\\n\t\b\r\x1a"';
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          table.string('required');
          table.string('string').default(value);
          table.integer('integer').default(3);
        });
      })
      .then(function() { return db.insert(table, { required: '' }); })
      .then(function() { return db.select(table); })
      .get('rows')
      .get('0')
      .then(function(result) {
        expect(result).to.eql({ required: '', string: value, integer: 3 });
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });

    it('supports `notNull`', function(done) {
      var table = 'azul_not_null';
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          table.string('column').notNull();
        });
      })
      .then(function() { return db.insert(table, { column: null }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/(cannot|violates|constraint).*null/i);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });

    it('supports `unique`', function(done) {
      var table = 'azul_unique';
      Promise.bind(this)
      .then(function() {
        return db.schema.createTable(table).pk(null).with(function(table) {
          table.string('column').unique();
        });
      })
      .then(function() { return db.insert(table, { column: 'val' }); })
      .then(function() { return db.insert(table, { column: 'val' }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/duplicate|unique constraint/i);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });
  });
};

shared.shouldSupportTransactions = function(it) {
  var db; before(function() { db = this.db; });

  describe('transactions', function() {
    beforeEach(function(done) {
      db.schema.createTable('people').pk(null).with(function(table) {
        table.string('name');
      })
      .execute()
      .return()
      .then(done, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people').ifExists()
        .execute()
        .return()
        .then(done, done);
    });

    it('works when nested', function(done) {
      var transaction = db.transaction();
      var q = db.query.transaction(transaction);
      transaction.begin()
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
      .catch(function(e) { return transaction.rollback().execute().throw(e); })
      .return()
      .then(done, done);
    });
  });
};

shared.shouldSupportStandardConditions = function(it) {
  var db; before(function() { db = this.db; });

  describe('conditions', function() {
    beforeEach(function(done) {
      db.schema.createTable('people').pk(null).with(function(table) {
        table.string('name');
        table.integer('height');
        table.dateTime('dob');
      })
      .then(function() {
        return db.insert('people')
          .values({ name: 'Brad' })
          .values({ name: 'Jim', height: 69, dob: new Date(1968, 2-1, 14) })
          .values({ name: 'Kristen', height: 65, dob: new Date(1982, 12-1, 20, 20, 31, 43) })
          .values({ name: 'Sarah', height: 64, dob: new Date(1991, 9-1, 1) })
          .values({ name: 'Tim', height: 72, dob: new Date(1958, 4-1, 14) });
      })
      .then(function() { done(); }, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people').ifExists()
        .then(function() { done(); }, done);
    });

    it('supports `exact`', function(done) {
      db.select('people').where(w({
        name$exact: 'Jim',
        height$exact: 69,
        dob$exact: new Date(1968, 2-1, 14)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      })
      .then(done, done);
    });

    it('supports `iexact`', function(done) {
      db.select('people').where(w({
        name$iexact: 'kristen'
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `in`', function(done) {
      db.select('people').where(w({
        name$in: ['Sarah', 'Tim']
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `gt`', function(done) {
      db.select('people').where(w({
        height$gt: 64,
        dob$gt: new Date(1968, 2-1, 14)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `gte`', function(done) {
      db.select('people').where(w({
        height$gte: 69,
        dob$gte: new Date(1958, 4-1, 14)
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `lt`', function(done) {
      db.select('people').where(w({
        height$lt: 69,
        dob$lt: new Date(1991, 9-1, 1)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `lte`', function(done) {
      db.select('people').where(w({
        height$lte: 69,
        dob$lte: new Date(1991, 9-1, 1)
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen', 'Sarah']);
      })
      .then(done, done);
    });

    it('supports `between` with numbers', function(done) {
      db.select('people').where(w({
        height$between: [65, 69]
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `between` with dates', function(done) {
      db.select('people').where(w({
        dob$between: [new Date(1968, 2-1, 14), new Date(1982, 12-1, 20, 20, 31, 43)]
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `isull`', function(done) {
      db.select('people').where(w({
        height$isnull: true,
        dob$isnull: true
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Brad']);
      })
      .then(done, done);
    });

    it('supports `contains` with uppercase value', function(done) {
      db.select('people').where(w({
        name$contains: 'T'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      })
      .then(done, done);
    });

    it('supports `contains` with lowercase value', function(done) {
      db.select('people').where(w({
        name$contains: 't'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `icontains`', function(done) {
      db.select('people').where(w({
        name$icontains: 'RA'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Brad', 'Sarah']);
      })
      .then(done, done);
    });

    it('supports `startsWith`', function(done) {
      db.select('people').where(w({
        name$startsWith: 'T'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      })
      .then(done, done);
    });

    it('supports `istartsWith`', function(done) {
      db.select('people').where(w({
        name$istartsWith: 'k'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `endsWith`', function(done) {
      db.select('people').where(w({
        name$endsWith: 'm'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `iendsWith`', function(done) {
      db.select('people').where(w({
        name$iendsWith: 'N'
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `regex`', function(done) {
      db.select('people').where(w({
        name$regex: /Jim|Kristen/
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `iregex`', function(done) {
      db.select('people').where(w({
        name$iregex: /jim|kristen/i
      }))
      .order('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim', 'Kristen']);
      })
      .then(done, done);
    });

    it('supports `year`', function(done) {
      db.select('people').where(w({
        dob$year: 1958
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Tim']);
      })
      .then(done, done);
    });

    it('supports `month`', function(done) {
      db.select('people').where(w({
        dob$month: 12
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `day`', function(done) {
      db.select('people').where(w({
        dob$day: 1
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah']);
      })
      .then(done, done);
    });

    it('supports `weekday`', function(done) {
      db.select('people').where(w({
        dob$weekday: 'wed'
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      })
      .then(done, done);
    });

    it('supports `hour`', function(done) {
      db.select('people').where(w({
        dob$hour: 20
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `minute`', function(done) {
      db.select('people').where(w({
        dob$minute: 31
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it('supports `second`', function(done) {
      db.select('people').where(w({
        dob$second: 43
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
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
