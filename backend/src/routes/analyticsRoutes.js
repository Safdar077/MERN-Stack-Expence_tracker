/**
 * Analytics Routes
 * 
 * Defines routing endpoints for the backend analytics engine:
 * - GET /api/analytics/overview: Dynamic lifetime & monthly totals with budget progress
 * - GET /api/analytics/categories: Dynamic category-grouped expenses for donut/pie charts
 * - GET /api/analytics/trends: Dynamic chronological income/expense/net trends with zero-filling
 * 
 * Route Protection:
 * All endpoints require Bearer JWT authentication via `protect` middleware.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getOverviewAnalytics,
  getCategoryAnalytics,
  getSpendingTrends,
} = require('../controllers/analyticsController');

/**
 * @route   GET /api/analytics/overview
 * @desc    Get dynamic total income, total expense, net savings, and budget usage
 * @access  Private (JWT required)
 */
router.get('/overview', protect, getOverviewAnalytics);

/**
 * @route   GET /api/analytics/categories
 * @desc    Get expenses grouped by category with metadata lookup, sorted descending
 * @access  Private (JWT required)
 */
router.get('/categories', protect, getCategoryAnalytics);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get chronological spending trends (income, expense, net) with zero-filling
 * @access  Private (JWT required)
 */
router.get('/trends', protect, getSpendingTrends);

module.exports = router;
