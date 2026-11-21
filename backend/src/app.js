/**
 * Express Application Setup
 * 
 * This module configures the Express application instance with security middleware,
 * CORS headers, request body parsers, core routes, and centralized error handling.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env if not already loaded in the current runtime
dotenv.config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const goalRoutes = require('./routes/goalRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize the Express application
const app = express();

/**
 * Security Headers Middleware: Helmet
 * Helmet adds various HTTP response headers that help protect against common web attacks
 * such as Cross-Site Scripting (XSS), Clickjacking, and MIME sniffing.
 */
app.use(helmet());

/**
 * Cross-Origin Resource Sharing (CORS) Middleware
 * Configured to allow communication with frontend clients on port 5180 (both localhost and 127.0.0.1)
 * as well as the deployed CLIENT_URL and any *.onrender.com frontend deployment.
 * Port restrictions: Client must run on port 5180 locally. Ports 3000, 5173, and 5022 are forbidden.
 * credentials: true allows HTTP cookies and authorization headers in cross-origin requests.
 */
const allowedOrigins = [
  'http://localhost:5180',
  'http://127.0.0.1:5180',
];

if (process.env.CLIENT_URL) {
  const configured = process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''));
  allowedOrigins.push(...configured);
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Allow configured origins or any onrender.com deployment origin
      const isAllowed =
        allowedOrigins.includes(normalizedOrigin) ||
        /^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(normalizedOrigin);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

/**
 * Body Parsing Middlewares
 * - express.json: Parses incoming HTTP requests with JSON payloads (Content-Type: application/json)
 * - express.urlencoded: Parses URL-encoded incoming requests (e.g., standard HTML form submissions)
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check Endpoint
 * Route: GET /api/health
 * Public route to verify backend connectivity, uptime, and server responsiveness.
 * Returns: { success: true, status: 'ok', timestamp: Date }
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date(),
  });
});

/**
 * Authentication Routes
 * Route: /api/auth
 * Handles user registration, authentication (login), and profile retrieval (/me).
 */
app.use('/api/auth', authRoutes);

/**
 * Account Routes
 * Route: /api/accounts
 * Handles creation, retrieval, updates, and deletion of user financial accounts.
 */
app.use('/api/accounts', accountRoutes);

/**
 * Category Routes
 * Route: /api/categories
 * Handles default category seeding, retrieval, and custom category creation.
 */
app.use('/api/categories', categoryRoutes);

/**
 * Transaction Routes
 * Route: /api/transactions
 * Handles CRUD operations, balance synchronization, filtering, pagination, and CSV export.
 */
app.use('/api/transactions', transactionRoutes);

/**
 * Budget Routes
 * Route: /api/budgets
 * Handles monthly budget limits, threshold alerts (50%, 90%, 100%, >100%), and spending tracking.
 */
app.use('/api/budgets', budgetRoutes);

/**
 * Savings Goal Routes
 * Route: /api/goals
 * Handles savings goals, progress tracking, and contributions with optional account deductions.
 */
app.use('/api/goals', goalRoutes);

/**
 * Recurring Rules Routes
 * Route: /api/recurring
 * Handles recurring income/expense rules, upcoming due item tracking via Date math, and "mark as paid" transactions.
 */
app.use('/api/recurring', recurringRoutes);

/**
 * Analytics Routes
 * Route: /api/analytics
 * Handles dynamic aggregation for overview metrics, category breakdown, and spending trends.
 */
app.use('/api/analytics', analyticsRoutes);

/**
 * 404 Route Not Found Middleware
 * Placed after all valid route declarations. Any request that reaches here
 * does not match an established route.
 */
app.use(notFound);

/**
 * Centralized Error Handling Middleware
 * Must be defined as the very last middleware with 4 arguments (err, req, res, next).
 */
app.use(errorHandler);

module.exports = app;
