/**
 * Budgets, Savings Goals & Recurring Rules Integration Tests
 * 
 * Verifies backend behavior for:
 * 1. Budgets:
 *    - Creation and upsert of overall and per-category monthly limits
 *    - Calculation of current month spending against limits
 *    - Threshold warnings at 50%, 90%, 100%, and >100% (exceeded) for both overall and category budgets
 * 2. Savings Goals:
 *    - Creation, retrieval, and dynamic progress percentage computation: (currentAmount / targetAmount) * 100
 *    - Adding contributions with optional deduction from chosen source accounts
 *    - Auto-completion flag when target amount is reached
 * 3. Recurring Rules & Date Math:
 *    - Creation with Daily, Weekly, Monthly, and Yearly frequencies
 *    - Accurate due date calculation and classification into due vs upcoming items
 *    - "Mark as Paid" cycle: creates Transaction, updates account balance, advances nextDueDate
 * 4. Multi-Tenant Isolation & Security:
 *    - User B cannot view, update, delete, or act upon User A's budgets, goals, or recurring rules
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Account = require('../src/models/Account');
const Category = require('../src/models/Category');
const Transaction = require('../src/models/Transaction');
const Budget = require('../src/models/Budget');
const SavingsGoal = require('../src/models/SavingsGoal');
const RecurringRule = require('../src/models/RecurringRule');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker_test';

describe('Budgets, Savings Goals & Recurring Rules API', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let userAAccount;
  let userASavingsAccount;
  let userBAccount;
  let foodCategory;
  let rentCategory;
  let salaryCategory;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MONGO_URI);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
    await Budget.deleteMany({});
    await SavingsGoal.deleteMany({});
    await RecurringRule.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
    await Budget.deleteMany({});
    await SavingsGoal.deleteMany({});
    await RecurringRule.deleteMany({});

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera.budget@example.com',
      password: 'password123',
    });
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb.budget@example.com',
      password: 'password123',
    });
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // Fetch User A accounts created by registration seed
    const aAccountsRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`);
    userAAccount = aAccountsRes.body.accounts.find((acc) => acc.type === 'Cash' || acc.name === 'Cash');
    userASavingsAccount = aAccountsRes.body.accounts.find((acc) => acc.type === 'Savings');

    // Fetch User B accounts
    const bAccountsRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${userBToken}`);
    userBAccount = bAccountsRes.body.accounts[0];

    // Seed default categories
    await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${userAToken}`);

    const cats = await Category.find({});
    foodCategory = cats.find((c) => c.name === 'Food' && c.type === 'Expense');
    rentCategory = cats.find((c) => c.name === 'Rent' && c.type === 'Expense');
    salaryCategory = cats.find((c) => c.name === 'Salary' && c.type === 'Income');
  });

  // ==========================================
  // SECTION 1: BUDGETS & WARNING THRESHOLDS
  // ==========================================
  describe('Budgets API Endpoints (/api/budgets)', () => {
    it('should require authentication for budget endpoints', async () => {
      const getRes = await request(app).get('/api/budgets/current');
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post('/api/budgets').send({
        overallAmount: 1000,
      });
      expect(postRes.status).toBe(401);
    });

    it('should set and update monthly budget with category limits', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const createRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          month: currentMonth,
          year: currentYear,
          overallAmount: 1000,
          categoryLimits: [
            { categoryId: foodCategory._id.toString(), amount: 300 },
            { categoryId: rentCategory._id.toString(), amount: 500 },
          ],
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.budget.overallAmount).toBe(1000);
      expect(createRes.body.budget.categoryLimits).toHaveLength(2);

      // Upsert: Updating budget for same month and year
      const updateRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          month: currentMonth,
          year: currentYear,
          overallAmount: 1200,
          categoryLimits: [
            { categoryId: foodCategory._id.toString(), amount: 400 },
          ],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.budget.overallAmount).toBe(1200);
      expect(updateRes.body.budget.categoryLimits).toHaveLength(1);
    });

    it('should calculate spending and return warning thresholds at 50%, 90%, 100%, and >100%', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Set budget: Overall $1000, Food $200
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          month: currentMonth,
          year: currentYear,
          overallAmount: 1000,
          categoryLimits: [
            { categoryId: foodCategory._id.toString(), amount: 200 },
          ],
        });

      // 1. Initial State: 0 spent -> Status ok, no warnings
      let currentRes = await request(app)
        .get('/api/budgets/current')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(currentRes.status).toBe(200);
      expect(currentRes.body.overall.spent).toBe(0);
      expect(currentRes.body.overall.status).toBe('ok');
      expect(currentRes.body.overall.warning).toBeNull();
      expect(currentRes.body.warnings).toHaveLength(0);

      // 2. Add expense: $500 (50% of overall budget)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 500,
          type: 'Expense',
          accountId: userAAccount._id.toString(),
          categoryId: rentCategory._id.toString(),
          date: now.toISOString(),
        });

      currentRes = await request(app)
        .get('/api/budgets/current')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(currentRes.body.overall.spent).toBe(500);
      expect(currentRes.body.overall.percentage).toBe(50);
      expect(currentRes.body.overall.status).toBe('50%');
      expect(currentRes.body.overall.warning).toMatch(/50%/);
      expect(currentRes.body.warnings.some((w) => w.type === 'overall' && w.status === '50%')).toBe(true);

      // 3. Add expense: $400 more (total $900 = 90% of overall budget)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 400,
          type: 'Expense',
          accountId: userAAccount._id.toString(),
          categoryId: rentCategory._id.toString(),
          date: now.toISOString(),
        });

      currentRes = await request(app)
        .get('/api/budgets/current')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(currentRes.body.overall.spent).toBe(900);
      expect(currentRes.body.overall.percentage).toBe(90);
      expect(currentRes.body.overall.status).toBe('90%');
      expect(currentRes.body.overall.warning).toMatch(/90%/);

      // 4. Add expense to hit category threshold: Food expense of $200 (100% of Food limit $200)
      // Total overall spending becomes $1100 (> 100% exceeded)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 200,
          type: 'Expense',
          accountId: userAAccount._id.toString(),
          categoryId: foodCategory._id.toString(),
          date: now.toISOString(),
        });

      currentRes = await request(app)
        .get('/api/budgets/current')
        .set('Authorization', `Bearer ${userAToken}`);

      // Overall check (> 100% exceeded)
      expect(currentRes.body.overall.spent).toBe(1100);
      expect(currentRes.body.overall.percentage).toBe(110);
      expect(currentRes.body.overall.status).toBe('exceeded');
      expect(currentRes.body.overall.isExceeded).toBe(true);
      expect(currentRes.body.overall.warning).toMatch(/exceeded by \$100/i);

      // Food category check (100% reached)
      const foodSummary = currentRes.body.categorySummaries.find(
        (c) => c.categoryId.toString() === foodCategory._id.toString()
      );
      expect(foodSummary).toBeDefined();
      expect(foodSummary.spent).toBe(200);
      expect(foodSummary.percentage).toBe(100);
      expect(foodSummary.status).toBe('100%');
      expect(foodSummary.warning).toMatch(/100%/);

      // Assert warnings array contains both overall exceeded and category 100%
      expect(currentRes.body.warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('should isolate budgets between User A and User B', async () => {
      const now = new Date();
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          overallAmount: 2500,
          categoryLimits: [],
        });

      const resB = await request(app)
        .get('/api/budgets/current')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.budget).toBeNull();
      expect(resB.body.overall.limit).toBe(0);
      expect(resB.body.overall.spent).toBe(0);
    });
  });

  // ==========================================
  // SECTION 2: SAVINGS GOALS
  // ==========================================
  describe('Savings Goals API Endpoints (/api/goals)', () => {
    it('should require authentication to access savings goals', async () => {
      const getRes = await request(app).get('/api/goals');
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post('/api/goals').send({
        title: 'Vacation',
        targetAmount: 1500,
        targetDate: new Date().toISOString(),
      });
      expect(postRes.status).toBe(401);
    });

    it('should create a savings goal and calculate progress percentage', async () => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6);

      const createRes = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Emergency Rainy Day Fund',
          targetAmount: 2000,
          currentAmount: 500,
          targetDate: targetDate.toISOString(),
          linkedAccountId: userASavingsAccount._id.toString(),
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.goal.title).toBe('Emergency Rainy Day Fund');
      expect(createRes.body.goal.targetAmount).toBe(2000);
      expect(createRes.body.goal.currentAmount).toBe(500);
      expect(createRes.body.goal.progress).toBe(25); // (500 / 2000) * 100
      expect(createRes.body.goal.isCompleted).toBe(false);

      const listRes = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.goals).toHaveLength(1);
      expect(listRes.body.goals[0].progress).toBe(25);
    });

    it('should contribute funds to goal and optionally deduct from account', async () => {
      // Give User A's savings account some starting balance
      await Account.findByIdAndUpdate(userASavingsAccount._id, { balance: 1000 });

      const targetDate = new Date();
      targetDate.setFullYear(targetDate.getFullYear() + 1);

      const goal = await SavingsGoal.create({
        userId: userAId,
        title: 'New Laptop',
        targetAmount: 1000,
        currentAmount: 200,
        targetDate,
        linkedAccountId: userASavingsAccount._id,
      });

      // 1. Contribution with account deduction
      const contributeRes = await request(app)
        .post(`/api/goals/${goal._id}/contribute`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 300,
          accountId: userASavingsAccount._id.toString(),
        });

      expect(contributeRes.status).toBe(200);
      expect(contributeRes.body.success).toBe(true);
      expect(contributeRes.body.goal.currentAmount).toBe(500);
      expect(contributeRes.body.goal.progress).toBe(50);
      expect(contributeRes.body.goal.isCompleted).toBe(false);

      // Verify savings account balance decreased by 300
      const updatedSavings = await Account.findById(userASavingsAccount._id);
      expect(updatedSavings.balance).toBe(700);

      // 2. Final contribution to reach target and complete goal
      const completeRes = await request(app)
        .post(`/api/goals/${goal._id}/contribute`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 500,
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.goal.currentAmount).toBe(1000);
      expect(completeRes.body.goal.progress).toBe(100);
      expect(completeRes.body.goal.isCompleted).toBe(true);
    });

    it('should prevent User B from contributing to User A goal or using User A account', async () => {
      const goalA = await SavingsGoal.create({
        userId: userAId,
        title: "User A's Private Goal",
        targetAmount: 5000,
        currentAmount: 1000,
        targetDate: new Date(),
      });

      // User B tries to contribute to User A's goal
      const res1 = await request(app)
        .post(`/api/goals/${goalA._id}/contribute`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          amount: 100,
        });
      expect(res1.status).toBe(404);

      // User A tries to deduct from User B's account
      const res2 = await request(app)
        .post(`/api/goals/${goalA._id}/contribute`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 100,
          accountId: userBAccount._id.toString(),
        });
      expect(res2.status).toBe(404);
    });
  });

  // ==========================================
  // SECTION 3: RECURRING RULES & DATE MATH
  // ==========================================
  describe('Recurring Rules API Endpoints (/api/recurring)', () => {
    it('should require authentication for recurring endpoints', async () => {
      const getRes = await request(app).get('/api/recurring');
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post('/api/recurring').send({
        title: 'Internet Bill',
      });
      expect(postRes.status).toBe(401);
    });

    it('should calculate due and upcoming recurring items using native JavaScript Date math', async () => {
      const now = new Date();

      // Rule 1: Due in the past / overdue (yesterday)
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      const ruleOverdue = await RecurringRule.create({
        userId: userAId,
        title: 'Electricity Bill',
        amount: 85,
        type: 'Expense',
        categoryId: rentCategory._id,
        accountId: userAAccount._id,
        frequency: 'Monthly',
        nextDueDate: yesterday,
        isActive: true,
      });

      // Rule 2: Due today
      const ruleToday = await RecurringRule.create({
        userId: userAId,
        title: 'Gym Membership',
        amount: 40,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: userAAccount._id,
        frequency: 'Monthly',
        nextDueDate: now,
        isActive: true,
      });

      // Rule 3: Upcoming (in 3 days)
      const inThreeDays = new Date(now);
      inThreeDays.setDate(now.getDate() + 3);

      const ruleUpcoming = await RecurringRule.create({
        userId: userAId,
        title: 'Cloud Storage Subscription',
        amount: 10,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: userAAccount._id,
        frequency: 'Monthly',
        nextDueDate: inThreeDays,
        isActive: true,
      });

      // Rule 4: Far future (in 30 days)
      const farFuture = new Date(now);
      farFuture.setDate(now.getDate() + 30);

      await RecurringRule.create({
        userId: userAId,
        title: 'Annual Car Insurance',
        amount: 600,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: userAAccount._id,
        frequency: 'Yearly',
        nextDueDate: farFuture,
        isActive: true,
      });

      const res = await request(app)
        .get('/api/recurring')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.recurringRules).toHaveLength(4);

      // Due items should contain overdue and due today
      const dueTitles = res.body.dueItems.map((item) => item.title);
      expect(dueTitles).toContain('Electricity Bill');
      expect(dueTitles).toContain('Gym Membership');
      expect(dueTitles).not.toContain('Cloud Storage Subscription');

      // Upcoming items should contain inThreeDays
      const upcomingTitles = res.body.upcomingItems.map((item) => item.title);
      expect(upcomingTitles).toContain('Cloud Storage Subscription');
      expect(upcomingTitles).not.toContain('Annual Car Insurance');
    });

    it('should execute "Mark as Paid" cycle: create Transaction, update account balance, advance nextDueDate', async () => {
      // Starting balance of $500 in User A account
      await Account.findByIdAndUpdate(userAAccount._id, { balance: 500 });

      const initialDueDate = new Date(2026, 4, 15); // May 15, 2026

      // Create a Monthly recurring expense
      const rule = await RecurringRule.create({
        userId: userAId,
        title: 'Monthly Apartment Rent',
        amount: 150,
        type: 'Expense',
        categoryId: rentCategory._id,
        accountId: userAAccount._id,
        frequency: 'Monthly',
        nextDueDate: initialDueDate,
        isActive: true,
      });

      // Trigger "Mark as Paid"
      const payRes = await request(app)
        .post(`/api/recurring/${rule._id}/pay`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.transaction).toBeDefined();
      expect(payRes.body.transaction.amount).toBe(150);
      expect(payRes.body.transaction.isRecurring).toBe(true);
      expect(payRes.body.transaction.recurringRuleId.toString()).toBe(rule._id.toString());

      // 1. Verify Transaction was created in collection
      const createdTx = await Transaction.findById(payRes.body.transaction._id);
      expect(createdTx).not.toBeNull();
      expect(createdTx.amount).toBe(150);
      expect(createdTx.type).toBe('Expense');

      // 2. Verify account balance was decremented by $150 (500 - 150 = 350)
      const updatedAccount = await Account.findById(userAAccount._id);
      expect(updatedAccount.balance).toBe(350);

      // 3. Verify nextDueDate was advanced by exactly 1 month (May 15 -> June 15)
      const updatedRule = await RecurringRule.findById(rule._id);
      const nextDue = new Date(updatedRule.nextDueDate);
      expect(nextDue.getFullYear()).toBe(2026);
      expect(nextDue.getMonth()).toBe(5); // June is index 5
      expect(nextDue.getDate()).toBe(15);
    });

    it('should correctly advance nextDueDate for Daily, Weekly, and Yearly frequencies', async () => {
      // Daily: +1 day
      const dailyRule = await RecurringRule.create({
        userId: userAId,
        title: 'Daily Coffee',
        amount: 4.5,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: userAAccount._id,
        frequency: 'Daily',
        nextDueDate: new Date(2026, 0, 10), // Jan 10
      });
      await request(app)
        .post(`/api/recurring/${dailyRule._id}/pay`)
        .set('Authorization', `Bearer ${userAToken}`);
      const refreshedDaily = await RecurringRule.findById(dailyRule._id);
      expect(new Date(refreshedDaily.nextDueDate).getDate()).toBe(11);

      // Weekly: +7 days
      const weeklyRule = await RecurringRule.create({
        userId: userAId,
        title: 'Weekly Groceries',
        amount: 80,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: userAAccount._id,
        frequency: 'Weekly',
        nextDueDate: new Date(2026, 0, 10), // Jan 10
      });
      await request(app)
        .post(`/api/recurring/${weeklyRule._id}/pay`)
        .set('Authorization', `Bearer ${userAToken}`);
      const refreshedWeekly = await RecurringRule.findById(weeklyRule._id);
      expect(new Date(refreshedWeekly.nextDueDate).getDate()).toBe(17);

      // Yearly: +1 year
      const yearlyRule = await RecurringRule.create({
        userId: userAId,
        title: 'Annual Hosting',
        amount: 120,
        type: 'Expense',
        categoryId: foodCategory._id,
        accountId: userAAccount._id,
        frequency: 'Yearly',
        nextDueDate: new Date(2026, 0, 10), // Jan 10, 2026
      });
      await request(app)
        .post(`/api/recurring/${yearlyRule._id}/pay`)
        .set('Authorization', `Bearer ${userAToken}`);
      const refreshedYearly = await RecurringRule.findById(yearlyRule._id);
      expect(new Date(refreshedYearly.nextDueDate).getFullYear()).toBe(2027);
    });

    it('should isolate recurring rules: User B cannot pay or manipulate User A recurring rule', async () => {
      const ruleA = await RecurringRule.create({
        userId: userAId,
        title: "User A's Recurring Utility",
        amount: 90,
        type: 'Expense',
        categoryId: rentCategory._id,
        accountId: userAAccount._id,
        frequency: 'Monthly',
        nextDueDate: new Date(),
      });

      // User B attempts to pay User A's rule
      const payRes = await request(app)
        .post(`/api/recurring/${ruleA._id}/pay`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(payRes.status).toBe(404);
      expect(payRes.body.success).toBe(false);

      // User B tries to create a recurring rule using User A's private account
      const createRes = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Unauthorized Recurring Rule',
          amount: 50,
          type: 'Expense',
          categoryId: foodCategory._id.toString(),
          accountId: userAAccount._id.toString(),
          frequency: 'Monthly',
        });

      expect(createRes.status).toBe(404);
      expect(createRes.body.success).toBe(false);
    });
  });
});
