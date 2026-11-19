/**
 * Backend Application & Health Check Tests
 * 
 * Verifies core server configuration:
 * 1. Health check endpoint responds with 200 and expected status object
 * 2. 404 handler intercepts undefined routes
 * 3. Centralized error handling returns structured JSON
 */

const request = require('supertest');
const app = require('../src/app');

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
  });

  describe('404 Not Found Handling', () => {
    it('should return 404 for undefined routes with JSON error message', async () => {
      const response = await request(app).get('/api/unknown-endpoint-12345');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Not Found - /api/unknown-endpoint-12345');
    });
  });
});
