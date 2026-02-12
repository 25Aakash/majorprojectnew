import { Router, Response } from 'express';
import { SpacedRepetition } from '../models/SpacedRepetition.model';
import { User } from '../models/User.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import axios from 'axios';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Get spaced repetition state for a course
 */
router.get('/course/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    let sr = await SpacedRepetition.findOne({ userId, courseId: req.params.courseId });

    if (!sr) {
      return res.json({
        concepts: [],
        overallMastery: 0,
        totalConcepts: 0,
        masteredConcepts: 0,
        conceptsDueForReview: 0,
      });
    }

    res.json(sr);
  } catch (error) {
    console.error('Error fetching spaced repetition:', error);
    res.status(500).json({ message: 'Error fetching spaced repetition data' });
  }
});

/**
 * Initialize concepts for a course (called when student enrolls or lesson defines concepts)
 */
router.post('/initialize', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { courseId, concepts } = req.body;
    // concepts: [{ conceptId, conceptName, lessonId }]

    if (!courseId || !concepts || !concepts.length) {
      return res.status(400).json({ message: 'courseId and concepts array required' });
    }

    // Get condition-specific BKT params from AI service
    const conditions = req.user?.neurodiverseProfile?.conditions || [];
    let bktParams = { p_init: 0.1, p_transit: 0.15, p_guess: 0.25, p_slip: 0.10 };
    try {
      const aiRes = await axios.post(`${AI_SERVICE_URL}/api/ai/knowledge-trace/params`, { conditions });
      if (aiRes.data.success) bktParams = aiRes.data.params;
    } catch { /* use defaults */ }

    let sr = await SpacedRepetition.findOne({ userId, courseId });
    if (!sr) {
      sr = new SpacedRepetition({ userId, courseId, concepts: [] });
    }

    // Add only new concepts (don't reset existing ones)
    const existingIds = new Set(sr.concepts.map(c => c.conceptId));
    for (const concept of concepts) {
      if (!existingIds.has(concept.conceptId)) {
        sr.concepts.push({
          conceptId: concept.conceptId,
          conceptName: concept.conceptName,
          courseId,
          lessonId: concept.lessonId,
          pInit: bktParams.p_init,
          pTransit: bktParams.p_transit,
          pGuess: bktParams.p_guess,
          pSlip: bktParams.p_slip,
          pMastery: bktParams.p_init,
          attempts: 0,
          correctAttempts: 0,
          responseTimes: [],
          leitnerBox: 1,
          reviewCount: 0,
          isMastered: false,
        });
      }
    }

    sr.totalConcepts = sr.concepts.length;
    await sr.save();

    res.json({ message: 'Concepts initialized', totalConcepts: sr.totalConcepts });
  } catch (error) {
    console.error('Error initializing concepts:', error);
    res.status(500).json({ message: 'Error initializing concepts' });
  }
});

/**
 * Record a concept attempt (answer) and update BKT mastery
 */
