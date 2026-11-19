/**
 * Authentication Endpoints & Security Integration Tests
 * 
 * Verifies backend user authentication and authorization workflows:
 * 1. User registration creates user, hashes password, seeds default accounts, returns JWT token.
 * 2. User registration rejects invalid inputs (short password, bad email, short name).
 * 3. User registration prevents duplicate email registration.
 * 4. User login validates credentials, returning JWT token on success.
 * 5. User login rejects invalid email or wrong password with 401.
 * 6. Protected /api/auth/me returns current user details with valid Bearer token.
 * 7. Protected /api/auth/me rejects requests without token or with invalid token (401).
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Account = require('../src/models/Account');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker_test';

describe('Auth API Endpoints (/api/auth)', () => {
  // Connect to the test MongoDB database before running tests
  beforeAll(async () => {
    // Set NODE_ENV to test so rate-limiting is skipped during test assertions
    process.env.NODE_ENV = 'test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MONGO_URI);
    }
  });

  // Clean up database tables before each test to guarantee test isolation
  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
  });

  // Close MongoDB connection after all tests have completed
  afterAll(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should register a new user successfully and return JWT token with user profile', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.user).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        currency: 'USD',
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user in database has hashed password, not plain text
      const userInDb = await User.findOne({ email: validUser.email });
      expect(userInDb).not.toBeNull();
      expect(userInDb.password).not.toBe(validUser.password);
      expect(userInDb.password.length).toBeGreaterThan(20);

      // Verify that default accounts ("Cash", "Main Bank", "Savings") were seeded
      const userAccounts = await Account.find({ userId: userInDb._id });
      expect(userAccounts).toHaveLength(3);
      const accountNames = userAccounts.map((a) => a.name);
      expect(accountNames).toContain('Cash');
      expect(accountNames).toContain('Main Bank');
      expect(accountNames).toContain('Savings');
    });

    it('should reject registration if email is already registered', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUser);

      // Duplicate registration attempt
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'invalid-email-address',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/email/i);
    });

    it('should reject registration with password shorter than 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: '12345',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/password/i);
    });

    it('should reject registration with name shorter than 2 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'J',
          email: 'j@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/name/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Seed a registered user
      await request(app).post('/api/auth/register').send({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securePassword123',
      });
    });

    it('should authenticate user with valid credentials and return JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'securePassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        name: 'Alice Smith',
        email: 'alice@example.com',
        currency: 'USD',
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with wrong password (401)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'wrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login for non-existent user email (401)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'securePassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Bob Jones',
        email: 'bob@example.com',
        password: 'password123',
      });
      authToken = registerRes.body.token;
    });

    it('should return user details when Bearer token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        name: 'Bob Jones',
        email: 'bob@example.com',
        currency: 'USD',
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request when Authorization header is missing (401)', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not authorized/i);
    });

    it('should reject request with an invalid or malformed token (401)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not authorized/i);
    });
  });
});
