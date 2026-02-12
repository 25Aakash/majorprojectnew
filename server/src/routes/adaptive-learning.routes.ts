import { Router, Response } from 'express';
import { LearningSession, AdaptiveProfile } from '../models/LearningSession.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import axios from 'axios';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Helper to determine time of day
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Helper to check if user is in onboarding period (first 7 days)
 */
async function isOnboardingPeriod(userId: string): Promise<boolean> {
  const profile = await AdaptiveProfile.findOne({ userId });
  if (!profile) return true;
  
  const daysSinceStart = Math.floor(
    (Date.now() - profile.onboardingStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceStart < 7;
}

// ==================== LEARNING SESSION ENDPOINTS ====================

/**
 * Start a new learning session
 */
router.post('/session/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId, deviceType } = req.body;
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if in onboarding period
    const onboarding = await isOnboardingPeriod(userId.toString());

    const session = new LearningSession({
      userId,
      courseId,
      lessonId,
      startTime: new Date(),
      timeOfDay: getTimeOfDay(),
      dayOfWeek: new Date().getDay(),
      deviceType: deviceType || 'desktop',
      isOnboardingPeriod: onboarding,
      behavioralMetrics: {
        frustrationScore: 50,
        engagementScore: 50,
        confidenceScore: 50,
      },
    });

    await session.save();

    res.json({
      sessionId: session._id,
      isOnboardingPeriod: onboarding,
      message: onboarding 
        ? 'Learning session started. We are learning how you learn best!'
        : 'Learning session started.',
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ message: 'Error starting learning session' });
  }
});

/**
 * Update session with behavioral data (called periodically during lesson)
 */
router.put('/session/:sessionId/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const {
      behavioralMetrics,
      contentInteraction,
      quizPerformance,
      breakTaken,
      adaptationApplied,
    } = req.body;

    const session = await LearningSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update behavioral metrics
    if (behavioralMetrics) {
      Object.assign(session.behavioralMetrics, behavioralMetrics);
    }

    // Add content interaction
    if (contentInteraction) {
      session.contentInteractions.push(contentInteraction);
    }

    // Add quiz performance
    if (quizPerformance) {
      session.quizPerformance.push(quizPerformance);
    }

    // Add break
    if (breakTaken) {
      session.breaksTaken.push({
        timestamp: new Date(),
        ...breakTaken,
      });
    }

    // Add adaptation
    if (adaptationApplied) {
      session.adaptationsApplied.push({
        timestamp: new Date(),
        ...adaptationApplied,
      });
    }

    // Update active duration
    session.activeDuration = Math.floor(
      (Date.now() - session.startTime.getTime()) / 1000
    );

    await session.save();

    // Get real-time adaptations from AI service (for ALL users, not just onboarding)
    let adaptations = null;
    try {
      const profile = await AdaptiveProfile.findOne({ userId: session.userId });
      const response = await axios.post(`${AI_SERVICE_URL}/api/adaptive/real-time`, {
        currentSession: session.toObject(),
        profile: profile?.toObject() || {},
        conditions: req.user?.neurodiverseProfile?.conditions || [],
      });
      adaptations = response.data;
    } catch (aiError) {
      // AI service unavailable - continue without adaptations
      console.debug('AI service unavailable for real-time adaptations');
    }

    res.json({ 
      message: 'Session updated',
      ...(adaptations && { adaptations })
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Error updating session' });
  }
});

/**
 * End a learning session
 */
router.post('/session/:sessionId/end', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { lessonCompleted, overallPerformance, focusScore, finalMetrics } = req.body;

    const session = await LearningSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.endTime = new Date();
    session.totalDuration = Math.floor(
      (session.endTime.getTime() - session.startTime.getTime()) / 1000
    );
    session.lessonCompleted = lessonCompleted || false;
    session.overallPerformance = overallPerformance || 0;
    session.focusScore = focusScore || 0;

    if (finalMetrics) {
      Object.assign(session.behavioralMetrics, finalMetrics);
    }

    await session.save();

    // Always trigger profile update (continuous learning, not just onboarding)
    await updateAdaptiveProfile(session.userId.toString(), req.user?.neurodiverseProfile?.conditions || []);

    res.json({
      message: 'Session ended',
      duration: session.totalDuration,
      isOnboardingPeriod: session.isOnboardingPeriod,
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ message: 'Error ending session' });
  }
});

