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
 * Configured to allow communication with frontend clients on port 5180 (both localhost and 127.0.0.1).
 * Port restrictions: Client must run on port 5180. Ports 3000, 5173, and 5022 are forbidden.
 * credentials: true allows HTTP cookies and authorization headers in cross-origin requests.
 */
const allowedOrigins = [
  ...new Set([
    process.env.CLIENT_URL || 'http://localhost:5180',
    'http://localhost:5180',
    'http://127.0.0.1:5180',
  ]),
];

app.use(
  cors({
    origin: allowedOrigins,
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
