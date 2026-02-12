import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.model';
import { generateToken } from '../middleware/auth.middleware';

const router = Router();

// Condition-based default settings
const getDefaultSettingsForConditions = (conditions: string[], learningStyles: string[] = []) => {
  let settings = {
    sensoryPreferences: {
      visualSensitivity: 'medium' as 'low' | 'medium' | 'high',
      audioSensitivity: 'medium' as 'low' | 'medium' | 'high',
      preferredLearningStyle: learningStyles.length > 0 ? learningStyles : ['visual'],
    },
    focusSettings: {
      sessionDuration: 25,
      breakDuration: 5,
      breakReminders: true,
      distractionBlocker: false,
    },
    accessibilitySettings: {
      fontSize: 'medium' as 'small' | 'medium' | 'large' | 'extra-large',
      fontFamily: 'default' as 'default' | 'dyslexia-friendly' | 'sans-serif' | 'serif',
      highContrast: false,
      reducedMotion: false,
      textToSpeech: false,
      lineSpacing: 'normal' as 'normal' | 'relaxed' | 'loose',
      colorTheme: 'light' as 'light' | 'dark' | 'sepia' | 'custom',
    },
  };

  // ADHD optimizations
  if (conditions.includes('adhd')) {
    settings.focusSettings.sessionDuration = 15; // Shorter sessions
    settings.focusSettings.breakDuration = 5;
    settings.focusSettings.breakReminders = true;
    settings.focusSettings.distractionBlocker = true;
    settings.accessibilitySettings.reducedMotion = true;
  }

  // Autism optimizations
  if (conditions.includes('autism')) {
    settings.sensoryPreferences.visualSensitivity = 'high';
    settings.sensoryPreferences.audioSensitivity = 'high';
    settings.accessibilitySettings.reducedMotion = true;
    settings.accessibilitySettings.colorTheme = 'sepia'; // Calmer colors
  }

  // Dyslexia optimizations
  if (conditions.includes('dyslexia')) {
    settings.accessibilitySettings.fontFamily = 'dyslexia-friendly';
    settings.accessibilitySettings.fontSize = 'large';
    settings.accessibilitySettings.lineSpacing = 'relaxed';
    settings.accessibilitySettings.textToSpeech = true;
  }

  // Dyscalculia optimizations
  if (conditions.includes('dyscalculia')) {
    settings.accessibilitySettings.fontSize = 'large';
    settings.focusSettings.sessionDuration = 20;
  }

  // Dysgraphia optimizations
  if (conditions.includes('dysgraphia')) {
    settings.accessibilitySettings.textToSpeech = true;
    settings.focusSettings.sessionDuration = 20;
  }

  return settings;
};

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').optional().isIn(['student', 'educator', 'parent']),
    body('conditions').optional().isArray(),
    body('learningStyles').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role, conditions = [], learningStyles = [] } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Get personalized default settings based on conditions
      const defaultSettings = getDefaultSettingsForConditions(conditions, learningStyles);

      // Create user with personalized neurodiverse profile
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'student',
        neurodiverseProfile: {
          conditions: conditions,
          sensoryPreferences: defaultSettings.sensoryPreferences,
          focusSettings: defaultSettings.focusSettings,
          accessibilitySettings: defaultSettings.accessibilitySettings,
        },
      });

      await user.save();

      const token = generateToken(user._id.toString());

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          neurodiverseProfile: user.neurodiverseProfile,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update streak — compare calendar dates, not raw timestamps
      const today = new Date();
      const todayStr = today.toDateString();
      const lastActive = user.rewards.lastActiveDate;
      const lastActiveStr = lastActive ? lastActive.toDateString() : '';

      if (lastActiveStr !== todayStr) {
        // Different calendar day — check if it's consecutive
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastActiveStr === yesterday.toDateString()) {
          // Consecutive day → increment streak
          user.rewards.streakDays += 1;
        } else if (!lastActive || lastActiveStr !== todayStr) {
          // Missed a day (or first login) → reset to 1
          user.rewards.streakDays = 1;
        }

        user.rewards.lastActiveDate = today;
        await user.save();
      }
      // Same calendar day — no streak change needed, but save lastActiveDate
      if (lastActiveStr === todayStr && !lastActive) {
        user.rewards.lastActiveDate = today;
        await user.save();
      }

      const token = generateToken(user._id.toString());

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          neurodiverseProfile: user.neurodiverseProfile,
          rewards: user.rewards,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// Internal API: Get all students (for AI service training)
router.get('/students', async (req: Request, res: Response) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('_id neurodiverseProfile rewards')
      .lean();
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

export default router;
