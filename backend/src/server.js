/**
 * Server Entrypoint
 * 
 * This file is the primary entrypoint for starting the Expense Tracker backend API.
 * It loads environment variables, initiates the MongoDB connection, and starts
 * listening for incoming HTTP connections on the designated port.
 * 
 * Port Restrictions:
 * - Server runs on port 5050 (default: process.env.PORT || 5050).
 * - Ports 3000, 5173, and 5022 are forbidden.
 */

const path = require('path');
const dotenv = require('dotenv');

// 1. Load environment variables from the server/.env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');

// 2. Connect to MongoDB database
connectDB();

// 3. Define the server port
// Uses PORT from .env or defaults to 5050
const PORT = process.env.PORT || 5050;

// 4. Start HTTP Server
const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`[Expense Tracker API] Server successfully started!`);
  console.log(`[Environment] Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Network] Listening on: http://localhost:${PORT}`);
  console.log(`[Health Check] http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});

// 5. Handle unhandled promise rejections (e.g. unhandled database exceptions)
process.on('unhandledRejection', (err) => {
  console.error(`[Fatal Unhandled Rejection] ${err.message}`);
  // In development, log the full stack trace for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
});

module.exports = server;
