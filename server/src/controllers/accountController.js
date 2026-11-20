/**
 * Account Controllers
 * 
 * Provides business logic for creating, reading, updating, and deleting
 * financial accounts (Cash, Bank Accounts, Wallets, etc.).
 * 
 * Multi-Tenant Security & Isolation:
 * Every database query in this controller strictly scopes documents using
 * `{ userId: req.user._id }`. This guarantees that authenticated users can only
 * see, manipulate, and calculate balances for their own accounts, completely
 * preventing unauthorized cross-user data leakage or modifications.
 */

const Account = require('../models/Account');

/**
 * @desc    Get all accounts for the authenticated user and compute total net balance
 * @route   GET /api/accounts
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Process:
 * 1. Queries only accounts where `userId` matches the authenticated `req.user._id`.
 * 2. Iterates over all retrieved user accounts to compute the aggregate total balance.
 * 3. Applies rounding to two decimal places (`Math.round(total * 100) / 100`) to avoid
 *    floating-point arithmetic precision errors common in JavaScript.
 * 4. Responds with 200 OK, the list of accounts, count, and computed `totalBalance`.
 */
const getAccounts = async (req, res, next) => {
  try {
    // User Isolation Check: strictly scope query by req.user._id
    const accounts = await Account.find({ userId: req.user._id }).sort({ createdAt: 1 });

    // Aggregate total balance across all active accounts for this user
    // e.g., Cash ($75.25) + Bank ($1250.75) + Credit Card (-$200.00) = $1126.00
    const rawTotal = accounts.reduce((accumulator, currentAccount) => {
      return accumulator + (currentAccount.balance || 0);
    }, 0);

    // Round safely to 2 decimal places to prevent floating-point anomalies (e.g. 1126.0000000000002)
    const totalBalance = Math.round(rawTotal * 100) / 100;

    return res.status(200).json({
      success: true,
      count: accounts.length,
      totalBalance,
      accounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new financial account for the authenticated user
 * @route   POST /api/accounts
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Process:
 * 1. Extracts validated input (name, type, balance, isDefault) from `req.body`.
 * 2. If the user marks this new account as the primary default (`isDefault: true`),
 *    any existing default flag for this user is reset to false to ensure a single default.
 * 3. Injects the authenticated `req.user._id` as the account owner.
 * 4. Saves the new account document and responds with 201 Created.
 */
const createAccount = async (req, res, next) => {
  try {
    const { name, type, balance, isDefault } = req.body;

    // If this new account is set as default, clear the default flag on all other user accounts
    if (isDefault) {
      await Account.updateMany({ userId: req.user._id }, { isDefault: false });
    }

    // Explicitly attach req.user._id for user isolation
    const account = await Account.create({
      userId: req.user._id,
      name,
      type,
      balance: balance !== undefined ? balance : 0,
      isDefault: Boolean(isDefault),
    });

    return res.status(201).json({
      success: true,
      account,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing financial account
 * @route   PUT /api/accounts/:id
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Process:
 * 1. Scopes the search strictly by BOTH `_id: req.params.id` AND `userId: req.user._id`.
 * 2. If no matching account is found, returns 404 Not Found (also prevents attackers from
 *    discovering existence of accounts belonging to other users).
 * 3. If setting `isDefault: true`, unsets `isDefault` on any other accounts owned by this user.
 * 4. Updates and returns the refreshed account document with 200 OK.
 */
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Strict multi-tenant isolation check: verify account exists AND belongs to req.user._id
    const existingAccount = await Account.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // If updating this account to default, clear default status on other user accounts
    if (req.body.isDefault) {
      await Account.updateMany(
        { userId: req.user._id, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Apply updates using findOneAndUpdate with userId enforcement
    const updatedAccount = await Account.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      account: updatedAccount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a financial account
 * @route   DELETE /api/accounts/:id
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Process:
 * 1. Scopes the deletion strictly by `_id: req.params.id` AND `userId: req.user._id`.
 * 2. If the account does not belong to the calling user, returns 404 Not Found without touching it.
 * 3. Returns 200 OK with success confirmation message upon successful deletion.
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Isolation check: find and delete ONLY if the account belongs to req.user._id
    const deletedAccount = await Account.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deletedAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};
