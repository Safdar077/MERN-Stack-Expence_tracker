/**
 * Account Model
 * 
 * Defines the Mongoose schema and model for financial accounts.
 * Every financial transaction in the Expense Tracker is tied to an account
 * (e.g., Cash in wallet, Main Bank checking account, Savings reserve).
 * Accounts are strictly scoped to individual users via `userId`.
 */

const mongoose = require('mongoose');

/**
 * Account Schema definition
 * 
 * - userId: Reference to the owning User document (used for user-data isolation)
 * - name: Display name of the account (e.g. "Cash", "Main Bank", "Savings")
 * - type: Type of financial account (Cash, Bank, Credit Card, Wallet, Savings)
 * - balance: Current running monetary balance of the account
 * - timestamps: Automatically tracks createdAt and updatedAt
 */
const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide an account name'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['Cash', 'Bank', 'Credit Card', 'Wallet', 'Savings'],
        message: '{VALUE} is not a supported account type',
      },
      default: 'Cash',
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure quick queries for all accounts belonging to a user
accountSchema.index({ userId: 1, name: 1 });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
