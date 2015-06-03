'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var helpers = require('../helpers');

var SelectQuery = require('../../lib/query/select');
var Condition = require('../../lib/condition'), f = Condition.f;
var test = helpers.withEntry;
var select;

describe('SelectQuery', test(function(query, adapter) {
  beforeEach(function() { select = query.select.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      SelectQuery.create();
    }).to.throw(/SelectQuery must be spawned/i);
  });

  it('accesses a table', function() {
    expect(select('users')).to.be.query(
      'SELECT * FROM "users"', []
    );
  });

  it('can use table name in a select all', function() {
    expect(select('users', ['users.*'])).to.be.query(
      'SELECT "users".* FROM "users"', []
    );
  });

  it('can be filtered', function() {
    expect(select('users').where({ id: 1 })).to.be.query(
      'SELECT * FROM "users" WHERE "id" = ?', [1]
    );
  });

  it('can be filtered with falsey values', function() {
    expect(select('users').where({ id: 0 })).to.be.query(
      'SELECT * FROM "users" WHERE "id" = ?', [0]
    );
  });

  it('can be filtered 2 times', function() {
    var query = select('users')
      .where({ id: 1 })
      .where({ name: 'Whitney' });
    expect(query).to.be.query(
      'SELECT * FROM "users" WHERE ("id" = ?) AND ("name" = ?)', [1, 'Whitney']
    );
  });

  it('can be filtered 3 times', function() {
    var query = select('users')
      .where({ id: 1 })
      .where({ name: 'Whitney' })
      .where({ city: 'Portland' });
    expect(query).to.be.query(
      'SELECT * FROM "users" WHERE (("id" = ?) AND ("name" = ?)) AND ("city" = ?)', [1, 'Whitney', 'Portland']
    );
  });

  it('can be filtered when columns are specified', function() {
    expect(select('users', ['id']).where({ id: 1 })).to.be.query(
      'SELECT "id" FROM "users" WHERE "id" = ?', [1]
    );
  });

  it('can be ordered', function() {
    var query = select('users').order('signup');
    expect(query).to.be.query(
      'SELECT * FROM "users" ORDER BY "signup" ASC', []
    );
  });

  it('can be ordered via orderBy', function() {
    var query = select('users').orderBy('signup');
    expect(query).to.be.query(
      'SELECT * FROM "users" ORDER BY "signup" ASC', []
    );
  });

  it('can be ordered descending', function() {
    var query = select('users').order('-signup');
    expect(query).to.be.query(
      'SELECT * FROM "users" ORDER BY "signup" DESC', []
    );
  });

  it('can be ordered over multiple fields', function() {
    var query = select('users').order('-signup', 'username');
    expect(query).to.be.query(
      'SELECT * FROM "users" ORDER BY "signup" DESC, "username" ASC', []
    );
  });

  it('can be ordered and filtered', function() {
    var query = select('users')
      .where({ id: 1 })
      .order('-signup', 'username');
    expect(query).to.be.query(
      'SELECT * FROM "users" WHERE "id" = ? ' +
      'ORDER BY "signup" DESC, "username" ASC', [1]
    );
  });

  it('can be limited', function() {
    expect(select('users').limit(5)).to.be.query(
      'SELECT * FROM "users" LIMIT 5', []
    );
  });

  it('handles predicates', function() {
    expect(select('articles').where({ words$gt: 200 })).to.be.query(
      'SELECT * FROM "articles" WHERE "words" > ?', [200]
    );
  });

  describe('column specification', function() {
    it('accepts simple names', function() {
      expect(select('articles', ['title', 'body'])).to.be.query(
        'SELECT "title", "body" FROM "articles"', []
      );
    });

    it('accepts simple table qualified names', function() {
      expect(select('articles', ['articles.title', 'body'])).to.be.query(
        'SELECT "articles"."title", "body" FROM "articles"', []
      );
    });
  });

  describe('joins', function() {
    it('defaults to an inner join', function() {
      expect(select('articles').join('authors')).to.be.query(
        'SELECT * FROM "articles" INNER JOIN "authors" ON TRUE', []
      );
    });

    it('accepts type', function() {
      expect(select('articles').join('authors', 'inner')).to.be.query(
        'SELECT * FROM "articles" INNER JOIN "authors" ON TRUE', []
      );
    });

    it('accepts conditions', function() {
      var result = select('articles').join('authors', { 'articles.author_id': f('authors.id') });
      expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('accepts alternate name', function() {
      expect(select('articles').join({ authors: 'authors_alias' })).to.be.query(
        'SELECT * FROM "articles" INNER JOIN "authors" "authors_alias" ON TRUE', []
      );
    });

    it('accepts conditions as a simple string', function() {
      var result = select('articles').join('authors', 'articles.author_id=authors.id');
      expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('works with where clause', function() {
      var result = select('articles')
        .join('authors')
        .where({ name: 'Whitney' });
      expect(result.sql).to.match(/JOIN "authors" ON TRUE WHERE "name" = \?$/);
    });

    it('supports grouping', function() {
      var result = select('articles')
        .join('authors')
        .groupBy('id');
      expect(result.sql).to.match(/JOIN "authors".*GROUP BY "id"$/);
    });
  });

  describe('aggregation', function() {
    it('will eventually have aggregation support');
    // avg, count, max, min, stdDev, sum, variance
  });

  it('is immutable', function() {
    var original = select('users');
    var filtered = original.where({ id: 2 });
    expect(original.statement).to.not.eql(filtered.statement);
  });

  it('has a fetch method', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }]
    });
    select('users').fetch().then(function(rows) {
      expect(rows).to.eql([{ id: 1, title: '1' }]);
    })
    .then(done, done);
  });

  it('gives an error when using fetch with a non-array transform', function(done) {
    select('users').transform(function(result) { return result; }).fetch()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/transform.*did not produce.*array/i);
    })
    .then(done, done);
  });

  it('has a fetchOne method', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }]
    });
    select('users').fetchOne().then(function(result) {
      expect(result).to.eql({ id: 1, title: '1' });
    })
    .then(done, done);
  });

  it('gives an error when fetchOne gets no results', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: []
    });
    select('users').fetchOne()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/no results/i);
      expect(e.code).to.eql('NO_RESULTS_FOUND');
      expect(e.sql).to.eql('SELECT * FROM "users"');
      expect(e.args).to.eql([]);
    })
    .then(done, done);
  });

  it('gives an error when fetchOne gets multiple results', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }, { id: 2, title: '2' }]
    });
    select('users').fetchOne()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/multiple results/i);
      expect(e.code).to.eql('MULTIPLE_RESULTS_FOUND');
      expect(e.sql).to.eql('SELECT * FROM "users"');
      expect(e.args).to.eql([]);
    })
    .then(done, done);
  });

  describe('when adapter throws an error', function() {
    beforeEach(function() {
      adapter.intercept(/.*/, function() {
        throw new Error('This adapter fails every time');
      });
    });

    it('emits errors', function(done) {
      var spy = sinon.spy();

      select('users').on('error', spy).execute()
      .catch(function() {})
      .then(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy.getCall(0).args[0].message).to.match(/adapter fails/i);
      })
      .then(done, done);
    });

    it('rejects with the error', function(done) {
      select('users').execute()
      .throw(new Error('Expected query to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/adapter fails/i);
      })
      .then(done, done);
    });
  });

  describe('events', function() {
    it('emits events in the proper sequence', function(done) {
      var data = {
        fields: ['id', 'title'],
        rows: [{ id: 1, title: '1' }, { id: 2, title: '2' }]
      };

      var execute = sinon.spy(function execute() {});
      var rawResult = sinon.spy(function rawResult() {});
      var result = sinon.spy(function result() {});
      var spawn = sinon.spy(function spawn() {});
      var dup = sinon.spy(function dup() {});
      var error = sinon.spy(function error() {});
      var query = select('articles');
      query.on('spawn', spawn);
      query.on('dup', dup);
      query.on('execute', execute);
      query.on('rawResult', rawResult);
      query.on('result', result);
      query.on('error', error);
      expect(execute).to.not.have.been.called;
      adapter.intercept(/select.*from "articles"/i, data);

      var promise = query.execute();
      expect(execute).to.have.been.calledOnce;
      promise.then(function() {
        expect(rawResult).to.have.been.calledAfter(execute);
        expect(rawResult).to.have.been.calledOnce;
        expect(rawResult).to.have.been.calledWith(data);
        expect(result).to.have.been.calledOnce;
        expect(result).to.have.been.calledAfter(rawResult);
        expect(result).to.have.been.calledWith(data);
        expect(error).to.not.have.been.called;
        expect(spawn).to.not.have.been.called;
        expect(dup).to.not.have.been.called;
      })
      .then(done, done);
    });

    it('emits results for transformed queries', function(done) {
      var data = {
        fields: ['id', 'title'],
        rows: [{ id: 1, title: '1' }, { id: 2, title: '2' }]
      };
      var rawResult = sinon.spy(function rawResult() {});
      var result = sinon.spy(function result() {});
      var query = select('articles').transform(function(info) {
        return info.rows;
      });
      query.on('rawResult', rawResult);
      query.on('result', result);
      adapter.intercept(/select.*from "articles"/i, data);
      query.execute().then(function() {
        expect(rawResult).to.have.been.calledWith(data);
        expect(result).to.have.been.calledWith(data.rows);
      })
      .then(done, done);
    });

    it('emits errors', function(done) {
      var fakeError = new Error('fake query error');
      var rawResult = sinon.spy(function rawResult() {});
      var result = sinon.spy(function result() {});
      var error = sinon.spy(function error() {});
      var query = select('articles').transform(function(info) {
        return info.rows;
      });
      query.on('rawResult', rawResult);
      query.on('result', result);
      query.on('error', error);
      adapter.intercept(/select.*from "articles"/i, function() {
        throw fakeError;
      });
      query.execute()
      .throw(new Error('always fail'))
      .catch(function() {
        expect(rawResult).to.not.have.been.called;
        expect(result).to.not.have.been.called;
        expect(error).to.have.been.calledWith(fakeError);
      })
      .then(done, done);
    });

    it('emits spawn events', function() {
      var spawn = sinon.spy(function spawn() {});
      query.on('spawn', spawn);
      var spawned = select('articles');
      expect(spawn).to.have.been.calledOnce;
      expect(spawn).to.have.been.calledWith(spawned);
    });

    it('emits dup events', function() {
      var dup = sinon.spy(function dup() {});
      var query = select('articles');
      query.on('dup', dup);
      var duped = query.clone();
      expect(dup).to.have.been.calledOnce;
      expect(dup).to.have.been.calledWith(duped);
    });
  });

  it('has default for _toField', function() {
    // find the to field function that's implemented on the select query class
    // (and not one of the mixins that overrides it).
    var toField = SelectQuery.__class__.prototype._toField;
    while (toField && toField.wrappedFunction.name !== '_toFieldSelectQuery') {
      toField = toField.superFunction;
    }

    // call the function w/ a mock _super function that returns nothing so we
    // can check that the function returns something when the super function
    // does not. this test is needed to be set up this way because the select
    // query always has the group by mixed in, so it really always would have
    // the super function return something.
    var _super = sinon.spy(function() {});
    var result = toField.call({ _super: _super }, 'aField');
    expect(result).to.eql('aField');
    expect(_super).to.have.been.calledOnce;
  });
}));
