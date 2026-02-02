import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Dynamic Configuration API
 * Serves configurable options that can be extended/modified without code changes
 * These could be moved to database for full admin control
 */

// In production, these would come from a Config collection in MongoDB
// For now, they're centralized here for easy modification

const getConfig = () => ({
  // Neurodiverse conditions supported by the platform
  conditions: [
    { id: 'adhd', label: 'ADHD', emoji: '⚡', description: 'Attention Deficit Hyperactivity Disorder' },
    { id: 'autism', label: 'Autism', emoji: '🌈', description: 'Autism Spectrum Disorder' },
    { id: 'dyslexia', label: 'Dyslexia', emoji: '📖', description: 'Reading and language processing difficulty' },
    { id: 'dyscalculia', label: 'Dyscalculia', emoji: '🔢', description: 'Difficulty with numbers and math' },
    { id: 'dysgraphia', label: 'Dysgraphia', emoji: '✍️', description: 'Difficulty with writing' },
    { id: 'dyspraxia', label: 'Dyspraxia', emoji: '🏃', description: 'Coordination and motor skills difficulty' },
    { id: 'other', label: 'Other', emoji: '🧠', description: 'Other learning differences' },
  ],

  // Learning styles
  learningStyles: [
    { id: 'visual', label: 'Visual', description: 'Learn best by seeing - diagrams, videos, images', icon: '👁️' },
    { id: 'auditory', label: 'Auditory', description: 'Learn best by hearing - lectures, discussions', icon: '👂' },
    { id: 'kinesthetic', label: 'Kinesthetic', description: 'Learn best by doing - hands-on activities', icon: '🖐️' },
    { id: 'reading', label: 'Reading/Writing', description: 'Learn best through text - reading and notes', icon: '📝' },
  ],

  // Course categories
  categories: [
    { id: 'math', label: 'Mathematics', icon: '🔢', color: '#3B82F6' },
    { id: 'reading', label: 'Reading & Language', icon: '📚', color: '#10B981' },
    { id: 'science', label: 'Science', icon: '🔬', color: '#8B5CF6' },
    { id: 'social-emotional', label: 'Social-Emotional', icon: '💝', color: '#EC4899' },
    { id: 'creative', label: 'Creative Arts', icon: '🎨', color: '#F59E0B' },
    { id: 'life-skills', label: 'Life Skills', icon: '🌟', color: '#06B6D4' },
    { id: 'technology', label: 'Technology', icon: '💻', color: '#6366F1' },
    { id: 'social', label: 'Social Studies', icon: '🌍', color: '#14B8A6' },
    { id: 'language', label: 'Language Arts', icon: '✏️', color: '#F97316' },
    { id: 'art', label: 'Art & Music', icon: '🎵', color: '#A855F7' },
  ],

  // Difficulty levels
  difficulties: [
    { id: 'beginner', label: 'Beginner', description: 'New to the subject', color: '#22C55E' },
    { id: 'intermediate', label: 'Intermediate', description: 'Some prior knowledge', color: '#F59E0B' },
    { id: 'advanced', label: 'Advanced', description: 'Experienced learners', color: '#EF4444' },
  ],

  // Accessibility features for courses
  accessibilityFeatures: [
    { id: 'visual-support', label: 'Visual Learning Support', description: 'Enhanced visual aids and diagrams' },
    { id: 'audio-descriptions', label: 'Audio Descriptions', description: 'Detailed audio explanations' },
    { id: 'text-to-speech', label: 'Text-to-Speech', description: 'Content can be read aloud' },
    { id: 'adjustable-text', label: 'Adjustable Text Size', description: 'Flexible text sizing' },
    { id: 'high-contrast', label: 'High Contrast Mode', description: 'Enhanced color contrast' },
    { id: 'reduced-motion', label: 'Reduced Motion', description: 'Minimal animations' },
    { id: 'break-reminders', label: 'Break Reminders', description: 'Automatic break suggestions' },
    { id: 'focus-mode', label: 'Focus Mode', description: 'Distraction-free environment' },
  ],

  // Theme options for accessibility settings
  themes: [
    { id: 'light', label: 'Light', icon: '☀️', colors: { bg: '#FFFFFF', text: '#1F2937' } },
    { id: 'dark', label: 'Dark', icon: '🌙', colors: { bg: '#1F2937', text: '#F9FAFB' } },
    { id: 'sepia', label: 'Sepia', icon: '📜', colors: { bg: '#F5F0E6', text: '#5C4B37' } },
    { id: 'high-contrast', label: 'High Contrast', icon: '⚫', colors: { bg: '#000000', text: '#FFFFFF' } },
  ],

  // Font size options
  fontSizes: [
    { id: 'small', label: 'Small', value: '14px', scale: 0.875 },
    { id: 'medium', label: 'Medium', value: '16px', scale: 1 },
    { id: 'large', label: 'Large', value: '18px', scale: 1.125 },
    { id: 'extra-large', label: 'Extra Large', value: '20px', scale: 1.25 },
  ],

  // Font family options
  fontFamilies: [
    { id: 'default', label: 'Default', family: 'system-ui, -apple-system, sans-serif' },
    { id: 'dyslexia-friendly', label: 'Dyslexia Friendly', family: 'OpenDyslexic, Comic Sans MS, sans-serif' },
    { id: 'sans-serif', label: 'Sans Serif', family: 'Arial, Helvetica, sans-serif' },
    { id: 'serif', label: 'Serif', family: 'Georgia, Times New Roman, serif' },
    { id: 'monospace', label: 'Monospace', family: 'Consolas, Monaco, monospace' },
  ],

  // Line spacing options
  lineSpacings: [
    { id: 'normal', label: 'Normal', value: 1.5 },
    { id: 'relaxed', label: 'Relaxed', value: 1.75 },
    { id: 'loose', label: 'Loose', value: 2 },
  ],

  // Focus mode default settings
  focusSettings: {
    defaultSessionDuration: 25,
    defaultBreakDuration: 5,
    minSessionDuration: 5,
    maxSessionDuration: 60,
    minBreakDuration: 1,
    maxBreakDuration: 30,
  },

  // Gamification settings
  gamification: {
    pointsPerLesson: 50,
    pointsPerQuiz: 100,
    streakBonusMultiplier: 1.5,
    badgeThresholds: {
      firstLesson: 1,
      fiveLessons: 5,
      tenLessons: 10,
      streak7Days: 7,
      streak30Days: 30,
    },
  },

  // Platform features for marketing/home page
  platformFeatures: [
    {
      id: 'ai-adaptation',
      title: 'AI-Powered Adaptation',
      description: 'Our AI learns your unique learning style and adapts content in real-time.',
      icon: 'sparkles',
    },
    {
      id: 'multi-sensory',
      title: 'Multi-Sensory Learning',
      description: 'Engage with content through visual, audio, and interactive elements.',
      icon: 'eye',
    },
    {
      id: 'focus-tools',
      title: 'Focus & Attention Tools',
      description: 'Built-in timers, break reminders, and distraction-blocking features.',
      icon: 'clock',
    },
    {
      id: 'progress-tracking',
      title: 'Progress Tracking',
      description: 'Detailed analytics and insights for students, parents, and educators.',
      icon: 'chart',
    },
    {
      id: 'gamification',
      title: 'Gamification',
      description: 'Earn points, badges, and rewards to stay motivated.',
      icon: 'trophy',
    },
    {
      id: 'accessibility',
      title: 'Full Accessibility',
      description: 'WCAG 2.1 compliant with customizable themes and fonts.',
      icon: 'accessibility',
    },
  ],
});

// Get all configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ message: 'Error fetching configuration' });
  }
});

// Get specific config section
router.get('/:section', async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    const section = req.params.section as keyof ReturnType<typeof getConfig>;
    
    if (section in config) {
      res.json(config[section]);
    } else {
      res.status(404).json({ message: 'Configuration section not found' });
    }
  } catch (error) {
    console.error('Error fetching config section:', error);
    res.status(500).json({ message: 'Error fetching configuration section' });
  }
});

// Admin: Update configuration (would save to database in production)
router.put(
  '/:section',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      // In production, this would update a Config collection in MongoDB
      // For now, just acknowledge the request
      res.json({ 
        message: 'Configuration update acknowledged',
        note: 'In production, this would persist to database'
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ message: 'Error updating configuration' });
    }
  }
);

export default router;
