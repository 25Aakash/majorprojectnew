import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import BiometricSession from '../models/BiometricSession.model'

const router = Router()

// Create a new biometric session
router.post('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId

    const session = new BiometricSession({
      userId,
      lessonId: req.body.lessonId,
      startTime: new Date(),
      permissions: req.body.permissions,
      deviceInfo: req.body.deviceInfo,
      voiceMetrics: {
        samples: [],
        averagePace: 0,
        averagePitch: 0,
        confidenceScore: 0,
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
          totalDistance: 0,
          averageSpeed: 0,
          pauseCount: 0,
          reversals: 0,
        },
        hoverEvents: [],
      },
    })

    await session.save()
    res.status(201).json({ sessionId: session._id, message: 'Biometric session created' })
  } catch (error) {
    console.error('Error creating biometric session:', error)
    res.status(500).json({ error: 'Failed to create biometric session' })
  }
})

// Update biometric session with voice metrics
router.patch('/sessions/:sessionId/voice', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { voiceMetrics } = req.body

    const session = await BiometricSession.findByIdAndUpdate(
      sessionId,
      {
        $push: { 'voiceMetrics.samples': voiceMetrics.sample },
        $set: {
          'voiceMetrics.averagePace': voiceMetrics.averagePace,
          'voiceMetrics.averagePitch': voiceMetrics.averagePitch,
          'voiceMetrics.confidenceScore': voiceMetrics.confidenceScore,
        }
      },
      { new: true }
    )

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ message: 'Voice metrics updated', session })
  } catch (error) {
    console.error('Error updating voice metrics:', error)
    res.status(500).json({ error: 'Failed to update voice metrics' })
  }
})

// Update biometric session with eye tracking metrics
router.patch('/sessions/:sessionId/eye-tracking', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { eyeTrackingMetrics } = req.body

    const session = await BiometricSession.findByIdAndUpdate(
      sessionId,
      {
        $set: { eyeTrackingMetrics },
      },
      { new: true }
    )

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ message: 'Eye tracking metrics updated', session })
  } catch (error) {
    console.error('Error updating eye tracking metrics:', error)
    res.status(500).json({ error: 'Failed to update eye tracking metrics' })
  }
})

// Update biometric session with mouse metrics
router.patch('/sessions/:sessionId/mouse', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { mouseMetrics } = req.body

    const session = await BiometricSession.findByIdAndUpdate(
      sessionId,
      {
        $set: { mouseMetrics },
      },
      { new: true }
    )

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ message: 'Mouse metrics updated', session })
  } catch (error) {
    console.error('Error updating mouse metrics:', error)
    res.status(500).json({ error: 'Failed to update mouse metrics' })
  }
})

// End biometric session with analysis results
router.patch('/sessions/:sessionId/end', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { analysisResults, adaptiveRecommendations } = req.body

    const session = await BiometricSession.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          endTime: new Date(),
          analysisResults,
          adaptiveRecommendations,
        }
      },
      { new: true }
    )

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ message: 'Biometric session ended', session })
  } catch (error) {
    console.error('Error ending biometric session:', error)
    res.status(500).json({ error: 'Failed to end biometric session' })
  }
})

// Get user's biometric sessions
router.get('/sessions/user/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { limit = 10, lessonId } = req.query

    const query: any = { userId }
    if (lessonId) {
      query.lessonId = lessonId
    }

    const sessions = await BiometricSession.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select('-voiceMetrics.samples -mouseMetrics.movementPattern')

    res.json(sessions)
  } catch (error) {
    console.error('Error fetching biometric sessions:', error)
    res.status(500).json({ error: 'Failed to fetch biometric sessions' })
  }
})

// Get biometric profile summary for a user
router.get('/profile/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // Get last 20 sessions for profile building
    const sessions = await BiometricSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)

    if (sessions.length === 0) {
      return res.json({
        userId,
        sessionsAnalyzed: 0,
        overallPatterns: null,
        message: 'No biometric data available yet',
      })
    }

    // Calculate aggregate profile
    const profile = {
      userId,
      sessionsAnalyzed: sessions.length,
      averageSessionDuration: calculateAverageSessionDuration(sessions),
      voicePatterns: aggregateVoicePatterns(sessions),
      eyeTrackingPatterns: aggregateEyeTrackingPatterns(sessions),
      mousePatterns: aggregateMousePatterns(sessions),
      learningIndicators: calculateLearningIndicators(sessions),
      adaptiveRecommendations: generateProfileRecommendations(sessions),
    }

    res.json(profile)
  } catch (error) {
    console.error('Error building biometric profile:', error)
    res.status(500).json({ error: 'Failed to build biometric profile' })
  }
})

