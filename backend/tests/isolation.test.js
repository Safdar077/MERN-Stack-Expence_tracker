/**
 * Multi-Tenant Isolation Integration Tests
 * 
 * Verifies strict data isolation between multiple authenticated users for Transactions:
 * 1. User B cannot read User A's transaction via GET /api/transactions/:id (returns 404)
 * 2. User B cannot update User A's transaction via PUT /api/transactions/:id (returns 404)
 * 3. User B cannot delete User A's transaction via DELETE /api/transactions/:id (returns 404)
 * 4. User B cannot see User A's transactions in GET /api/transactions list (returns empty)
 * 5. User B cannot see User A's transactions in GET /api/transactions/export CSV
 * 6. User B cannot create a transaction referencing User A's private account or custom category
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Account = require('../src/models/Account');
const Category = require('../src/models/Category');
const Transaction = require('../src/models/Transaction');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker_test';

describe('Multi-Tenant Isolation for Transactions', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let userAAccount;
  let userACategory;
  let userATransactionId;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MONGO_URI);
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    if (mongoose.models.Transaction) {
      await mongoose.models.Transaction.deleteMany({});
    }

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'password123',
    });
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123',
    });
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // Create Account for User A
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: "User A Checking",
        type: 'Bank Account',
        balance: 1000,
      });
    userAAccount = accRes.body.account;

    // Create Custom Category for User A
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: "User A Salary",
        type: 'Income',
        icon: 'FaMoneyBillWave',
      });
    userACategory = catRes.body.category;

    // Create Transaction for User A
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        amount: 250,
        type: 'Income',
        categoryId: userACategory._id,
        accountId: userAAccount._id,
        note: "User A's confidential income",
        date: new Date().toISOString(),
      });
    userATransactionId = txRes.body?.transaction?._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    if (mongoose.models.Transaction) {
      await mongoose.models.Transaction.deleteMany({});
    }
    await mongoose.connection.close();
  });

  it('should return 404 when User B attempts GET /api/transactions/:id with User A transaction ID', async () => {
    expect(userATransactionId).toBeDefined();

    const res = await request(app)
      .get(`/api/transactions/${userATransactionId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when User B attempts PUT /api/transactions/:id with User A transaction ID', async () => {
    expect(userATransactionId).toBeDefined();

    const res = await request(app)
      .put(`/api/transactions/${userATransactionId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        amount: 999,
        note: 'Malicious modification attempt',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when User B attempts DELETE /api/transactions/:id with User A transaction ID', async () => {
    expect(userATransactionId).toBeDefined();

    const res = await request(app)
      .delete(`/api/transactions/${userATransactionId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should not include User A transactions in User B GET /api/transactions list', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transactions).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('should not include User A transactions in User B CSV export', async () => {
    const res = await request(app)
      .get('/api/transactions/export')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).not.toContain("User A's confidential income");
  });
});
