/**
 * Savings Goal Controller
 * 
 * Provides business logic for creating, tracking, contributing to, and managing
 * savings goals with dynamic progress percentages and optional account deduction.
 * 
 * Multi-Tenant Security & Isolation:
 * Every database query in this controller strictly scopes documents using
 * `{ userId: req.user._id }`.
 */

const SavingsGoal = require('../models/SavingsGoal');
const Account = require('../models/Account');

/**
 * Calculates dynamic progress percentage for a savings goal.
 * 
 * @param {Object} goal - Savings goal document or object
 * @returns {number} Progress percentage (0 - 100+ rounded to 2 decimal places)
 */
const calculateGoalProgress = (goal) => {
  if (!goal.targetAmount || goal.targetAmount <= 0) return 0;
  const rawProgress = (goal.currentAmount / goal.targetAmount) * 100;
  return Math.round(rawProgress * 100) / 100;
};

/**
 * Formats goal document into client response object including dynamic progress.
 * 
 * @param {Object} goal - Mongoose SavingsGoal document
 * @returns {Object} JSON-serializable goal with progress field
 */
const formatGoalWithProgress = (goal) => {
  const goalObj = goal.toObject ? goal.toObject() : { ...goal };
  goalObj.progress = calculateGoalProgress(goal);
  return goalObj;
};

/**
 * @desc    Get all savings goals for authenticated user with dynamic progress
 * @route   GET /api/goals
 * @access  Private (JWT required)
 */
const getGoals = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user._id })
      .populate('linkedAccountId', 'name type balance')
      .sort({ createdAt: -1 });

    const formattedGoals = goals.map(formatGoalWithProgress);

    return res.status(200).json({
      success: true,
      count: formattedGoals.length,
      goals: formattedGoals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single savings goal by ID
 * @route   GET /api/goals/:id
 * @access  Private (JWT required)
 */
const getGoalById = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('linkedAccountId', 'name type balance');

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    return res.status(200).json({
      success: true,
      goal: formatGoalWithProgress(goal),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new savings goal
 * @route   POST /api/goals
 * @access  Private (JWT required)
 */
const createGoal = async (req, res, next) => {
  try {
    const { title, targetAmount, currentAmount = 0, targetDate, linkedAccountId } = req.body;

    // If a linked account is specified, verify ownership
    if (linkedAccountId) {
      const account = await Account.findOne({
        _id: linkedAccountId,
        userId: req.user._id,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Linked account not found or unauthorized',
        });
      }
    }

    const isCompleted = currentAmount >= targetAmount;

    const goal = await SavingsGoal.create({
      userId: req.user._id,
      title,
      targetAmount,
      currentAmount,
      targetDate,
      linkedAccountId: linkedAccountId || null,
      isCompleted,
    });

    if (linkedAccountId) {
      await goal.populate('linkedAccountId', 'name type balance');
    }

    return res.status(201).json({
      success: true,
      goal: formatGoalWithProgress(goal),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Contribute funds towards a savings goal (optionally deducting from an account)
 * @route   POST /api/goals/:id/contribute
 * @access  Private (JWT required)
 */
const contributeToGoal = async (req, res, next) => {
  try {
    const { amount, accountId } = req.body;

    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    let updatedAccount = null;

    // If an account is selected for deduction, verify ownership and deduct balance
    if (accountId) {
      const account = await Account.findOne({
        _id: accountId,
        userId: req.user._id,
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Source account not found or unauthorized',
        });
      }

      account.balance = Math.round((account.balance - amount) * 100) / 100;
      await account.save();
      updatedAccount = account;
    }

    // Update goal current amount and completion status
    goal.currentAmount = Math.round((goal.currentAmount + amount) * 100) / 100;
    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
    }

    await goal.save();

    if (goal.linkedAccountId) {
      await goal.populate('linkedAccountId', 'name type balance');
    }

    return res.status(200).json({
      success: true,
      message: 'Contribution recorded successfully',
      goal: formatGoalWithProgress(goal),
      account: updatedAccount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a savings goal
 * @route   PUT /api/goals/:id
 * @access  Private (JWT required)
 */
const updateGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    const { title, targetAmount, currentAmount, targetDate, linkedAccountId, isCompleted } = req.body;

    if (linkedAccountId !== undefined) {
      if (linkedAccountId !== null) {
        const account = await Account.findOne({
          _id: linkedAccountId,
          userId: req.user._id,
        });

        if (!account) {
          return res.status(404).json({
            success: false,
            message: 'Linked account not found or unauthorized',
          });
        }
        goal.linkedAccountId = linkedAccountId;
      } else {
        goal.linkedAccountId = null;
      }
    }

    if (title !== undefined) goal.title = title;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (currentAmount !== undefined) goal.currentAmount = currentAmount;
    if (targetDate !== undefined) goal.targetDate = targetDate;
    if (isCompleted !== undefined) {
      goal.isCompleted = isCompleted;
    } else {
      // Automatically recalculate completion based on updated current vs target amount
      // (e.g., increasing targetAmount resets a previously completed goal to in-progress)
      goal.isCompleted = goal.currentAmount >= goal.targetAmount;
    }

    await goal.save();
    if (goal.linkedAccountId) {
      await goal.populate('linkedAccountId', 'name type balance');
    }

    return res.status(200).json({
      success: true,
      goal: formatGoalWithProgress(goal),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a savings goal
 * @route   DELETE /api/goals/:id
 * @access  Private (JWT required)
 */
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Savings goal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateGoalProgress,
  formatGoalWithProgress,
  getGoals,
  getGoalById,
  createGoal,
  contributeToGoal,
  updateGoal,
  deleteGoal,
};
