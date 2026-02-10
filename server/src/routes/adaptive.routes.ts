import { Router, Response } from 'express';
import { Progress } from '../models/Progress.model';
import { Course, Lesson } from '../models/Course.model';
import { User } from '../models/User.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get personalized course recommendations
router.get('/recommendations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userProfile = req.user?.neurodiverseProfile;

    // Get user's current enrollments
    const userProgress = await Progress.find({ userId });
    const enrolledCourseIds = userProgress.map((p) => p.courseId);

    // Build recommendation criteria based on neurodiverse profile
    const filter: Record<string, unknown> = {
      isPublished: true,
      _id: { $nin: enrolledCourseIds },
    };

    // Filter by neurodiverse-friendly features
    if (userProfile?.conditions.includes('adhd')) {
      filter['neurodiverseFeatures.adhdFriendly'] = true;
    }
    if (userProfile?.conditions.includes('autism')) {
      filter['neurodiverseFeatures.autismFriendly'] = true;
    }
    if (userProfile?.conditions.includes('dyslexia')) {
      filter['neurodiverseFeatures.dyslexiaFriendly'] = true;
    }

    // Get recommended courses
    const recommendations = await Course.find(filter)
      .populate('instructor', 'firstName lastName')
      .limit(10)
      .sort({ rating: -1, enrollmentCount: -1 });

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
});

// Get adaptive learning insights
router.get('/insights', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const progress = await Progress.find({ userId });

    // Calculate total learning time from all progress records
    const totalLearningTime = progress.reduce((total, p) => total + (p.timeSpent || 0), 0);

    // Analyze learning patterns
    const allSessions = progress.flatMap((p) => p.learningSessions);

    // Calculate optimal session duration
    const focusScores = allSessions.map((s) => ({
      duration: (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000,
      focusScore: s.focusScore,
    }));

    let optimalDuration = 25; // default
    if (focusScores.length > 0) {
      const highFocusSessions = focusScores.filter((s) => s.focusScore > 70);
      if (highFocusSessions.length > 0) {
        optimalDuration = Math.round(
          highFocusSessions.reduce((acc, s) => acc + s.duration, 0) / highFocusSessions.length
        );
      }
    }

    // Determine best time of day
    const sessionsByHour: Record<number, number[]> = {};
    allSessions.forEach((s) => {
      const hour = new Date(s.startTime).getHours();
      if (!sessionsByHour[hour]) sessionsByHour[hour] = [];
      sessionsByHour[hour].push(s.focusScore);
    });

    let bestTimeOfDay = 'morning';
    let bestAvgFocus = 0;
    Object.entries(sessionsByHour).forEach(([hour, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAvgFocus) {
        bestAvgFocus = avg;
        const hourNum = parseInt(hour);
        if (hourNum >= 5 && hourNum < 12) bestTimeOfDay = 'morning';
        else if (hourNum >= 12 && hourNum < 17) bestTimeOfDay = 'afternoon';
        else if (hourNum >= 17 && hourNum < 21) bestTimeOfDay = 'evening';
        else bestTimeOfDay = 'night';
      }
    });

    // Content type preferences
    const contentTypeTime: Record<string, number> = {};
    allSessions.forEach((s) => {
      if (s.contentPreferences?.timeSpentPerType) {
        Object.entries(s.contentPreferences.timeSpentPerType).forEach(([type, time]) => {
          contentTypeTime[type] = (contentTypeTime[type] || 0) + (time as number);
        });
      }
    });

    const preferredContentType = Object.entries(contentTypeTime).sort((a, b) => b[1] - a[1])[0]?.[0] || 'visual';

    // Calculate recommended pace based on quiz performance
    const allQuizAttempts = progress.flatMap((p) => p.quizAttempts);
    const avgQuizScore = allQuizAttempts.length > 0
      ? allQuizAttempts.reduce((acc, q) => acc + (q.correctAnswers / q.totalQuestions) * 100, 0) / allQuizAttempts.length
      : 70;

    let recommendedPace: 'slower' | 'normal' | 'faster' = 'normal';
    if (avgQuizScore < 60) recommendedPace = 'slower';
    else if (avgQuizScore > 85) recommendedPace = 'faster';

    // Build insights array for the AI component
    const insightsArray = [];

    // Add focus time insight
    insightsArray.push({
      type: 'focus',
      message: `Your optimal focus time is around ${optimalDuration} minutes. ${optimalDuration < 20 ? 'Take frequent short breaks!' : 'Great concentration span!'}`,
      icon: '⏰'
    });

    // Add best time insight
    const timeEmojis: Record<string, string> = { morning: '☀️', afternoon: '🌤️', evening: '🌅', night: '🌙' };
    insightsArray.push({
      type: 'time',
      message: `${bestTimeOfDay.charAt(0).toUpperCase() + bestTimeOfDay.slice(1)} sessions show your highest engagement. Try to study during this time!`,
      icon: timeEmojis[bestTimeOfDay] || '📅'
    });

    // Add content type insight
    const contentEmojis: Record<string, string> = { visual: '🎨', audio: '🎧', text: '📖', interactive: '🎮' };
    insightsArray.push({
      type: 'style',
      message: `${preferredContentType.charAt(0).toUpperCase() + preferredContentType.slice(1)} content works best for you. Look for courses with ${preferredContentType === 'visual' ? 'videos and images' : preferredContentType === 'audio' ? 'audio explanations' : preferredContentType === 'interactive' ? 'hands-on activities' : 'detailed reading materials'}.`,
      icon: contentEmojis[preferredContentType] || '💡'
    });

    // Add pace recommendation if needed
    if (recommendedPace !== 'normal') {
      insightsArray.push({
        type: 'pace',
        message: recommendedPace === 'slower'
          ? 'Consider reviewing material more thoroughly before moving on. Take your time!'
          : 'You\'re excelling! You might benefit from more challenging content.',
        icon: recommendedPace === 'slower' ? '🐢' : '🚀'
      });
    }

    // Return both formats for compatibility
    res.json({
      insights: {
        optimalSessionDuration: optimalDuration,
        bestTimeOfDay,
        preferredContentType,
        recommendedPace,
        totalLearningTime
      },
      insightsArray
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating insights' });
  }
});

// Get next recommended lesson
router.get('/next-lesson/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await Progress.findOne({
      userId: req.user?._id,
      courseId: req.params.courseId,
    });

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    const course = await Course.findById(req.params.courseId).populate('lessons');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find next uncompleted lesson
    const completedIds = progress.completedLessons.map((id) => id.toString());
    const nextLesson = (course.lessons as unknown as { _id: { toString: () => string } }[]).find(
      (lesson) => !completedIds.includes(lesson._id.toString())
    );

    if (!nextLesson) {
      return res.json({ message: 'Course completed!', completed: true });
    }

    // Determine if difficulty should be adjusted
    const recentQuizzes = progress.quizAttempts.slice(-3);
    const recentAvg = recentQuizzes.length > 0
      ? recentQuizzes.reduce((acc, q) => acc + (q.correctAnswers / q.totalQuestions) * 100, 0) / recentQuizzes.length
      : 70;

    res.json({
      nextLesson,
      adaptiveHints: {
        suggestSimplified: recentAvg < 60,
        suggestAdvanced: recentAvg > 90,
        currentDifficulty: progress.adaptiveMetrics.currentDifficultyLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error finding next lesson' });
  }
});

