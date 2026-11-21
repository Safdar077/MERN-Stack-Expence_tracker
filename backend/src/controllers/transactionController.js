/**
 * Transaction Controller
 * 
 * Provides business logic for managing financial transactions:
 * 1. createTransaction: Records transaction and updates associated account balance.
 * 2. getTransactions: Retrieves paginated transactions with combinable filters and note search.
 * 3. getTransactionById: Fetches a single transaction by ID.
 * 4. updateTransaction: Updates transaction and synchronizes account balance delta.
 * 5. deleteTransaction: Deletes transaction and reverses its balance impact.
 * 6. exportTransactionsCSV: Exports filtered transactions as a CSV file.
 * 
 * Multi-Tenant Security & Isolation:
 * Every database query and mutation strictly scopes documents by `{ userId: req.user._id }`.
 */

const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const { exportTransactionsToCSV } = require('../utils/csvExporter');

/**
 * Builds MongoDB filter query from request parameters, enforcing strict user isolation
 * 
 * @param {Object} query - req.query
 * @param {string|mongoose.Types.ObjectId} userId - req.user._id
 * @returns {Object} MongoDB query filter
 */
const buildTransactionFilter = (query, userId) => {
  const filter = { userId };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.category) {
    filter.categoryId = query.category;
  }

  if (query.account) {
    filter.accountId = query.account;
  }

  // Date range filter
  if ((query.startDate && query.startDate !== '') || (query.endDate && query.endDate !== '')) {
    if (query.startDate && query.startDate !== '') {
      const start = new Date(query.startDate);
      if (!isNaN(start.getTime())) {
        filter.date = filter.date || {};
        filter.date.$gte = start;
      }
    }

    if (query.endDate && query.endDate !== '') {
      const end = new Date(query.endDate);
      if (!isNaN(end.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(query.endDate.trim())) {
          end.setUTCHours(23, 59, 59, 999);
        }
        filter.date = filter.date || {};
        filter.date.$lte = end;
      }
    }
  }

  // Amount range filter with safe empty query parameter handling
  const hasMin =
    query.minAmount !== undefined &&
    query.minAmount !== '' &&
    !isNaN(Number(query.minAmount));
  const hasMax =
    query.maxAmount !== undefined &&
    query.maxAmount !== '' &&
    !isNaN(Number(query.maxAmount));

  if (hasMin || hasMax) {
    filter.amount = {};
    if (hasMin) filter.amount.$gte = Number(query.minAmount);
    if (hasMax) filter.amount.$lte = Number(query.maxAmount);
  }

  // Note text search with escaped regex
  if (query.search && query.search.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.note = { $regex: escaped, $options: 'i' };
  }

  return filter;
};

/**
 * @desc    Create a new transaction and update source account balance
 * @route   POST /api/transactions
 * @access  Private
 */
