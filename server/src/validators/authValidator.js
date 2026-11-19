/**
 * Authentication Input Validators (Zod Schemas)
 * 
 * Defines schema validation rules for incoming authentication request payloads
 * using the Zod validation library. Zod ensures type-safety and format correctness
 * before reaching controller business logic.
 */

const { z } = require('zod');

/**
 * Registration Request Payload Validation Schema
 * 
 * Rules:
 * - name: string, trimmed, minimum 2 characters long
 * - email: valid email format, trimmed, transformed to lowercase
 * - password: string, minimum 6 characters long
 * - currency: optional string (e.g. 'USD', 'EUR', 'GBP'), defaults to 'USD'
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .default('USD'),
});

/**
 * Login Request Payload Validation Schema
 * 
 * Rules:
 * - email: valid email format, trimmed, transformed to lowercase
 * - password: string, non-empty
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