// ==================== ADAPTIVE PROFILE ENDPOINTS ====================

/**
 * Get user's adaptive profile
 */
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    let profile = await AdaptiveProfile.findOne({ userId });

    // Create default profile if none exists
    if (!profile) {
      profile = new AdaptiveProfile({
        userId,
        onboardingStartDate: new Date(),
        discoveredPreferences: {
          preferredContentTypes: [],
          optimalTimeSlots: [],
        },
        insights: [],
      });
      await profile.save();
    }

    // Calculate days in onboarding and session count
    const daysInOnboarding = Math.floor(
      (Date.now() - profile.onboardingStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Get session count
    const sessionCount = await LearningSession.countDocuments({
      userId,
    });
    
    // Get average session duration
    const sessions = await LearningSession.find({ userId }).select('totalDuration');
    const avgSessionDuration = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / sessions.length / 60)
      : 25;

    // Transform insights to array of strings
    const insightsDiscovered = (profile.insights || []).map(i => i.insight);
    
    // Get top content preference
    const topContentType = profile.discoveredPreferences?.preferredContentTypes?.[0];
    const topTimeSlot = profile.discoveredPreferences?.optimalTimeSlots?.[0];
    
    // Format response to match frontend expectations
    const formattedProfile = {
      isOnboardingComplete: profile.onboardingComplete || daysInOnboarding >= 7,
      onboardingProgress: {
        daysCompleted: Math.min(daysInOnboarding, 7),
        totalDays: 7,
        sessionsCompleted: sessionCount,
        insightsDiscovered: insightsDiscovered,
      },
      discoveredPreferences: {
        contentPreferences: {
          preferredFormats: (profile.discoveredPreferences?.preferredContentTypes || []).map(pt => ({
            format: pt.type,
            score: pt.effectivenessScore,
          })),
          readingSpeed: profile.discoveredPreferences?.idealDifficultyProgression || 'moderate',
          attentionSpan: profile.attentionProfile?.averageFocusDuration 
            ? (profile.attentionProfile.averageFocusDuration < 600 ? 'short' : 
               profile.attentionProfile.averageFocusDuration < 1200 ? 'medium' : 'long')
            : 'medium',
          visualVsText: profile.discoveredPreferences?.visualComplexityTolerance === 'high' ? 75 : 
                        profile.discoveredPreferences?.visualComplexityTolerance === 'low' ? 25 : 50,
          detailLevel: profile.discoveredPreferences?.needsMoreExamples ? 'detailed' : 'concise',
        },
        learningPatterns: {
          bestTimeOfDay: topTimeSlot?.timeOfDay || 'morning',
          optimalSessionDuration: profile.discoveredPreferences?.optimalSessionDuration || avgSessionDuration,
          breakFrequency: `Every ${profile.discoveredPreferences?.optimalBreakFrequency || 25} min`,
          focusPatterns: (profile.discoveredPreferences?.optimalTimeSlots || []).map(slot => ({
            environment: slot.timeOfDay,
            score: slot.performanceScore,
          })),
        },
        engagementIndicators: {
          engagementLevel: profile.confidenceScores?.overallConfidence >= 70 ? 'high' :
                          profile.confidenceScores?.overallConfidence >= 40 ? 'medium' : 'low',
          motivationTriggers: [
            profile.discoveredPreferences?.respondsToGamification ? 'Gamification' : null,
            profile.discoveredPreferences?.needsFrequentFeedback ? 'Frequent Feedback' : null,
            profile.discoveredPreferences?.prefersGuidedLearning ? 'Guided Learning' : null,
          ].filter(Boolean),
          stressIndicators: [
            profile.emotionalThresholds?.frustrationTriggerPoint < 50 ? 'Low frustration tolerance' : null,
            profile.attentionProfile?.distractionSensitivity === 'high' ? 'High distraction sensitivity' : null,
          ].filter(Boolean),
          copingStrategies: [
            'Take regular breaks',
            profile.discoveredPreferences?.needsFrequentFeedback ? 'Request frequent feedback' : null,
          ].filter(Boolean),
        },
        accessibilityNeeds: {
          preferredContrast: profile.discoveredPreferences?.visualComplexityTolerance === 'low' ? 'high' : 'normal',
          fontSizePreference: 'medium',
          animationSensitivity: profile.discoveredPreferences?.animationTolerance || 'moderate',
        },
      },
      confidenceScores: profile.confidenceScores || {
        overallConfidence: 0,
        contentPreferenceConfidence: 0,
        timingPreferenceConfidence: 0,
        attentionPatternConfidence: 0,
      },
    };

    res.json(formattedProfile);
  } catch (error) {
    console.error('Error fetching adaptive profile:', error);
    res.status(500).json({ message: 'Error fetching adaptive profile' });
  }
});

