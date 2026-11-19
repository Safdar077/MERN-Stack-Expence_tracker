/**
 * JWT Token Generation Utility
 * 
 * Signs a JSON Web Token containing the user's MongoDB `_id` as the payload.
 * The token is signed using the server's JWT_SECRET and configured to expire
 * after a specified duration (e.g. 30 days).
 */

const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT for an authenticated user.
 * 
 * @param {string|import('mongoose').Types.ObjectId} id - The MongoDB ObjectId of the user
 * @returns {string} Signed JWT token string
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_for_development_12345!',
    {
      expiresIn: '30d',
    }
  );
};

module.exports = generateToken;
