/**
 * Analytics Controller
 * 
 * Provides dynamic aggregation engines for financial insights:
 * 1. getOverviewAnalytics: Computes overall and current-month dynamic totals
 *    (totalIncome, totalExpense, netSavings, budget progress, usage percentage).
 * 2. getCategoryAnalytics: Aggregates expenses grouped by category for donut/pie charts
 *    with category metadata lookup, sorted descending by total amount.
 * 3. getSpendingTrends: Aggregates chronological transaction buckets across configurable
 *    timeframes (Week, Month, 3Months, Year) with zero-filling for empty periods.
 * 
 * Multi-Tenant Security & Isolation:
 * Every aggregation pipeline strictly starts with `$match: { userId: userObjectId }`.
 * Zero hardcoded metrics — all metrics are dynamically aggregated from live database records.
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

/**
 * Formats a Date object as 'YYYY-MM-DD' using local calendar date parts
 * to prevent UTC midnight date shift.
 * 
 * @param {Date} d - Date object
 * @returns {string} 'YYYY-MM-DD'
 */
const formatDateKey = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Normalizes timeframe string to one of the supported values.
 * Default is 'Month'.
 * 
 * @param {string} tf - Raw timeframe string from query params
 * @returns {'Week' | 'Month' | '3Months' | 'Year'}
 */
const normalizeTimeframe = (tf) => {
  const valid = ['Week', 'Month', '3Months', 'Year'];
  return valid.includes(tf) ? tf : 'Month';
};

/**
 * Computes start and end date boundaries for a given timeframe.
 * 
 * @param {'Week' | 'Month' | '3Months' | 'Year'} timeframe
 * @returns {{ startDate: Date, endDate: Date }}
 */
const getTimeframeBoundaries = (timeframe) => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let startDate;

  switch (timeframe) {
    case 'Week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      break;
    case 'Month':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      break;
    case '3Months':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90, 0, 0, 0, 0);
      break;
    case 'Year':
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
};

/**
 * @desc    Get comprehensive overview metrics (lifetime totals, current month totals, budget usage)
 * @route   GET /api/analytics/overview
 * @access  Private (JWT required)
 */
