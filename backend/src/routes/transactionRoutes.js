/**
 * Transaction Routes
 * 
 * Defines endpoints for managing financial transactions.
 * All endpoints require JWT authentication via `protect` middleware.
 * The `/export` route is defined before `/:id` to prevent route parameter collision.
 */

const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCSV,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  createTransactionSchema,
  updateTransactionSchema,
} = require('../validators/transactionValidator');

// Protect all transaction routes
router.use(protect);

// GET /api/transactions/export (Placed before /:id)
router.get('/export', exportTransactionsCSV);

// Root routes: GET paginated list, POST create transaction
router
  .route('/')
  .get(getTransactions)
  .post(validate(createTransactionSchema), createTransaction);

// ID-based routes: GET single, PUT update, DELETE remove
router
  .route('/:id')
  .get(getTransactionById)
  .put(validate(updateTransactionSchema), updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
