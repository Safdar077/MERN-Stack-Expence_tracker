/**
 * Budget Validation Schemas
 * 
 * Defines Zod schemas for validating budget creation and updates.
 */

const { z } = require('zod');

// MongoDB ObjectId regex validator (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for setting or updating monthly budget (POST /api/budgets)
 */
const setBudgetSchema = z.object({
  month: z
    .number({ invalid_type_error: 'Month must be an integer' })
    .int('Month must be an integer')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12')
    .optional(),
  year: z
    .number({ invalid_type_error: 'Year must be an integer' })
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier')
    .optional(),
  overallAmount: z
    .number({ required_error: 'Overall budget amount is required' })
    .min(0, 'Overall budget amount must be non-negative'),
  categoryLimits: z
    .array(
      z.object({
        categoryId: z
          .string({ required_error: 'Category ID is required' })
          .regex(objectIdRegex, 'Invalid category ID format'),
        amount: z
          .number({ required_error: 'Category limit amount is required' })
          .min(0, 'Category limit amount must be non-negative'),
      })
    )
    .optional()
    .default([]),
})
.refine(
  (data) => {
    if (!data.categoryLimits || data.categoryLimits.length <= 1) return true;
    const seenCategories = new Set();
    for (const item of data.categoryLimits) {
      if (seenCategories.has(item.categoryId)) {
        return false;
      }
      seenCategories.add(item.categoryId);
    }
    return true;
  },
  {
    message: 'Category limits must not contain duplicate categories',
    path: ['categoryLimits'],
  }
);

module.exports = {
  setBudgetSchema,
};