const createTransaction = async (req, res, next) => {
  try {
    const {
      amount,
      type,
      categoryId,
      accountId,
      date,
      note,
      attachmentUrl,
      isRecurring,
      recurringRuleId,
    } = req.body;

    // Strict multi-tenant isolation: verify account belongs to calling user
    const account = await Account.findOne({
      _id: accountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Verify category belongs to user or is system default
    const category = await Category.findOne({
      _id: categoryId,
      $or: [{ userId: req.user._id }, { userId: null }],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Prepare transaction document and pre-validate against schema constraints
    // before modifying account balance, ensuring balance consistency
    const transaction = new Transaction({
      userId: req.user._id,
      accountId,
      categoryId,
      type,
      amount,
      date: date || new Date(),
      note: note || '',
      attachmentUrl: attachmentUrl || '',
      isRecurring: Boolean(isRecurring),
      recurringRuleId: recurringRuleId || null,
    });

    await transaction.validate();

    // Balance Synchronization:
    // Expense decrements chosen account balance; Income increments account balance.
    // Daily Wallet/Cash balances remain untouched when spending from Savings.
    if (type === 'Expense') {
      account.balance -= amount;
    } else {
      account.balance += amount;
    }
    account.balance = Math.round(account.balance * 100) / 100;
    await account.save();

    await transaction.save();

    await transaction.populate([
      { path: 'accountId', select: 'name type' },
      { path: 'categoryId', select: 'name icon type isCustom' },
    ]);

    return res.status(201).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated transactions with combinable filters and search
 * @route   GET /api/transactions
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = buildTransactionFilter(req.query, req.user._id);

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('accountId', 'name type')
      .populate('categoryId', 'name icon type isCustom')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single transaction by ID
 * @route   GET /api/transactions/:id
 * @access  Private
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      userId: req.user._id,
    })
      .populate('accountId', 'name type')
      .populate('categoryId', 'name icon type isCustom');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a transaction and synchronize account balance delta
 * @route   PUT /api/transactions/:id
 * @access  Private
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Strict multi-tenant isolation: verify transaction belongs to calling user
    const transaction = await Transaction.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // If account is being changed, verify new account belongs to user
    if (req.body.accountId && req.body.accountId !== transaction.accountId.toString()) {
      const newAccount = await Account.findOne({
        _id: req.body.accountId,
        userId: req.user._id,
      });

      if (!newAccount) {
        return res.status(404).json({
          success: false,
          message: 'Account not found',
        });
      }
    }

    // If category is being changed, verify new category belongs to user or is default
    if (req.body.categoryId && req.body.categoryId !== transaction.categoryId.toString()) {
      const newCategory = await Category.findOne({
        _id: req.body.categoryId,
        $or: [{ userId: req.user._id }, { userId: null }],
      });

      if (!newCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }
    }

    const oldAccountId = transaction.accountId.toString();
    const oldType = transaction.type;
    const oldAmount = transaction.amount;

    const newAccountId = req.body.accountId ? req.body.accountId.toString() : oldAccountId;
    const newType = req.body.type || oldType;
    const newAmount = req.body.amount !== undefined ? req.body.amount : oldAmount;

    // Balance Synchronization: reverse old impact and apply new impact
    const balanceAffected =
      oldAccountId !== newAccountId || oldType !== newType || oldAmount !== newAmount;

    if (balanceAffected) {
      if (oldAccountId === newAccountId) {
        // Same account: apply delta
        const account = await Account.findOne({
          _id: oldAccountId,
          userId: req.user._id,
        });

        if (account) {
          let balance = account.balance;
          // Reversal of old transaction
          if (oldType === 'Expense') {
            balance += oldAmount;
          } else {
            balance -= oldAmount;
          }
          // Application of new transaction
          if (newType === 'Expense') {
            balance -= newAmount;
          } else {
            balance += newAmount;
          }
          account.balance = Math.round(balance * 100) / 100;
          await account.save();
        }
      } else {
        // Different accounts: reverse on old account, apply on new account
        const oldAccount = await Account.findOne({
          _id: oldAccountId,
          userId: req.user._id,
        });
        if (oldAccount) {
          if (oldType === 'Expense') {
            oldAccount.balance += oldAmount;
          } else {
            oldAccount.balance -= oldAmount;
          }
          oldAccount.balance = Math.round(oldAccount.balance * 100) / 100;
          await oldAccount.save();
        }

        const newAccount = await Account.findOne({
          _id: newAccountId,
          userId: req.user._id,
        });
        if (newAccount) {
          if (newType === 'Expense') {
            newAccount.balance -= newAmount;
          } else {
            newAccount.balance += newAmount;
          }
          newAccount.balance = Math.round(newAccount.balance * 100) / 100;
          await newAccount.save();
        }
      }
    }

    // Update transaction fields
    if (req.body.amount !== undefined) transaction.amount = req.body.amount;
    if (req.body.type !== undefined) transaction.type = req.body.type;
    if (req.body.accountId !== undefined) transaction.accountId = req.body.accountId;
    if (req.body.categoryId !== undefined) transaction.categoryId = req.body.categoryId;
    if (req.body.date !== undefined) transaction.date = req.body.date;
    if (req.body.note !== undefined) transaction.note = req.body.note;
    if (req.body.attachmentUrl !== undefined) transaction.attachmentUrl = req.body.attachmentUrl;
    if (req.body.isRecurring !== undefined) transaction.isRecurring = req.body.isRecurring;
    if (req.body.recurringRuleId !== undefined) transaction.recurringRuleId = req.body.recurringRuleId;

    await transaction.save();

    await transaction.populate([
      { path: 'accountId', select: 'name type' },
      { path: 'categoryId', select: 'name icon type isCustom' },
    ]);

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a transaction and reverse its account balance impact
 * @route   DELETE /api/transactions/:id
 * @access  Private
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Strict multi-tenant isolation: verify transaction belongs to calling user
    const transaction = await Transaction.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Reverses transaction's impact on account balance
    const account = await Account.findOne({
      _id: transaction.accountId,
      userId: req.user._id,
    });

    if (account) {
      if (transaction.type === 'Expense') {
        account.balance += transaction.amount;
      } else {
        account.balance -= transaction.amount;
      }
      account.balance = Math.round(account.balance * 100) / 100;
      await account.save();
    }

    await Transaction.deleteOne({ _id: transaction._id, userId: req.user._id });

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export filtered transactions to CSV format
 * @route   GET /api/transactions/export
 * @access  Private
 */
const exportTransactionsCSV = async (req, res, next) => {
  try {
    const filter = buildTransactionFilter(req.query, req.user._id);

    const transactions = await Transaction.find(filter)
      .populate('accountId', 'name')
      .populate('categoryId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const csvData = exportTransactionsToCSV(transactions);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCSV,
  buildTransactionFilter,
};
