/**
 * Accounts & Categories Integration Tests
 * 
 * Verifies backend account and category management endpoints:
 * 1. Accounts CRUD (Create, Read, Update, Delete)
 * 2. Combined total balance calculation across accounts
 * 3. Default category retrieval and automatic seeding
 * 4. Custom category creation and scoped retrieval
 * 5. Strict multi-tenant user isolation (User B cannot access or modify User A's data)
 * 6. Authentication requirements (401 when token is missing)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Account = require('../src/models/Account');
const Category = require('../src/models/Category');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker_test';

describe('Accounts & Categories API Endpoints', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;

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

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Alice UserA',
      email: 'alice@example.com',
      password: 'password123',
    });
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Bob UserB',
      email: 'bob@example.com',
      password: 'password123',
    });
    userBToken = resB.body.token;
    userBId = resB.body.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await mongoose.connection.close();
  });

  // -------------------------------------------------------------
  // Account Endpoints (/api/accounts)
  // -------------------------------------------------------------
  describe('Account Endpoints (/api/accounts)', () => {
    describe('Authentication Protection', () => {
      it('should return 401 when accessing GET /api/accounts without token', async () => {
        const res = await request(app).get('/api/accounts');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });

      it('should return 401 when creating account without token', async () => {
        const res = await request(app).post('/api/accounts').send({
          name: 'Wallet',
          type: 'Wallet',
          balance: 100,
        });
        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/accounts', () => {
      it('should create a new account successfully with valid data', async () => {
        const res = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Emergency Fund',
            type: 'Savings',
            balance: 500,
            isDefault: false,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.account).toBeDefined();
        expect(res.body.account.name).toBe('Emergency Fund');
        expect(res.body.account.type).toBe('Savings');
        expect(res.body.account.balance).toBe(500);
        expect(res.body.account.userId.toString()).toBe(userAId);
      });

      it('should reject account creation with missing name', async () => {
        const res = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            type: 'Cash',
            balance: 100,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject account creation with invalid type', async () => {
        const res = await request(app)
          .post('/api/accounts')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Bitcoin',
            type: 'Cryptocurrency',
            balance: 1000,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('GET /api/accounts & Balance Calculation', () => {
      it('should return all accounts for user and accurately calculate total balance', async () => {
        // Clear seeded default accounts for user A so we can test explicit balances
        await Account.deleteMany({ userId: userAId });

        // Create 3 accounts with specific balances
        await Account.create([
          { userId: userAId, name: 'Main Checking', type: 'Bank Account', balance: 1250.75 },
          { userId: userAId, name: 'Pocket Cash', type: 'Cash', balance: 75.25 },
          { userId: userAId, name: 'Credit Card Debt', type: 'Credit Card', balance: -200.00 },
        ]);

        const res = await request(app)
          .get('/api/accounts')
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.accounts).toHaveLength(3);
        // Total = 1250.75 + 75.25 + (-200.00) = 1126.00
        expect(res.body.totalBalance).toBe(1126);
      });
    });

    describe('PUT /api/accounts/:id', () => {
      it('should update an existing account for the owner', async () => {
        const account = await Account.create({
          userId: userAId,
          name: 'Old Account Name',
          type: 'Cash',
          balance: 100,
        });

        const res = await request(app)
          .put(`/api/accounts/${account._id}`)
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Updated Account Name',
            balance: 250,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.account.name).toBe('Updated Account Name');
        expect(res.body.account.balance).toBe(250);
      });

      it('should return 404 when updating non-existent account', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
          .put(`/api/accounts/${fakeId}`)
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Ghost Account',
          });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/accounts/:id', () => {
      it('should delete an existing account belonging to the owner', async () => {
        const account = await Account.create({
          userId: userAId,
          name: 'To Be Deleted',
          type: 'Wallet',
          balance: 50,
        });

        const res = await request(app)
          .delete(`/api/accounts/${account._id}`)
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const checkInDb = await Account.findById(account._id);
        expect(checkInDb).toBeNull();
      });

      it('should return 404 when deleting non-existent account', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
          .delete(`/api/accounts/${fakeId}`)
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Multi-Tenant User Isolation for Accounts', () => {
      it('should prevent User B from viewing User A accounts', async () => {
        await Account.deleteMany({});

        await Account.create({
          userId: userAId,
          name: 'User A Secret Vault',
          type: 'Savings',
          balance: 1000000,
        });

        await Account.create({
          userId: userBId,
          name: 'User B Modest Wallet',
          type: 'Wallet',
          balance: 50,
        });

        const resB = await request(app)
          .get('/api/accounts')
          .set('Authorization', `Bearer ${userBToken}`);

        expect(resB.status).toBe(200);
        expect(resB.body.accounts).toHaveLength(1);
        expect(resB.body.accounts[0].name).toBe('User B Modest Wallet');
        expect(resB.body.totalBalance).toBe(50);
      });

      it('should return 404 and prevent User B from updating User A account', async () => {
        const userAAccount = await Account.create({
          userId: userAId,
          name: 'User A Original Account',
          type: 'Bank Account',
          balance: 500,
        });

        const resB = await request(app)
          .put(`/api/accounts/${userAAccount._id}`)
          .set('Authorization', `Bearer ${userBToken}`)
          .send({
            name: 'Hacked by User B',
            balance: 0,
          });

        expect(resB.status).toBe(404);

        // Verify User A account remains unmodified in database
        const unchanged = await Account.findById(userAAccount._id);
        expect(unchanged.name).toBe('User A Original Account');
        expect(unchanged.balance).toBe(500);
      });

      it('should return 404 and prevent User B from deleting User A account', async () => {
        const userAAccount = await Account.create({
          userId: userAId,
          name: 'User A Protected Account',
          type: 'Cash',
          balance: 300,
        });

        const resB = await request(app)
          .delete(`/api/accounts/${userAAccount._id}`)
          .set('Authorization', `Bearer ${userBToken}`);

        expect(resB.status).toBe(404);

        // Verify User A account was not deleted
        const stillExists = await Account.findById(userAAccount._id);
        expect(stillExists).not.toBeNull();
      });
    });
  });

  // -------------------------------------------------------------
  // Category Endpoints (/api/categories)
  // -------------------------------------------------------------
  describe('Category Endpoints (/api/categories)', () => {
    describe('GET /api/categories', () => {
      it('should auto-seed default categories on first access and return all defaults', async () => {
        // Ensure categories collection is completely empty
        await Category.deleteMany({});

        const res = await request(app)
          .get('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.categories).toBeDefined();

        // 10 Expense + 6 Income = 16 default categories
        expect(res.body.categories.length).toBe(16);

        // Check specific default categories and icons
        const food = res.body.categories.find((c) => c.name === 'Food' && c.type === 'Expense');
        expect(food).toBeDefined();
        expect(food.icon).toBe('FaUtensils');
        expect(food.isCustom).toBe(false);
        expect(food.userId).toBeNull();

        const salary = res.body.categories.find((c) => c.name === 'Salary' && c.type === 'Income');
        expect(salary).toBeDefined();
        expect(salary.icon).toBe('FaMoneyBillWave');
        expect(salary.isCustom).toBe(false);
        expect(salary.userId).toBeNull();
      });

      it('should not duplicate default categories on subsequent requests', async () => {
        // First request triggers seeding
        await request(app)
          .get('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`);

        // Second request should reuse existing default categories
        const res2 = await request(app)
          .get('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res2.status).toBe(200);
        expect(res2.body.categories.length).toBe(16);

        const totalInDb = await Category.countDocuments({ userId: null });
        expect(totalInDb).toBe(16);
      });
    });

    describe('POST /api/categories & Scoped Custom Categories', () => {
      it('should allow user to create custom category with valid data', async () => {
        const res = await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Side Hustle',
            type: 'Income',
            icon: 'FaLaptopCode',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeDefined();
        expect(res.body.category.name).toBe('Side Hustle');
        expect(res.body.category.type).toBe('Income');
        expect(res.body.category.icon).toBe('FaLaptopCode');
        expect(res.body.category.isCustom).toBe(true);
        expect(res.body.category.userId.toString()).toBe(userAId);
      });

      it('should reject custom category creation with name shorter than 2 characters', async () => {
        const res = await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'A',
            type: 'Expense',
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject custom category creation with invalid type', async () => {
        const res = await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Crypto Gain',
            type: 'InvalidType',
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should return default categories combined with user custom categories in GET /api/categories', async () => {
        // Seed custom category for User A
        await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Pet Care',
            type: 'Expense',
            icon: 'FaHeartbeat',
          });

        const res = await request(app)
          .get('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res.status).toBe(200);
        // 16 default + 1 custom = 17 categories
        expect(res.body.categories.length).toBe(17);

        const customCat = res.body.categories.find((c) => c.name === 'Pet Care');
        expect(customCat).toBeDefined();
        expect(customCat.isCustom).toBe(true);
      });

      it('should isolate custom categories between User A and User B', async () => {
        // User A creates custom category "Freelance Photography"
        await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Freelance Photography',
            type: 'Income',
            icon: 'FaGift',
          });

        // User B requests categories
        const resB = await request(app)
          .get('/api/categories')
          .set('Authorization', `Bearer ${userBToken}`);

        expect(resB.status).toBe(200);
        // User B should only see 16 default categories, NOT User A's custom category
        expect(resB.body.categories.length).toBe(16);
        const photoCat = resB.body.categories.find((c) => c.name === 'Freelance Photography');
        expect(photoCat).toBeUndefined();
      });
    });
  });
});
