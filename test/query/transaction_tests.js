'use strict';

require('../helpers');

var TransactionQuery = require('../../lib/query/transaction');
var BaseQuery = require('../../lib/query/base');
var Promise = require('bluebird');

var transaction;

describe('Transaction Mixin', __query(function() {
  /* global query */

  beforeEach(function() {
    transaction = query.transaction.bind(query);
  });

  beforeEach(function() {
    // spy after pool has been set up. the only way to tell is to get a
    // client and release it.
    return query._adapter.pool.acquireAsync().then(function(client) {
      query._adapter.pool.release(client);
      sinon.spy(query._adapter, '_execute');
      sinon.spy(query._adapter.pool, 'acquire');
      sinon.spy(query._adapter.pool, 'release');
    });
  });

  afterEach(function() {
    query._adapter._execute.restore();
    query._adapter.pool.acquire.restore();
    query._adapter.pool.release.restore();
  });

  it('cannot be created directly', function() {
    expect(function() {
      TransactionQuery.create();
    }).to.throw(/TransactionQuery must be spawned/i);
  });

  it('contains begin query that cannot be created directly', function() {
    expect(function() {
      TransactionQuery.BeginQuery.create();
    }).to.throw(/BeginQuery must be spawned/i);
  });

  it('contains commit query that cannot be created directly', function() {
    expect(function() {
      TransactionQuery.CommitQuery.create();
    }).to.throw(/CommitQuery must be spawned/i);
  });

  it('contains rollback query that cannot be created directly', function() {
    expect(function() {
      TransactionQuery.RollbackQuery.create();
    }).to.throw(/RollbackQuery must be spawned/i);
  });

  describe('when begun', function() {
    beforeEach(function() {
      this.transaction = transaction();
      this.begin = this.transaction.begin();
    });

    it('is a query', function() {
      expect(this.transaction).to.be.an.instanceOf(BaseQuery.__class__);
      expect(this.begin).to.be.an.instanceOf(BaseQuery.__class__);
    });

    it('does not allow transaction calls after begin', function() {
      expect(this.begin.transaction).to.not.exist;
      expect(this.begin.begin).to.not.exist;
    });

    it('includes sql', function() {
      this.begin.should.be.a.query('BEGIN');
    });

    it('can be committed', function() {
      return this.begin.execute().bind(this).then(function() {
        this.transaction.commit()
        .should.be.a.query('COMMIT');
      });
    });

    it('can be rolled back', function() {
      return this.begin.execute().bind(this).then(function() {
        this.transaction.rollback()
        .should.be.a.query('ROLLBACK');
      });
    });

    it('preforms commit with same client', function() {
      return this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.commit();
      })
      .then(function() {
        expect(query._adapter._execute).to.have.been
          .calledWithExactly(this.client, 'COMMIT', []);
      });
    });

    it('preforms rollback with same client', function() {
      return this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.rollback();
      })
      .then(function() {
        expect(query._adapter._execute).to.have.been
          .calledWithExactly(this.client, 'ROLLBACK', []);
      });
    });

    it('performs duplicated commits with the same client', function() {
      return this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.commit().clone();
      })
      .then(function() {
        expect(query._adapter._execute).to.have.been
          .calledWithExactly(this.client, 'COMMIT', []);
      });
    });

    it('releases client back to pool on commit', function() {
      return this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.commit();
      })
      .then(function() {
        expect(query._adapter.pool.acquire).to.have.been.calledOnce;
        expect(query._adapter.pool.release).to.have.been.calledOnce;
        expect(query._adapter.pool.release).to.have.been
          .calledWithExactly(this.client);
      });
    });

    it('cannot use commit before begin', function() {
      return this.transaction.commit()
      .should.eventually.be.rejectedWith(/execute.*transaction.*not open/i);
    });

    it('cannot use rollback before begin', function() {
      return this.transaction.rollback()
      .should.eventually.be.rejectedWith(/execute.*transaction.*not open/i);
    });

    it('cannot execute query before begin', function() {
      return query.select('users').transaction(this.transaction)
      .should.eventually.be.rejectedWith(/execute.*transaction.*not open/i);
    });

    it('cannot over-commit', function() {
      return this.begin.execute().bind(this)
      .then(function() { return this.transaction.commit(); })
      .then(function() { return this.transaction.commit(); })
      .should.eventually.be.rejectedWith(/execute.*transaction.*not open/i);
    });

    describe('a select that uses the transaction', function() {
      beforeEach(function() {
        this.selectQuery = query.select('users').transaction(this.transaction);
      });

      it('generates standard sql', function() {
        this.selectQuery.should.be.a.query('SELECT * FROM "users"');
      });

      it('shares the transaction', function() {
        expect(this.selectQuery.transaction()).to.equal(this.transaction);
      });

      it('cannot run if initial transaction was committed', function() {
        return this.begin.execute().bind(this).then(function() {
          return this.transaction.commit();
        })
        .then(function() {
          return this.selectQuery.execute();
        })
        .should.eventually.be.rejectedWith(/execute.*transaction.*not open/i);
      });

      describe('when executed', function() {
        beforeEach(function() {
          sinon.spy(this.transaction, 'acquireClient');
        });
        afterEach(function() {
          this.transaction.acquireClient.restore();
        });

        beforeEach(function() {
          return this.begin.execute();
        });

        beforeEach(function() {
          return this.selectQuery.execute();
        });

        it('first acquires a client', function() {
          var acquireClient = this.transaction.acquireClient;
          var promise = acquireClient.getCall(0).returnValue;
          expect(acquireClient).to.have.been.called;
          expect(promise.isFulfilled()).to.be.true;
        });

        it('passes transaction client to adapter', function() {
          var acquireClient = this.transaction.acquireClient;
          var promise = acquireClient.getCall(0).returnValue;
          var client = promise.value();
          expect(query._adapter._execute).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "users"', []);
        });
      });
    });

    it('can be nested', function() {
      // note that we're intentionally not executing this.begin in this test &
      // expect that everything will still work as expected.
      var txn = this.transaction;
      var txnQuery = query.transaction(txn);
      var client;
      return Promise.resolve()
      .then(function() { return txn.begin(); })
      .then(function() { return txn.acquireClient(); })
      .then(function(_client) { client = _client; })
      .then(function() { return txnQuery.select('users'); })
      .then(function() { return txn.begin(); })
      .then(function() { return txnQuery.select('articles'); })
      .then(function() { return txnQuery.select('comments'); })
      .then(function() { return txn.commit(); })
      .then(function() { return txn.commit(); })
      .then(function() {
          expect(txnQuery._adapter._execute.getCall(0)).to.have.been
            .calledWithExactly(client, 'BEGIN', []);
          expect(txnQuery._adapter._execute.getCall(1)).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "users"', []);
          expect(txnQuery._adapter._execute.getCall(2)).to.have.been
            .calledWithExactly(client, 'BEGIN', []);
          expect(txnQuery._adapter._execute.getCall(3)).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "articles"', []);
          expect(txnQuery._adapter._execute.getCall(4)).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "comments"', []);
          expect(txnQuery._adapter._execute.getCall(5)).to.have.been
            .calledWithExactly(client, 'COMMIT', []);
          expect(txnQuery._adapter._execute.getCall(6)).to.have.been
            .calledWithExactly(client, 'COMMIT', []);
      });
    });
  });
}));
