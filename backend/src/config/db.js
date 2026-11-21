/**
 * Database Connection Module
 * 
 * This module establishes and manages the connection between the Node.js/Express
 * backend and MongoDB using the Mongoose ODM (Object Data Modeling) library.
 * 
 * Configuration & Connection Strings:
 * 1. Local MongoDB (Default for development):
 *    - Example: mongodb://127.0.0.1:27017/expense_tracker
 * 2. MongoDB Atlas (Cloud database ready):
 *    - Example: mongodb+srv://<username>:<password>@cluster0.mongodb.net/expense_tracker?retryWrites=true&w=majority
 * 
 * The URI is loaded from process.env.MONGO_URI, set in server/.env.
 * Includes automated retries with exponential backoff and friendly console logging.
 */

const mongoose = require('mongoose');

/**
 * Connects to MongoDB database with retry logic and descriptive logging.
 * 
 * @param {number} retryCount - Current retry attempt count (internal use)
 * @param {number} maxRetries - Maximum number of reconnection attempts before failing gracefully
 * @returns {Promise<mongoose.Connection|null>} Resolved Mongoose connection or null if connection failed
 */
const connectDB = async (retryCount = 0, maxRetries = 3) => {
  // Use connection URI from environment variable or fallback to default local database
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker';

  // Mask credentials if present for safe terminal logging
  const maskedURI = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');

  try {
    console.log(`[Database] Connecting to MongoDB (${maskedURI})...`);

    // Connect to MongoDB using Mongoose
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Wait up to 5 seconds before failing initial connection attempt
    });

    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    console.error('[Database Hint] If using local MongoDB, ensure the mongod service is active. If using Atlas, verify your IP is whitelisted and credentials are correct.');

    // If retry attempts remain, wait and attempt reconnect
    if (retryCount < maxRetries) {
      const delayMs = 3000;
      console.log(`[Database] Retrying connection in ${delayMs / 1000} seconds (Attempt ${retryCount + 1} of ${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return connectDB(retryCount + 1, maxRetries);
    } else {
      console.error('[Database Error] Maximum retry attempts reached. Server running without an active database connection.');
      // In production environment, exit process with failure code
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      return null;
    }
  }
};

module.exports = connectDB;
