import mongoose from 'mongoose';
import { User, IUser } from '../../models/User.model';

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user with required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.firstName).toBe('Test');
      expect(savedUser.lastName).toBe('User');
      expect(savedUser.role).toBe('student'); // default value
    });

    it('should fail without required email', async () => {
      const userData = {
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without required password', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without required firstName', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        lastName: 'User',
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without required lastName', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await new User(userData).save();
      const duplicateUser = new User(userData);
      
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should only allow valid roles', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'invalid-role',
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should accept valid roles', async () => {
      const roles = ['student', 'educator', 'parent', 'admin'];

      for (let i = 0; i < roles.length; i++) {
        const userData = {
          email: `test${i}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: roles[i],
        };

        const user = new User(userData);
        const savedUser = await user.save();
        expect(savedUser.role).toBe(roles[i]);
      }
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'password123';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(plainPassword.length);
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();
      const hashedPassword = user.password;

      user.firstName = 'Updated';
      await user.save();

      expect(user.password).toBe(hashedPassword);
    });
  });

  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'password123';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('');
      expect(isMatch).toBe(false);
    });
  });

  describe('Neurodiverse Profile', () => {
    it('should save user with neurodiverse profile', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        neurodiverseProfile: {
          conditions: ['adhd', 'dyslexia'],
          sensoryPreferences: {
            visualSensitivity: 'high',
            audioSensitivity: 'medium',
            preferredLearningStyle: ['visual', 'auditory'],
          },
          focusSettings: {
            sessionDuration: 20,
            breakDuration: 5,
            breakReminders: true,
            distractionBlocker: true,
          },
          accessibilitySettings: {
            fontSize: 'large',
            fontFamily: 'dyslexia-friendly',
            highContrast: false,
            reducedMotion: true,
            textToSpeech: true,
            lineSpacing: 'relaxed',
            colorTheme: 'sepia',
          },
        },
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.neurodiverseProfile?.conditions).toContain('adhd');
      expect(savedUser.neurodiverseProfile?.conditions).toContain('dyslexia');
      expect(savedUser.neurodiverseProfile?.accessibilitySettings?.fontSize).toBe('large');
    });

    it('should only accept valid conditions', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        neurodiverseProfile: {
          conditions: ['invalid-condition'],
        },
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Rewards', () => {
    it('should have default rewards values', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.rewards.points).toBe(0);
      expect(savedUser.rewards.badges).toEqual([]);
      expect(savedUser.rewards.streakDays).toBe(0);
      expect(savedUser.rewards.lastActiveDate).toBeDefined();
    });

    it('should update rewards', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();

      user.rewards.points = 100;
      user.rewards.badges = ['first_course', 'streak_7'];
      user.rewards.streakDays = 7;

      await user.save();

      expect(user.rewards.points).toBe(100);
      expect(user.rewards.badges).toContain('first_course');
      expect(user.rewards.streakDays).toBe(7);
    });
  });

  describe('Linked Accounts', () => {
    it('should link parent to student account', async () => {
      const studentData = {
        email: 'student@example.com',
        password: 'password123',
        firstName: 'Student',
        lastName: 'User',
        role: 'student',
      };

      const parentData = {
        email: 'parent@example.com',
        password: 'password123',
        firstName: 'Parent',
        lastName: 'User',
        role: 'parent',
      };

      const student = await new User(studentData).save();
      const parent = new User(parentData);
      parent.linkedAccounts = [student._id as mongoose.Types.ObjectId];
      const savedParent = await parent.save();

      expect(savedParent.linkedAccounts).toContainEqual(student._id);
    });
  });

  describe('Preferences', () => {
    it('should have default preferences', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.preferences.notifications).toBe(true);
      expect(savedUser.preferences.emailUpdates).toBe(true);
      expect(savedUser.preferences.language).toBe('en');
    });
  });

  describe('Email Normalization', () => {
    it('should convert email to lowercase', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim email whitespace', async () => {
      const userData = {
        email: '  test@example.com  ',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });
  });

  describe('Timestamps', () => {
    it('should add createdAt and updatedAt timestamps', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = new User(userData);
      await user.save();
      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      user.firstName = 'Updated';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