// Helper functions for profile building
function calculateAverageSessionDuration(sessions: any[]): number {
  const completedSessions = sessions.filter(s => s.endTime)
  if (completedSessions.length === 0) return 0

  const totalDuration = completedSessions.reduce((sum, s) => {
    return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime())
  }, 0)

  return totalDuration / completedSessions.length / 1000 / 60 // in minutes
}

function aggregateVoicePatterns(sessions: any[]): any {
  const voiceSessions = sessions.filter(s => s.voiceMetrics?.confidenceScore > 0)
  if (voiceSessions.length === 0) return null

  return {
    averagePace: voiceSessions.reduce((sum, s) => sum + s.voiceMetrics.averagePace, 0) / voiceSessions.length,
    averageConfidence: voiceSessions.reduce((sum, s) => sum + s.voiceMetrics.confidenceScore, 0) / voiceSessions.length,
    sessionsWithVoice: voiceSessions.length,
  }
}

function aggregateEyeTrackingPatterns(sessions: any[]): any {
  const eyeSessions = sessions.filter(s => s.eyeTrackingMetrics?.calibrationQuality > 0)
  if (eyeSessions.length === 0) return null

  return {
    averageCalibrationQuality: eyeSessions.reduce((sum, s) => sum + s.eyeTrackingMetrics.calibrationQuality, 0) / eyeSessions.length,
    averageFixationDuration: eyeSessions.reduce((sum, s) => sum + (s.eyeTrackingMetrics.readingPatterns?.averageFixationDuration || 0), 0) / eyeSessions.length,
    sessionsWithEyeTracking: eyeSessions.length,
  }
}

function aggregateMousePatterns(sessions: any[]): any {
  const mouseSessions = sessions.filter(s => s.mouseMetrics?.scrollBehavior?.totalDistance > 0)
  if (mouseSessions.length === 0) return null

  return {
    averageScrollSpeed: mouseSessions.reduce((sum, s) => sum + s.mouseMetrics.scrollBehavior.averageSpeed, 0) / mouseSessions.length,
    averagePauseCount: mouseSessions.reduce((sum, s) => sum + s.mouseMetrics.scrollBehavior.pauseCount, 0) / mouseSessions.length,
    sessionsWithMouseTracking: mouseSessions.length,
  }
}

function calculateLearningIndicators(sessions: any[]): any {
  // Calculate learning style indicators based on biometric patterns
  const indicators = {
    attentionSpan: 'moderate',
    processingSpeed: 'average',
    anxietyLevel: 'low',
    engagementLevel: 'moderate',
  }

  // Analyze patterns to determine indicators
  const analysisResults = sessions.filter(s => s.analysisResults).map(s => s.analysisResults)
  if (analysisResults.length > 0) {
    // Use analysis results to refine indicators
    const avgAttention = analysisResults.reduce((sum, r) => sum + (r.attentionScore || 0.5), 0) / analysisResults.length
    const avgEngagement = analysisResults.reduce((sum, r) => sum + (r.engagementScore || 0.5), 0) / analysisResults.length
    const avgStress = analysisResults.reduce((sum, r) => sum + (r.stressLevel || 0.3), 0) / analysisResults.length

    indicators.attentionSpan = avgAttention > 0.7 ? 'high' : avgAttention < 0.4 ? 'low' : 'moderate'
    indicators.engagementLevel = avgEngagement > 0.7 ? 'high' : avgEngagement < 0.4 ? 'low' : 'moderate'
    indicators.anxietyLevel = avgStress > 0.6 ? 'high' : avgStress < 0.3 ? 'low' : 'moderate'
  }

  return indicators
}

