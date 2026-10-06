const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const { signToken } = require('../src/utils/jwt');

describe('Auth API Integration Tests', () => {
  const validUser = {
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    mobile: '9876543210',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    businessName: 'Sharma Glass & Hardware',
    gstNumber: '27AAAAA0000A1Z5',
    address: {
      line1: 'Shop 14, Hardware Market',
      line2: 'MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
  };

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user with full profile and set cookies', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.fullName).toBe(validUser.fullName);
      expect(res.body.data.user.role).toBe('USER');
      expect(res.body.data.user.password).toBeUndefined();

      // Check cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('should reject registration when email already exists', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUser);

      // Duplicate attempt
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration if passwords do not match', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          confirmPassword: 'DifferentPassword999!',
        });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'confirmPassword', message: 'Passwords do not match' }),
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'IncorrectPassword',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'Password123!',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should return 401 when no token is supplied', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should return user profile when authenticated with cookie', async () => {
      const reg = await request(app).post('/api/auth/register').send(validUser);
      const cookies = reg.headers['set-cookie'];

      const res = await request(app).get('/api/auth/me').set('Cookie', cookies);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('should return user profile when authenticated with Authorization Bearer header', async () => {
      const reg = await request(app).post('/api/auth/register').send(validUser);
      const token = reg.body.data.token;

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
    });
  });

  describe('Role-Based Access Control (requireRole)', () => {
    let regularUserToken;
    let adminUserToken;

    beforeEach(async () => {
      // 1. Regular user
      const user = await User.create({
        fullName: 'Regular User',
        email: 'user@example.com',
        mobile: '9876543211',
        password: 'Password123!',
        role: 'USER',
      });
      regularUserToken = signToken(user._id);

      // 2. Admin user
      const admin = await User.create({
        fullName: 'Admin User',
        email: 'admin@example.com',
        mobile: '9876543212',
        password: 'Password123!',
        role: 'ADMIN',
      });
      adminUserToken = signToken(admin._id);
    });

    it('should block regular USER from accessing ADMIN route with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Role 'USER' is not authorized");
    });

    it('should allow ADMIN to access ADMIN route with 200 OK', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${adminUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Access granted');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookies and return 200', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('token=;'))).toBe(true);
    });
  });
});