const getOverviewAnalytics = async (req, res, next) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const now = new Date();
    const queryMonth = parseInt(req.query.month, 10);
    const queryYear = parseInt(req.query.year, 10);

    const month = !isNaN(queryMonth) && queryMonth >= 1 && queryMonth <= 12 ? queryMonth : now.getMonth() + 1;
    const year = !isNaN(queryYear) && queryYear >= 2000 && queryYear <= 2100 ? queryYear : now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Overall Lifetime Aggregation (strictly scoped to user)
    const overallStatsPromise = Transaction.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    // 2. Current Month Aggregation (strictly scoped to user and month window)
    const monthlyStatsPromise = Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    // 3. User's Monthly Budget
    const budgetPromise = Budget.findOne({
      userId: userObjectId,
      month,
      year,
    });

    const [overallStats, monthlyStats, budgetDoc] = await Promise.all([
      overallStatsPromise,
      monthlyStatsPromise,
      budgetPromise,
    ]);

    // Extract lifetime totals
    let totalIncome = 0;
    let totalExpense = 0;
    for (const item of overallStats) {
      if (item._id === 'Income') totalIncome = Math.round(item.total * 100) / 100;
      if (item._id === 'Expense') totalExpense = Math.round(item.total * 100) / 100;
    }
    const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;

    // Extract monthly totals
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    for (const item of monthlyStats) {
      if (item._id === 'Income') monthlyIncome = Math.round(item.total * 100) / 100;
      if (item._id === 'Expense') monthlyExpense = Math.round(item.total * 100) / 100;
    }
    const monthlyNetSavings = Math.round((monthlyIncome - monthlyExpense) * 100) / 100;

    // Compute budget progress
    const budgetLimit = budgetDoc ? Math.round(budgetDoc.overallAmount * 100) / 100 : 0;
    const budgetSpent = monthlyExpense;
    const budgetRemaining = Math.max(0, Math.round((budgetLimit - budgetSpent) * 100) / 100);
    const budgetUsagePercentage = budgetLimit > 0
      ? Math.round((budgetSpent / budgetLimit) * 10000) / 100
      : 0;
    const isExceeded = budgetLimit > 0 ? budgetSpent > budgetLimit : false;

    const budgetData = {
      limit: budgetLimit,
      spent: budgetSpent,
      remaining: budgetRemaining,
      percentage: budgetUsagePercentage,
      isExceeded,
    };

    const overviewData = {
      totalIncome,
      totalExpense,
      netSavings,
      monthlyIncome,
      monthlyExpense,
      monthlyNetSavings,
      budgetUsagePercentage,
      budget: budgetData,
    };

    res.status(200).json({
      success: true,
      ...overviewData,
      overview: overviewData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get expense breakdown grouped by category with lookup, sorted descending by amount
 * @route   GET /api/analytics/categories?timeframe=Week|Month|3Months|Year
 * @access  Private (JWT required)
 */
const getCategoryAnalytics = async (req, res, next) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);
    const timeframe = normalizeTimeframe(req.query.timeframe);

    let { startDate, endDate } = getTimeframeBoundaries(timeframe);

    // Allow explicit override if valid dates provided
    if (req.query.startDate && !isNaN(new Date(req.query.startDate).getTime())) {
      startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate && !isNaN(new Date(req.query.endDate).getTime())) {
      endDate = new Date(req.query.endDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.endDate).trim())) {
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // Aggregation pipeline: Match user expenses within date range, group by category, lookup category details
    const pipeline = [
      {
        $match: {
          userId: userObjectId,
          type: 'Expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          categoryId: '$_id',
          categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
          icon: { $ifNull: ['$category.icon', 'FaQuestionCircle'] },
          color: { $ifNull: ['$category.color', '#6366F1'] },
          amount: { $round: ['$totalAmount', 2] },
          count: 1,
        },
      },
      {
        $sort: { amount: -1 },
      },
    ];

    const rawCategories = await Transaction.aggregate(pipeline);

    // Compute total expense across all categories in this timeframe
    const totalExpenses = Math.round(
      rawCategories.reduce((sum, item) => sum + (item.amount || 0), 0) * 100
    ) / 100;

    // Attach percentage to each category
    const categories = rawCategories.map((item) => {
      const percentage = totalExpenses > 0
        ? Math.round(((item.amount || 0) / totalExpenses) * 10000) / 100
        : 0;

      return {
        ...item,
        percentage,
      };
    });

    res.status(200).json({
      success: true,
      timeframe,
      totalExpenses,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chronological spending trends (income, expense, net) with zero-filling
 * @route   GET /api/analytics/trends?timeframe=Week|Month|3Months|Year
 * @access  Private (JWT required)
 */
const getSpendingTrends = async (req, res, next) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);
    const timeframe = normalizeTimeframe(req.query.timeframe);

    const now = new Date();
    let buckets = [];
    let rangeStartDate;
    let rangeEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeframe === 'Week') {
      // 7 daily chronological buckets (from 6 days ago up to today)
      rangeStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const dateStr = formatDateKey(d);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets.push({
          key: dateStr,
          date: dateStr,
          label,
          income: 0,
          expense: 0,
          net: 0,
        });
      }
    } else if (timeframe === 'Month') {
      // 30 daily chronological buckets (from 29 days ago up to today)
      rangeStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const dateStr = formatDateKey(d);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets.push({
          key: dateStr,
          date: dateStr,
          label,
          income: 0,
          expense: 0,
          net: 0,
        });
      }
    } else if (timeframe === '3Months') {
      // 13 weekly chronological buckets across past 90 days
      rangeStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
      for (let w = 12; w >= 0; w--) {
        const startW = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7 - 6, 0, 0, 0, 0);
        const endW = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7, 23, 59, 59, 999);
        const label = `${startW.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endW.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        buckets.push({
          startDate: startW,
          endDate: endW,
          label,
          income: 0,
          expense: 0,
          net: 0,
        });
      }
    } else if (timeframe === 'Year') {
      // 12 monthly chronological buckets (from 11 months ago up to current month)
      rangeStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      for (let m = 11; m >= 0; m--) {
        const startM = new Date(now.getFullYear(), now.getMonth() - m, 1, 0, 0, 0, 0);
        const endM = new Date(startM.getFullYear(), startM.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthKey = `${startM.getFullYear()}-${String(startM.getMonth() + 1).padStart(2, '0')}`;
        const label = startM.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        buckets.push({
          key: monthKey,
          label,
          startDate: startM,
          endDate: endM,
          income: 0,
          expense: 0,
          net: 0,
        });
      }
    }

    // Align rangeStartDate directly with the earliest chronological bucket when defined as a Date
    if (buckets.length > 0 && buckets[0].startDate instanceof Date) {
      rangeStartDate = buckets[0].startDate;
    }

    // Dynamic aggregation pipeline: strictly scoped to authenticated user and timeframe
    const pipeline = [
      {
        $match: {
          userId: userObjectId,
          date: { $gte: rangeStartDate, $lte: rangeEndDate },
        },
      },
      {
        $group: {
          _id: {
            dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ];

    const aggregatedTransactions = await Transaction.aggregate(pipeline);

    // Accumulate aggregated values into pre-built zero-filled buckets
    for (const record of aggregatedTransactions) {
      const dateStr = record._id.dateStr;
      const type = record._id.type;
      const amount = record.total || 0;
      const recordDate = new Date(`${dateStr}T12:00:00Z`);

      for (const bucket of buckets) {
        let isMatch = false;

        if (timeframe === 'Week' || timeframe === 'Month') {
          isMatch = bucket.key === dateStr;
        } else if (timeframe === '3Months') {
          isMatch = recordDate >= bucket.startDate && recordDate <= bucket.endDate;
        } else if (timeframe === 'Year') {
          isMatch = dateStr.startsWith(bucket.key);
        }

        if (isMatch) {
          if (type === 'Income') {
            bucket.income += amount;
          } else if (type === 'Expense') {
            bucket.expense += amount;
          }
          break;
        }
      }
    }

    // Format final response trends with rounded numbers and net values
    let totalIncome = 0;
    let totalExpense = 0;

    const trends = buckets.map((b) => {
      const income = Math.round(b.income * 100) / 100;
      const expense = Math.round(b.expense * 100) / 100;
      const net = Math.round((income - expense) * 100) / 100;

      totalIncome += income;
      totalExpense += expense;

      const item = {
        label: b.label,
        income,
        expense,
        net,
      };

      if (b.date) item.date = b.date;

      return item;
    });

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpense = Math.round(totalExpense * 100) / 100;
    const netSavings = Math.round((totalIncome - totalExpense) * 100) / 100;

    res.status(200).json({
      success: true,
      timeframe,
      trends,
      totalIncome,
      totalExpense,
      netSavings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverviewAnalytics,
  getCategoryAnalytics,
  getSpendingTrends,
};
