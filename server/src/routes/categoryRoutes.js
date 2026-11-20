/**
 * Category Routes
 * 
 * Declares HTTP routes for category management.
 * All endpoints are secured by the `protect` JWT middleware.
 * Custom category creation is validated via Zod schema using `validate` middleware.
 */

const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCustomCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createCategorySchema } = require('../validators/categoryValidator');

// GET all categories (system defaults + custom) & POST create custom category
router
  .route('/')
  .get(protect, getCategories)
  .post(protect, validate(createCategorySchema), createCustomCategory);

module.exports = router;
