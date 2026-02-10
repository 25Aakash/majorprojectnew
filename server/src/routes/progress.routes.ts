import { Router, Request, Response } from 'express';
import { Progress } from '../models/Progress.model';
import { User } from '../models/User.model';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get user's progress for all courses
router.get('/my-progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await Progress.find({ userId: req.user?._id })
      .populate('courseId', 'title thumbnail category')
      .populate('currentLesson', 'title')
      .sort({ lastAccessedAt: -1 });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress' });
  }
});

// Get progress for specific course
router.get('/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await Progress.findOne({
      userId: req.user?._id,
      courseId: req.params.courseId,
    })
      .populate('completedLessons')
      .populate('currentLesson');

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress' });
  }
});

// Update learning session
router.post('/session', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId, sessionData } = req.body;

    const progress = await Progress.findOne({
      userId: req.user?._id,
      courseId,
    });

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    // Add learning session
    progress.learningSessions.push({
      ...sessionData,
      lessonId,
      startTime: new Date(sessionData.startTime),
      endTime: new Date(sessionData.endTime),
    });

    // Update time spent
    const sessionDuration = (new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime()) / 60000;
    progress.timeSpent += sessionDuration;

    // Update streak
    const today = new Date().toDateString();
    const lastStudy = progress.streakData.lastStudyDate?.toDateString();

    if (lastStudy !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastStudy === yesterday.toDateString()) {
        progress.streakData.currentStreak += 1;
      } else if (lastStudy !== today) {
        progress.streakData.currentStreak = 1;
      }

      if (progress.streakData.currentStreak > progress.streakData.longestStreak) {
        progress.streakData.longestStreak = progress.streakData.currentStreak;
      }

      progress.streakData.lastStudyDate = new Date();
    }

    progress.lastAccessedAt = new Date();
    await progress.save();

    // Award points and sync streak to user model
    // Use the maximum streak across all user's courses to preserve progress
    const allUserProgress = await Progress.find({ userId: req.user?._id });
    const maxStreak = Math.max(...allUserProgress.map(p => p.streakData?.currentStreak || 0));

    const pointsEarned = Math.floor(sessionDuration * 2) + (sessionData.focusScore > 80 ? 10 : 0);
    await User.findByIdAndUpdate(req.user?._id, {
      $inc: { 'rewards.points': pointsEarned },
      $set: {
        'rewards.streakDays': maxStreak,
        'rewards.lastActiveDate': new Date()
      }
    });

    res.json({
      message: 'Session recorded',
      pointsEarned,
      streak: progress.streakData.currentStreak,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error recording session' });
  }
});

// Mark lesson as complete
router.post('/complete-lesson', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId } = req.body;

    const progress = await Progress.findOne({
      userId: req.user?._id,
      courseId,
    }).populate('courseId');

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    // Add to completed lessons if not already completed
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);

      // Calculate overall progress
      const course = progress.courseId as unknown as { lessons: string[] };
      progress.overallProgress = Math.round(
        (progress.completedLessons.length / course.lessons.length) * 100
      );

      // Award completion bonus
      await User.findByIdAndUpdate(req.user?._id, {
        $inc: { 'rewards.points': 50 },
      });
    }

    await progress.save();

    res.json({
      message: 'Lesson marked as complete',
      overallProgress: progress.overallProgress,
      pointsEarned: 50,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing lesson' });
  }
});

// Submit quiz attempt
router.post('/quiz-attempt', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, quizAttempt } = req.body;

    const progress = await Progress.findOne({
      userId: req.user?._id,
      courseId,
    });

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    progress.quizAttempts.push({
      ...quizAttempt,
      attemptDate: new Date(),
    });

    // Update adaptive metrics based on quiz performance
    const scorePercent = (quizAttempt.correctAnswers / quizAttempt.totalQuestions) * 100;

    if (scorePercent >= 90) {
      progress.adaptiveMetrics.currentDifficultyLevel = Math.min(
        10,
        progress.adaptiveMetrics.currentDifficultyLevel + 1
      );
    } else if (scorePercent < 60) {
      progress.adaptiveMetrics.currentDifficultyLevel = Math.max(
        1,
        progress.adaptiveMetrics.currentDifficultyLevel - 1
      );
    }

    await progress.save();

    // Award points based on score
    const pointsEarned = Math.floor(scorePercent);
    await User.findByIdAndUpdate(req.user?._id, {
      $inc: { 'rewards.points': pointsEarned },
    });

    res.json({
      message: 'Quiz attempt recorded',
      scorePercent,
      pointsEarned,
      newDifficultyLevel: progress.adaptiveMetrics.currentDifficultyLevel,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error recording quiz attempt' });
  }
});

