/**
 * Category Model
 * 
 * Defines the Mongoose schema and model for transaction categories.
 * Categories are used to classify income and expense transactions
 * (e.g., Food, Travel, Rent, Salary, Freelance, etc.).
 * 
 * Hybrid Global/User-Scoped Architecture:
 * - Default seeded categories have `userId: null` and `isCustom: false`.
 *   These are globally accessible by all authenticated users as standard choices.
 * - Custom categories created by users have `userId: req.user._id` and `isCustom: true`.
 *   These are strictly scoped and visible ONLY to the user who created them.
 * 
 * Indexing:
 * - Compound index `{ userId: 1, name: 1, type: 1 }` ensures fast query lookups
 *   when filtering categories for a given user, name, and income/expense classification.
 */

const mongoose = require('mongoose');

/**
 * Category Schema Definition
 * 
 * Fields:
 * - userId: Reference to the User who created this custom category, or null for system default categories.
 * - name: Display name of the category (e.g. "Food", "Salary", "Pet Care").
 * - type: Transaction category type enum: either 'Income' or 'Expense'.
 * - icon: React-icons identifier string (e.g., 'FaUtensils', 'FaCar', 'FaMoneyBillWave').
 * - isCustom: Boolean indicating if this is a user-created custom category (true) or default (false).
 * - timestamps: Automatically tracks createdAt and updatedAt timestamps.
 */
const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please provide a category type'],
      enum: {
        values: ['Income', 'Expense'],
        message: '{VALUE} is not a valid category type',
      },
    },
    icon: {
      type: String,
      required: [true, 'Please provide an icon identifier'],
      default: 'FaQuestionCircle',
      trim: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize finding categories by user scope, name, and type
categorySchema.index({ userId: 1, name: 1, type: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
