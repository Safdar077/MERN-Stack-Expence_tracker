/**
 * Category Request Validation Schemas
 * 
 * Defines Zod validation schemas for custom category creation.
 * Ensures user-supplied categories adhere to naming, classification, and icon requirements.
 */

const { z } = require('zod');

// Valid transaction category types
const categoryTypes = ['Income', 'Expense'];

/**
 * Validation schema for creating a custom category (POST /api/categories)
 * 
 * Rules:
 * - name: String, trimmed, min 2 characters, max 50 characters.
 * - type: Must be either 'Income' or 'Expense'.
 * - icon: Optional string identifier for a react-icon (e.g., 'FaLaptopCode', 'FaHeartbeat').
 */
const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name cannot exceed 50 characters'),
  type: z.enum(categoryTypes, {
    required_error: 'Category type is required',
    invalid_type_error: `Category type must be either 'Income' or 'Expense'`,
  }),
  icon: z
    .string()
    .trim()
    .min(1, 'Icon identifier cannot be empty')
    .optional(),
});

module.exports = {
  createCategorySchema,
};