// Get analytics for parent/educator
router.get(
  '/student/:studentId',
  authMiddleware,
  roleMiddleware('parent', 'educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify parent has access to this student
      if (req.user?.role === 'parent') {
        const parent = await User.findById(req.user._id);
        if (!parent?.linkedAccounts?.includes(req.params.studentId as unknown as typeof parent.linkedAccounts[0])) {
          return res.status(403).json({ message: 'Not authorized to view this student' });
        }
      }

      const progress = await Progress.find({ userId: req.params.studentId })
        .populate('courseId', 'title category')
        .populate('completedLessons', 'title');

      const student = await User.findById(req.params.studentId).select('firstName lastName rewards');

      res.json({
        student,
        progress,
        summary: {
          totalCourses: progress.length,
          totalTimeSpent: progress.reduce((acc, p) => acc + p.timeSpent, 0),
          averageProgress: progress.reduce((acc, p) => acc + p.overallProgress, 0) / progress.length || 0,
          currentStreak: progress[0]?.streakData.currentStreak || 0,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching student analytics' });
    }
  }
);

// Internal API: Get user progress by ID (for AI service)
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const progress = await Progress.find({ userId: req.params.userId })
      .populate('courseId', 'title category')
      .populate('completedLessons', 'title');

    if (!progress || progress.length === 0) {
      return res.json({
        lessonsCompleted: 0,
        quizzesPassed: 0,
        coursesProgress: [],
        rewards: { streakDays: 0, points: 0, badges: [] },
        subjectPerformance: {},
        weeklyGoals: { target_minutes: 150, completed_minutes: 0, target_lessons: 10, completed_lessons: 0 }
      });
    }

    // Aggregate progress data
    const lessonsCompleted = progress.reduce((acc, p) => acc + (p.completedLessons?.length || 0), 0);
    const quizzesPassed = progress.reduce((acc, p) =>
      acc + (p.quizAttempts?.filter(q => (q.correctAnswers / q.totalQuestions) >= 0.7)?.length || 0), 0);

    const coursesProgress = progress.map(p => ({
      courseId: p.courseId,
      courseName: (p.courseId as any)?.title || 'Course',
      progress: p.overallProgress || 0,
      lessonsCompleted: p.completedLessons?.length || 0,
      totalLessons: (p.courseId as any)?.lessons?.length || 1
    }));

    // Get user for rewards
    const user = await User.findById(req.params.userId).select('rewards');

    res.json({
      lessonsCompleted,
      quizzesPassed,
      coursesProgress,
      rewards: {
        streakDays: progress[0]?.streakData?.currentStreak || 0,
        points: user?.rewards?.points || 0,
        badges: user?.rewards?.badges || []
      },
      subjectPerformance: {},
      weeklyGoals: {
        target_minutes: 150,
        completed_minutes: Math.round(progress.reduce((acc, p) => acc + (p.timeSpent || 0), 0)),
        target_lessons: 10,
        completed_lessons: lessonsCompleted
      }
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Error fetching user progress' });
  }
});

// Internal API: Get user sessions (for AI service)
router.get('/:userId/sessions', async (req: Request, res: Response) => {
  try {
    const { range } = req.query;
    const progress = await Progress.find({ userId: req.params.userId });

    let allSessions: any[] = [];
    progress.forEach(p => {
      if (p.learningSessions) {
        allSessions = allSessions.concat(p.learningSessions);
      }
    });

    // Filter by time range
    const now = new Date();
    let startDate = new Date(0);

    if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredSessions = allSessions.filter(s =>
      new Date(s.startTime || s.date) >= startDate
    );

    res.json(filteredSessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Error fetching user sessions' });
  }
});

export default router;
