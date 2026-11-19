/**
 * Backend Application & Health Check Tests
 * 
 * Verifies core server configuration:
 * 1. Health check endpoint responds with 200 and expected status object
 * 2. 404 handler intercepts undefined routes
 * 3. Centralized error handling returns structured JSON across error types
 * 4. CORS headers allow legitimate frontend origins
 */

const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const { notFound, errorHandler } = require('../src/middleware/errorMiddleware');

describe('Backend Core & Health Check Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK with success: true and status: "ok"', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      // Timestamp should be valid ISO date string
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should support CORS for allowed origins', async () => {
      const res1 = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5180');
      expect(res1.headers['access-control-allow-origin']).toBe('http://localhost:5180');

      const res2 = await request(app)
        .get('/api/health')
        .set('Origin', 'http://127.0.0.1:5180');
      expect(res2.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5180');
    });
  });

  describe('404 Not Found Handling', () => {
    it('should return 404 for undefined routes with JSON error message', async () => {
      const response = await request(app).get('/api/unknown-endpoint-12345');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Not Found - /api/unknown-endpoint-12345');
    });
  });

  describe('Centralized Error Handler Branches', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
    });

    it('should handle generic errors with 500 status code', async () => {
      testApp.get('/test-error', (req, res, next) => {
        next(new Error('Unexpected system failure'));
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unexpected system failure');
    });

    it('should handle custom status code on error object', async () => {
      testApp.get('/test-custom-status', (req, res, next) => {
        const err = new Error('Forbidden resource');
        err.statusCode = 403;
        next(err);
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-custom-status');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Forbidden resource');
    });

    it('should format Zod validation errors with and without issue path', async () => {
      testApp.get('/test-zod-error', (req, res, next) => {
        const zodErr = new Error('Validation failed');
        zodErr.name = 'ZodError';
        zodErr.issues = [
          { path: ['user', 'email'], message: 'Invalid email format' },
          { path: [], message: 'Payload must be an object' },
        ];
        next(zodErr);
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-zod-error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('user.email: Invalid email format, Payload must be an object');
    });

    it('should format Mongoose CastError to 400', async () => {
      testApp.get('/test-cast-error', (req, res, next) => {
        const castErr = new Error('Cast to ObjectId failed');
        castErr.name = 'CastError';
        castErr.path = '_id';
        castErr.value = 'invalid-id-xyz';
        next(castErr);
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-cast-error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid format for field '_id': invalid-id-xyz");
    });

    it('should format Mongoose ValidationError to 400', async () => {
      testApp.get('/test-val-error', (req, res, next) => {
        const valErr = new Error('Validation failed');
        valErr.name = 'ValidationError';
        valErr.errors = {
          title: { message: 'Title is required' },
          amount: { message: 'Amount must be positive' },
        };
        next(valErr);
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-val-error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Title is required, Amount must be positive');
    });

    it('should delegate to next(err) if headers are already sent', () => {
      const mockReq = {};
      const mockRes = { headersSent: true };
      const mockNext = jest.fn();
      const testErr = new Error('Post-header failure');

      errorHandler(testErr, mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(testErr);
    });
  });
});
