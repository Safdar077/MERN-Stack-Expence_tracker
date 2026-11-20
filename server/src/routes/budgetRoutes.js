/**
 * Budget Routes
 * 
 * Declares HTTP routes for budget tracking and threshold notifications.
 * All budget endpoints require authentication via `protect`.
 */

const express = require('express');
const router = express.Router();
const {
  getCurrentBudget,
  setBudget,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { setBudgetSchema } = require('../validators/budgetValidator');

// GET /api/budgets/current: calculates spending and warnings for current month
router.get('/current', protect, getCurrentBudget);

// POST /api/budgets: sets or updates overall and per-category limits
router.post('/', protect, validate(setBudgetSchema), setBudget);

module.exports = router;
