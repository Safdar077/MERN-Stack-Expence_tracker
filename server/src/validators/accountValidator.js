/**
 * Account Request Validation Schemas
 * 
 * Defines Zod validation schemas for account creation and modification endpoints.
 * These schemas ensure incoming HTTP request payloads have valid structures and types
 * before business logic in controllers executes.
 */

const { z } = require('zod');

// Valid financial account types supported by the system
const accountTypes = ['Cash', 'Bank Account', 'Credit Card', 'Wallet', 'Savings'];

/**
 * Validation schema for creating a new financial account (POST /api/accounts)
 * 
 * Rules:
 * - name: String, trimmed, min 1 character, max 100 characters.
 * - type: Must be one of ['Cash', 'Bank Account', 'Credit Card', 'Wallet', 'Savings'].
 * - balance: Number, defaults to 0 if omitted.
 * - isDefault: Boolean, defaults to false if omitted.
 */
const createAccountSchema = z.object({
  name: z
    .string({ required_error: 'Account name is required' })
    .trim()
    .min(1, 'Account name is required')
    .max(100, 'Account name cannot exceed 100 characters'),
  type: z.enum(accountTypes, {
    required_error: 'Account type is required',
    invalid_type_error: `Account type must be one of: ${accountTypes.join(', ')}`,
  }),
  balance: z.number().default(0).optional(),
  isDefault: z.boolean().default(false).optional(),
});

/**
 * Validation schema for updating an existing financial account (PUT /api/accounts/:id)
 * 
 * Rules:
 * - All fields are optional, but if provided, must satisfy format constraints.
 * - name: String, trimmed, min 1 character if supplied.
 * - type: Must be one of the valid account types if supplied.
 * - balance: Number if supplied.
 * - isDefault: Boolean if supplied.
 */
const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Account name cannot be empty')
    .max(100, 'Account name cannot exceed 100 characters')
    .optional(),
  type: z
    .enum(accountTypes, {
      invalid_type_error: `Account type must be one of: ${accountTypes.join(', ')}`,
    })
    .optional(),
  balance: z.number().optional(),
  isDefault: z.boolean().optional(),
});

module.exports = {
  createAccountSchema,
  updateAccountSchema,
};