// Request content in different format
router.get('/adapt-content/:lessonId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { format } = req.query; // 'simplified', 'visual', 'audio', 'advanced'
    const lesson = await Lesson.findById(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    let adaptedContent = lesson.contentBlocks;

    switch (format) {
      case 'simplified':
        adaptedContent = lesson.adaptiveContent.simplifiedVersion || lesson.contentBlocks;
        break;
      case 'visual':
        adaptedContent = lesson.adaptiveContent.visualEnhanced || lesson.contentBlocks;
        break;
      case 'audio':
        adaptedContent = lesson.adaptiveContent.audioEnhanced || lesson.contentBlocks;
        break;
      case 'advanced':
        adaptedContent = lesson.adaptiveContent.advancedVersion || lesson.contentBlocks;
        break;
    }

    res.json({
      lessonId: lesson._id,
      title: lesson.title,
      format,
      contentBlocks: adaptedContent,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adapting content' });
  }
});

// Get focus mode settings
router.get('/focus-mode', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const focusSettings = user?.neurodiverseProfile?.focusSettings;

    // Get adaptive recommendations
    const progress = await Progress.find({ userId: user?._id });
    const allSessions = progress.flatMap((p) => p.learningSessions);

    // Calculate optimal break intervals
    const highFocusSessions = allSessions.filter((s) => s.focusScore > 75);
    let recommendedSessionDuration = focusSettings?.sessionDuration || 25;

    if (highFocusSessions.length >= 5) {
      const avgDuration = highFocusSessions.reduce((acc, s) => {
        return acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
      }, 0) / highFocusSessions.length;
      recommendedSessionDuration = Math.round(avgDuration);
    }

    res.json({
      currentSettings: focusSettings,
      recommendations: {
        sessionDuration: recommendedSessionDuration,
        breakDuration: Math.max(5, Math.round(recommendedSessionDuration / 5)),
        suggestion: recommendedSessionDuration < 20
          ? 'Consider shorter, more frequent sessions'
          : recommendedSessionDuration > 40
            ? 'Your focus is great! Consider longer sessions'
            : 'Your session duration is optimal',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting focus mode settings' });
  }
});

export default router;
