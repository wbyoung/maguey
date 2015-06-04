'use strict';

require('../helpers');

var SelectQuery = require('../../lib/query/select');
var Condition = require('../../lib/condition'), f = Condition.f;
var select;

describe('SelectQuery', __query(function() {
  /* global query, adapter */

  beforeEach(function() { select = query.select.bind(query); });

  it('cannot be created directly', function() {
    expect(function() {
      SelectQuery.create();
    }).to.throw(/SelectQuery must be spawned/i);
  });

  it('accesses a table', function() {
    select('users').should.be.a.query('SELECT * FROM "users"');
  });

  it('can use table name in a select all', function() {
    select('users', ['users.*'])
    .should.be.a.query('SELECT "users".* FROM "users"');
  });

  it('can be filtered', function() {
    select('users').where({ id: 1 })
    .should.be.a.query('SELECT * FROM "users" WHERE "id" = ?', [1]);
  });

  it('can be filtered with falsey values', function() {
    select('users').where({ id: 0 })
    .should.be.a.query('SELECT * FROM "users" WHERE "id" = ?', [0]);
  });

  it('can be filtered 2 times', function() {
    select('users').where({ id: 1 }).where({ name: 'Whitney' })
    .should.be.a.query('SELECT * FROM "users" WHERE ("id" = ?) ' +
      'AND ("name" = ?)', [1, 'Whitney']);
  });

  it('can be filtered 3 times', function() {
    select('users')
    .where({ id: 1 })
    .where({ name: 'Whitney' })
    .where({ city: 'Portland' })
    .should.be.a.query('SELECT * FROM "users" ' +
      'WHERE (("id" = ?) AND ("name" = ?)) ' +
      'AND ("city" = ?)', [1, 'Whitney', 'Portland']);
  });

  it('can be filtered when columns are specified', function() {
    select('users', ['id']).where({ id: 1 })
    .should.be.a.query('SELECT "id" FROM "users" WHERE "id" = ?', [1]);
  });

  it('can be ordered', function() {
    select('users').order('signup')
    .should.be.a.query('SELECT * FROM "users" ORDER BY "signup" ASC');
  });

  it('can be ordered via orderBy', function() {
    select('users').orderBy('signup')
    .should.be.a.query('SELECT * FROM "users" ORDER BY "signup" ASC');
  });

  it('can be ordered descending', function() {
    select('users').order('-signup')
    .should.be.a.query('SELECT * FROM "users" ORDER BY "signup" DESC');
  });

  it('can be ordered over multiple fields', function() {
    select('users').order('-signup', 'username')
    .should.be.a.query('SELECT * FROM "users" ' +
      'ORDER BY "signup" DESC, "username" ASC');
  });

  it('can be ordered and filtered', function() {
    select('users')
    .where({ id: 1 })
    .order('-signup', 'username')
    .should.be.a.query('SELECT * FROM "users" WHERE "id" = ? ' +
      'ORDER BY "signup" DESC, "username" ASC', [1]);
  });

  it('can be limited', function() {
    select('users').limit(5)
    .should.be.a.query('SELECT * FROM "users" LIMIT 5');
  });

  it('can be limited with offset', function() {
    select('users').limit(5).offset(2)
    .should.be.a.query('SELECT * FROM "users" LIMIT 5 OFFSET 2');
  });

  it('handles predicates', function() {
    select('articles').where({ words$gt: 200 })
    .should.be.a.query('SELECT * FROM "articles" WHERE "words" > ?', [200]);
  });

  describe('column specification', function() {
    it('accepts simple names', function() {
      select('articles', ['title', 'body'])
      .should.be.a.query('SELECT "title", "body" FROM "articles"');
    });

    it('accepts simple table qualified names', function() {
      select('articles', ['articles.title', 'body'])
      .should.be.a.query('SELECT "articles"."title", "body" FROM "articles"');
    });
  });

  describe('joins', function() {
    it('defaults to an inner join', function() {
      select('articles').join('authors')
      .should.be.a.query('SELECT * FROM "articles" ' +
        'INNER JOIN "authors" ON TRUE');
    });

    it('accepts type', function() {
      select('articles').join('authors', 'inner')
      .should.be.a.query('SELECT * FROM "articles" ' +
        'INNER JOIN "authors" ON TRUE');
    });

    it('accepts conditions', function() {
      select('articles').join('authors', { 'articles.author_id': f('authors.id') })
      .sql.should.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('accepts alternate name', function() {
      select('articles').join({ authors: 'authors_alias' })
      .should.be.a.query('SELECT * FROM "articles" ' +
        'INNER JOIN "authors" "authors_alias" ON TRUE');
    });

    it('accepts conditions as a simple string', function() {
      select('articles').join('authors', 'articles.author_id=authors.id')
      .sql.should.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('works with where clause', function() {
      select('articles').join('authors').where({ name: 'Whitney' })
      .sql.should.match(/JOIN "authors" ON TRUE WHERE "name" = \?$/);
    });

    it('supports grouping', function() {
      select('articles').join('authors').groupBy('id')
      .sql.should.match(/JOIN "authors".*GROUP BY "id"$/);
    });
  });

  describe('aggregation', function() {
    it('will eventually have aggregation support');
    // avg, count, max, min, stdDev, sum, variance
  });

  it('is immutable', function() {
    var original = select('users');
    var filtered = original.where({ id: 2 });
    original.statement.should.not.eql(filtered.statement);
  });

  it('has a fetch method', function() {
    adapter.respond(/select.*from "users"/i, [{ id: 1, title: '1' }]);
    return select('users').fetch()
      .should.eventually.eql([{ id: 1, title: '1' }]);
  });

  it('can add transforms', function() {
    var transform = function(result) { return result.rows; };
    return select('users').transform(transform)
      .should.eventually.eql([]);
  });

  it('can remove transforms', function() {
    var transform = function() { throw new Error('Transform installed'); };
    return select('users').transform(transform).untransform(transform)
      .should.eventually.eql({ rows: [], fields: [] });
  });

  it('gives an error when using fetch with a non-array transform', function() {
    return select('users').transform(function(result) { return result; }).fetch()
      .should.eventually.be.rejectedWith(/transform.*did not produce.*array/i);
  });

  it('has a fetchOne method', function() {
    adapter.respond(/select.*from "users"/i, [{ id: 1, title: '1' }]);
    return select('users').fetchOne()
      .should.eventually.eql({ id: 1, title: '1' });
  });

  it('gives an error when fetchOne gets no results', function() {
    adapter.respond(/select.*from "users"/i, []);
    return select('users').fetchOne()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      e.message.should.match(/no results/i);
      e.code.should.eql('NO_RESULTS_FOUND');
      e.sql.should.eql('SELECT * FROM "users"');
      e.args.should.eql([]);
    });
  });

  it('gives an error when fetchOne gets multiple results', function() {
    adapter.respond(/select.*from "users"/i, [
      { id: 1, title: '1' }, { id: 2, title: '2' }]);
    return select('users').fetchOne()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      e.message.should.match(/multiple results/i);
      e.code.should.eql('MULTIPLE_RESULTS_FOUND');
      e.sql.should.eql('SELECT * FROM "users"');
      e.args.should.eql([]);
    });
  });

  describe('when adapter throws an error', function() {
    beforeEach(function() {
      adapter.fail(/.*/);
    });

    it('emits errors', function() {
      var spy = sinon.spy();

      return select('users').on('error', spy).execute()
      .catch(function() {})
      .then(function() {
        spy.should.have.been.calledOnce;
        spy.getCall(0).args[0].message.should.match(/fakefail/i);
      });
    });

    it('rejects with the error', function() {
      return select('users').execute()
      .should.eventually.be.rejectedWith(/fakefail/i);
    });
  });

  describe('events', function() {
    it('emits events in the proper sequence', function() {
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
      execute.should.not.have.been.called;
      adapter.respond(/select.*from "articles"/i, data.rows);

      var promise = query.execute();
      execute.should.have.been.calledOnce;
      return promise.then(function() {
        rawResult.should.have.been.calledAfter(execute);
        rawResult.should.have.been.calledOnce;
        rawResult.should.have.been.calledWith(data);
        result.should.have.been.calledOnce;
        result.should.have.been.calledAfter(rawResult);
        result.should.have.been.calledWith(data);
        error.should.not.have.been.called;
        spawn.should.not.have.been.called;
        dup.should.not.have.been.called;
      });
    });

    it('emits results for transformed queries', function() {
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
      adapter.respond(/select.*from "articles"/i, data.rows);
      return query.execute().then(function() {
        rawResult.should.have.been.calledWith(data);
        result.should.have.been.calledWith(data.rows);
      });
    });

    it('emits errors', function() {
      var rawResult = sinon.spy(function rawResult() {});
      var result = sinon.spy(function result() {});
      var error = sinon.spy(function error() {});
      var query = select('articles').transform(function(info) {
        return info.rows;
      });
      query.on('rawResult', rawResult);
      query.on('result', result);
      query.on('error', error);
      adapter.fail(/select.*from "articles"/i);
      return query.execute()
      .throw(new Error('always fail'))
      .catch(function() {
        rawResult.should.not.have.been.called;
        result.should.not.have.been.called;
        error.getCall(0).args[0].should.match(/fakefail.*select.*from "articles"/i);
      });
    });

    it('emits spawn events', function() {
      var spawn = sinon.spy(function spawn() {});
      query.on('spawn', spawn);
      var spawned = select('articles');
      spawn.should.have.been.calledOnce;
      spawn.should.have.been.calledWith(spawned);
    });

    it('emits dup events', function() {
      var dup = sinon.spy(function dup() {});
      var query = select('articles');
      query.on('dup', dup);
      var duped = query.clone();
      dup.should.have.been.calledOnce;
      dup.should.have.been.calledWith(duped);
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
    result.should.eql('aField');
    _super.should.have.been.calledOnce;
  });
}));