/**
 * Get onboarding progress and insights
 */
router.get('/onboarding-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const profile = await AdaptiveProfile.findOne({ userId });
    const sessionCount = await LearningSession.countDocuments({
      userId,
      isOnboardingPeriod: true,
    });

    if (!profile) {
      return res.json({
        isOnboarding: true,
        daysCompleted: 0,
        sessionsCompleted: 0,
        insightsDiscovered: 0,
        confidenceLevel: 0,
        message: "Let's start learning about how you learn best!",
      });
    }

    const daysInOnboarding = Math.floor(
      (Date.now() - profile.onboardingStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      isOnboarding: daysInOnboarding < 7,
      daysCompleted: Math.min(daysInOnboarding, 7),
      daysRemaining: Math.max(0, 7 - daysInOnboarding),
      sessionsCompleted: sessionCount,
      insightsDiscovered: profile.insights?.length || 0,
      confidenceLevel: profile.confidenceScores?.overallConfidence || 0,
      topInsights: profile.insights?.slice(0, 3) || [],
      discoveredPreferences: {
        bestContentType: profile.discoveredPreferences?.preferredContentTypes?.[0]?.type,
        bestTimeOfDay: profile.discoveredPreferences?.optimalTimeSlots?.[0]?.timeOfDay,
        optimalSessionLength: profile.discoveredPreferences?.optimalSessionDuration,
        needsFrequentBreaks: (profile.discoveredPreferences?.optimalBreakFrequency || 25) < 20,
      },
      message: getOnboardingMessage(daysInOnboarding, sessionCount),
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({ message: 'Error fetching onboarding status' });
  }
});

function getOnboardingMessage(days: number, sessions: number): string {
  if (days === 0 && sessions === 0) {
    return "Welcome! Complete a few lessons today and we'll start learning how you learn best.";
  } else if (sessions === 0) {
    return "Start your first learning session to begin building your personalized profile!";
  } else if (days < 3) {
    return `Day ${days + 1} of discovery! We're gathering insight about your learning style.`;
  } else if (days < 7) {
    return `We've discovered ${sessions > 5 ? 'a lot' : 'some patterns'} about your learning style. Keep going!`;
  } else {
    return "Your personalized learning profile is ready! We'll keep refining it as you learn.";
  }
}

/**
 * Get real-time learning recommendations
 */
router.post('/real-time-adapt', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { currentSessionData } = req.body;

    const profile = await AdaptiveProfile.findOne({ userId });
    const conditions = req.user?.neurodiverseProfile?.conditions || [];

    // Call AI service for real-time adaptations
    const response = await axios.post(`${AI_SERVICE_URL}/api/adaptive/real-time`, {
      currentSession: currentSessionData,
      profile: profile?.toObject() || {},
      conditions,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error getting real-time adaptations:', error);
    // Return safe defaults
    res.json({
      should_suggest_break: false,
      should_simplify_content: false,
      should_offer_alternative_format: false,
      calming_intervention_needed: false,
      messages: [],
    });
  }
});

