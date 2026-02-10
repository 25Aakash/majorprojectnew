import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'

// ==================== TYPES ====================

interface VoiceMetrics {
  averagePace: number
  paceVariability: number
  pauseFrequency: number
  averagePauseDuration: number
  fillerWordCount: number
  volumeLevel: number
  volumeVariability: number
  speechClarity: number
  hesitationPatterns: number
  samples: Array<{
    timestamp: Date
    duration: number
    transcription?: string
    confidence: number
  }>
}

interface EyeTrackingMetrics {
  averageFixationDuration: number
  fixationCount: number
  saccadeCount: number
  regressionCount: number
  lineSkipCount: number
  contentFocusPercentage: number
  distractionZones: Array<{
    zone: string
    duration: number
    frequency: number
  }>
  blinkRate: number
  gazePath: Array<{
    x: number
    y: number
    timestamp: number
    duration: number
    elementId?: string
  }>
  attentionHeatmap: Map<string, {
    totalGazeTime: number
    gazeCount: number
  }>
  calibrationAccuracy: number
  trackingConfidence: number
}

interface MouseMetrics {
  totalDistance: number
  averageSpeed: number
  speedVariability: number
  maxSpeed: number
  pathStraightness: number
  directionChanges: number
  erraticMovementCount: number
  hoverEvents: Array<{
    elementId: string
    duration: number
    timestamp: number
    abandoned: boolean
  }>
  clickCount: number
  missClickCount: number
  rapidClickEvents: number
  backAndForthMovements: number
  idleTimeTotal: number
  scrollPatterns: {
    totalScrollDistance: number
    scrollUpCount: number
    scrollDownCount: number
    rapidScrollCount: number
    scrollBackCount: number
  }
}

interface BiometricScores {
  attention: number
  engagement: number
  stress: number
  confidence: number
  frustration: number
  focusQuality: number
}

interface BiometricIntervention {
  type: 'break' | 'simplify' | 'calming' | 'restructure'
  priority: 'high' | 'medium' | 'low'
  message: string
  suggestedAction: string
}

interface UseBiometricTrackingOptions {
  enabled?: boolean
  enableVoice?: boolean
  enableEyeTracking?: boolean
  enableMouseTracking?: boolean
  updateInterval?: number // milliseconds
  onIntervention?: (intervention: BiometricIntervention) => void
}

// ==================== WEBGAZER TYPES ====================
declare global {
  interface Window {
    webgazer?: {
      begin: () => Promise<any>
      end: () => void
      pause: () => void
      resume: () => void
      setGazeListener: (callback: (data: { x: number; y: number } | null, elapsedTime: number) => void) => any
      showPredictionPoints: (show: boolean) => any
      showVideo: (show: boolean) => any
      showFaceOverlay: (show: boolean) => any
      showFaceFeedbackBox: (show: boolean) => any
    }
  }
}

// ==================== MAIN HOOK ====================

