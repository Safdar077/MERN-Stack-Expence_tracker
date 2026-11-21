/**
 * Financial Account Model
 * 
 * Defines the Mongoose schema and model for user financial accounts.
 * Every financial transaction in the Expense Tracker is tied to an account
 * (e.g., Cash in wallet, Main Bank checking account, Credit Card, or Savings reserve).
 * 
 * Multi-Tenant Isolation & Indexing:
 * - Each account is strictly scoped to a single user via `userId`.
 * - A compound index `{ userId: 1, name: 1 }` is applied to optimize queries scoped to
 *   a specific user and prevent slow collection scans.
 * - Single-field index on `userId` is intentionally omitted because the compound index
 *   already has `userId` as its prefix.
 */

const mongoose = require('mongoose');

/**
 * Account Schema Definition
 * 
 * Fields:
 * - userId: Reference to the owning User document (used for strict user isolation)
 * - name: Display name of the account (e.g. "Main Checking", "Emergency Cash")
 * - type: Supported account type enum (['Cash', 'Bank Account', 'Credit Card', 'Wallet', 'Savings'])
 * - balance: Running numerical balance of the account (can be positive, zero, or negative for debt/credit)
 * - isDefault: Flag indicating if this is the user's primary/default account for transactions
 * - timestamps: Automatically tracks createdAt and updatedAt
 */
const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user'],
    },
    name: {
      type: String,
      required: [true, 'Please provide an account name'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please provide an account type'],
      enum: {
        values: ['Cash', 'Bank Account', 'Credit Card', 'Wallet', 'Savings'],
        message: '{VALUE} is not a supported account type',
      },
      default: 'Cash',
    },
    balance: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize querying and sorting accounts by user and name
accountSchema.index({ userId: 1, name: 1 });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