router.post('/attempt', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { courseId, conceptId, isCorrect, responseTime } = req.body;

    const sr = await SpacedRepetition.findOne({ userId, courseId });
    if (!sr) {
      return res.status(404).json({ message: 'No spaced repetition record found. Initialize first.' });
    }

    const concept = sr.concepts.find(c => c.conceptId === conceptId);
    if (!concept) {
      return res.status(404).json({ message: 'Concept not found' });
    }

    // Call AI service for BKT update
    try {
      const aiRes = await axios.post(`${AI_SERVICE_URL}/api/ai/knowledge-trace/update`, {
        concept: {
          concept_id: concept.conceptId,
          concept_name: concept.conceptName,
          course_id: courseId,
          lesson_id: concept.lessonId,
          p_init: concept.pInit,
          p_transit: concept.pTransit,
          p_guess: concept.pGuess,
          p_slip: concept.pSlip,
          p_mastery: concept.pMastery,
          attempts: concept.attempts,
          correct_attempts: concept.correctAttempts,
          last_attempt: concept.lastAttempt?.toISOString(),
          response_times: concept.responseTimes,
          leitner_box: concept.leitnerBox,
          next_review: concept.nextReview?.toISOString(),
          review_count: concept.reviewCount,
          is_mastered: concept.isMastered,
        },
        is_correct: isCorrect,
        response_time: responseTime || 0,
      });

      if (aiRes.data.success) {
        const updated = aiRes.data.concept;
        concept.pMastery = updated.p_mastery;
        concept.attempts = updated.attempts;
        concept.correctAttempts = updated.correct_attempts;
        concept.lastAttempt = new Date();
        if (responseTime) concept.responseTimes.push(responseTime);
        concept.leitnerBox = updated.leitner_box;
        concept.nextReview = updated.next_review ? new Date(updated.next_review) : undefined;
        concept.reviewCount = updated.review_count;
        concept.isMastered = updated.is_mastered;
      }
    } catch {
      // Fallback: simple local update
      concept.attempts += 1;
      if (isCorrect) concept.correctAttempts += 1;
      concept.lastAttempt = new Date();
      if (responseTime) concept.responseTimes.push(responseTime);
      // Simple mastery update
      const acc = concept.correctAttempts / concept.attempts;
      concept.pMastery = Math.min(1, concept.pMastery + (isCorrect ? 0.1 : -0.05));
      concept.isMastered = concept.pMastery >= 0.80;
      concept.leitnerBox = isCorrect ? Math.min(5, concept.leitnerBox + 1) : 1;
      const intervals: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
      concept.nextReview = new Date(Date.now() + (intervals[concept.leitnerBox] || 1) * 86400000);
    }

    // Recalculate aggregates
    sr.masteredConcepts = sr.concepts.filter(c => c.isMastered).length;
    sr.overallMastery = sr.concepts.length > 0
      ? sr.concepts.reduce((sum, c) => sum + c.pMastery, 0) / sr.concepts.length
      : 0;

    const now = new Date();
    sr.conceptsDueForReview = sr.concepts.filter(c =>
      c.nextReview && new Date(c.nextReview) <= now && !c.isMastered
    ).length;

    await sr.save();

    // Award XP for review activity
    const xpEarned = isCorrect ? 15 : 5;
    await User.findByIdAndUpdate(userId, { $inc: { 'rewards.points': xpEarned } });

    res.json({
      concept: {
        conceptId: concept.conceptId,
        pMastery: concept.pMastery,
        isMastered: concept.isMastered,
        leitnerBox: concept.leitnerBox,
        nextReview: concept.nextReview,
        attempts: concept.attempts,
      },
      overallMastery: sr.overallMastery,
      masteredConcepts: sr.masteredConcepts,
      xpEarned,
    });
  } catch (error) {
    console.error('Error recording attempt:', error);
    res.status(500).json({ message: 'Error recording attempt' });
  }
});

/**
 * Get concepts due for review (spaced repetition queue)
 */
router.get('/due/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const sr = await SpacedRepetition.findOne({ userId, courseId: req.params.courseId });

    if (!sr) {
      return res.json({ dueConcepts: [], count: 0 });
    }

    // Call AI service to prioritize
    try {
      const aiRes = await axios.post(`${AI_SERVICE_URL}/api/ai/knowledge-trace/due`, {
        concept_states: sr.concepts.map(c => ({
          concept_id: c.conceptId,
          concept_name: c.conceptName,
          p_mastery: c.pMastery,
          leitner_box: c.leitnerBox,
          next_review: c.nextReview?.toISOString(),
          is_mastered: c.isMastered,
          attempts: c.attempts,
        })),
      });

      if (aiRes.data.success) {
        return res.json({
          dueConcepts: aiRes.data.due_concepts,
          count: aiRes.data.due_concepts.length,
        });
      }
    } catch { /* fallback below */ }

    // Fallback: local due calculation
    const now = new Date();
    const due = sr.concepts
      .filter(c => !c.isMastered && c.nextReview && new Date(c.nextReview) <= now)
      .sort((a, b) => a.pMastery - b.pMastery);

    res.json({
      dueConcepts: due.map(c => ({
        concept_id: c.conceptId,
        concept_name: c.conceptName,
        p_mastery: c.pMastery,
        leitner_box: c.leitnerBox,
        next_review: c.nextReview,
      })),
      count: due.length,
    });
  } catch (error) {
    console.error('Error fetching due concepts:', error);
    res.status(500).json({ message: 'Error fetching due concepts' });
  }
});

