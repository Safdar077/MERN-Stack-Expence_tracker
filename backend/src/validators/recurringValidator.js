/**
 * Recurring Rule Validation Schemas
 * 
 * Defines Zod schemas for validating recurring rules creation and updates.
 */

const { z } = require('zod');

// MongoDB ObjectId regex validator (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for creating a recurring rule (POST /api/recurring)
 */
const createRecurringSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title cannot exceed 100 characters'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0'),
  type: z.enum(['Income', 'Expense']).optional().default('Expense'),
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Invalid category ID format'),
  accountId: z
    .string({ required_error: 'Account ID is required' })
    .regex(objectIdRegex, 'Invalid account ID format'),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly'], {
    required_error: 'Recurrence frequency is required (Daily, Weekly, Monthly, Yearly)',
  }),
  dueDay: z
    .number()
    .int('Due day must be an integer')
    .min(1, 'Due day must be between 1 and 31')
    .max(31, 'Due day must be between 1 and 31')
    .nullable()
    .optional(),
  nextDueDate: z
    .union([z.string(), z.date()])
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
      message: 'Invalid next due date format',
    })
    .transform((val) => (val ? new Date(val) : undefined)),
  isActive: z.boolean().optional().default(true),
});

/**
 * Validation schema for updating a recurring rule (PUT /api/recurring/:id)
 */
const updateRecurringSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  type: z.enum(['Income', 'Expense']).optional(),
  categoryId: z.string().regex(objectIdRegex, 'Invalid category ID format').optional(),
  accountId: z.string().regex(objectIdRegex, 'Invalid account ID format').optional(),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']).optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  nextDueDate: z
    .union([z.string(), z.date()])
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
      message: 'Invalid next due date format',
    })
    .transform((val) => (val ? new Date(val) : undefined)),
  isActive: z.boolean().optional(),
});

module.exports = {
  createRecurringSchema,
  updateRecurringSchema,
};