function generateProfileRecommendations(sessions: any[]): string[] {
  const recommendations: string[] = []

  // Analyze recent sessions for patterns
  const recentSessions = sessions.slice(0, 5)
  const hasVoiceData = recentSessions.some(s => s.voiceMetrics?.confidenceScore > 0)
  const hasEyeData = recentSessions.some(s => s.eyeTrackingMetrics?.calibrationQuality > 0)
  const hasMouseData = recentSessions.some(s => s.mouseMetrics?.scrollBehavior?.totalDistance > 0)

  if (!hasVoiceData) {
    recommendations.push('Enable voice tracking for read-aloud analysis')
  }
  if (!hasEyeData) {
    recommendations.push('Enable eye tracking for reading pattern analysis')
  }
  if (!hasMouseData) {
    recommendations.push('Mouse tracking helps identify focus patterns')
  }

  // Add learning-based recommendations
  const avgAnalysis = sessions.filter(s => s.analysisResults).map(s => s.analysisResults)
  if (avgAnalysis.length > 0) {
    const avgStress = avgAnalysis.reduce((sum, r) => sum + (r.stressLevel || 0), 0) / avgAnalysis.length
    if (avgStress > 0.5) {
      recommendations.push('Consider shorter learning sessions with more breaks')
      recommendations.push('Try calming background music during lessons')
    }
  }

  return recommendations
}

// ─── Gap 3: Bulk biometric persistence ────────────────────────────────────────

/**
 * Persist a combined biometric snapshot.
 * Creates a session if needed, then updates metrics + analysis scores.
 */
