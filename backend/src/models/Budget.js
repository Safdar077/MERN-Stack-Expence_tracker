/**
 * Monthly Budget Model
 * 
 * Defines the Mongoose schema and model for user monthly budgets.
 * Tracks overall monthly spending limits as well as granular per-category limits.
 * 
 * Multi-Tenant Security & Isolation:
 * - Every budget document is strictly scoped to an authenticated user via `userId`.
 * - Unique compound index `{ userId: 1, year: 1, month: 1 }` guarantees that each user
 *   has at most one budget plan per month and year, enabling idempotent upsert operations.
 */

const mongoose = require('mongoose');

/**
 * Category Limit Subdocument Schema
 */
const categoryLimitSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required for category limit'],
    },
    amount: {
      type: Number,
      required: [true, 'Category limit amount is required'],
      min: [0, 'Category limit amount must be greater than or equal to 0'],
    },
  },
  { _id: false }
);

/**
 * Monthly Budget Schema Definition
 */
const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Budget must belong to a user'],
      index: true,
    },
    month: {
      type: Number,
      required: [true, 'Budget month is required (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },
    year: {
      type: Number,
      required: [true, 'Budget year is required'],
    },
    overallAmount: {
      type: Number,
      required: [true, 'Overall monthly budget amount is required'],
      min: [0, 'Overall budget amount must be greater than or equal to 0'],
    },
    categoryLimits: {
      type: [categoryLimitSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee only one budget record per user per month & year
budgetSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