/**
 * Force update adaptive profile (manual trigger)
 */
router.post('/profile/update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const conditions = req.user?.neurodiverseProfile?.conditions || [];

    await updateAdaptiveProfile(userId.toString(), conditions);

    const profile = await AdaptiveProfile.findOne({ userId });
    res.json({
      message: 'Profile updated',
      profile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

/**
 * Helper function to update adaptive profile based on session data
 */
async function updateAdaptiveProfile(userId: string, conditions: string[]): Promise<void> {
  try {
    // Get all recent sessions (continuous adaptation, not just onboarding)
    const sessions = await LearningSession.find({
      userId,
    }).sort({ startTime: -1 }).limit(100);

    if (sessions.length === 0) return;

    let newProfileData: any;
    let useBasicAnalysis = false;

    try {
      // Try to call AI service to analyze sessions and build profile
      const response = await axios.post(`${AI_SERVICE_URL}/api/adaptive/build-profile`, {
        sessions: sessions.map(s => s.toObject()),
        conditions,
      }, {
        timeout: 5000, // 5 second timeout
      });
      newProfileData = response.data;
    } catch (aiError) {
      console.warn('AI service unavailable, using basic analysis:', aiError instanceof Error ? aiError.message : 'Unknown error');
      useBasicAnalysis = true;
      // Generate basic profile from sessions without AI
      newProfileData = generateBasicProfile(sessions, conditions);
    }

    // Update or create profile
    await AdaptiveProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          discoveredPreferences: newProfileData.discovered_preferences,
          attentionProfile: newProfileData.attention_profile,
          emotionalThresholds: newProfileData.emotional_thresholds,
          confidenceScores: newProfileData.confidence_scores,
          totalSessionsAnalyzed: sessions.length,
        },
        $push: {
          insights: {
            $each: newProfileData.insights || [],
            $slice: -20, // Keep last 20 insights
          },
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating adaptive profile:', error);
  }
}

/**
 * Generate a basic profile when AI service is unavailable
 */
function generateBasicProfile(sessions: any[], conditions: string[]): any {
  const avgDuration = sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / sessions.length;
  const avgPerformance = sessions.reduce((sum, s) => sum + (s.overallPerformance || 0), 0) / sessions.length;
  
  // Analyze time of day performance
  const timePerformance: Record<string, number[]> = {};
  sessions.forEach(s => {
    if (!timePerformance[s.timeOfDay]) {
      timePerformance[s.timeOfDay] = [];
    }
    timePerformance[s.timeOfDay].push(s.overallPerformance || 50);
  });
  
  const bestTime = Object.entries(timePerformance)
    .map(([time, scores]) => ({ time, avgScore: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.avgScore - a.avgScore)[0];
  
  // Analyze content preferences
  const contentStats: Record<string, { total: number; engagement: number }> = {};
  sessions.forEach(s => {
    s.contentInteractions?.forEach((interaction: any) => {
      if (!contentStats[interaction.contentType]) {
        contentStats[interaction.contentType] = { total: 0, engagement: 0 };
      }
      contentStats[interaction.contentType].total++;
      const engagementValue = interaction.engagementLevel === 'high' ? 100 : 
                             interaction.engagementLevel === 'medium' ? 60 : 30;
      contentStats[interaction.contentType].engagement += engagementValue;
    });
  });
  
  const preferredContentTypes = Object.entries(contentStats)
    .map(([type, stats]) => ({
      type,
      effectivenessScore: stats.total > 0 ? Math.round(stats.engagement / stats.total) : 50
    }))
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore);
  
  // Generate insights
  const insights = [];
  
  if (sessions.length >= 3) {
    insights.push({
      insight: `You've completed ${sessions.length} learning sessions!`,
      confidence: Math.min(100, sessions.length * 10),
      discoveredOn: new Date(),
      basedOnSessions: sessions.length
    });
  }
  
  if (bestTime) {
    insights.push({
      insight: `You perform best during the ${bestTime.time} (${Math.round(bestTime.avgScore)}% avg performance)`,
      confidence: Math.min(80, sessions.length * 8),
      discoveredOn: new Date(),
      basedOnSessions: sessions.length
    });
  }
  
  if (preferredContentTypes.length > 0) {
    insights.push({
      insight: `${preferredContentTypes[0].type.charAt(0).toUpperCase() + preferredContentTypes[0].type.slice(1)} content keeps you most engaged`,
      confidence: Math.min(75, sessions.length * 7),
      discoveredOn: new Date(),
      basedOnSessions: sessions.length
    });
  }
  
  const sessionDurationMin = Math.round(avgDuration / 60);
  insights.push({
    insight: `Your average session length is ${sessionDurationMin} minutes`,
    confidence: Math.min(70, sessions.length * 6),
    discoveredOn: new Date(),
    basedOnSessions: sessions.length
  });
  
  // Add condition-specific insights
  if (conditions.includes('ADHD') && sessionDurationMin < 20) {
    insights.push({
      insight: 'Shorter, focused sessions work well for you',
      confidence: 65,
      discoveredOn: new Date(),
      basedOnSessions: sessions.length
    });
  }
  
  return {
    discovered_preferences: {
      optimalSessionDuration: sessionDurationMin || 25,
      optimalBreakFrequency: sessionDurationMin || 25,
      preferredContentTypes: preferredContentTypes.slice(0, 3),
      optimalTimeSlots: bestTime ? [{
        timeOfDay: bestTime.time,
        performanceScore: Math.round(bestTime.avgScore)
      }] : [],
      idealDifficultyProgression: avgPerformance > 75 ? 'fast' : avgPerformance > 50 ? 'moderate' : 'slow',
    },
    attention_profile: {
      averageFocusDuration: avgDuration || 900,
      distractionSensitivity: 'medium'
    },
    emotional_thresholds: {
      frustrationTriggerPoint: 70,
      disengagementTriggerPoint: 30,
      optimalChallengeLevel: 60
    },
    confidence_scores: {
      overallConfidence: Math.min(100, sessions.length * 12),
      contentPreferenceConfidence: Math.min(100, sessions.length * 10),
      timingPreferenceConfidence: Math.min(100, sessions.length * 8),
      attentionPatternConfidence: Math.min(100, sessions.length * 15)
    },
    insights
  };
}

/**
 * Get learning session history
 */
router.get('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { limit = 10, onboardingOnly } = req.query;

    const query: Record<string, unknown> = { userId };
    if (onboardingOnly === 'true') {
      query.isOnboardingPeriod = true;
    }

    const sessions = await LearningSession.find(query)
      .sort({ startTime: -1 })
      .limit(Number(limit))
      .populate('courseId', 'title')
      .populate('lessonId', 'title');

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

/**
 * Get daily learning patterns
 */
router.get('/patterns/daily', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const sessions = await LearningSession.find({ userId });

    // Aggregate by time of day
    const timePatterns: Record<string, { count: number; avgPerformance: number; totalDuration: number }> = {
      morning: { count: 0, avgPerformance: 0, totalDuration: 0 },
      afternoon: { count: 0, avgPerformance: 0, totalDuration: 0 },
      evening: { count: 0, avgPerformance: 0, totalDuration: 0 },
      night: { count: 0, avgPerformance: 0, totalDuration: 0 },
    };

    sessions.forEach(session => {
      const time = session.timeOfDay;
      if (timePatterns[time]) {
        timePatterns[time].count++;
        timePatterns[time].avgPerformance += session.overallPerformance;
        timePatterns[time].totalDuration += session.totalDuration;
      }
    });

    // Calculate averages
    Object.keys(timePatterns).forEach(time => {
      if (timePatterns[time].count > 0) {
        timePatterns[time].avgPerformance /= timePatterns[time].count;
      }
    });

    res.json({
      patterns: timePatterns,
      bestTime: Object.entries(timePatterns)
        .filter(([, v]) => v.count > 0)
        .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance)[0]?.[0] || 'afternoon',
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ message: 'Error fetching patterns' });
  }
});

export default router;
