/**
 * Account Routes
 * 
 * Declares HTTP routes for financial account management.
 * All account endpoints require authentication via the `protect` JWT middleware.
 * Creation and update payloads are validated via Zod schemas and `validate` middleware.
 */

const express = require('express');
const router = express.Router();
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  createAccountSchema,
  updateAccountSchema,
} = require('../validators/accountValidator');

// GET all accounts & POST create account
router
  .route('/')
  .get(protect, getAccounts)
  .post(protect, validate(createAccountSchema), createAccount);

// PUT update account & DELETE remove account by ID
router
  .route('/:id')
  .put(protect, validate(updateAccountSchema), updateAccount)
  .delete(protect, deleteAccount);

module.exports = router;
