/**
 * Budget Controller
 * 
 * Provides business logic for creating, updating, and evaluating monthly budgets
 * with threshold alert indicators (50%, 90%, 100%, and >100% exceeded).
 * 
 * Multi-Tenant Security & Isolation:
 * Every database query in this controller strictly scopes documents using
 * `{ userId: req.user._id }`.
 */

const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

/**
 * Computes warning threshold metrics for a given spent amount and budget limit.
 * 
 * Thresholds:
 * - 50%: Informational warning ("You have reached 50% of your ...")
 * - 90%: High alert warning ("Warning: You have used 90% of your ...")
 * - 100%: Limit reached warning ("You have reached 100% of your ...")
 * - >100%: Critical over-budget warning ("Budget exceeded by $X!")
 * 
 * @param {number} spent - Total amount spent
 * @param {number} limit - Configured budget limit
 * @param {string} label - Human-readable label for alert message
 * @returns {Object} Calculated status, percentage, warning message, and exceeded flag
 */
const computeThreshold = (spent, limit, label = 'budget') => {
  const safeSpent = Math.round((spent || 0) * 100) / 100;
  const safeLimit = Math.round((limit || 0) * 100) / 100;

  if (safeLimit <= 0) {
    return {
      spent: safeSpent,
      limit: safeLimit,
      remaining: 0,
      percentage: 0,
      status: 'ok',
      warning: null,
      isExceeded: false,
    };
  }

  const percentage = Math.round((safeSpent / safeLimit) * 10000) / 100;
  const remaining = Math.round((safeLimit - safeSpent) * 100) / 100;

  let status = 'ok';
  let warning = null;
  let isExceeded = false;

  if (safeSpent > safeLimit) {
    status = 'exceeded';
    isExceeded = true;
    const overAmount = (safeSpent - safeLimit).toFixed(2);
    warning = `Budget exceeded by $${overAmount}!`;
  } else if (safeSpent === safeLimit || percentage >= 100) {
    status = '100%';
    warning = `You have reached 100% of your ${label}`;
  } else if (percentage >= 90) {
    status = '90%';
    warning = `Warning: You have used ${percentage}% of your ${label}`;
  } else if (percentage >= 50) {
    status = '50%';
    warning = `You have reached ${percentage}% of your ${label}`;
  }

  return {
    spent: safeSpent,
    limit: safeLimit,
    remaining,
    percentage,
    status,
    warning,
    isExceeded,
  };
};

/**
 * @desc    Get current month budget, evaluate spending, and compute warning thresholds
 * @route   GET /api/budgets/current
 * @access  Private (JWT required)
 */
const getCurrentBudget = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();

    // Calculate month boundary dates
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch user's budget for the specified month and year
    const budget = await Budget.findOne({
      userId: req.user._id,
      month,
      year,
    }).populate('categoryLimits.categoryId', 'name icon type');

    // Aggregate all Expense transactions for this user within this month
    const expenseTransactions = await Transaction.find({
      userId: req.user._id,
      type: 'Expense',
      date: { $gte: startDate, $lte: endDate },
    }).populate('categoryId', 'name icon');

    // Calculate overall monthly expenses
    const totalSpent = expenseTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    // Group expenses by category ID
    const categorySpendingMap = {};
    for (const tx of expenseTransactions) {
      if (!tx.categoryId) continue;
      const catId = tx.categoryId._id ? tx.categoryId._id.toString() : tx.categoryId.toString();
      categorySpendingMap[catId] = (categorySpendingMap[catId] || 0) + tx.amount;
    }

    // Evaluate overall monthly budget threshold
    const overallLimit = budget ? budget.overallAmount : 0;
    const overallSummary = computeThreshold(totalSpent, overallLimit, 'overall budget');

    // Evaluate per-category spending vs defined limits
    const categorySummaries = [];
    const warnings = [];

    if (overallSummary.warning) {
      warnings.push({
        type: 'overall',
        label: 'Overall Budget',
        ...overallSummary,
      });
    }

    if (budget && Array.isArray(budget.categoryLimits)) {
      for (const limitItem of budget.categoryLimits) {
        const cat = limitItem.categoryId;
        const catId = cat && cat._id ? cat._id.toString() : limitItem.categoryId.toString();
        const catName = cat && cat.name ? cat.name : 'Category';
        const catSpent = categorySpendingMap[catId] || 0;

        const summary = computeThreshold(catSpent, limitItem.amount, `${catName} budget`);
        const itemSummary = {
          categoryId: catId,
          categoryName: catName,
          categoryIcon: cat && cat.icon ? cat.icon : 'FaQuestionCircle',
          ...summary,
        };

        categorySummaries.push(itemSummary);

        if (summary.warning) {
          warnings.push({
            type: 'category',
            ...itemSummary,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      month,
      year,
      budget,
      overall: overallSummary,
      categorySummaries,
      warnings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set or update monthly budget with overall and per-category limits
 * @route   POST /api/budgets
 * @access  Private (JWT required)
 */
const setBudget = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.body.month || now.getMonth() + 1;
    const year = req.body.year || now.getFullYear();
    const { overallAmount, categoryLimits = [] } = req.body;

    // Verify all referenced categories belong to user or are default global categories
    for (const item of categoryLimits) {
      const category = await Category.findOne({
        _id: item.categoryId,
        $or: [{ userId: null }, { userId: req.user._id }],
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Category with ID ${item.categoryId} not found or unauthorized`,
        });
      }
    }

    // Check if a budget record already exists for this month/year to determine status code (201 vs 200)
    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      month,
      year,
    });

    const isNew = !existingBudget;

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, month, year },
      {
        userId: req.user._id,
        month,
        year,
        overallAmount,
        categoryLimits,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).populate('categoryLimits.categoryId', 'name icon type');

    return res.status(isNew ? 201 : 200).json({
      success: true,
      budget,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  computeThreshold,
  getCurrentBudget,
  setBudget,
};
