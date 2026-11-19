/**
 * Centralized Error Handling Middleware
 * 
 * In an Express application, error-handling middleware is essential for
 * intercepting any runtime errors or invalid requests before they crash
 * the application or expose sensitive server internal details.
 */

/**
 * 404 Not Found Middleware
 * 
 * Intercepts any request that does not match any registered route in the Express app.
 * Creates an Error object with the requested URL, sets HTTP status to 404,
 * and passes the error downstream to the centralized errorHandler.
 * 
 * @param {import('express').Request} req - Incoming HTTP request
 * @param {import('express').Response} res - Outgoing HTTP response
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized Error Handler Middleware
 * 
 * Receives all errors forwarded by `next(error)` or unhandled exceptions in routes.
 * Standardizes the error response to consistent JSON format:
 * {
 *   success: false,
 *   message: string,
 *   stack?: string (only included when NODE_ENV is 'development')
 * }
 * 
 * Handles special cases:
 * - Mongoose CastError: Invalid MongoDB ObjectId (returns 400 Bad Request)
 * - Mongoose ValidationError: Schema validation failure (returns 400 Bad Request)
 * - ZodError: Request body / parameter validation failure (returns 400 Bad Request)
 * - General errors: Defaults to status code 500 if not already set to a 4xx or 5xx code
 * 
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Incoming HTTP request
 * @param {import('express').Response} res - Outgoing HTTP response
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // If response headers have already been sent to client, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // If the status code was not previously set to an error status (e.g. still 200 OK), default to 500
  let statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (e.g., searching with an invalid ObjectId like "123")
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}': ${err.value}`;
  }

  // Handle Mongoose Schema Validation Errors (e.g., required fields missing)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Handle Zod Validation Errors (e.g., invalid payload schemas)
  if (err.name === 'ZodError' || (err.issues && Array.isArray(err.issues))) {
    statusCode = 400;
    const issues = err.issues || err.errors || [];
    message = issues.map((issue) => {
      const path = Array.isArray(issue.path) && issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    }).join(', ') || 'Validation failed';
  }

  // Handle explicitly attached status codes on custom errors
  if (err.statusCode && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  } else if (err.status && typeof err.status === 'number') {
    statusCode = err.status;
  }

  // Return standard JSON error response
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
