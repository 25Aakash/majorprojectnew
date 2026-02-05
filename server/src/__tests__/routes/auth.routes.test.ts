import request from 'supertest';
import express, { Express } from 'express';
import { User } from '../../models/User.model';

// Create a test app with auth routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import and use auth routes
  const authRoutes = require('../../routes/auth.routes').default;
  app.use('/api/auth', authRoutes);
  
  return app;
};

describe('Auth Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for missing firstName', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing lastName', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password123',
          firstName: 'First',
          lastName: 'User',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password123',
          firstName: 'Second',
          lastName: 'User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists');
    });

    it('should register with custom role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'educator@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'Educator',
          role: 'educator',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('educator');
    });

    it('should apply ADHD settings when condition is provided', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'adhd@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          conditions: ['adhd'],
        });

      expect(response.status).toBe(201);
      expect(response.body.user.neurodiverseProfile.focusSettings.sessionDuration).toBe(15);
      expect(response.body.user.neurodiverseProfile.focusSettings.distractionBlocker).toBe(true);
    });

    it('should apply dyslexia settings when condition is provided', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'dyslexia@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          conditions: ['dyslexia'],
        });

      expect(response.status).toBe(201);
      expect(response.body.user.neurodiverseProfile.accessibilitySettings.fontFamily).toBe('dyslexia-friendly');
      expect(response.body.user.neurodiverseProfile.accessibilitySettings.textToSpeech).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        email: 'logintest@test.com',
        password: 'password123',
        firstName: 'Login',
        lastName: 'Test',
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('logintest@test.com');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: '',
        });

      expect(response.status).toBe(400);
    });

    it('should update streak on consecutive login', async () => {
      const user = await User.findOne({ email: 'logintest@test.com' });
      if (user) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        user.rewards.lastActiveDate = yesterday;
        user.rewards.streakDays = 5;
        await user.save();
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.rewards.streakDays).toBe(6);
    });

    it('should reset streak if more than one day gap', async () => {
      const user = await User.findOne({ email: 'logintest@test.com' });
      if (user) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        user.rewards.lastActiveDate = threeDaysAgo;
        user.rewards.streakDays = 10;
        await user.save();
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.rewards.streakDays).toBe(1);
    });

    it('should include neurodiverse profile in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.neurodiverseProfile).toBeDefined();
    });
  });
});