/**
 * Get aggregate mastery summary across ALL courses
 */
router.get('/summary/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const records = await SpacedRepetition.find({ userId });

    if (!records.length) {
      return res.json({
        total_concepts: 0,
        mastered: 0,
        learning: 0,
        reviewDue: 0,
        notStarted: 0,
        overall_mastery: 0,
      });
    }

    let mastered = 0;
    let learning = 0;
    let reviewDue = 0;
    let notStarted = 0;
    const now = new Date();

    for (const sr of records) {
      for (const c of sr.concepts) {
        if (c.isMastered || c.pMastery >= 0.8) {
          mastered++;
        } else if (c.nextReview && c.nextReview <= now) {
          reviewDue++;
        } else if (c.pMastery > 0.15) {
          learning++;
        } else {
          notStarted++;
        }
      }
    }

    const total = mastered + learning + reviewDue + notStarted;
    res.json({
      total_concepts: total,
      mastered,
      learning,
      reviewDue,
      notStarted,
      overall_mastery: total > 0 ? Math.round((mastered / total) * 100) / 100 : 0,
    });
  } catch (error) {
    console.error('Error fetching aggregate summary:', error);
    res.status(500).json({ message: 'Error fetching aggregate summary' });
  }
});

/**
 * Get mastery summary with prediction of time to mastery
 */
router.get('/summary/:courseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const sr = await SpacedRepetition.findOne({ userId, courseId: req.params.courseId });

    if (!sr) {
      return res.json({ total_concepts: 0, mastered: 0, overall_mastery: 0 });
    }

    try {
      const aiRes = await axios.post(`${AI_SERVICE_URL}/api/ai/knowledge-trace/summary`, {
        concept_states: sr.concepts.map(c => ({
          concept_id: c.conceptId,
          concept_name: c.conceptName,
          p_mastery: c.pMastery,
          leitner_box: c.leitnerBox,
          next_review: c.nextReview?.toISOString(),
          is_mastered: c.isMastered,
          p_transit: c.pTransit,
          p_guess: c.pGuess,
          p_slip: c.pSlip,
        })),
      });

      if (aiRes.data.success) {
        return res.json({
          ...aiRes.data.summary,
          preAssessmentScore: sr.preAssessmentScore,
          postAssessmentScore: sr.postAssessmentScore,
          normalizedGain: sr.normalizedGain,
        });
      }
    } catch { /* fallback */ }

    res.json({
      total_concepts: sr.totalConcepts,
      mastered: sr.masteredConcepts,
      overall_mastery: sr.overallMastery,
      preAssessmentScore: sr.preAssessmentScore,
      postAssessmentScore: sr.postAssessmentScore,
      normalizedGain: sr.normalizedGain,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

/**
 * Save pre-assessment or post-assessment score
 */
router.post('/assessment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { courseId, type, score } = req.body;
    // type: 'pre' or 'post'

    let sr = await SpacedRepetition.findOne({ userId, courseId });
    if (!sr) {
      sr = new SpacedRepetition({ userId, courseId, concepts: [] });
    }

    if (type === 'pre') {
      sr.preAssessmentScore = score;
    } else if (type === 'post') {
      sr.postAssessmentScore = score;
      // Calculate normalized learning gain
      if (sr.preAssessmentScore != null && sr.preAssessmentScore < 100) {
        sr.normalizedGain = Math.round(
          ((score - sr.preAssessmentScore) / (100 - sr.preAssessmentScore)) * 100
        ) / 100;
      }
    }

    await sr.save();

    res.json({
      preAssessmentScore: sr.preAssessmentScore,
      postAssessmentScore: sr.postAssessmentScore,
      normalizedGain: sr.normalizedGain,
      message: `${type}-assessment score saved`,
    });
  } catch (error) {
    console.error('Error saving assessment:', error);
    res.status(500).json({ message: 'Error saving assessment' });
  }
});

export default router;
