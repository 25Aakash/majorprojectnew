import { useEffect, useRef, useCallback, useState } from 'react'
import api from '../services/api'

interface BehavioralMetrics {
  averageTimeOnContent: number
  attentionDropPoints: number[]
  tabSwitches: number
  scrollPatterns: {
    speed: 'slow' | 'medium' | 'fast'
    backtrackCount: number
  }
  clickFrequency: number
  hoverTime: number
  responseTime: number
  rereadCount: number
  helpRequests: number
  hintUsage: number
  frustrationScore: number
  engagementScore: number
  confidenceScore: number
}

interface ContentInteraction {
  contentType: 'text' | 'video' | 'audio' | 'interactive' | 'image' | 'quiz'
  timeSpent: number
  completionRate: number
  engagementLevel: 'low' | 'medium' | 'high'
  wasSkipped: boolean
  wasReplayed: boolean
}

interface QuizPerformance {
  questionId: string
  timeToAnswer: number
  wasCorrect: boolean
  attemptsBeforeCorrect: number
  usedHint: boolean
}

interface RealTimeAdaptation {
  should_suggest_break: boolean
  should_simplify_content: boolean
  should_offer_alternative_format: boolean
  suggested_format: string | null
  should_reduce_difficulty: boolean
  calming_intervention_needed: boolean
  encouragement_needed: boolean
  messages: string[]
}

interface UseAdaptiveTrackingOptions {
  enabled?: boolean
  courseId?: string | null
  onAdaptation?: (adaptation: RealTimeAdaptation) => void
}

