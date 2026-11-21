/**
 * Recurring Rule Model
 * 
 * Defines the Mongoose schema and model for recurring income and expense schedules
 * (e.g., Monthly Rent, Bi-weekly Salary, Daily Coffee, Yearly Subscriptions).
 * 
 * Multi-Tenant Security & Isolation:
 * - Every recurring rule is strictly scoped to an authenticated user via `userId`.
 * - Due items and next dueDate tracking are computed using native JavaScript Date math.
 */

const mongoose = require('mongoose');

/**
 * Recurring Rule Schema Definition
 */
const recurringRuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recurring rule must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title for the recurring rule'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      required: [true, 'Please specify transaction type'],
      enum: {
        values: ['Income', 'Expense'],
        message: '{VALUE} is not a valid transaction type',
      },
      default: 'Expense',
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Recurring rule must be linked to a category'],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Recurring rule must be linked to an account'],
    },
    frequency: {
      type: String,
      required: [true, 'Please provide recurrence frequency'],
      enum: {
        values: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
        message: '{VALUE} is not a valid frequency',
      },
    },
    dueDay: {
      type: Number,
      min: [1, 'Due day must be between 1 and 31'],
      max: [31, 'Due day must be between 1 and 31'],
      default: null,
    },
    nextDueDate: {
      type: Date,
      required: [true, 'Next due date is required'],
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

recurringRuleSchema.index({ userId: 1, nextDueDate: 1 });
recurringRuleSchema.index({ userId: 1, isActive: 1 });

const RecurringRule = mongoose.model('RecurringRule', recurringRuleSchema);

module.exports = RecurringRule;
