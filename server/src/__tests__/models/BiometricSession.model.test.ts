import mongoose from 'mongoose';
import { Request, Response } from 'express';
import BiometricSession from '../../models/BiometricSession.model';

// We need to test the /biometric/persist route logic.
// Since the route is integrated into biometric.routes.ts, we test via the model + direct handler logic.

describe('Biometric Persist (Gap 3)', () => {
  describe('BiometricSession Model', () => {
    it('should create a biometric session with scores', async () => {
      const session = new BiometricSession({
        userId: new mongoose.Types.ObjectId(),
        lessonId: 'lesson123',
        courseId: 'course123',
        learningSessionId: new mongoose.Types.ObjectId(),
        startTime: new Date(),
        permissions: { microphone: true, camera: false },
        voiceMetrics: {
          samples: [],
          averagePace: 120,
          averagePitch: 200,
          confidenceScore: 0.8,
        },
        eyeTrackingMetrics: {
          calibrationQuality: 0,
          fixations: [],
          saccades: [],
          gazeHeatmap: [],
          readingPatterns: {
            lineRegressions: 0,
            wordSkips: 0,
            averageFixationDuration: 0,
            readingSpeed: 0,
          },
        },
        mouseMetrics: {
          movementPattern: [],
          clickEvents: [],
          scrollBehavior: {
            totalDistance: 500,
            averageSpeed: 30,
            pauseCount: 5,
            reversals: 2,
          },
          hoverEvents: [],
        },
        scores: {
          attentionScore: 0.8,
          engagementScore: 0.7,
          stressLevel: 0.3,
          confidenceLevel: 0.75,
          frustrationLevel: 0.2,
          focusQuality: 0.85,
        },
      });

      const saved = await session.save();
      expect(saved._id).toBeDefined();
      expect(saved.scores.attentionScore).toBe(0.8);
      expect(saved.scores.frustrationLevel).toBe(0.2);
    });

    it('should find session by userId and lessonId', async () => {
      const userId = new mongoose.Types.ObjectId();
      const session = new BiometricSession({
        userId,
        lessonId: 'lesson_abc',
        courseId: 'course_abc',
        learningSessionId: new mongoose.Types.ObjectId(),
        startTime: new Date(),
        permissions: { microphone: false, camera: false },
        voiceMetrics: { samples: [], averagePace: 0, averagePitch: 0, confidenceScore: 0 },
        eyeTrackingMetrics: {
          calibrationQuality: 0,
          fixations: [],
          saccades: [],
          gazeHeatmap: [],
          readingPatterns: { lineRegressions: 0, wordSkips: 0, averageFixationDuration: 0, readingSpeed: 0 },
        },
        mouseMetrics: {
          movementPattern: [],
          clickEvents: [],
          scrollBehavior: { totalDistance: 0, averageSpeed: 0, pauseCount: 0, reversals: 0 },
          hoverEvents: [],
        },
      });
      await session.save();

      const found = await BiometricSession.findOne({ userId, lessonId: 'lesson_abc' });
      expect(found).not.toBeNull();
      expect(found!.lessonId).toBe('lesson_abc');
    });

    it('should update scores on an existing session', async () => {
      const userId = new mongoose.Types.ObjectId();
      const session = new BiometricSession({
        userId,
        lessonId: 'lesson_xyz',
        courseId: 'course_xyz',
        learningSessionId: new mongoose.Types.ObjectId(),
        startTime: new Date(),
        permissions: { microphone: true, camera: true },
        voiceMetrics: { samples: [], averagePace: 0, averagePitch: 0, confidenceScore: 0 },
        eyeTrackingMetrics: {
          calibrationQuality: 0,
          fixations: [],
          saccades: [],
          gazeHeatmap: [],
          readingPatterns: { lineRegressions: 0, wordSkips: 0, averageFixationDuration: 0, readingSpeed: 0 },
        },
        mouseMetrics: {
          movementPattern: [],
          clickEvents: [],
          scrollBehavior: { totalDistance: 0, averageSpeed: 0, pauseCount: 0, reversals: 0 },
          hoverEvents: [],
        },
      });
      await session.save();

      // Simulate the persist route updating scores
      session.scores = {
        attentionScore: 0.9,
        engagementScore: 0.85,
        stressLevel: 0.1,
        confidenceLevel: 0.95,
        frustrationLevel: 0.05,
        focusQuality: 0.92,
      };
      await session.save();

      const updated = await BiometricSession.findById(session._id);
      expect(updated!.scores.attentionScore).toBe(0.9);
      expect(updated!.scores.engagementScore).toBe(0.85);
      expect(updated!.scores.focusQuality).toBe(0.92);
    });

    it('should allow session without endTime (active session)', async () => {
      const session = new BiometricSession({
        userId: new mongoose.Types.ObjectId(),
        lessonId: 'active_lesson',
        courseId: 'course_active',
        learningSessionId: new mongoose.Types.ObjectId(),
        startTime: new Date(),
        permissions: { microphone: false, camera: false },
        voiceMetrics: { samples: [], averagePace: 0, averagePitch: 0, confidenceScore: 0 },
        eyeTrackingMetrics: {
          calibrationQuality: 0,
          fixations: [],
          saccades: [],
          gazeHeatmap: [],
          readingPatterns: { lineRegressions: 0, wordSkips: 0, averageFixationDuration: 0, readingSpeed: 0 },
        },
        mouseMetrics: {
          movementPattern: [],
          clickEvents: [],
          scrollBehavior: { totalDistance: 0, averageSpeed: 0, pauseCount: 0, reversals: 0 },
          hoverEvents: [],
        },
      });
      const saved = await session.save();
      expect(saved.endTime).toBeUndefined();
    });

    it('should find active sessions (no endTime)', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Active session
      await new BiometricSession({
        userId,
        lessonId: 'lesson1',
        courseId: 'course1',
        learningSessionId: new mongoose.Types.ObjectId(),
        startTime: new Date(),
        permissions: { microphone: false, camera: false },
        voiceMetrics: { samples: [], averagePace: 0, averagePitch: 0, confidenceScore: 0 },
        eyeTrackingMetrics: {
          calibrationQuality: 0, fixations: [], saccades: [], gazeHeatmap: [],
          readingPatterns: { lineRegressions: 0, wordSkips: 0, averageFixationDuration: 0, readingSpeed: 0 },
        },
        mouseMetrics: {
          movementPattern: [], clickEvents: [],
          scrollBehavior: { totalDistance: 0, averageSpeed: 0, pauseCount: 0, reversals: 0 },
          hoverEvents: [],
        },
      }).save();

      // Ended session
      await new BiometricSession({
        userId,
        lessonId: 'lesson2',
        courseId: 'course2',
        learningSessionId: new mongoose.Types.ObjectId(),
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        permissions: { microphone: false, camera: false },
        voiceMetrics: { samples: [], averagePace: 0, averagePitch: 0, confidenceScore: 0 },
        eyeTrackingMetrics: {
          calibrationQuality: 0, fixations: [], saccades: [], gazeHeatmap: [],
          readingPatterns: { lineRegressions: 0, wordSkips: 0, averageFixationDuration: 0, readingSpeed: 0 },
        },
        mouseMetrics: {
          movementPattern: [], clickEvents: [],
          scrollBehavior: { totalDistance: 0, averageSpeed: 0, pauseCount: 0, reversals: 0 },
          hoverEvents: [],
        },
      }).save();

      const activeSessions = await BiometricSession.find({ userId, endTime: null });
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].lessonId).toBe('lesson1');
    });
  });
});
