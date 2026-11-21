/**
 * Transaction Request Validation Schemas
 * 
 * Defines Zod schemas for validating transaction creation and update payloads.
 */

const { z } = require('zod');

// MongoDB ObjectId regex validator (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for creating a transaction (POST /api/transactions)
 */
const createTransactionSchema = z.object({
  amount: z
    .number({ required_error: 'Transaction amount is required' })
    .positive('Transaction amount must be greater than 0'),
  type: z.enum(['Income', 'Expense'], {
    required_error: 'Transaction type is required',
    invalid_type_error: 'Transaction type must be either Income or Expense',
  }),
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format'),
  accountId: z
    .string({ required_error: 'Account ID is required' })
    .regex(objectIdRegex, 'Invalid account ID format'),
  date: z
    .union([z.string(), z.date()])
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
      message: 'Invalid date format',
    })
    .transform((val) => (val ? new Date(val) : new Date())),
  note: z
    .string()
    .trim()
    .max(500, 'Note cannot exceed 500 characters')
    .optional()
    .default(''),
  attachmentUrl: z.string().trim().optional().default(''),
  isRecurring: z.boolean().optional().default(false),
  recurringRuleId: z
    .string()
    .regex(objectIdRegex, 'Invalid recurring rule ID')
    .nullable()
    .optional(),
});

/**
 * Validation schema for updating a transaction (PUT /api/transactions/:id)
 */
const updateTransactionSchema = z.object({
  amount: z.number().positive('Transaction amount must be greater than 0').optional(),
  type: z.enum(['Income', 'Expense']).optional(),
  categoryId: z.string().regex(objectIdRegex, 'Invalid category ID format').optional(),
  accountId: z.string().regex(objectIdRegex, 'Invalid account ID format').optional(),
  date: z
    .union([z.string(), z.date()])
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
      message: 'Invalid date format',
    })
    .transform((val) => (val ? new Date(val) : undefined)),
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters').optional(),
  attachmentUrl: z.string().trim().optional(),
  isRecurring: z.boolean().optional(),
  recurringRuleId: z
    .string()
    .regex(objectIdRegex, 'Invalid recurring rule ID')
    .nullable()
    .optional(),
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
};
