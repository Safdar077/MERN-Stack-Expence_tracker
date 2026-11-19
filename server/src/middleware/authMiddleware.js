/**
 * JWT Authentication & Route Protection Middleware
 * 
 * Intercepts incoming requests to protected routes, inspects the HTTP Authorization header
 * for a valid JSON Web Token (JWT) in Bearer format, verifies the cryptographic signature,
 * and attaches the authenticated user document (excluding password) to `req.user`.
 * 
 * If the token is missing, expired, or invalid, returns an HTTP 401 Unauthorized response.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects endpoints by verifying the client's Bearer JWT.
 * 
 * Expected Header:
 * Authorization: Bearer <jwt_token>
 * 
 * @param {import('express').Request} req - Incoming HTTP request
 * @param {import('express').Response} res - Outgoing HTTP response
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check if Authorization header exists and follows 'Bearer <token>' pattern
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract the JWT string after the "Bearer " prefix
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token missing from Bearer header',
        });
      }

      // 2. Cryptographically verify the token using JWT_SECRET
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_key_for_development_12345!'
      );

      // 3. Find the user associated with this token ID in MongoDB
      // Exclude the hashed password field from being attached to req.user for security
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found',
        });
      }

      // Attach user document to request object for downstream controllers
      req.user = user;
      return next();
    } catch (error) {
      // Handles JsonWebTokenError, TokenExpiredError, etc.
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or invalid',
      });
    }
  }

  // 4. Return 401 if no Bearer token was provided in headers
  return res.status(401).json({
    success: false,
    message: 'Not authorized, no token provided',
  });
};

module.exports = {
  protect,
};
