/**
 * Savings Goal Model
 * 
 * Defines the Mongoose schema and model for user savings targets
 * (e.g., "Emergency Fund", "New Laptop", "Summer Vacation").
 * 
 * Multi-Tenant Security & Isolation:
 * - Every savings goal is strictly scoped to an authenticated user via `userId`.
 * - Progress is calculated dynamically as (currentAmount / targetAmount) * 100.
 */

const mongoose = require('mongoose');

/**
 * Savings Goal Schema Definition
 */
const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Savings goal must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a savings goal title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Please provide a target amount'],
      min: [0.01, 'Target amount must be greater than 0'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Please provide a target date for this goal'],
    },
    linkedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

savingsGoalSchema.index({ userId: 1, createdAt: -1 });

const SavingsGoal = mongoose.model('SavingsGoal', savingsGoalSchema);

module.exports = SavingsGoal;
