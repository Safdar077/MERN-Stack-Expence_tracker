/**
 * Analytics Engine Unit & Integration Tests
 * 
 * Verifies backend analytics engine:
 * 1. Overview Analytics:
 *    - Dynamic aggregation of totalIncome, totalExpense, netSavings
 *    - Monthly totals and budget progress / usage percentage
 *    - Edge cases: zero transactions, no budget, exceeded budget
 * 2. Category Analytics:
 *    - Expense aggregation grouped by category with lookup to categories
 *    - Sorted descending by amount for pie/donut charts
 *    - Respects timeframes (Week, Month, 3Months, Year)
 *    - Handles default timeframe (Month)
 * 3. Spending Trends:
 *    - Chronological buckets across Week, Month, 3Months, Year
 *    - Zero-filling for empty periods ({ label, income, expense, net })
 *    - Accurate net savings calculation (income - expense)
 * 4. Multi-Tenant Isolation:
 *    - Aggregation pipelines strictly start with $match: { userId: req.user._id }
 *    - User B's transactions never leak into User A's results
 * 5. Route Protection & Mounting:
 *    - Verified routes with auth middleware
 */

const mongoose = require('mongoose');
const {
  getOverviewAnalytics,
  getCategoryAnalytics,
  getSpendingTrends,
} = require('../src/controllers/analyticsController');
const Transaction = require('../src/models/Transaction');
const Budget = require('../src/models/Budget');
const Category = require('../src/models/Category');

