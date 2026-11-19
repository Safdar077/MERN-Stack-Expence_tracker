/**
 * Authentication Controllers
 * 
 * Contains business logic for user registration, user authentication (login),
 * and retrieval of the currently authenticated user's profile.
 */

const User = require('../models/User');
const Account = require('../models/Account');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user and seed default accounts
 * @route   POST /api/auth/register
 * @access  Public
 * 
 * Process:
 * 1. Checks if a user already exists with the provided email.
 * 2. Creates the new User document (password is hashed automatically by User pre-save hook).
 * 3. Automatically seeds 3 standard starter accounts ("Cash", "Main Bank", "Savings") for the user.
 * 4. Responds with 201 Created containing a signed JWT token and the sanitized user profile.
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    // Check for existing user with the same email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create the user in MongoDB
    const user = await User.create({
      name,
      email,
      password,
      currency: currency || 'USD',
    });

    // Seed default starter accounts for the new user
    const defaultAccounts = [
      { userId: user._id, name: 'Cash', type: 'Cash', balance: 0 },
      { userId: user._id, name: 'Main Bank', type: 'Bank', balance: 0 },
      { userId: user._id, name: 'Savings', type: 'Savings', balance: 0 },
    ];
    await Account.insertMany(defaultAccounts);

    // Return success response with signed JWT and sanitized user data
    return res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 * 
 * Process:
 * 1. Looks up user by email address.
 * 2. Compares plain entered password with stored bcrypt hash using user.matchPassword().
 * 3. Returns 401 Unauthorized if email or password do not match.
 * 4. Responds with 200 OK, a fresh signed JWT token, and the sanitized user profile.
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by lowercase email
    const user = await User.findOne({ email });

    // Validate existence and password hash match
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Return success response with signed JWT
    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Returns the authenticated user attached to `req.user` by the `protect` middleware.
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      currency: req.user.currency,
    },
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
