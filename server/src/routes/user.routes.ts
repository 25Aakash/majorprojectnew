import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();


// Get accessibility preferences
router.get('/accessibility-preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('neurodiverseProfile');
    const preferences = user?.neurodiverseProfile?.accessibilitySettings || null;
    res.json({ preferences });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching accessibility preferences' });
  }
});

// Update accessibility preferences
router.post('/accessibility-preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { preferences } = req.body;
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.neurodiverseProfile) {
      user.neurodiverseProfile = {
        conditions: [],
        sensoryPreferences: {},
        focusSettings: {},
        accessibilitySettings: preferences
      } as any;
    } else {
      user.neurodiverseProfile.accessibilitySettings = preferences;
    }
    await user.save();
    res.json({ message: 'Accessibility preferences updated', preferences });
  } catch (error) {
    res.status(500).json({ message: 'Error updating accessibility preferences' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile
router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    delete updates.password; // Prevent password update through this route
    delete updates.email; // Prevent email update through this route

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile' });
  }
});

// Update neurodiverse profile
router.put(
  '/me/neurodiverse-profile',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { neurodiverseProfile } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { neurodiverseProfile } },
        { new: true }
      ).select('-password');

      res.json({
        message: 'Neurodiverse profile updated successfully',
        neurodiverseProfile: user?.neurodiverseProfile,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating neurodiverse profile' });
    }
  }
);

// Update accessibility settings
router.put(
  '/me/accessibility',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { accessibilitySettings } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { 'neurodiverseProfile.accessibilitySettings': accessibilitySettings } },
        { new: true }
      ).select('-password');

      res.json({
        message: 'Accessibility settings updated successfully',
        accessibilitySettings: user?.neurodiverseProfile?.accessibilitySettings,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating accessibility settings' });
    }
  }
);

// Update focus settings
router.put(
  '/me/focus-settings',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { focusSettings } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { 'neurodiverseProfile.focusSettings': focusSettings } },
        { new: true }
      ).select('-password');

      res.json({
        message: 'Focus settings updated successfully',
        focusSettings: user?.neurodiverseProfile?.focusSettings,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating focus settings' });
    }
  }
);

// Get user rewards
router.get('/me/rewards', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('rewards');
    res.json(user?.rewards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rewards' });
  }
});

// Link parent-student accounts
router.post(
  '/link-account',
  authMiddleware,
  [body('studentEmail').isEmail()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (req.user?.role !== 'parent') {
        return res.status(403).json({ message: 'Only parents can link student accounts' });
      }

      const student = await User.findOne({ email: req.body.studentEmail, role: 'student' });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { linkedAccounts: student._id },
      });

      res.json({ message: 'Account linked successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error linking accounts' });
    }
  }
);

// Internal API: Get user rewards by ID (for AI service)
router.get('/:userId/rewards', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select('rewards');
    if (!user) {
      return res.json({ badges: [], points: 0, streakDays: 0 });
    }
    res.json({
      badges: user.rewards?.badges || [],
      points: user.rewards?.points || 0,
      streakDays: user.rewards?.streakDays || 0
    });
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    res.status(500).json({ message: 'Error fetching user rewards' });
  }
});

export default router;
