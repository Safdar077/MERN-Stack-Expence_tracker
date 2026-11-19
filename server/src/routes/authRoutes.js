/**
 * Authentication Routes
 * 
 * Defines the Express router for all authentication endpoints:
 * - POST /api/auth/register (Rate-limited, validated with registerSchema)
 * - POST /api/auth/login    (Rate-limited, validated with loginSchema)
 * - GET  /api/auth/me       (Protected with JWT Bearer auth middleware)
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  loginUser,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  registerSchema,
  loginSchema,
} = require('../validators/authValidator');

const router = express.Router();

/**
 * Authentication Rate Limiter
 * 
 * Protects against brute-force password guessing and automated registration attacks.
 * Limits incoming requests from a single IP to 10 requests per 15 minutes.
 * Skipped when NODE_ENV is 'test' to avoid rate-limiting legitimate automated test suites.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute time window
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* legacy headers
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Apply rate limiter to all authentication routes
router.use(authRateLimiter);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account and seed default accounts
 * @access  Public
 */
router.post('/register', validate(registerSchema), registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and receive JWT
 * @access  Public
 */
router.post('/login', validate(loginSchema), loginUser);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieve the current authenticated user profile
 * @access  Private (Requires valid JWT Bearer token)
 */
router.get('/me', protect, getMe);

module.exports = router;