router.post('/persist', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId
    const { lessonId, courseId, learningSessionId, voiceMetrics, eyeMetrics, mouseMetrics, scores } = req.body

    if (!userId || !lessonId) {
      return res.status(400).json({ error: 'Missing required fields: userId or lessonId' })
    }

    // Find or create session for this lesson
    let session = await BiometricSession.findOne({
      userId,
      lessonId,
      endTime: null, // still active
    })

    if (!session) {
      session = new BiometricSession({
        userId,
        lessonId,
        courseId: courseId || 'unknown',
        learningSessionId: learningSessionId || undefined,
        startTime: new Date(),
        permissions: {
          voiceEnabled: !!voiceMetrics,
          eyeTrackingEnabled: !!eyeMetrics,
          mouseTrackingEnabled: true,
          webcamEnabled: false
        },
        voiceMetrics: voiceMetrics ? {
          averagePace: voiceMetrics.averagePace || 0,
          paceVariability: voiceMetrics.paceVariability || 0,
          pauseFrequency: voiceMetrics.pauseFrequency || 0,
          averagePauseDuration: voiceMetrics.averagePauseDuration || 0,
          fillerWordCount: voiceMetrics.fillerWordCount || 0,
          volumeLevel: voiceMetrics.volumeLevel || 50,
          volumeVariability: voiceMetrics.volumeVariability || 0,
          pitchLevel: voiceMetrics.averagePitch || 50,
          pitchVariability: 0,
          speechClarity: voiceMetrics.speechClarity || 50,
          hesitationPatterns: voiceMetrics.hesitationPatterns || 0,
          voiceTremor: 0,
          readingAccuracy: 0,
          selfCorrections: 0,
          skippedWords: 0,
          samples: voiceMetrics.samples || []
        } : undefined,
        eyeTrackingMetrics: eyeMetrics ? {
          averageFixationDuration: eyeMetrics.averageFixationDuration || 0,
          fixationCount: eyeMetrics.fixationCount || 0,
          saccadeCount: eyeMetrics.saccadeCount || 0,
          averageSaccadeLength: 0,
          readingDirection: 'left-to-right',
          regressionCount: eyeMetrics.regressionCount || 0,
          lineSkipCount: eyeMetrics.lineSkipCount || 0,
          contentFocusPercentage: eyeMetrics.contentFocusPercentage || 0,
          distractionZones: eyeMetrics.distractionZones || [],
          blinkRate: eyeMetrics.blinkRate || 0,
          pupilDilation: 0,
          gazePath: eyeMetrics.gazePath || [],
          attentionHeatmap: eyeMetrics.attentionHeatmap || [],
          calibrationAccuracy: eyeMetrics.calibrationAccuracy || 0,
          trackingConfidence: eyeMetrics.trackingConfidence || 0,
        } : undefined,
        mouseTrackingMetrics: {
          totalDistance: mouseMetrics?.totalDistance || 0,
          averageSpeed: mouseMetrics?.averageSpeed || 0,
          speedVariability: mouseMetrics?.speedVariability || 0,
          maxSpeed: mouseMetrics?.maxSpeed || 0,
          pathStraightness: mouseMetrics?.pathStraightness || 0,
          directionChanges: mouseMetrics?.directionChanges || 0,
          erraticMovementCount: mouseMetrics?.erraticMovementCount || 0,
          hoverEvents: mouseMetrics?.hoverEvents || [],
          averageHoverDuration: 0,
          hoverAbandonRate: 0,
          clickCount: mouseMetrics?.clickCount || 0,
          missClickCount: mouseMetrics?.missClickCount || 0,
          doubleClickCount: 0,
          averageClickInterval: 0,
          rapidClickEvents: mouseMetrics?.rapidClickEvents || 0,
          backAndForthMovements: mouseMetrics?.backAndForthMovements || 0,
          idleTimeTotal: mouseMetrics?.idleTimeTotal || 0,
          idleEvents: [],
          scrollPatterns: {
            totalScrollDistance: mouseMetrics?.scrollPatterns?.totalScrollDistance || 0,
            scrollUpCount: mouseMetrics?.scrollPatterns?.scrollUpCount || 0,
            scrollDownCount: mouseMetrics?.scrollPatterns?.scrollDownCount || 0,
            rapidScrollCount: mouseMetrics?.scrollPatterns?.rapidScrollCount || 0,
            scrollBackCount: mouseMetrics?.scrollPatterns?.scrollBackCount || 0,
            averageScrollSpeed: mouseMetrics?.scrollPatterns?.averageSpeed || 0,
          },
          contentInteractions: []
        },
        scores: {
          attentionScore: scores?.attention || 50,
          engagementScore: scores?.engagement || 50,
          stressLevel: scores?.stress || 50,
          confidenceLevel: scores?.confidence || 50,
          frustrationLevel: scores?.frustration || 50,
          focusQuality: scores?.focusQuality || 50,
        },
        detectedPatterns: [],
        deviceInfo: {
          screenWidth: 0,
          screenHeight: 0,
          browser: '',
          hasWebcam: !!eyeMetrics,
          hasMicrophone: !!voiceMetrics,
        },
        flaggedForReview: false,
      })
    } else {
      // Update existing session
      if (voiceMetrics && session.voiceMetrics) {
        session.voiceMetrics.averagePace = voiceMetrics.averagePace ?? session.voiceMetrics.averagePace
        session.voiceMetrics.pitchLevel = voiceMetrics.averagePitch ?? session.voiceMetrics.pitchLevel
        session.voiceMetrics.speechClarity = voiceMetrics.speechClarity ?? session.voiceMetrics.speechClarity
      }
      if (eyeMetrics && session.eyeTrackingMetrics) {
        session.eyeTrackingMetrics.contentFocusPercentage = eyeMetrics.contentFocusPercentage ?? session.eyeTrackingMetrics.contentFocusPercentage
        session.eyeTrackingMetrics.fixationCount = eyeMetrics.fixationCount ?? session.eyeTrackingMetrics.fixationCount
      }
      if (mouseMetrics && session.mouseTrackingMetrics) {
        session.mouseTrackingMetrics.totalDistance = mouseMetrics.totalDistance ?? session.mouseTrackingMetrics.totalDistance
        session.mouseTrackingMetrics.averageSpeed = mouseMetrics.averageSpeed ?? session.mouseTrackingMetrics.averageSpeed
        if (mouseMetrics.scrollPatterns) {
          session.mouseTrackingMetrics.scrollPatterns.totalScrollDistance = mouseMetrics.scrollPatterns.totalScrollDistance ?? session.mouseTrackingMetrics.scrollPatterns.totalScrollDistance
        }
      }
      if (scores) {
        session.scores = {
          attentionScore: scores.attention ?? session.scores.attentionScore,
          engagementScore: scores.engagement ?? session.scores.engagementScore,
          stressLevel: scores.stress ?? session.scores.stressLevel,
          confidenceLevel: scores.confidence ?? session.scores.confidenceLevel,
          frustrationLevel: scores.frustration ?? session.scores.frustrationLevel,
          focusQuality: scores.focusQuality ?? session.scores.focusQuality,
        }
      }
    }

    await session.save()
    res.json({ success: true, sessionId: session._id })
  } catch (error) {
    console.error('Error persisting biometric data:', error)
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({
      error: 'Failed to persist biometric data',
      details: errorMessage
    })
  }
})

export default router
