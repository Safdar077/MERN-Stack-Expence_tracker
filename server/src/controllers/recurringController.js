/**
 * Recurring Rules Controller
 * 
 * Provides business logic for recurring income/expense rules,
 * upcoming/due item calculation via native JavaScript Date math,
 * and the "Mark as Paid" transaction workflow.
 * 
 * Multi-Tenant Security & Isolation:
 * Every database query in this controller strictly scopes documents using
 * `{ userId: req.user._id }`.
 */

const RecurringRule = require('../models/RecurringRule');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');

/**
 * Advances a due date by one recurrence frequency interval using native JavaScript Date math.
 * 
 * @param {Date|string} currentDate - The current due date
 * @param {'Daily'|'Weekly'|'Monthly'|'Yearly'} frequency - Recurrence frequency
 * @returns {Date} Calculated next due date
 */
const advanceDueDate = (currentDate, frequency) => {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'Daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'Weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'Monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'Yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
};

/**
 * @desc    Get all recurring rules, categorized into due vs upcoming items via Date math
 * @route   GET /api/recurring
 * @access  Private (JWT required)
 */
const getRecurringRules = async (req, res, next) => {
  try {
    const rules = await RecurringRule.find({ userId: req.user._id })
      .populate('accountId', 'name type balance')
      .populate('categoryId', 'name icon type isCustom')
      .sort({ nextDueDate: 1 });

    const now = new Date();
    // End of today boundary (local time)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // Upcoming window: Next 7 days
    const upcomingWindow = new Date(endOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueItems = [];
    const upcomingItems = [];

    for (const rule of rules) {
      if (!rule.isActive) continue;

      const due = new Date(rule.nextDueDate);
      if (due <= endOfToday) {
        dueItems.push(rule);
      } else if (due <= upcomingWindow) {
        upcomingItems.push(rule);
      }
    }

    return res.status(200).json({
      success: true,
      count: rules.length,
      recurringRules: rules,
      dueItems,
      upcomingItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single recurring rule by ID
 * @route   GET /api/recurring/:id
 * @access  Private (JWT required)
 */
const getRecurringRuleById = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate('accountId', 'name type balance')
      .populate('categoryId', 'name icon type isCustom');

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Recurring rule not found',
      });
    }

    return res.status(200).json({
      success: true,
      recurringRule: rule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new recurring rule
 * @route   POST /api/recurring
 * @access  Private (JWT required)
 */
const createRecurringRule = async (req, res, next) => {
  try {
    const {
      title,
      amount,
      type = 'Expense',
      categoryId,
      accountId,
      frequency,
      dueDay,
      nextDueDate,
      isActive = true,
    } = req.body;

    // Validate account ownership
    const account = await Account.findOne({
      _id: accountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or unauthorized',
      });
    }

    // Validate category exists and is accessible
    const category = await Category.findOne({
      _id: categoryId,
      $or: [{ userId: null }, { userId: req.user._id }],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or unauthorized',
      });
    }

    // Determine initial nextDueDate if not explicitly provided
    let calculatedDueDate = nextDueDate ? new Date(nextDueDate) : new Date();

    if (!nextDueDate && frequency === 'Monthly' && dueDay) {
      const now = new Date();
      calculatedDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      if (calculatedDueDate < now) {
        calculatedDueDate.setMonth(calculatedDueDate.getMonth() + 1);
      }
    }

    const rule = await RecurringRule.create({
      userId: req.user._id,
      title,
      amount,
      type,
      categoryId,
      accountId,
      frequency,
      dueDay: dueDay || null,
      nextDueDate: calculatedDueDate,
      isActive,
    });

    await rule.populate([
      { path: 'accountId', select: 'name type balance' },
      { path: 'categoryId', select: 'name icon type isCustom' },
    ]);

    return res.status(201).json({
      success: true,
      recurringRule: rule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a recurring item as paid:
 *          1. Creates an actual Transaction record
 *          2. Synchronizes account balance (Expense decrements, Income increments)
 *          3. Advances nextDueDate to the next cycle using native Date math
 * @route   POST /api/recurring/:id/pay
 * @access  Private (JWT required)
 */
const payRecurringRule = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Recurring rule not found',
      });
    }

    // Find linked account
    const account = await Account.findOne({
      _id: rule.accountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Linked account not found or unauthorized',
      });
    }

    // 1. Prepare Transaction document
    const transaction = new Transaction({
      userId: req.user._id,
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      type: rule.type,
      amount: rule.amount,
      date: new Date(),
      note: `Recurring payment: ${rule.title}`,
      isRecurring: true,
      recurringRuleId: rule._id,
    });

    await transaction.validate();

    // 2. Synchronize Account Balance
    if (rule.type === 'Expense') {
      account.balance -= rule.amount;
    } else {
      account.balance += rule.amount;
    }
    account.balance = Math.round(account.balance * 100) / 100;

    await account.save();
    await transaction.save();

    // 3. Advance nextDueDate using native JavaScript Date math
    rule.nextDueDate = advanceDueDate(rule.nextDueDate, rule.frequency);
    await rule.save();

    await transaction.populate([
      { path: 'accountId', select: 'name type balance' },
      { path: 'categoryId', select: 'name icon type isCustom' },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Recurring payment recorded successfully',
      transaction,
      recurringRule: rule,
      accountBalance: account.balance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a recurring rule
 * @route   PUT /api/recurring/:id
 * @access  Private (JWT required)
 */
const updateRecurringRule = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Recurring rule not found',
      });
    }

    const {
      title,
      amount,
      type,
      categoryId,
      accountId,
      frequency,
      dueDay,
      nextDueDate,
      isActive,
    } = req.body;

    if (accountId) {
      const account = await Account.findOne({
        _id: accountId,
        userId: req.user._id,
      });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found or unauthorized',
        });
      }
      rule.accountId = accountId;
    }

    if (categoryId) {
      const category = await Category.findOne({
        _id: categoryId,
        $or: [{ userId: null }, { userId: req.user._id }],
      });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found or unauthorized',
        });
      }
      rule.categoryId = categoryId;
    }

    if (title !== undefined) rule.title = title;
    if (amount !== undefined) rule.amount = amount;
    if (type !== undefined) rule.type = type;
    if (frequency !== undefined) rule.frequency = frequency;
    if (dueDay !== undefined) rule.dueDay = dueDay;
    if (nextDueDate !== undefined) rule.nextDueDate = nextDueDate;
    if (isActive !== undefined) rule.isActive = isActive;

    await rule.save();
    await rule.populate([
      { path: 'accountId', select: 'name type balance' },
      { path: 'categoryId', select: 'name icon type isCustom' },
    ]);

    return res.status(200).json({
      success: true,
      recurringRule: rule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a recurring rule
 * @route   DELETE /api/recurring/:id
 * @access  Private (JWT required)
 */
const deleteRecurringRule = async (req, res, next) => {
  try {
    const rule = await RecurringRule.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Recurring rule not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recurring rule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  advanceDueDate,
  getRecurringRules,
  getRecurringRuleById,
  createRecurringRule,
  payRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
};
