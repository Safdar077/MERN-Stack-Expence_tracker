/**
 * Transactions API Integration Tests
 * 
 * Verifies backend transaction endpoints:
 * 1. CRUD operations for transactions
 * 2. Account balance synchronization on create, update, and delete
 * 3. Savings vs Wallet balance segregation (spending from Savings touches only Savings)
 * 4. Pagination and combinable filters (type, category, account, date range, amount range)
 * 5. Case-insensitive note search with special character escaping
 * 6. CSV export with active filters and RFC 4180 escaping
 * 7. Authentication protection and payload validation
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Account = require('../src/models/Account');
const Category = require('../src/models/Category');
const Transaction = require('../src/models/Transaction');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker_test';

describe('Transactions API Endpoints (/api/transactions)', () => {
  let userToken;
  let userId;
  let walletAccount;
  let bankAccount;
  let savingsAccount;
  let foodCategory;
  let salaryCategory;

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
    await Transaction.deleteMany({});

    // Register test user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Tester',
      email: 'alice.tester@example.com',
      password: 'password123',
    });
    userToken = res.body.token;
    userId = res.body.user.id;

    // Create three separate accounts
    const walletRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Daily Wallet',
        type: 'Wallet',
        balance: 200,
      });
    walletAccount = walletRes.body.account;

    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Main Bank',
        type: 'Bank Account',
        balance: 1500,
      });
    bankAccount = bankRes.body.account;

    const savingsRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Emergency Savings',
        type: 'Savings',
        balance: 5000,
      });
    savingsAccount = savingsRes.body.account;

    // Create categories
    const foodRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Food & Dining',
        type: 'Expense',
        icon: 'FaUtensils',
      });
    foodCategory = foodRes.body.category;

    const salaryRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Salary',
        type: 'Income',
        icon: 'FaMoneyBillWave',
      });
    salaryCategory = salaryRes.body.category;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
    await mongoose.connection.close();
  });

  // --------------------------------------------------------------------------
  // 1. Authentication Protection & Validation
  // --------------------------------------------------------------------------
  describe('Authentication & Validation', () => {
    it('should return 401 when creating transaction without token', async () => {
      const res = await request(app).post('/api/transactions').send({
        amount: 50,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: walletAccount._id,
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when amount is zero or negative', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: -25,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when type is invalid', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 50,
          type: 'Transfer', // Not supported in this endpoint
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when account does not exist or belongs to another user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 50,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: fakeId.toString(),
        });
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/account not found/i);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Transaction CRUD & Account Balance Synchronization
  // --------------------------------------------------------------------------
  describe('CRUD & Balance Synchronization', () => {
    it('should create an Expense and decrement the account balance', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 45.5,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Groceries at supermarket',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.transaction.amount).toBe(45.5);
      expect(res.body.transaction.note).toBe('Groceries at supermarket');
      expect(res.body.transaction.accountId.name).toBe('Daily Wallet');
      expect(res.body.transaction.categoryId.name).toBe('Food & Dining');

      // Verify account balance decremented from 200 to 154.50
      const updatedAccount = await Account.findById(walletAccount._id);
      expect(updatedAccount.balance).toBe(154.5);
    });

    it('should create an Income and increment the account balance', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 3000,
          type: 'Income',
          categoryId: salaryCategory._id,
          accountId: bankAccount._id,
          note: 'Monthly salary paycheck',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify bank balance incremented from 1500 to 4500
      const updatedAccount = await Account.findById(bankAccount._id);
      expect(updatedAccount.balance).toBe(4500);
    });

    it('should fetch transaction by ID with populated account and category', async () => {
      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 25,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Coffee & croissant',
        });

      const txId = createRes.body.transaction._id;

      const getRes = await request(app)
        .get(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.transaction._id).toBe(txId);
      expect(getRes.body.transaction.accountId.name).toBe('Daily Wallet');
      expect(getRes.body.transaction.categoryId.name).toBe('Food & Dining');
    });

    it('should update transaction amount on the same account and adjust balance delta', async () => {
      // 1. Create initial expense of $50 on Wallet (initial balance: $200 -> $150)
      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 50,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Initial lunch',
        });
      const txId = createRes.body.transaction._id;

      let acc = await Account.findById(walletAccount._id);
      expect(acc.balance).toBe(150);

      // 2. Update transaction amount to $75 (should deduct an additional $25 -> balance: $125)
      const updateRes = await request(app)
        .put(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 75,
          note: 'Lunch with dessert',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.transaction.amount).toBe(75);
      expect(updateRes.body.transaction.note).toBe('Lunch with dessert');

      acc = await Account.findById(walletAccount._id);
      expect(acc.balance).toBe(125);
    });

    it('should reverse old account balance and apply new account balance when switching account', async () => {
      // 1. Create expense of $100 on Wallet (Wallet: 200 -> 100, Bank: 1500)
      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Big dinner',
        });
      const txId = createRes.body.transaction._id;

      let wallet = await Account.findById(walletAccount._id);
      let bank = await Account.findById(bankAccount._id);
      expect(wallet.balance).toBe(100);
      expect(bank.balance).toBe(1500);

      // 2. Switch account to Bank (Wallet restored to 200; Bank deducted to 1400)
      const updateRes = await request(app)
        .put(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          accountId: bankAccount._id,
        });

      expect(updateRes.status).toBe(200);

      wallet = await Account.findById(walletAccount._id);
      bank = await Account.findById(bankAccount._id);
      expect(wallet.balance).toBe(200);
      expect(bank.balance).toBe(1400);
    });

    it('should reverse account balance impact when transaction is deleted', async () => {
      // 1. Create expense of $80 on Wallet (Wallet: 200 -> 120)
      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 80,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Supplies',
        });
      const txId = createRes.body.transaction._id;

      let wallet = await Account.findById(walletAccount._id);
      expect(wallet.balance).toBe(120);

      // 2. Delete the transaction (Wallet restored from 120 back to 200)
      const delRes = await request(app)
        .delete(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      wallet = await Account.findById(walletAccount._id);
      expect(wallet.balance).toBe(200);

      // Verify transaction is removed from DB
      const findTx = await Transaction.findById(txId);
      expect(findTx).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Savings Account Segregation
  // --------------------------------------------------------------------------
  describe('Savings Account Segregation', () => {
    it('should deduct ONLY from Savings balance when spending from Savings; Wallet and Bank remain untouched', async () => {
      // Initial balances:
      // Savings: 5000, Wallet: 200, Bank: 1500
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1200,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: savingsAccount._id,
          note: 'Emergency expenditure drawn from savings fund',
        });

      expect(res.status).toBe(201);

      // Verify Savings balance is deducted
      const updatedSavings = await Account.findById(savingsAccount._id);
      expect(updatedSavings.balance).toBe(3800);

      // Verify Wallet and Bank balances are completely untouched
      const updatedWallet = await Account.findById(walletAccount._id);
      expect(updatedWallet.balance).toBe(200);

      const updatedBank = await Account.findById(bankAccount._id);
      expect(updatedBank.balance).toBe(1500);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Pagination, Combinable Filters & Regex Note Search
  // --------------------------------------------------------------------------
  describe('Pagination, Filters & Search', () => {
    beforeEach(async () => {
      // Seed 6 transactions with varying properties
      const transactionsToSeed = [
        {
          amount: 15,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Coffee [special]',
          date: new Date('2026-01-10T10:00:00Z'),
        },
        {
          amount: 50,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Dinner at Bistro (downtown)',
          date: new Date('2026-01-15T19:00:00Z'),
        },
        {
          amount: 120,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: bankAccount._id,
          note: 'Weekly Grocery Store + bakery',
          date: new Date('2026-02-01T12:00:00Z'),
        },
        {
          amount: 2500,
          type: 'Income',
          categoryId: salaryCategory._id,
          accountId: bankAccount._id,
          note: 'Monthly Salary direct deposit $bonus',
          date: new Date('2026-02-05T08:00:00Z'),
        },
        {
          amount: 500,
          type: 'Income',
          categoryId: salaryCategory._id,
          accountId: savingsAccount._id,
          note: 'Interest savings yield',
          date: new Date('2026-02-15T15:00:00Z'),
        },
        {
          amount: 300,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: savingsAccount._id,
          note: 'Special family gathering celebration',
          date: new Date('2026-03-01T20:00:00Z'),
        },
      ];

      for (const t of transactionsToSeed) {
        await Transaction.create({ ...t, userId });
      }
    });

    it('should paginate results with page and limit query parameters', async () => {
      const res = await request(app)
        .get('/api/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.total).toBe(6);
      expect(res.body.page).toBe(1);
      expect(res.body.pages).toBe(3);
      expect(res.body.transactions).toHaveLength(2);
    });

    it('should filter transactions by type', async () => {
      const res = await request(app)
        .get('/api/transactions?type=Income')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.transactions.every((tx) => tx.type === 'Income')).toBe(true);
    });

    it('should filter transactions by account', async () => {
      const res = await request(app)
        .get(`/api/transactions?account=${walletAccount._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(
        res.body.transactions.every(
          (tx) => tx.accountId._id.toString() === walletAccount._id.toString()
        )
      ).toBe(true);
    });

    it('should filter transactions by date range', async () => {
      const res = await request(app)
        .get('/api/transactions?startDate=2026-02-01T00:00:00Z&endDate=2026-02-28T23:59:59Z')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3); // 2026-02-01, 2026-02-05, 2026-02-15
    });

    it('should filter transactions by minAmount and maxAmount', async () => {
      const res = await request(app)
        .get('/api/transactions?minAmount=100&maxAmount=1000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3); // 120, 500, 300
    });

    it('should perform note search with regex special characters safely escaped', async () => {
      // Note contains [special]
      const resSpecial = await request(app)
        .get('/api/transactions?search=[special]')
        .set('Authorization', `Bearer ${userToken}`);

      expect(resSpecial.status).toBe(200);
      expect(resSpecial.body.total).toBe(1);
      expect(resSpecial.body.transactions[0].note).toBe('Coffee [special]');

      // Note contains $bonus
      const resBonus = await request(app)
        .get('/api/transactions?search=$bonus')
        .set('Authorization', `Bearer ${userToken}`);

      expect(resBonus.status).toBe(200);
      expect(resBonus.body.total).toBe(1);
      expect(resBonus.body.transactions[0].note).toContain('$bonus');
    });

    it('should combine multiple filters simultaneously (type + account + search)', async () => {
      const res = await request(app)
        .get(`/api/transactions?type=Expense&account=${walletAccount._id}&search=bistro`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.transactions[0].note).toBe('Dinner at Bistro (downtown)');
    });
  });

  // --------------------------------------------------------------------------
  // 5. CSV Export Endpoint (/api/transactions/export)
  // --------------------------------------------------------------------------
  describe('CSV Export Endpoint (/api/transactions/export)', () => {
    beforeEach(async () => {
      await Transaction.create([
        {
          userId,
          amount: 75.5,
          type: 'Expense',
          categoryId: foodCategory._id,
          accountId: walletAccount._id,
          note: 'Groceries, apples & "fresh" oranges',
          date: new Date('2026-03-10'),
        },
        {
          userId,
          amount: 2000,
          type: 'Income',
          categoryId: salaryCategory._id,
          accountId: bankAccount._id,
          note: 'Bi-weekly payroll',
          date: new Date('2026-03-15'),
        },
      ]);
    });

    it('should export all transactions with proper CSV headers and RFC 4180 escaping', async () => {
      const res = await request(app)
        .get('/api/transactions/export')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/filename="transactions.csv"/);

      const lines = res.text.trim().split(/\r?\n/);
      // Header line
      expect(lines[0]).toBe('Date,Type,Category,Account,Amount,Note');

      // Check content lines
      expect(res.text).toContain('2000');
      expect(res.text).toContain('Bi-weekly payroll');
      expect(res.text).toContain('Food & Dining');
      expect(res.text).toContain('Daily Wallet');

      // Escaping check: quotes and commas in 'Groceries, apples & "fresh" oranges'
      expect(res.text).toContain('"Groceries, apples & ""fresh"" oranges"');
    });

    it('should apply active query filters when exporting CSV', async () => {
      const res = await request(app)
        .get('/api/transactions/export?type=Income')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Bi-weekly payroll');
      expect(res.text).not.toContain('Groceries, apples');
    });
  });
});
