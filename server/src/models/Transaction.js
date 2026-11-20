/**
 * Transaction Model
 * 
 * Defines the Mongoose schema and model for financial transactions.
 * Transactions record income and expense activities associated with a user,
 * an account, and a category.
 * 
 * Multi-Tenant Security & Isolation:
 * - Every transaction is strictly associated with an authenticated user via `userId`.
 * - Compound index `{ userId: 1, date: -1 }` optimizes paginated list queries and date-range filters.
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Transaction must be linked to an account'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Transaction must be categorized'],
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['Income', 'Expense'],
        message: '{VALUE} is not a valid transaction type (must be Income or Expense)',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Transaction amount must be greater than 0'],
    },
    date: {
      type: Date,
      default: Date.now,
      required: [true, 'Transaction date is required'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringRule',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize sorted and filtered user transaction retrieval
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1 });
transactionSchema.index({ userId: 1, categoryId: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
