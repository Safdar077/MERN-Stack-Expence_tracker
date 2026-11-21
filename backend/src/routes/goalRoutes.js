/**
 * Savings Goal Routes
 * 
 * Declares HTTP routes for savings goals and contributions.
 * All goal endpoints require authentication via `protect`.
 */

const express = require('express');
const router = express.Router();
const {
  getGoals,
  getGoalById,
  createGoal,
  contributeToGoal,
  updateGoal,
  deleteGoal,
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  createGoalSchema,
  updateGoalSchema,
  contributeGoalSchema,
} = require('../validators/goalValidator');

router
  .route('/')
  .get(protect, getGoals)
  .post(protect, validate(createGoalSchema), createGoal);

router
  .route('/:id')
  .get(protect, getGoalById)
  .put(protect, validate(updateGoalSchema), updateGoal)
  .delete(protect, deleteGoal);

router.post(
  '/:id/contribute',
  protect,
  validate(contributeGoalSchema),
  contributeToGoal
);

module.exports = router;
