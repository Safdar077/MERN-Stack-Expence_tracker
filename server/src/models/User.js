/**
 * User Model
 * 
 * Defines the Mongoose schema and model for application users.
 * Represents user credentials, preferences (such as preferred currency),
 * and provides secure password hashing using bcryptjs.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema definition
 * 
 * - name: Full display name of the user (minimum 2 characters)
 * - email: Unique user email, automatically converted to lowercase for case-insensitive logins
 * - password: User's hashed secret password (minimum 6 characters before hashing)
 * - currency: User's primary currency code (default: 'USD')
 * - timestamps: Automatically generates createdAt and updatedAt fields
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-Save Mongoose Hook: Password Hashing
 * 
 * Before saving a User document to the MongoDB database, this hook inspects
 * whether the password field has been added or modified. If modified, it generates
 * a cryptographic salt using bcryptjs (cost factor 10) and replaces the plaintext
 * password with its secure hash. If unmodified, it proceeds without rehashing.
 */
userSchema.pre('save', async function (next) {
  // If the password hasn't been changed, move to the next middleware
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with 10 rounds of computation
    const salt = await bcrypt.genSalt(10);
    // Hash password with the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Method: matchPassword
 * 
 * Compares an entered plaintext password against the stored bcrypt hash.
 * Returns true if passwords match, or false otherwise.
 * 
 * @param {string} enteredPassword - The plaintext password to verify
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
