import mongoose from 'mongoose';
import { Progress, IProgress } from '../../models/Progress.model';
import { User } from '../../models/User.model';
import { Course, Lesson } from '../../models/Course.model';

describe('Progress Model', () => {
  let userId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let lessonId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create user
    const user = new User({
      email: 'student@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Student',
    });
    await user.save();
    userId = user._id as mongoose.Types.ObjectId;

    // Create course
    const instructor = new User({
      email: 'instructor@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'educator',
    });
    await instructor.save();

    const course = new Course({
      title: 'Test Course',
      description: 'A test course',
      category: 'Programming',
      instructor: instructor._id,
    });
    await course.save();
    courseId = course._id as mongoose.Types.ObjectId;

    // Create lesson
    const lesson = new Lesson({
      title: 'Test Lesson',
      courseId: courseId,
      order: 1,
    });
    await lesson.save();
    lessonId = lesson._id as mongoose.Types.ObjectId;
  });

  describe('Schema Validation', () => {
    it('should create a valid progress record', async () => {
      const progressData = {
        userId: userId,
        courseId: courseId,
        currentLesson: lessonId,
      };

      const progress = new Progress(progressData);
      const saved = await progress.save();

      expect(saved._id).toBeDefined();
      expect(saved.userId).toEqual(userId);
      expect(saved.courseId).toEqual(courseId);
      expect(saved.overallProgress).toBe(0); // default
    });

    it('should fail without required userId', async () => {
      const progressData = {
        courseId: courseId,
      };

      const progress = new Progress(progressData);
      await expect(progress.save()).rejects.toThrow();
    });

    it('should fail without required courseId', async () => {
      const progressData = {
        userId: userId,
      };

      const progress = new Progress(progressData);
      await expect(progress.save()).rejects.toThrow();
    });

    it('should enforce unique userId-courseId combination', async () => {
      const progressData = {
        userId: userId,
        courseId: courseId,
      };

      await new Progress(progressData).save();
      const duplicate = new Progress(progressData);
      
      await expect(duplicate.save()).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
      });
      const saved = await progress.save();

      expect(saved.overallProgress).toBe(0);
      expect(saved.completedLessons).toEqual([]);
      expect(saved.learningSessions).toEqual([]);
      expect(saved.quizAttempts).toEqual([]);
      expect(saved.timeSpent).toBe(0);
    });

    it('should have default adaptive metrics', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
      });
      const saved = await progress.save();

      expect(saved.adaptiveMetrics.currentDifficultyLevel).toBe(5);
      expect(saved.adaptiveMetrics.recommendedPace).toBe('normal');
      expect(saved.adaptiveMetrics.optimalSessionDuration).toBe(25);
    });

    it('should have default streak data', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
      });
      const saved = await progress.save();

      expect(saved.streakData.currentStreak).toBe(0);
      expect(saved.streakData.longestStreak).toBe(0);
    });
  });

  describe('Completed Lessons', () => {
    it('should track completed lessons', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        completedLessons: [lessonId],
      });
      const saved = await progress.save();

      expect(saved.completedLessons).toContainEqual(lessonId);
    });

    it('should update overall progress', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        overallProgress: 50,
      });
      const saved = await progress.save();

      expect(saved.overallProgress).toBe(50);
    });
  });

  describe('Learning Sessions', () => {
    it('should store learning session data', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        learningSessions: [
          {
            startTime: new Date(),
            endTime: new Date(),
            lessonId: lessonId,
            focusScore: 85,
            completionRate: 100,
            interactionCount: 25,
            pauseCount: 2,
            contentPreferences: {
              preferredType: 'video',
              timeSpentPerType: { video: 300, text: 120 },
            },
          },
        ],
      });
      const saved = await progress.save();

      expect(saved.learningSessions).toHaveLength(1);
      expect(saved.learningSessions[0].focusScore).toBe(85);
      expect(saved.learningSessions[0].completionRate).toBe(100);
    });

    it('should allow multiple learning sessions', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
      });
      await progress.save();

      // Add sessions
      progress.learningSessions.push({
        startTime: new Date(),
        endTime: new Date(),
        lessonId: lessonId,
        focusScore: 80,
        completionRate: 50,
        interactionCount: 10,
        pauseCount: 1,
        contentPreferences: {
          preferredType: 'text',
          timeSpentPerType: { text: 300 },
        },
      });

      progress.learningSessions.push({
        startTime: new Date(),
        endTime: new Date(),
        lessonId: lessonId,
        focusScore: 90,
        completionRate: 100,
        interactionCount: 20,
        pauseCount: 0,
        contentPreferences: {
          preferredType: 'video',
          timeSpentPerType: { video: 600 },
        },
      });

      await progress.save();
      expect(progress.learningSessions).toHaveLength(2);
    });
  });

  describe('Quiz Attempts', () => {
    it('should store quiz attempt data', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        quizAttempts: [
          {
            quizId: new mongoose.Types.ObjectId(),
            score: 80,
            totalQuestions: 10,
            correctAnswers: 8,
            timeSpent: 300,
            attemptDate: new Date(),
            questionDetails: [
              {
                questionId: 'q1',
                correct: true,
                timeSpent: 30,
                selectedAnswer: 'A',
              },
            ],
          },
        ],
      });
      const saved = await progress.save();

      expect(saved.quizAttempts).toHaveLength(1);
      expect(saved.quizAttempts[0].score).toBe(80);
      expect(saved.quizAttempts[0].correctAnswers).toBe(8);
    });
  });

  describe('Adaptive Metrics', () => {
    it('should only accept valid recommendedPace values', async () => {
      const validPaces = ['slower', 'normal', 'faster'];

      for (const pace of validPaces) {
        const progress = new Progress({
          userId: new mongoose.Types.ObjectId(),
          courseId: courseId,
          adaptiveMetrics: {
            recommendedPace: pace,
          },
        });
        const saved = await progress.save();
        expect(saved.adaptiveMetrics.recommendedPace).toBe(pace);
      }
    });

    it('should store strong and improvement areas', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        adaptiveMetrics: {
          strongAreas: ['problem-solving', 'creativity'],
          improvementAreas: ['time-management'],
          currentDifficultyLevel: 7,
        },
      });
      const saved = await progress.save();

      expect(saved.adaptiveMetrics.strongAreas).toContain('problem-solving');
      expect(saved.adaptiveMetrics.improvementAreas).toContain('time-management');
      expect(saved.adaptiveMetrics.currentDifficultyLevel).toBe(7);
    });
  });

  describe('Streak Data', () => {
    it('should track streak data', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        streakData: {
          currentStreak: 7,
          longestStreak: 10,
          lastStudyDate: new Date(),
        },
      });
      const saved = await progress.save();

      expect(saved.streakData.currentStreak).toBe(7);
      expect(saved.streakData.longestStreak).toBe(10);
    });
  });

  describe('Time Tracking', () => {
    it('should track time spent', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
        timeSpent: 120, // 120 minutes
      });
      const saved = await progress.save();

      expect(saved.timeSpent).toBe(120);
    });

    it('should update lastAccessedAt', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
      });
      await progress.save();
      const initialAccess = progress.lastAccessedAt;

      // Wait and update
      await new Promise(resolve => setTimeout(resolve, 100));
      progress.lastAccessedAt = new Date();
      await progress.save();

      expect(progress.lastAccessedAt.getTime()).toBeGreaterThan(initialAccess.getTime());
    });
  });

  describe('Enrolled At', () => {
    it('should have enrolledAt date', async () => {
      const progress = new Progress({
        userId: userId,
        courseId: courseId,
      });
      const saved = await progress.save();

      expect(saved.enrolledAt).toBeDefined();
      expect(saved.enrolledAt).toBeInstanceOf(Date);
    });
  });
});