export function useAdaptiveTracking(
  lessonId: string | null,
  options: UseAdaptiveTrackingOptions = {}
) {
  const {
    enabled = true,
    courseId,
    onAdaptation,
  } = options

  // Stable ref for callback to prevent infinite loops
  const onAdaptationRef = useRef(onAdaptation)
  onAdaptationRef.current = onAdaptation

  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<Date>(new Date())
  const lastInteractionRef = useRef<Date>(new Date())
  const metricsRef = useRef<BehavioralMetrics>({
    averageTimeOnContent: 0,
    attentionDropPoints: [],
    tabSwitches: 0,
    scrollPatterns: { speed: 'medium', backtrackCount: 0 },
    clickFrequency: 0,
    hoverTime: 0,
    responseTime: 0,
    rereadCount: 0,
    helpRequests: 0,
    hintUsage: 0,
    frustrationScore: 50,
    engagementScore: 50,
    confidenceScore: 50,
  })
  
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [currentAdaptation, setCurrentAdaptation] = useState<RealTimeAdaptation | null>(null)
  
  // Tracking state
  const clickCountRef = useRef(0)
  const scrollPositionsRef = useRef<number[]>([])
  const contentStartTimesRef = useRef<Map<string, number>>(new Map())
  const wrongAnswerCountRef = useRef(0)
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start session
  const startSession = useCallback(async () => {
    if (!enabled || sessionIdRef.current || !lessonId) return

    try {
      const deviceType = getDeviceType()
      const response = await api.post('/adaptive-learning/session/start', {
        lessonId,
        courseId,
        deviceType,
      })

      sessionIdRef.current = response.data.sessionId
      setIsOnboarding(response.data.isOnboardingPeriod)
      startTimeRef.current = new Date()

      console.log('Adaptive learning session started:', sessionIdRef.current)
    } catch (error) {
      console.error('Failed to start adaptive learning session:', error)
    }
  }, [lessonId, courseId, enabled])

  // Update session with current metrics
  const updateSession = useCallback(async (_force = false) => {
    if (!sessionIdRef.current || !enabled) return

    try {
      const response = await api.put(`/adaptive-learning/session/${sessionIdRef.current}/update`, {
        behavioralMetrics: metricsRef.current,
      })

      // Handle real-time adaptations
      if (response.data.adaptations) {
        setCurrentAdaptation(response.data.adaptations)
        if (onAdaptationRef.current) {
          onAdaptationRef.current(response.data.adaptations)
        }
      }
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }, [enabled, onAdaptation])

  // End session
  const endSession = useCallback(async (lessonCompleted: boolean, quizScore?: number) => {
    if (!sessionIdRef.current || !enabled) return

    try {
      const focusScore = calculateFocusScore()
      const performance = quizScore ?? (lessonCompleted ? 70 : 30)

      await api.post(`/adaptive-learning/session/${sessionIdRef.current}/end`, {
        lessonCompleted,
        overallPerformance: performance,
        focusScore,
        finalMetrics: metricsRef.current,
      })

      console.log('Adaptive learning session ended')
      sessionIdRef.current = null
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }, [enabled])

  // Calculate focus score based on tracked metrics
  const calculateFocusScore = useCallback(() => {
    const metrics = metricsRef.current
    
    // Base score from engagement
    let score = metrics.engagementScore * 0.4

    // Penalty for tab switches
    score -= Math.min(20, metrics.tabSwitches * 3)

    // Penalty for frustration
    if (metrics.frustrationScore > 70) {
      score -= 15
    }

    // Bonus for low backtracking (indicates understanding)
    if (metrics.scrollPatterns.backtrackCount < 2) {
      score += 10
    }

    // Normalize to 0-100
    return Math.max(0, Math.min(100, score + 30))
  }, [])

  // Track content interaction
  const trackContentInteraction = useCallback((
    contentType: 'text' | 'video' | 'audio' | 'interactive' | 'image' | 'quiz',
    completed: boolean = true,
    timeSpent: number = 0
  ) => {
    if (!sessionIdRef.current || !enabled) return

    const interaction: ContentInteraction = {
      contentType,
      timeSpent,
      completionRate: completed ? 100 : 50,
      engagementLevel: timeSpent > 30 ? 'high' : timeSpent > 10 ? 'medium' : 'low',
      wasSkipped: !completed && timeSpent < 5,
      wasReplayed: false,
    }

    api.put(`/adaptive-learning/session/${sessionIdRef.current}/update`, {
      contentInteraction: interaction,
    }).catch(console.error)

    // Update engagement score based on interaction
    const engagementDelta = interaction.engagementLevel === 'high' ? 5 
      : interaction.engagementLevel === 'low' ? -5 : 0
    
    metricsRef.current.engagementScore = Math.max(0, Math.min(100,
      metricsRef.current.engagementScore + engagementDelta
    ))
  }, [enabled])

  // Track quiz answer
  const trackQuizAnswer = useCallback((questionId: string, wasCorrect: boolean, timeToAnswer: number, usedHint: boolean) => {
    if (!sessionIdRef.current || !enabled) return

    const quizPerformance: QuizPerformance = {
      questionId,
      timeToAnswer,
      wasCorrect,
      attemptsBeforeCorrect: wasCorrect ? 1 : wrongAnswerCountRef.current + 1,
      usedHint,
    }

    api.put(`/adaptive-learning/session/${sessionIdRef.current}/update`, {
      quizPerformance,
    }).catch(console.error)

    // Update metrics based on quiz performance
    if (!wasCorrect) {
      wrongAnswerCountRef.current++
      metricsRef.current.frustrationScore = Math.min(100,
        metricsRef.current.frustrationScore + 10
      )
    } else {
      wrongAnswerCountRef.current = 0
      metricsRef.current.confidenceScore = Math.min(100,
        metricsRef.current.confidenceScore + 5
      )
    }

    if (usedHint) {
      metricsRef.current.hintUsage++
    }
  }, [enabled])

  // Track break taken
  const trackBreakTaken = useCallback((wasPrompted: boolean) => {
    if (!sessionIdRef.current || !enabled) return

    api.put(`/adaptive-learning/session/${sessionIdRef.current}/update`, {
      breakTaken: {
        duration: 0, // Will be updated when they return
        wasPrompted,
        returnedAfter: true,
      },
    }).catch(console.error)

    // Breaks help reduce frustration
    metricsRef.current.frustrationScore = Math.max(0,
      metricsRef.current.frustrationScore - 15
    )
  }, [enabled])

  // Track help request
  const trackHelpRequest = useCallback(() => {
    metricsRef.current.helpRequests++
    updateSession()
  }, [updateSession])

  // Track content reread
  const trackReread = useCallback(() => {
    metricsRef.current.rereadCount++
  }, [])

  // Start tracking content view time
  const startContentTimer = useCallback((contentId: string) => {
    contentStartTimesRef.current.set(contentId, Date.now())
  }, [])

  // End content view time
  const endContentTimer = useCallback((contentId: string, contentType: ContentInteraction['contentType']) => {
    const startTime = contentStartTimesRef.current.get(contentId)
    if (!startTime) return

    const timeSpent = (Date.now() - startTime) / 1000
    contentStartTimesRef.current.delete(contentId)

    // Update average time on content
    const currentAvg = metricsRef.current.averageTimeOnContent
    const count = contentStartTimesRef.current.size + 1
    metricsRef.current.averageTimeOnContent = (currentAvg * (count - 1) + timeSpent) / count

    // Track interaction with simpler signature
    trackContentInteraction(contentType, timeSpent >= 3, timeSpent)
  }, [trackContentInteraction])

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return

    // Track clicks
    const handleClick = () => {
      clickCountRef.current++
      lastInteractionRef.current = new Date()
    }

    // Track tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        metricsRef.current.tabSwitches++
        metricsRef.current.attentionDropPoints.push(
          (new Date().getTime() - startTimeRef.current.getTime()) / 1000
        )
      }
    }

    // Track scroll
    const handleScroll = () => {
      const currentPosition = window.scrollY
      const lastPosition = scrollPositionsRef.current[scrollPositionsRef.current.length - 1] || 0
      
      // Detect backtracking
      if (currentPosition < lastPosition - 100) {
        metricsRef.current.scrollPatterns.backtrackCount++
      }

      scrollPositionsRef.current.push(currentPosition)
      
      // Keep only last 50 positions
      if (scrollPositionsRef.current.length > 50) {
        scrollPositionsRef.current = scrollPositionsRef.current.slice(-50)
      }

      // Calculate scroll speed
      const scrollDiff = Math.abs(currentPosition - lastPosition)
      if (scrollDiff > 500) {
        metricsRef.current.scrollPatterns.speed = 'fast'
      } else if (scrollDiff < 100) {
        metricsRef.current.scrollPatterns.speed = 'slow'
      } else {
        metricsRef.current.scrollPatterns.speed = 'medium'
      }
    }

    // Track keyboard activity
    const handleKeydown = () => {
      lastInteractionRef.current = new Date()
      metricsRef.current.engagementScore = Math.min(100,
        metricsRef.current.engagementScore + 1
      )
    }

    window.addEventListener('click', handleClick)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('keydown', handleKeydown)

    // Calculate click frequency every 30 seconds
    const clickInterval = setInterval(() => {
      metricsRef.current.clickFrequency = clickCountRef.current / 0.5 // per minute
      clickCountRef.current = 0
    }, 30000)

    // Update session every 30 seconds
    updateIntervalRef.current = setInterval(() => {
      updateSession()
    }, 30000)

    return () => {
      window.removeEventListener('click', handleClick)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keydown', handleKeydown)
      clearInterval(clickInterval)
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [enabled, updateSession])

  // Start session on mount
  useEffect(() => {
    startSession()

    return () => {
      // Don't end session on unmount - let the component decide
    }
  }, [startSession])

  // Clear current intervention
  const clearIntervention = useCallback(() => {
    setCurrentAdaptation(null)
  }, [])

  return {
    sessionId: sessionIdRef.current,
    isOnboarding,
    currentAdaptation,
    metrics: metricsRef.current,
    
    // Actions
    endSession,
    trackContentInteraction,
    trackQuizAnswer,
    trackBreakTaken,
    trackHelpRequest,
    trackReread,
    startContentTimer,
    endContentTimer,
    clearIntervention,
    
    // Manual trigger for adaptation check
    checkForAdaptation: updateSession,
  }
}

// Helper function
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export default useAdaptiveTracking