export function useBiometricTracking(
  lessonId: string | null,
  options: UseBiometricTrackingOptions = {}
) {
  const {
    enabled = true,
    enableVoice = false,
    enableEyeTracking = false,
    enableMouseTracking = true,
    updateInterval = 30000, // 30 seconds
    onIntervention,
  } = options

  // Stable ref for callback to prevent infinite loops
  const onInterventionRef = useRef(onIntervention)
  onInterventionRef.current = onIntervention

  // State
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [permissions, setPermissions] = useState({
    microphone: false,
    camera: false,
  })
  const [currentScores, setCurrentScores] = useState<BiometricScores>({
    attention: 50,
    engagement: 50,
    stress: 50,
    confidence: 50,
    frustration: 50,
    focusQuality: 50,
  })
  const [isRecording, setIsRecording] = useState(false)

  // Refs for tracking data
  const voiceMetricsRef = useRef<VoiceMetrics>({
    averagePace: 0,
    paceVariability: 0,
    pauseFrequency: 0,
    averagePauseDuration: 0,
    fillerWordCount: 0,
    volumeLevel: 50,
    volumeVariability: 0,
    speechClarity: 50,
    hesitationPatterns: 0,
    samples: [],
  })

  const eyeMetricsRef = useRef<EyeTrackingMetrics>({
    averageFixationDuration: 0,
    fixationCount: 0,
    saccadeCount: 0,
    regressionCount: 0,
    lineSkipCount: 0,
    contentFocusPercentage: 50,
    distractionZones: [],
    blinkRate: 0,
    gazePath: [],
    attentionHeatmap: new Map(),
    calibrationAccuracy: 0,
    trackingConfidence: 0,
  })

  const mouseMetricsRef = useRef<MouseMetrics>({
    totalDistance: 0,
    averageSpeed: 0,
    speedVariability: 0,
    maxSpeed: 0,
    pathStraightness: 0.5,
    directionChanges: 0,
    erraticMovementCount: 0,
    hoverEvents: [],
    clickCount: 0,
    missClickCount: 0,
    rapidClickEvents: 0,
    backAndForthMovements: 0,
    idleTimeTotal: 0,
    scrollPatterns: {
      totalScrollDistance: 0,
      scrollUpCount: 0,
      scrollDownCount: 0,
      rapidScrollCount: 0,
      scrollBackCount: 0,
    },
  })

  // Mouse tracking state
  const lastMousePosRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastScrollPosRef = useRef<number>(0)
  const lastScrollTimeRef = useRef<number>(0)
  const mouseSpeedsRef = useRef<number[]>([])
  const hoverStartRef = useRef<{ elementId: string; startTime: number } | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const clickTimesRef = useRef<number[]>([])
  const idleStartRef = useRef<number | null>(null)
  const pathStartRef = useRef<{ x: number; y: number } | null>(null)
  const pathDistanceRef = useRef<number>(0)
  const straightLineDistanceRef = useRef<number>(0)

  // Voice tracking state
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)

  // Eye tracking state
  const lastGazePosRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const fixationStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const contentAreaRef = useRef<DOMRect | null>(null)

  // Update interval
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ==================== MOUSE TRACKING ====================

  const trackMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now()
    const metrics = mouseMetricsRef.current

    // Reset idle timer
    if (idleStartRef.current) {
      metrics.idleTimeTotal += now - idleStartRef.current
      idleStartRef.current = null
    }

    if (lastMousePosRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      const dt = now - lastMousePosRef.current.time
      const distance = Math.sqrt(dx * dx + dy * dy)
      const speed = dt > 0 ? distance / dt * 1000 : 0 // pixels per second

      metrics.totalDistance += distance
      mouseSpeedsRef.current.push(speed)

      if (mouseSpeedsRef.current.length > 100) {
        mouseSpeedsRef.current.shift()
      }

      // Calculate average and max speed
      metrics.averageSpeed = mouseSpeedsRef.current.reduce((a, b) => a + b, 0) / mouseSpeedsRef.current.length
      metrics.maxSpeed = Math.max(metrics.maxSpeed, speed)

      // Calculate speed variability
      const mean = metrics.averageSpeed
      const variance = mouseSpeedsRef.current.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / mouseSpeedsRef.current.length
      metrics.speedVariability = Math.sqrt(variance) / (mean || 1)

      // Detect direction changes (erratic movement)
      const lastDir = lastMousePosRef.current
      if (lastDir) {
        const prevDx = lastDir.x - (pathStartRef.current?.x || lastDir.x)
        const prevDy = lastDir.y - (pathStartRef.current?.y || lastDir.y)

        // Check for sharp direction change (more than 90 degrees)
        if ((prevDx * dx + prevDy * dy) < 0) {
          metrics.directionChanges++

          // Very sharp change with high speed = erratic
          if (speed > 500 && Math.abs(prevDx * dx + prevDy * dy) > 100) {
            metrics.erraticMovementCount++
          }
        }
      }

      // Path straightness calculation
      if (pathStartRef.current) {
        pathDistanceRef.current += distance
        const straightDx = e.clientX - pathStartRef.current.x
        const straightDy = e.clientY - pathStartRef.current.y
        straightLineDistanceRef.current = Math.sqrt(straightDx * straightDx + straightDy * straightDy)

        if (pathDistanceRef.current > 0) {
          metrics.pathStraightness = straightLineDistanceRef.current / pathDistanceRef.current
        }
      } else {
        pathStartRef.current = { x: e.clientX, y: e.clientY }
      }

      // Detect back-and-forth movements
      if (mouseSpeedsRef.current.length >= 4) {
        const recent = mouseSpeedsRef.current.slice(-4)
        const isBackForth = recent.every((s, i) => i === 0 || Math.abs(s - recent[i - 1]) > 200)
        if (isBackForth) {
          metrics.backAndForthMovements++
        }
      }
    }

    lastMousePosRef.current = { x: e.clientX, y: e.clientY, time: now }

    // Start idle timer
    setTimeout(() => {
      if (lastMousePosRef.current && now === lastMousePosRef.current.time) {
        idleStartRef.current = now
      }
    }, 2000)
  }, [])

  const trackMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    const elementId = target.id || target.className?.toString().slice(0, 50) || 'unknown'
    hoverStartRef.current = { elementId, startTime: Date.now() }
  }, [])

  const trackMouseLeave = useCallback((_e: MouseEvent) => {
    if (hoverStartRef.current) {
      const duration = Date.now() - hoverStartRef.current.startTime
      const metrics = mouseMetricsRef.current

      metrics.hoverEvents.push({
        elementId: hoverStartRef.current.elementId,
        duration,
        timestamp: hoverStartRef.current.startTime,
        abandoned: true, // No click followed
      })

      hoverStartRef.current = null
    }
  }, [])

  const trackClick = useCallback((e: MouseEvent) => {
    const now = Date.now()
    const metrics = mouseMetricsRef.current
    metrics.clickCount++

    // Update hover event as not abandoned
    if (hoverStartRef.current && metrics.hoverEvents.length > 0) {
      const lastHover = metrics.hoverEvents[metrics.hoverEvents.length - 1]
      if (lastHover.elementId === hoverStartRef.current.elementId) {
        lastHover.abandoned = false
      }
    }

    // Check for miss-clicks (clicking on non-interactive elements)
    const target = e.target as HTMLElement
    const isInteractive = target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.tagName === 'INPUT' ||
      target.onclick !== null ||
      target.closest('button, a, [role="button"]')

    if (!isInteractive) {
      metrics.missClickCount++
    }

    // Detect rapid clicking
    clickTimesRef.current.push(now)
    if (clickTimesRef.current.length > 5) {
      clickTimesRef.current.shift()
    }

    if (clickTimesRef.current.length >= 3) {
      const recentClicks = clickTimesRef.current.slice(-3)
      const avgInterval = (recentClicks[2] - recentClicks[0]) / 2
      if (avgInterval < 300) { // 3 clicks in less than 600ms
        metrics.rapidClickEvents++
      }
    }

    // Reset path tracking on click
    pathStartRef.current = { x: e.clientX, y: e.clientY }
    pathDistanceRef.current = 0

    lastClickTimeRef.current = now
  }, [])

  const trackScroll = useCallback((_e: Event) => {
    const now = Date.now()
    const scrollY = window.scrollY
    const metrics = mouseMetricsRef.current.scrollPatterns

    const scrollDelta = scrollY - lastScrollPosRef.current
    const timeDelta = now - lastScrollTimeRef.current

    if (timeDelta > 50) { // Debounce
      metrics.totalScrollDistance += Math.abs(scrollDelta)

      if (scrollDelta > 0) {
        metrics.scrollDownCount++
      } else if (scrollDelta < 0) {
        metrics.scrollUpCount++
        metrics.scrollBackCount++ // Scrolling up = going back
      }

      // Detect rapid scrolling
      const scrollSpeed = Math.abs(scrollDelta) / timeDelta * 1000
      if (scrollSpeed > 2000) { // pixels per second
        metrics.rapidScrollCount++
      }
    }

    lastScrollPosRef.current = scrollY
    lastScrollTimeRef.current = now
  }, [])

  // ==================== VOICE TRACKING ====================

  const startVoiceTracking = useCallback(async () => {
    if (!enableVoice) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      setPermissions(prev => ({ ...prev, microphone: true }))

      // Set up audio analysis
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 2048

      // Set up speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true

        let speechStartTime = Date.now()
        let wordCount = 0
        let pauseCount = 0
        let lastSpeechTime = Date.now()
        const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually']

        recognitionRef.current.onresult = (event: any) => {
          const result = event.results[event.results.length - 1]
          if (result.isFinal) {
            const transcript = result[0].transcript.toLowerCase()
            const words = transcript.split(/\s+/)
            wordCount += words.length

            // Count filler words
            fillerWords.forEach(filler => {
              const regex = new RegExp(`\\b${filler}\\b`, 'gi')
              const matches = transcript.match(regex)
              if (matches) {
                voiceMetricsRef.current.fillerWordCount += matches.length
              }
            })

            // Calculate pace
            const duration = (Date.now() - speechStartTime) / 60000 // minutes
            voiceMetricsRef.current.averagePace = duration > 0 ? wordCount / duration : 0

            // Add sample
            voiceMetricsRef.current.samples.push({
              timestamp: new Date(),
              duration: Date.now() - lastSpeechTime,
              transcription: transcript,
              confidence: result[0].confidence,
            })

            lastSpeechTime = Date.now()
          }
        }

        recognitionRef.current.onspeechend = () => {
          pauseCount++
          voiceMetricsRef.current.pauseFrequency = pauseCount / ((Date.now() - speechStartTime) / 60000)
        }

        recognitionRef.current.start()
        setIsRecording(true)
      }

      // Analyze audio levels periodically
      const analyzeAudio = () => {
        if (!analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate volume level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        voiceMetricsRef.current.volumeLevel = (average / 255) * 100

        requestAnimationFrame(analyzeAudio)
      }
      analyzeAudio()

    } catch (error) {
      console.error('Failed to start voice tracking:', error)
      setPermissions(prev => ({ ...prev, microphone: false }))
    }
  }, [enableVoice])

  const stopVoiceTracking = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    } catch (error) {
      // Ignore errors during cleanup
      console.debug('Voice tracking cleanup:', error)
    }
    setIsRecording(false)
  }, [])

  // ==================== EYE TRACKING ====================

  const startEyeTracking = useCallback(async () => {
    if (!enableEyeTracking || !window.webgazer) {
      console.log('WebGazer not available or eye tracking disabled')
      return
    }

    try {
      setPermissions(prev => ({ ...prev, camera: true }))

      // Configure WebGazer
      window.webgazer
        .showPredictionPoints(false)
        .showVideo(false)
        .showFaceOverlay(false)
        .showFaceFeedbackBox(false)

      // Set up gaze listener
      window.webgazer.setGazeListener((data, _elapsedTime) => {
        if (!data) return

        const now = Date.now()
        const metrics = eyeMetricsRef.current

        // Get content area bounds
        const contentArea = document.querySelector('.lesson-content, .content-area, main')
        if (contentArea) {
          contentAreaRef.current = contentArea.getBoundingClientRect()
        }

        // Check if looking at content
        if (contentAreaRef.current) {
          const isInContent =
            data.x >= contentAreaRef.current.left &&
            data.x <= contentAreaRef.current.right &&
            data.y >= contentAreaRef.current.top &&
            data.y <= contentAreaRef.current.bottom

          if (isInContent) {
            metrics.contentFocusPercentage = Math.min(100, metrics.contentFocusPercentage + 0.1)
          } else {
            metrics.contentFocusPercentage = Math.max(0, metrics.contentFocusPercentage - 0.1)

            // Track distraction zone
            const zone = getDistractionZone(data.x, data.y)
            const existingZone = metrics.distractionZones.find(z => z.zone === zone)
            if (existingZone) {
              existingZone.duration += 50 // assuming ~50ms between updates
              existingZone.frequency++
            } else {
              metrics.distractionZones.push({ zone, duration: 50, frequency: 1 })
            }
          }
        }

        // Detect fixations vs saccades
        if (lastGazePosRef.current) {
          const dx = data.x - lastGazePosRef.current.x
          const dy = data.y - lastGazePosRef.current.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 30) { // Fixation threshold
            if (!fixationStartRef.current) {
              fixationStartRef.current = { x: data.x, y: data.y, time: now }
            }
          } else {
            // End of fixation
            if (fixationStartRef.current) {
              const fixationDuration = now - fixationStartRef.current.time
              metrics.fixationCount++
              metrics.averageFixationDuration =
                (metrics.averageFixationDuration * (metrics.fixationCount - 1) + fixationDuration) / metrics.fixationCount

              // Detect regression (looking back)
              if (dx < -50) { // Moved significantly left (backward in reading)
                metrics.regressionCount++
              }

              // Detect line skip
              if (Math.abs(dy) > 40) {
                metrics.lineSkipCount++
              }

              fixationStartRef.current = null
            }

            metrics.saccadeCount++
          }
        }

        // Add to gaze path
        metrics.gazePath.push({
          x: data.x,
          y: data.y,
          timestamp: now,
          duration: lastGazePosRef.current ? now - lastGazePosRef.current.time : 0,
        })

        // Keep gaze path manageable
        if (metrics.gazePath.length > 1000) {
          metrics.gazePath.shift()
        }

        // Update attention heatmap
        const element = document.elementFromPoint(data.x, data.y)
        if (element) {
          const contentBlock = element.closest('[data-content-block-id]')
          if (contentBlock) {
            const blockId = contentBlock.getAttribute('data-content-block-id') || 'unknown'
            const existing = metrics.attentionHeatmap.get(blockId)
            if (existing) {
              existing.totalGazeTime += 50
              existing.gazeCount++
            } else {
              metrics.attentionHeatmap.set(blockId, { totalGazeTime: 50, gazeCount: 1 })
            }
          }
        }

        lastGazePosRef.current = { x: data.x, y: data.y, time: now }
      })

      await window.webgazer.begin()
      setIsCalibrated(true)

    } catch (error) {
      console.error('Failed to start eye tracking:', error)
      setPermissions(prev => ({ ...prev, camera: false }))
    }
  }, [enableEyeTracking])

  const stopEyeTracking = useCallback(() => {
    try {
      if (window.webgazer && typeof window.webgazer.end === 'function') {
        window.webgazer.end()
      }
    } catch (error) {
      // Silently ignore cleanup errors - WebGazer may not be fully initialized
    }
    setIsCalibrated(false)
  }, [])

  // ==================== HELPER FUNCTIONS ====================

  const getDistractionZone = (x: number, y: number): string => {
    const width = window.innerWidth
    const height = window.innerHeight

    if (x < 0 || x > width || y < 0 || y > height) {
      return 'outside'
    }
    if (y < 60) {
      return 'navigation'
    }
    if (x < width * 0.15) {
      return 'sidebar-left'
    }
    if (x > width * 0.85) {
      return 'sidebar-right'
    }
    return 'other'
  }

  // ==================== API INTEGRATION ====================

  const sendBiometricUpdate = useCallback(async () => {
    if (!lessonId || !enabled) return

    const voiceData = enableVoice ? voiceMetricsRef.current : null
    const eyeData = enableEyeTracking ? {
      ...eyeMetricsRef.current,
      attentionHeatmap: Array.from(eyeMetricsRef.current.attentionHeatmap.entries()).map(([blockId, data]) => ({
        contentBlockId: blockId,
        ...data,
        averageGazeDuration: data.gazeCount > 0 ? data.totalGazeTime / data.gazeCount : 0,
      })),
    } : null
    const mouseData = enableMouseTracking ? mouseMetricsRef.current : null

    try {
      // 1. Send to AI for real-time analysis (existing behaviour)
      const response = await api.post('/ai/biometric/analyze-combined', {
        voice_metrics: voiceData,
        eye_metrics: eyeData,
        mouse_metrics: mouseData,
      })

      if (response.data.success) {
        // Update current scores
        setCurrentScores(response.data.combined_scores)

        // Handle interventions
        if (response.data.interventions && response.data.interventions.length > 0 && onInterventionRef.current) {
          const urgent = response.data.urgent_intervention
          if (urgent) {
            onInterventionRef.current({
              type: urgent.type,
              priority: urgent.priority,
              message: urgent.message,
              suggestedAction: urgent.suggested_action,
            })
          }
        }

        // 2. Persist to MongoDB in background (Gap 3)
        // Only persist if we have a valid lessonId
        if (lessonId) {
          console.debug('Persisting biometric data with lessonId:', lessonId)
          api.post('/biometric/persist', {
            lessonId,
            voiceMetrics: voiceData,
            eyeMetrics: eyeData,
            mouseMetrics: mouseData,
            scores: response.data.combined_scores,
          }).catch((error) => {
            // Log errors for debugging but don't block main flow
            console.debug('Biometric persist failed:', error.response?.data || error.message)
          })
        } else {
          console.debug('Skipping biometric persist - no lessonId available')
        }
      }
    } catch (error) {
      console.debug('Biometric analysis failed:', error)
    }
  }, [lessonId, enabled, enableVoice, enableEyeTracking, enableMouseTracking])

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    if (!enabled || !lessonId) return

    // Set up mouse tracking (no permission required)
    if (enableMouseTracking) {
      document.addEventListener('mousemove', trackMouseMove)
      document.addEventListener('mouseenter', trackMouseEnter, true)
      document.addEventListener('mouseleave', trackMouseLeave, true)
      document.addEventListener('click', trackClick)
      window.addEventListener('scroll', trackScroll)
    }

    // Only start voice tracking if permission is granted
    if (enableVoice && permissions.microphone) {
      startVoiceTracking()
    }

    // Only start eye tracking if permission is granted
    if (enableEyeTracking && permissions.camera) {
      startEyeTracking()
    }

    // Set up periodic updates
    updateIntervalRef.current = setInterval(sendBiometricUpdate, updateInterval)

    return () => {
      // Clean up mouse tracking
      document.removeEventListener('mousemove', trackMouseMove)
      document.removeEventListener('mouseenter', trackMouseEnter, true)
      document.removeEventListener('mouseleave', trackMouseLeave, true)
      document.removeEventListener('click', trackClick)
      window.removeEventListener('scroll', trackScroll)

      // Clean up voice tracking
      stopVoiceTracking()

      // Clean up eye tracking
      stopEyeTracking()

      // Clear update interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [
    enabled, lessonId, enableMouseTracking, enableVoice, enableEyeTracking,
    permissions.microphone, permissions.camera,
    trackMouseMove, trackMouseEnter, trackMouseLeave, trackClick, trackScroll,
    startVoiceTracking, stopVoiceTracking, startEyeTracking, stopEyeTracking,
    sendBiometricUpdate, updateInterval
  ])

  // ==================== PUBLIC API ====================

  const requestPermissions = useCallback(async () => {
    const results: { microphone?: boolean; camera?: boolean } = {}

    if (enableVoice) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        results.microphone = true
      } catch {
        results.microphone = false
      }
    }

    if (enableEyeTracking) {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true })
        results.camera = true
      } catch {
        results.camera = false
      }
    }

    setPermissions(prev => ({ ...prev, ...results }))
    return results
  }, [enableVoice, enableEyeTracking])

  const getMetrics = useCallback(() => ({
    voice: voiceMetricsRef.current,
    eyeTracking: eyeMetricsRef.current,
    mouse: mouseMetricsRef.current,
  }), [])

  const resetMetrics = useCallback(() => {
    // Reset voice metrics
    voiceMetricsRef.current = {
      averagePace: 0,
      paceVariability: 0,
      pauseFrequency: 0,
      averagePauseDuration: 0,
      fillerWordCount: 0,
      volumeLevel: 50,
      volumeVariability: 0,
      speechClarity: 50,
      hesitationPatterns: 0,
      samples: [],
    }

    // Reset eye tracking metrics
    eyeMetricsRef.current = {
      averageFixationDuration: 0,
      fixationCount: 0,
      saccadeCount: 0,
      regressionCount: 0,
      lineSkipCount: 0,
      contentFocusPercentage: 50,
      distractionZones: [],
      blinkRate: 0,
      gazePath: [],
      attentionHeatmap: new Map(),
      calibrationAccuracy: 0,
      trackingConfidence: 0,
    }

    // Reset mouse metrics
    mouseMetricsRef.current = {
      totalDistance: 0,
      averageSpeed: 0,
      speedVariability: 0,
      maxSpeed: 0,
      pathStraightness: 0.5,
      directionChanges: 0,
      erraticMovementCount: 0,
      hoverEvents: [],
      clickCount: 0,
      missClickCount: 0,
      rapidClickEvents: 0,
      backAndForthMovements: 0,
      idleTimeTotal: 0,
      scrollPatterns: {
        totalScrollDistance: 0,
        scrollUpCount: 0,
        scrollDownCount: 0,
        rapidScrollCount: 0,
        scrollBackCount: 0,
      },
    }
  }, [])

  // Function to update permissions externally (called from modal)
  const setPermissionsGranted = useCallback((newPermissions: { microphone?: boolean; camera?: boolean }) => {
    setPermissions(prev => ({ ...prev, ...newPermissions }))
  }, [])

  return {
    // State
    isCalibrated,
    permissions,
    currentScores,
    isRecording,

    // Actions
    requestPermissions,
    setPermissionsGranted,
    getMetrics,
    resetMetrics,
    startVoiceTracking,
    stopVoiceTracking,
    startEyeTracking,
    stopEyeTracking,
    forceUpdate: sendBiometricUpdate,
  }
}

export default useBiometricTracking
