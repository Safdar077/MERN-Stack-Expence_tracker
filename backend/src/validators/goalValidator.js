/**
 * Savings Goal Validation Schemas
 * 
 * Defines Zod schemas for validating savings goals creation, updates, and contributions.
 */

const { z } = require('zod');

// MongoDB ObjectId regex validator (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for creating a savings goal (POST /api/goals)
 */
const createGoalSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title cannot exceed 100 characters'),
  targetAmount: z
    .number({ required_error: 'Target amount is required' })
    .positive('Target amount must be greater than 0'),
  currentAmount: z
    .number({ invalid_type_error: 'Current amount must be a number' })
    .min(0, 'Current amount cannot be negative')
    .optional()
    .default(0),
  targetDate: z
    .union([z.string(), z.date()])
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid target date format',
    })
    .transform((val) => new Date(val)),
  linkedAccountId: z
    .string()
    .regex(objectIdRegex, 'Invalid linked account ID format')
    .nullable()
    .optional(),
});

/**
 * Validation schema for updating a savings goal (PUT /api/goals/:id)
 */
const updateGoalSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(100).optional(),
  targetAmount: z.number().positive('Target amount must be greater than 0').optional(),
  currentAmount: z.number().min(0, 'Current amount cannot be negative').optional(),
  targetDate: z
    .union([z.string(), z.date()])
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
      message: 'Invalid target date format',
    })
    .transform((val) => (val ? new Date(val) : undefined)),
  linkedAccountId: z
    .string()
    .regex(objectIdRegex, 'Invalid linked account ID format')
    .nullable()
    .optional(),
  isCompleted: z.boolean().optional(),
});

/**
 * Validation schema for contributing funds towards a savings goal (POST /api/goals/:id/contribute)
 */
const contributeGoalSchema = z.object({
  amount: z
    .number({ required_error: 'Contribution amount is required' })
    .positive('Contribution amount must be greater than 0'),
  accountId: z
    .string()
    .regex(objectIdRegex, 'Invalid account ID format')
    .optional(),
});

module.exports = {
  createGoalSchema,
  updateGoalSchema,
  contributeGoalSchema,
};