describe('Analytics Engine Backend Tests', () => {
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  const mockUserA = { _id: userAId, id: userAId.toString(), email: 'usera@example.com' };
  const mockUserB = { _id: userBId, id: userBId.toString(), email: 'userb@example.com' };

  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: mockUserA,
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterAll(async () => {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/analytics/overview (getOverviewAnalytics)', () => {
    it('should dynamically aggregate totalIncome, totalExpense, netSavings and budget usage', async () => {
      // Spy on Transaction.aggregate and Budget.findOne
      jest.spyOn(Transaction, 'aggregate')
        .mockResolvedValueOnce([
          { _id: 'Income', total: 5000 },
          { _id: 'Expense', total: 2000 },
        ]) // overallStats
        .mockResolvedValueOnce([
          { _id: 'Income', total: 3000 },
          { _id: 'Expense', total: 1500 },
        ]); // monthlyStats

      jest.spyOn(Budget, 'findOne').mockResolvedValueOnce({
        userId: userAId,
        overallAmount: 2500,
      });

      await getOverviewAnalytics(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.success).toBe(true);
      expect(response.totalIncome).toBe(5000);
      expect(response.totalExpense).toBe(2000);
      expect(response.netSavings).toBe(3000);
      expect(response.monthlyIncome).toBe(3000);
      expect(response.monthlyExpense).toBe(1500);
      expect(response.monthlyNetSavings).toBe(1500);

      // Budget progress: limit 2500, spent 1500 -> 60%
      expect(response.budget.limit).toBe(2500);
      expect(response.budget.spent).toBe(1500);
      expect(response.budget.remaining).toBe(1000);
      expect(response.budget.percentage).toBe(60);
      expect(response.budget.isExceeded).toBe(false);
      expect(response.budgetUsagePercentage).toBe(60);

      // Verify that aggregation was strictly matched by userAId
      const overallCall = Transaction.aggregate.mock.calls[0][0];
      expect(overallCall[0].$match).toHaveProperty('userId', userAId);
    });

    it('should handle zero transactions and missing budget gracefully without hardcoding', async () => {
      jest.spyOn(Transaction, 'aggregate')
        .mockResolvedValueOnce([]) // overallStats empty
        .mockResolvedValueOnce([]); // monthlyStats empty

      jest.spyOn(Budget, 'findOne').mockResolvedValueOnce(null);

      await getOverviewAnalytics(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.success).toBe(true);
      expect(response.totalIncome).toBe(0);
      expect(response.totalExpense).toBe(0);
      expect(response.netSavings).toBe(0);
      expect(response.monthlyIncome).toBe(0);
      expect(response.monthlyExpense).toBe(0);
      expect(response.monthlyNetSavings).toBe(0);
      expect(response.budgetUsagePercentage).toBe(0);
      expect(response.budget.limit).toBe(0);
      expect(response.budget.spent).toBe(0);
      expect(response.budget.remaining).toBe(0);
      expect(response.budget.isExceeded).toBe(false);
    });

    it('should correctly flag exceeded budget when monthly expenses exceed budget limit', async () => {
      jest.spyOn(Transaction, 'aggregate')
        .mockResolvedValueOnce([
          { _id: 'Income', total: 6000 },
          { _id: 'Expense', total: 3500 },
        ])
        .mockResolvedValueOnce([
          { _id: 'Income', total: 4000 },
          { _id: 'Expense', total: 3200 },
        ]);

      jest.spyOn(Budget, 'findOne').mockResolvedValueOnce({
        userId: userAId,
        overallAmount: 3000,
      });

      await getOverviewAnalytics(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.budget.limit).toBe(3000);
      expect(response.budget.spent).toBe(3200);
      expect(response.budget.remaining).toBe(0);
      expect(response.budget.percentage).toBeCloseTo(106.67, 1);
      expect(response.budget.isExceeded).toBe(true);
    });
  });

  describe('GET /api/analytics/categories (getCategoryAnalytics)', () => {
    it('should aggregate expenses grouped by category with lookup, sorted descending by amount', async () => {
      const cat1Id = new mongoose.Types.ObjectId();
      const cat2Id = new mongoose.Types.ObjectId();

      const mockAggResult = [
        {
          _id: cat1Id,
          categoryId: cat1Id,
          categoryName: 'Housing & Rent',
          icon: 'FaHome',
          color: '#10B981',
          amount: 1200,
          count: 2,
        },
        {
          _id: cat2Id,
          categoryId: cat2Id,
          categoryName: 'Food & Dining',
          icon: 'FaUtensils',
          color: '#F59E0B',
          amount: 450,
          count: 5,
        },
      ];

      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce(mockAggResult);

      mockReq.query = { timeframe: 'Month' };
      await getCategoryAnalytics(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.success).toBe(true);
      expect(response.timeframe).toBe('Month');
      expect(response.totalExpenses).toBe(1650);
      expect(response.categories).toHaveLength(2);

      // Verify sorted descending
      expect(response.categories[0].amount).toBe(1200);
      expect(response.categories[0].categoryName).toBe('Housing & Rent');
      expect(response.categories[0].percentage).toBeCloseTo(72.73, 1);

      expect(response.categories[1].amount).toBe(450);
      expect(response.categories[1].categoryName).toBe('Food & Dining');
      expect(response.categories[1].percentage).toBeCloseTo(27.27, 1);

      // Verify pipeline structure
      const pipeline = Transaction.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.userId).toEqual(userAId);
      expect(pipeline[0].$match.type).toBe('Expense');
      expect(pipeline[1].$group._id).toBe('$categoryId');
      expect(pipeline[2].$lookup.from).toBe('categories');
    });

    it('should default timeframe to Month when unspecified or invalid', async () => {
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);

      mockReq.query = {}; // No timeframe supplied
      await getCategoryAnalytics(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.timeframe).toBe('Month');
      expect(response.categories).toEqual([]);
      expect(response.totalExpenses).toBe(0);
    });

    it('should support Week, 3Months, and Year timeframes', async () => {
      for (const tf of ['Week', '3Months', 'Year']) {
        jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);
        mockReq.query = { timeframe: tf };
        await getCategoryAnalytics(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[mockRes.json.mock.calls.length - 1][0];
        expect(response.timeframe).toBe(tf);
      }
    });
  });

  describe('GET /api/analytics/trends (getSpendingTrends)', () => {
    it('should return chronological buckets with zero-filling for empty periods (Month)', async () => {
      // Suppose there was only 1 day with activity
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([
        {
          _id: { dateStr: todayStr, type: 'Income' },
          total: 1000,
        },
        {
          _id: { dateStr: todayStr, type: 'Expense' },
          total: 250,
        },
      ]);

      mockReq.query = { timeframe: 'Month' };
      await getSpendingTrends(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = mockRes.json.mock.calls[0][0];

      expect(response.success).toBe(true);
      expect(response.timeframe).toBe('Month');
      expect(Array.isArray(response.trends)).toBe(true);
      // Month timeframe contains 30 daily buckets
      expect(response.trends.length).toBe(30);

      // Verify zero-filling for empty periods
      const emptyDay = response.trends.find((t) => t.date !== todayStr);
      expect(emptyDay).toBeDefined();
      expect(emptyDay.income).toBe(0);
      expect(emptyDay.expense).toBe(0);
      expect(emptyDay.net).toBe(0);
      expect(emptyDay.label).toBeDefined();

      // Verify day with transactions
      const activeDay = response.trends.find((t) => t.date === todayStr);
      expect(activeDay).toBeDefined();
      expect(activeDay.income).toBe(1000);
      expect(activeDay.expense).toBe(250);
      expect(activeDay.net).toBe(750);
    });

    it('should return 7 daily buckets for Week timeframe with zero-filling', async () => {
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);

      mockReq.query = { timeframe: 'Week' };
      await getSpendingTrends(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.trends).toHaveLength(7);
      response.trends.forEach((bucket) => {
        expect(bucket).toHaveProperty('label');
        expect(bucket.income).toBe(0);
        expect(bucket.expense).toBe(0);
        expect(bucket.net).toBe(0);
      });
    });

    it('should return 12 monthly buckets for Year timeframe with zero-filling', async () => {
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);

      mockReq.query = { timeframe: 'Year' };
      await getSpendingTrends(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.trends).toHaveLength(12);
      response.trends.forEach((bucket) => {
        expect(bucket).toHaveProperty('label');
        expect(bucket.income).toBe(0);
        expect(bucket.expense).toBe(0);
        expect(bucket.net).toBe(0);
      });
    });

    it('should return chronological weekly buckets for 3Months timeframe', async () => {
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);

      mockReq.query = { timeframe: '3Months' };
      await getSpendingTrends(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.trends.length).toBeGreaterThanOrEqual(12);
      response.trends.forEach((bucket) => {
        expect(bucket).toHaveProperty('label');
        expect(bucket.income).toBe(0);
        expect(bucket.expense).toBe(0);
        expect(bucket.net).toBe(0);
      });
    });
  });

  describe('Multi-Tenant Isolation Verification', () => {
    it('should strictly isolate aggregations by req.user._id and never mix users', async () => {
      // User B makes request
      mockReq.user = mockUserB;

      jest.spyOn(Transaction, 'aggregate')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      jest.spyOn(Budget, 'findOne').mockResolvedValueOnce(null);

      await getOverviewAnalytics(mockReq, mockRes, mockNext);

      // Verify that Transaction.aggregate was called with User B id, not User A
      const overallCall = Transaction.aggregate.mock.calls[0][0];
      expect(overallCall[0].$match.userId).toEqual(userBId);
      expect(overallCall[0].$match.userId).not.toEqual(userAId);

      const budgetCall = Budget.findOne.mock.calls[0][0];
      expect(budgetCall.userId).toEqual(userBId);
    });

    it('should strictly enforce userId match in category analytics pipeline', async () => {
      mockReq.user = mockUserB;
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);

      await getCategoryAnalytics(mockReq, mockRes, mockNext);

      const pipeline = Transaction.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.userId).toEqual(userBId);
    });

    it('should strictly enforce userId match in spending trends pipeline', async () => {
      mockReq.user = mockUserB;
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce([]);

      await getSpendingTrends(mockReq, mockRes, mockNext);

      const pipeline = Transaction.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.userId).toEqual(userBId);
    });
  });

  describe('Error Handling Middleware Delegation', () => {
    it('should pass caught errors to next(err) in getOverviewAnalytics', async () => {
      const dbErr = new Error('Database connection failed');
      jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(dbErr);

      await getOverviewAnalytics(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(dbErr);
    });

    it('should pass caught errors to next(err) in getCategoryAnalytics', async () => {
      const dbErr = new Error('Database connection failed');
      jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(dbErr);

      await getCategoryAnalytics(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(dbErr);
    });

    it('should pass caught errors to next(err) in getSpendingTrends', async () => {
      const dbErr = new Error('Database connection failed');
      jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(dbErr);

      await getSpendingTrends(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(dbErr);
    });
  });

  describe('Route Configuration and Middleware Attachment', () => {
    const analyticsRoutes = require('../src/routes/analyticsRoutes');
    const app = require('../src/app');

    it('should configure GET /overview, GET /categories, and GET /trends with protect middleware', () => {
      const routes = analyticsRoutes.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
          stackLength: layer.route.stack.length,
        }));

      expect(routes).toContainEqual(
        expect.objectContaining({ path: '/overview', methods: ['get'], stackLength: 2 })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({ path: '/categories', methods: ['get'], stackLength: 2 })
      );
      expect(routes).toContainEqual(
        expect.objectContaining({ path: '/trends', methods: ['get'], stackLength: 2 })
      );
    });

    it('should have mounted /api/analytics in app router stack', () => {
      const isMounted = app._router.stack.some(
        (layer) => layer.regexp && layer.regexp.test('/api/analytics/overview')
      );
      expect(isMounted).toBe(true);
    });
  });
});
