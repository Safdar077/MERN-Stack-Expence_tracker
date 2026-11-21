/**
 * Recurring Rules Routes
 * 
 * Declares HTTP routes for recurring transaction rules, due date tracking,
 * and the "Mark as Paid" action.
 * All recurring endpoints require authentication via `protect`.
 */

const express = require('express');
const router = express.Router();
const {
  getRecurringRules,
  getRecurringRuleById,
  createRecurringRule,
  payRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
} = require('../controllers/recurringController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  createRecurringSchema,
  updateRecurringSchema,
} = require('../validators/recurringValidator');

router
  .route('/')
  .get(protect, getRecurringRules)
  .post(protect, validate(createRecurringSchema), createRecurringRule);

router
  .route('/:id')
  .get(protect, getRecurringRuleById)
  .put(protect, validate(updateRecurringSchema), updateRecurringRule)
  .delete(protect, deleteRecurringRule);

router.post('/:id/pay', protect, payRecurringRule);

module.exports = router;
