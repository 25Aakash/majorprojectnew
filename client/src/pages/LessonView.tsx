import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../services/api'
import { useAccessibility } from '../contexts/AccessibilityContext'
import { useAdaptiveTracking } from '../hooks/useAdaptiveTracking'
import { useBiometricTracking } from '../hooks/useBiometricTracking'
import { useSSEInterventions } from '../hooks/useSSEInterventions'
import AdaptiveInterventionModal from '../components/AdaptiveInterventionModal'
import BiometricPermissionsModal from '../components/BiometricPermissionsModal'
import { useAuthStore } from '../stores/authStore'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  TrophyIcon,
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  EyeIcon,
  MicrophoneIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'

interface ContentBlock {
  type: 'text' | 'video' | 'audio' | 'interactive' | 'image' | 'quiz'
  content: string
  altText?: string
  transcription?: string
}

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  points: number
}

interface Quiz {
  questions: QuizQuestion[]
  passingScore: number
}

interface Lesson {
  _id: string
  title: string
  description: string
  content?: string  // Simple string content
  contentBlocks?: ContentBlock[]  // Block-based content
  estimatedDuration?: number
  duration?: number
  learningObjectives: string[]
  quiz?: Quiz  // After normalization, always Quiz format
}

export default function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { settings, speak, forceSpeak, stopSpeaking } = useAccessibility()
  
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [contentFormat, setContentFormat] = useState<'default' | 'simplified' | 'visual' | 'audio'>('default')
  const [showFormatSelector, setShowFormatSelector] = useState(false)
  const [sessionStart] = useState(new Date())
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Tracking for dynamic focus score calculation
  const [interactionCount, setInteractionCount] = useState(0)
  const [pauseCount, setPauseCount] = useState(0)
  const lastInteractionTime = useRef(new Date())
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
  const [showResult, setShowResult] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>([])
  const [showExplanation, setShowExplanation] = useState(false)
  const [isQuizSpeaking, setIsQuizSpeaking] = useState(false)
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const [autoPlayQuiz, setAutoPlayQuiz] = useState(true) // Auto-play enabled by default
  const [voiceVolume, setVoiceVolume] = useState(0) // Track microphone volume
  const recognitionRef = useRef<any>(null)
  const speechEndTimeoutRef = useRef<any>(null)
  const audioContextRef = useRef<any>(null)
  const analyserRef = useRef<any>(null)

  // Adaptive learning tracking
  const {
    isOnboarding,
    currentAdaptation,
    endSession,
    trackContentInteraction,
    trackQuizAnswer,
    trackBreakTaken,
    clearIntervention,
  } = useAdaptiveTracking(lessonId || null, { courseId })

  // Biometric tracking state
  const [showBiometricModal, setShowBiometricModal] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('neurolearn_biometric_prefs')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { voice: false, eyeTracking: false, mouseTracking: true }
      }
    }
    return { voice: false, eyeTracking: false, mouseTracking: true }
  })
  const [hasAskedPermissions, setHasAskedPermissions] = useState(false)

  // Biometric tracking hook
  const {
    isCalibrated,
    permissions: biometricPermissions,
    currentScores: biometricScores,
    isRecording: isVoiceRecording,
    setPermissionsGranted,
  } = useBiometricTracking(lessonId || null, {
    enabled: true,
    enableVoice: biometricEnabled.voice,
    enableEyeTracking: biometricEnabled.eyeTracking,
    enableMouseTracking: biometricEnabled.mouseTracking,
    onIntervention: (intervention) => {
      // Handle biometric-based interventions
      if (intervention.type === 'calming' || intervention.priority === 'high') {
        setInterventionType(intervention.type as any)
        setInterventionMessage(intervention.message)
        setShowIntervention(true)
      }
    },
  })

  // Show biometric permissions modal on first visit
  useEffect(() => {
    const hasAsked = localStorage.getItem('neurolearn_biometric_asked')
    if (!hasAsked && !hasAskedPermissions) {
      // Show after a short delay
      const timer = setTimeout(() => {
        setShowBiometricModal(true)
        setHasAskedPermissions(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [hasAskedPermissions])

  // Real-time SSE push interventions (Gap 6)
  const user = useAuthStore((s) => s.user)
  useSSEInterventions({
    userId: user?.id,
    enabled: true,
    onIntervention: (intervention) => {
      setInterventionType(intervention.type as any)
      setInterventionMessage(intervention.message)
      setShowIntervention(true)
    },
  })

  const handleBiometricPermissions = (perms: { voice: boolean; eyeTracking: boolean; mouseTracking: boolean }) => {
    setBiometricEnabled(perms)
    
    // Update the hook's permissions state so tracking can start
    setPermissionsGranted({
      microphone: perms.voice,
      camera: perms.eyeTracking,
    })
    
    localStorage.setItem('neurolearn_biometric_asked', 'true')
    localStorage.setItem('neurolearn_biometric_prefs', JSON.stringify(perms))
    
    if (perms.voice) {
      toast.success('Voice analysis enabled')
    }
    if (perms.eyeTracking) {
      toast.success('Eye tracking enabled')
    }
  }

  // Auto-show biometric permissions modal on lesson load (once per session)
  useEffect(() => {
    if (lesson && !hasAskedPermissions) {
      const timer = setTimeout(() => {
        setShowBiometricModal(true)
        setHasAskedPermissions(true)
        localStorage.setItem('neurolearn_biometric_asked', 'true')
      }, 1500) // Show after 1.5 seconds to let page load
      return () => clearTimeout(timer)
    }
  }, [lesson, hasAskedPermissions])

  // Intervention modal state
  const [showIntervention, setShowIntervention] = useState(false)
  const [interventionType, setInterventionType] = useState<'break' | 'simplify' | 'alternative' | 'calming' | 'encouragement'>('break')
  const [interventionMessage, setInterventionMessage] = useState('')

  // Show intervention when adaptation suggests it
  useEffect(() => {
    if (!currentAdaptation) return
    
    if (currentAdaptation.should_suggest_break) {
      setInterventionType('break')
      setInterventionMessage('You\'ve been learning for a while. Taking a short break can help you focus better.')
      setShowIntervention(true)
    } else if (currentAdaptation.should_reduce_difficulty) {
      setInterventionType('simplify')
      setInterventionMessage('This content seems challenging. Would you like me to present it in a simpler way?')
      setShowIntervention(true)
    } else if (currentAdaptation.should_offer_alternative_format &&
               currentAdaptation.suggested_format &&
               currentAdaptation.suggested_format !== contentFormat) {
      setInterventionType('alternative')
      setInterventionMessage(`Based on your learning style, you might prefer ${currentAdaptation.suggested_format} content.`)
      setShowIntervention(true)
    } else if (currentAdaptation.calming_intervention_needed) {
      setInterventionType('calming')
      setInterventionMessage('Let\'s take a moment to relax and reset before continuing.')
      setShowIntervention(true)
    }
  }, [currentAdaptation, contentFormat])

  // Track user interactions for focus score
  useEffect(() => {
    const handleInteraction = () => {
      setInteractionCount(prev => prev + 1)
      lastInteractionTime.current = new Date()
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setPauseCount(prev => prev + 1)
      }
    }
    
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('scroll', handleInteraction)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Auto-play quiz when question loads or changes (only when quiz is active)
  useEffect(() => {
    if (lesson?.quiz && autoPlayQuiz && showQuiz && !answeredQuestions[currentQuestionIndex]) {
      const timer = setTimeout(() => {
        handleQuizAutoPlay()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [currentQuestionIndex, lesson?.quiz, autoPlayQuiz, showQuiz, answeredQuestions])

  // Keyboard shortcuts for quiz answers (A/B/C/D or 1/2/3/4)
  useEffect(() => {
    if (!showQuiz || !lesson?.quiz) return
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (answeredQuestions[currentQuestionIndex]) return
      
      const key = e.key.toLowerCase()
      let optionIndex = -1
      
      if (['a', 'b', 'c', 'd'].includes(key)) {
        optionIndex = key.charCodeAt(0) - 97
      } else if (['1', '2', '3', '4'].includes(key)) {
        optionIndex = parseInt(key) - 1
      }
      
      if (optionIndex >= 0 && lesson.quiz && optionIndex < lesson.quiz.questions[currentQuestionIndex].options.length) {
        const letter = String.fromCharCode(65 + optionIndex)
        handleAnswerSelect(optionIndex)
        forceSpeak(`Selected option ${letter}`)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showQuiz, lesson?.quiz, currentQuestionIndex, answeredQuestions])

  // Cleanup speech timeout on unmount
  useEffect(() => {
    return () => {
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current)
      }
    }
  }, [])

  // Calculate dynamic focus score based on actual user behavior
  const calculateFocusScore = (): number => {
    const sessionDuration = (new Date().getTime() - sessionStart.getTime()) / 1000 / 60 // minutes
    const totalBlocks = lesson?.contentBlocks?.length || 1
    const blocksViewed = currentBlockIndex + 1
    
    // Base score from content progress
    const progressScore = (blocksViewed / totalBlocks) * 40
    
    // Interaction score (capped at 30)
    const expectedInteractions = sessionDuration * 3 // expect ~3 interactions per minute
    const interactionScore = Math.min(30, (interactionCount / Math.max(expectedInteractions, 1)) * 30)
    
    // Penalty for pauses/tab switches
    const pausePenalty = Math.min(20, pauseCount * 5)
    
    // Time consistency score (steady pace through content)
    const expectedTime = (lesson?.estimatedDuration || 10) / totalBlocks * blocksViewed
    const actualTime = sessionDuration
    const timeEfficiency = Math.max(0, 30 - Math.abs(expectedTime - actualTime) * 2)
    
    const totalScore = Math.round(progressScore + interactionScore + timeEfficiency - pausePenalty)
    return Math.max(0, Math.min(100, totalScore))
  }

  // Helper to normalize lesson data (handle both content string and contentBlocks array)
  const normalizeLesson = (lessonData: any): Lesson => {
    let contentBlocks: ContentBlock[] = lessonData.contentBlocks || []
    
    // If no contentBlocks but has content string, create a single text block
    if (contentBlocks.length === 0 && lessonData.content) {
      contentBlocks = [{
        type: 'text',
        content: lessonData.content,
      }]
    }
    
    // Normalize quiz format
    let quiz: Quiz | undefined = undefined
    if (lessonData.quiz) {
      if (Array.isArray(lessonData.quiz)) {
        // It's an array of questions, convert to Quiz object
        quiz = {
          questions: lessonData.quiz.map((q: any) => ({
            question: q.question || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? 0,
            explanation: q.explanation || '',
            points: q.points || 10,
          })),
          passingScore: 70,
        }
      } else if (lessonData.quiz.questions) {
        // It's already a Quiz object
        quiz = {
          questions: lessonData.quiz.questions.map((q: any) => ({
            question: q.question || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? 0,
            explanation: q.explanation || '',
            points: q.points || 10,
          })),
          passingScore: lessonData.quiz.passingScore || 70,
        }
      }
    }
    
    return {
      ...lessonData,
      contentBlocks,
      quiz,
      estimatedDuration: lessonData.estimatedDuration || lessonData.duration || 10,
    }
  }

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`)
        const normalizedLesson = normalizeLesson(response.data)
        setLesson(normalizedLesson)
      } catch (error) {
        console.error('Error fetching lesson:', error)
        toast.error('Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [courseId, lessonId])

  const handleFormatChange = async (format: typeof contentFormat) => {
    try {
      const response = await api.get(`/adaptive/adapt-content/${lessonId}?format=${format}`)
      if (lesson) {
        setLesson({ ...lesson, contentBlocks: response.data.contentBlocks })
      }
      setContentFormat(format)
      setShowFormatSelector(false)
      toast.success(`Switched to ${format} format`)
    } catch (error) {
      toast.error('This format is not available for this lesson')
    }
  }

  const handleTextToSpeech = () => {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
    } else {
      const currentBlock = lesson?.contentBlocks?.[currentBlockIndex]
      if (currentBlock) {
        const textToRead = currentBlock.type === 'text' 
          ? currentBlock.content 
          : currentBlock.transcription || currentBlock.altText || 'No text available'
        speak(textToRead)
        setIsSpeaking(true)
      }
    }
  }

  // Auto-play quiz: speak question then open mic
  const handleQuizAutoPlay = () => {
    if (!lesson?.quiz) return
    
    const currentQuestion = lesson.quiz.questions[currentQuestionIndex]
    const questionText = `Question ${currentQuestionIndex + 1}: ${currentQuestion.question}.`
    const optionsText = currentQuestion.options
      .map((option, idx) => `Option ${String.fromCharCode(65 + idx)}: ${option}.`)
      .join(' ')
    const fullText = `${questionText} ${optionsText}`
    
    setIsQuizSpeaking(true)
    forceSpeak(fullText)
    
    // Estimate speech duration (rough: 150 words per minute)
    const wordCount = fullText.split(' ').length
    const estimatedDuration = (wordCount / 150) * 60 * 1000 // Convert to milliseconds
    
    // Auto-open mic after speech finishes
    speechEndTimeoutRef.current = setTimeout(() => {
      setIsQuizSpeaking(false)
      if (!answeredQuestions[currentQuestionIndex]) {
        startVoiceRecognition()
      }
    }, estimatedDuration + 500) // Add 500ms buffer
  }

  const handleQuizTextToSpeech = () => {
    if (isQuizSpeaking) {
      stopSpeaking()
      if (speechEndTimeoutRef.current) {
        clearTimeout(speechEndTimeoutRef.current)
      }
      setIsQuizSpeaking(false)
    } else {
      if (lesson?.quiz) {
        const currentQuestion = lesson.quiz.questions[currentQuestionIndex]
        // Format: "Question 1: [question]. Option A: [option1]. Option B: [option2]..."
        const questionText = `Question ${currentQuestionIndex + 1}: ${currentQuestion.question}.`
        const optionsText = currentQuestion.options
          .map((option, idx) => `Option ${String.fromCharCode(65 + idx)}: ${option}.`)
          .join(' ')
        const fullText = `${questionText} ${optionsText}`
        forceSpeak(fullText) // Use forceSpeak to bypass global textToSpeech setting
        setIsQuizSpeaking(true)
      }
    }
  }

  // Voice recognition for quiz answers
  const startVoiceRecognition = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    // Start audio monitoring for visual feedback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      microphone.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      
      // Monitor volume
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const checkVolume = () => {
        if (analyserRef.current) {
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setVoiceVolume(Math.min(100, average * 2)) // Amplify for visibility
          requestAnimationFrame(checkVolume)
        }
      }
      checkVolume()
    } catch (err) {
      console.warn('Could not start audio monitoring:', err)
    }

    setIsVoiceListening(true)
    startRecognitionInstance()
  }

  // Helper to detect option from transcript
  const detectOptionFromText = (transcript: string): number => {
    const t = transcript.toLowerCase().trim()
    
    // Single letter
    if (/^[a-d]$/i.test(t)) return t.toUpperCase().charCodeAt(0) - 65
    // "option X"
    const optMatch = t.match(/option\s*([a-d])/i)
    if (optMatch) return optMatch[1].toUpperCase().charCodeAt(0) - 65
    // Letter anywhere
    const letterMatch = t.match(/\b([a-d])\b/i)
    if (letterMatch) return letterMatch[1].toUpperCase().charCodeAt(0) - 65
    // Phonetic: A
    if (/\b(ay|eh|hey|a)\b/i.test(t)) return 0
    // Phonetic: B
    if (/\b(be|bee|b)\b/i.test(t)) return 1
    // Phonetic: C
    if (/\b(see|sea|si|c)\b/i.test(t)) return 2
    // Phonetic: D
    if (/\b(dee|d)\b/i.test(t)) return 3
    // Numbers
    if (/\b(one|1|first|1st)\b/i.test(t)) return 0
    if (/\b(two|2|second|2nd|to|too)\b/i.test(t)) return 1
    if (/\b(three|3|third|3rd)\b/i.test(t)) return 2
    if (/\b(four|4|fourth|4th|for)\b/i.test(t)) return 3
    
    return -1
  }

  // Start a single recognition instance
  const startRecognitionInstance = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 5

    let hasSelected = false

    recognition.onresult = (event: any) => {
      if (hasSelected) return
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        
        // Check all alternatives for a match
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim()
          const confidence = result[j].confidence
          
          // Accept with very low confidence threshold for interim, any confidence for final
          if (result.isFinal || confidence > 0.3) {
            console.log(`Voice: "${transcript}" (confidence: ${confidence.toFixed(2)}, final: ${result.isFinal}, alt: ${j})`)
            
            const optionIndex = detectOptionFromText(transcript)
            
            if (optionIndex >= 0 && lesson?.quiz && optionIndex < lesson.quiz.questions[currentQuestionIndex].options.length) {
              hasSelected = true
              const letter = String.fromCharCode(65 + optionIndex)
              console.log('✅ Selecting option:', letter)
              handleAnswerSelect(optionIndex)
              forceSpeak(`Selected option ${letter}`)
              recognition.stop()
              return
            }
          }
        }
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Auto-restart silently
        console.log('Recognition ended, auto-restarting...')
      } else if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone in browser settings.')
        setIsVoiceListening(false)
      }
    }

    recognition.onend = () => {
      // Auto-restart if still listening and no answer selected
      if (!hasSelected && isVoiceListening) {
        console.log('Recognition ended, restarting...')
        try {
          recognition.start()
        } catch (e) {
          // If restart fails, create a new instance
          setTimeout(() => {
            if (isVoiceListening) startRecognitionInstance()
          }, 300)
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsVoiceListening(false)
    }
    // Stop audio monitoring
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setVoiceVolume(0)
  }

  const handleComplete = async () => {
    try {
      // Calculate dynamic focus score based on actual user behavior
      const focusScore = calculateFocusScore()
      
      // End adaptive tracking session (lessonCompleted, optional quizScore)
      await endSession(true, quizScore || undefined)
      
      // Record session with dynamic metrics
      await api.post('/progress/session', {
        courseId,
        lessonId,
        sessionData: {
          startTime: sessionStart,
          endTime: new Date(),
          focusScore,
          completionRate: 100,
          interactionCount,
          pauseCount,
        },
      })

      // Mark lesson complete
      await api.post('/progress/complete-lesson', { courseId, lessonId })
      
      toast.success('Lesson completed! +50 points 🎉')
      navigate(`/courses/${courseId}`)
    } catch (error) {
      toast.error('Failed to save progress')
    }
  }

  const goToNext = () => {
    if (lesson && currentBlockIndex < (lesson.contentBlocks?.length || 1) - 1) {
      // Track content interaction with time spent on this block
      const blockType = lesson.contentBlocks?.[currentBlockIndex]?.type || 'text'
      trackContentInteraction(blockType, true)
      
      setCurrentBlockIndex(prev => prev + 1)
      stopSpeaking()
      setIsSpeaking(false)
    }
  }

  const goToPrevious = () => {
    if (currentBlockIndex > 0) {
      // Track that user went back (might indicate confusion)
      const blockType = lesson?.contentBlocks?.[currentBlockIndex]?.type || 'text'
      trackContentInteraction(blockType, false) // Not completed since going back
      
      setCurrentBlockIndex(prev => prev - 1)
      stopSpeaking()
      setIsSpeaking(false)
    }
  }

  const renderContent = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-primary-700 dark:prose-headings:text-primary-300 prose-p:leading-relaxed prose-li:marker:text-primary-500">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
          </div>
        )
      case 'video':
        // Convert YouTube watch URL to embed URL
        const getEmbedUrl = (url: string) => {
          // Handle YouTube URLs
          if (url.includes('youtube.com/watch')) {
            const videoId = url.split('v=')[1]?.split('&')[0]
            return `https://www.youtube.com/embed/${videoId}`
          }
          if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0]
            return `https://www.youtube.com/embed/${videoId}`
          }
          // Handle Vimeo URLs
          if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
            return `https://player.vimeo.com/video/${videoId}`
          }
          // Already an embed URL or other video
          return url
        }
        
        const embedUrl = getEmbedUrl(block.content)
        const isEmbeddable = embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com')
        
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-xl">
              {isEmbeddable ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Lesson video"
                />
              ) : block.content.startsWith('http') ? (
                <video 
                  controls 
                  className="w-full h-full"
                  poster="https://via.placeholder.com/1280x720?text=Click+to+Play"
                >
                  <source src={block.content} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <p>Video: {block.content}</p>
                </div>
              )}
            </div>
            {block.transcription && (
              <details className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <summary className="font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
                  📝 Show Transcript (Accessibility)
                </summary>
                <p className="mt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{block.transcription}</p>
              </details>
            )}
          </div>
        )
      case 'audio':
        return (
          <div className="p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
            <div className="flex items-center justify-center gap-4 mb-4">
              <SpeakerWaveIcon className="h-12 w-12 text-primary-500" />
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">Audio Content</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{block.content}</p>
              </div>
            </div>
            {block.transcription && (
              <div className="p-4 bg-white dark:bg-gray-700 rounded-lg text-sm mt-4">
                <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Transcript:</p>
                <p className="text-gray-600 dark:text-gray-400">{block.transcription}</p>
              </div>
            )}
          </div>
        )
      case 'image':
        return (
          <div className="text-center">
            <img
              src={block.content}
              alt={block.altText || 'Lesson image'}
              className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=Image'
              }}
            />
            {block.altText && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 italic">
                {block.altText}
              </p>
            )}
          </div>
        )
      case 'interactive':
        return (
          <div className="p-6 bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 rounded-xl border-2 border-primary-200 dark:border-primary-700">
            <div className="text-center">
              <span className="text-4xl mb-4 block">🎮</span>
              <p className="font-semibold text-lg text-gray-800 dark:text-white">Interactive Activity</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{block.content}</p>
            </div>
          </div>
        )
      default:
        return (
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Lesson not found</p>
      </div>
    )
  }

  const contentBlocks = lesson.contentBlocks || []
  const currentBlock = contentBlocks[currentBlockIndex]
  const isLastBlock = currentBlockIndex === contentBlocks.length - 1

  // Quiz handlers
  const startQuiz = () => {
    if (lesson?.quiz) {
      setShowQuiz(true)
      setCurrentQuestionIndex(0)
      setSelectedAnswers(new Array(lesson.quiz.questions.length).fill(null))
      setAnsweredQuestions(new Array(lesson.quiz.questions.length).fill(false))
      setShowResult(false)
      setShowExplanation(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (answeredQuestions[currentQuestionIndex]) return
    
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const submitAnswer = () => {
    // Stop quiz voice if speaking
    if (isQuizSpeaking) {
      stopSpeaking()
      setIsQuizSpeaking(false)
    }
    
    const newAnswered = [...answeredQuestions]
    newAnswered[currentQuestionIndex] = true
    setAnsweredQuestions(newAnswered)
    setShowExplanation(true)
    
    // Track quiz answer for adaptive learning
    if (lesson?.quiz) {
      const currentQuestion = lesson.quiz.questions[currentQuestionIndex]
      const isCorrect = selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer
      trackQuizAnswer(`q${currentQuestionIndex}`, isCorrect, 10, false) // questionId, wasCorrect, timeToAnswer, usedHint
    }
  }

  const nextQuestion = () => {
    // Stop quiz voice if speaking
    if (isQuizSpeaking) {
      stopSpeaking()
      setIsQuizSpeaking(false)
    }
    
    setShowExplanation(false)
    if (lesson?.quiz && currentQuestionIndex < lesson.quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // Calculate score
      if (lesson?.quiz) {
        let score = 0
        lesson.quiz.questions.forEach((q, idx) => {
          if (selectedAnswers[idx] === q.correctAnswer) {
            score += q.points
          }
        })
        setQuizScore(score)
        setShowResult(true)
      }
    }
  }

  const retryQuiz = () => {
    startQuiz()
  }

  // Render Quiz Component
  const renderQuiz = () => {
    if (!lesson?.quiz) return null

    const currentQuestion = lesson.quiz.questions[currentQuestionIndex]
    const totalPoints = lesson.quiz.questions.reduce((sum, q) => sum + q.points, 0)
    const passingPoints = (lesson.quiz.passingScore / 100) * totalPoints
    const passed = quizScore >= passingPoints

    if (showResult) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
            passed ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
          }`}>
            {passed ? (
              <TrophyIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowPathIcon className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>
          
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            {passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            You scored <span className="font-bold text-primary-600">{quizScore}</span> out of {totalPoints} points
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-8">
            {lesson.quiz.questions.map((q, idx) => (
              <div
                key={idx}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  selectedAnswers[idx] === q.correctAnswer
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {selectedAnswers[idx] === q.correctAnswer ? '✓' : '✗'}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            {passed ? (
              <button onClick={handleComplete} className="btn-calm text-lg px-8 py-3">
                <CheckCircleIcon className="h-6 w-6 mr-2" />
                Complete Lesson
              </button>
            ) : (
              <>
                <button onClick={retryQuiz} className="btn-secondary text-lg px-6 py-3">
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Try Again
                </button>
                <button onClick={handleComplete} className="btn-primary text-lg px-6 py-3">
                  Continue Anyway
                </button>
              </>
            )}
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        {/* Progress */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {lesson.quiz.questions.length}
          </span>
          <div className="flex items-center gap-3">
            {/* Voice Assistant Button */}
            <button
              onClick={handleQuizTextToSpeech}
              className={`p-2 rounded-lg transition-colors ${
                isQuizSpeaking 
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label={isQuizSpeaking ? 'Stop reading question' : 'Read question aloud'}
              title={isQuizSpeaking ? 'Stop reading' : 'Read question and options aloud'}
            >
              {isQuizSpeaking ? (
                <SpeakerXMarkIcon className="h-5 w-5" />
              ) : (
                <SpeakerWaveIcon className="h-5 w-5" />
              )}
            </button>
            
            {/* Voice Recognition Button */}
            {!answeredQuestions[currentQuestionIndex] && (
              <button
                onClick={isVoiceListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`p-2 rounded-lg transition-colors ${
                  isVoiceListening 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 animate-pulse' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={isVoiceListening ? 'Stop listening' : 'Speak your answer'}
                title={isVoiceListening ? 'Listening... Say A, B, C, or D' : 'Click to speak your answer (A, B, C, or D)'}
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>
            )}
            
            <span className="text-sm font-medium text-primary-600">
              {currentQuestion.points} points
            </span>
          </div>
        </div>

        {/* Voice Listening Hint */}
        {isVoiceListening && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <MicrophoneIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                🎤 Listening... Say or press: A, B, C, or D
              </span>
            </div>
            {/* Volume Indicator */}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Volume:</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                    style={{ width: `${voiceVolume}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{Math.round(voiceVolume)}%</span>
              </div>
              {voiceVolume < 10 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Low volume detected. Speak louder or closer to mic.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Question */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestionIndex] === idx
            const isCorrect = idx === currentQuestion.correctAnswer
            const isAnswered = answeredQuestions[currentQuestionIndex]

            let buttonClass = 'w-full p-4 text-left rounded-xl border-2 transition-all '
            
            if (isAnswered) {
              if (isCorrect) {
                buttonClass += 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              } else if (isSelected && !isCorrect) {
                buttonClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              } else {
                buttonClass += 'border-gray-200 dark:border-gray-700 text-gray-500'
              }
            } else if (isSelected) {
              buttonClass += 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            } else {
              buttonClass += 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(idx)}
                disabled={isAnswered}
                className={buttonClass}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isSelected ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-lg">{option}</span>
                  {isAnswered && isCorrect && (
                    <CheckCircleIcon className="h-6 w-6 ml-auto text-green-500" />
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <XCircleIcon className="h-6 w-6 ml-auto text-red-500" />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl ${
                selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer
                  ? 'bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <p className="font-medium mb-1">
                {selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer
                  ? '✅ Correct!'
                  : '💡 Learning moment!'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">{currentQuestion.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          {!answeredQuestions[currentQuestionIndex] ? (
            <button
              onClick={submitAnswer}
              disabled={selectedAnswers[currentQuestionIndex] === null}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary">
              {currentQuestionIndex < lesson.quiz.questions.length - 1 ? 'Next Question' : 'See Results'}
              <ChevronRightIcon className="h-5 w-5 ml-1" />
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Biometric Permissions Modal */}
      <BiometricPermissionsModal
        isOpen={showBiometricModal}
        onClose={() => {
          setShowBiometricModal(false)
          localStorage.setItem('neurolearn_biometric_asked', 'true')
        }}
        onSubmit={handleBiometricPermissions}
        currentPermissions={biometricPermissions}
      />

      {/* Adaptive Intervention Modal */}
      <AdaptiveInterventionModal
        isVisible={showIntervention}
        type={interventionType}
        message={interventionMessage}
        suggestedFormat={currentAdaptation?.suggested_format}
        onDismiss={() => {
          setShowIntervention(false)
          clearIntervention()
        }}
        onAccept={(action) => {
          if (action === 'video' || action === 'audio' || action === 'text') {
            handleFormatChange(action as typeof contentFormat)
          } else if (action === 'simplify') {
            handleFormatChange('simplified')
          }
          setShowIntervention(false)
          clearIntervention()
        }}
        onTakeBreak={() => {
          trackBreakTaken(true)
          setShowIntervention(false)
          clearIntervention()
          toast.success('Taking a break! You earned +5 XP for self-care 🌟')
        }}
      />

      {/* Biometric Status Indicator */}
      {(biometricEnabled.voice || biometricEnabled.eyeTracking) && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 bg-white dark:bg-gray-800 
                        rounded-full px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
          {biometricEnabled.voice && (
            <div className={`flex items-center gap-1 ${isVoiceRecording ? 'text-red-500' : 'text-gray-400'}`}>
              <MicrophoneIcon className="h-4 w-4" />
              {isVoiceRecording && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            </div>
          )}
          {biometricEnabled.eyeTracking && (
            <div className={`flex items-center gap-1 ${isCalibrated ? 'text-green-500' : 'text-gray-400'}`}>
              <EyeIcon className="h-4 w-4" />
              {isCalibrated && <span className="w-2 h-2 bg-green-500 rounded-full" />}
            </div>
          )}
          <div className="text-xs text-gray-500 ml-1">
            <CpuChipIcon className="h-3 w-3 inline mr-1" />
            Adaptive
          </div>
        </div>
      )}

      {/* Biometric Scores (Debug/Dev Mode) */}
      {(biometricEnabled.voice || biometricEnabled.eyeTracking || biometricEnabled.mouseTracking) && 
       process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 
                        rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700
                        text-xs font-mono">
          <div className="text-gray-500 mb-1">Biometric Scores</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span>Attention:</span>
            <span className={biometricScores.attention < 40 ? 'text-red-500' : 'text-green-500'}>
              {biometricScores.attention.toFixed(0)}%
            </span>
            <span>Engagement:</span>
            <span className={biometricScores.engagement < 40 ? 'text-red-500' : 'text-green-500'}>
              {biometricScores.engagement.toFixed(0)}%
            </span>
            <span>Stress:</span>
            <span className={biometricScores.stress > 60 ? 'text-red-500' : 'text-green-500'}>
              {biometricScores.stress.toFixed(0)}%
            </span>
            <span>Frustration:</span>
            <span className={biometricScores.frustration > 60 ? 'text-red-500' : 'text-green-500'}>
              {biometricScores.frustration.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Onboarding indicator */}
      {isOnboarding && (
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-center py-2 px-4 text-sm">
          <SparklesIcon className="h-4 w-4 inline mr-2" />
          Learning Discovery Mode: We're adapting to your learning style
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (showQuiz) {
                  setShowQuiz(false)
                } else {
                  navigate(`/courses/${courseId}`)
                }
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              {showQuiz ? 'Back to Lesson' : 'Back to Course'}
            </button>
            <div className="flex items-center gap-4">
              {!showQuiz && (
                <>
                  {/* Biometric Settings Button */}
                  <button
                    onClick={() => setShowBiometricModal(true)}
                    className={`p-2 rounded-lg ${
                      (biometricEnabled.voice || biometricEnabled.eyeTracking) 
                        ? 'bg-accent-100 text-accent-600 dark:bg-accent-900 dark:text-accent-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-label="Biometric tracking settings"
                    title="Enable voice/eye tracking"
                  >
                    <CpuChipIcon className="h-5 w-5" />
                  </button>

                  {/* Format Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFormatSelector(!showFormatSelector)}
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      aria-label="Change content format"
                    >
                      <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    </button>
                    {showFormatSelector && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                        {['default', 'simplified', 'visual', 'audio'].map((format) => (
                          <button
                            key={format}
                            onClick={() => handleFormatChange(format as typeof contentFormat)}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 capitalize ${
                              contentFormat === format ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {format}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text to Speech */}
                  {settings.textToSpeech && (
                    <button
                      onClick={handleTextToSpeech}
                      className={`p-2 rounded-lg ${
                        isSpeaking ? 'bg-primary-100 text-primary-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
                    >
                      {isSpeaking ? (
                        <SpeakerXMarkIcon className="h-5 w-5" />
                      ) : (
                        <SpeakerWaveIcon className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>{lesson.title}</span>
              <span>
                {showQuiz 
                  ? `Quiz: ${currentQuestionIndex + 1} / ${lesson.quiz?.questions.length || 0}`
                  : `${currentBlockIndex + 1} / ${contentBlocks.length}`
                }
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ 
                  width: showQuiz 
                    ? `${((currentQuestionIndex + 1) / (lesson.quiz?.questions.length || 1)) * 100}%`
                    : `${((currentBlockIndex + 1) / (contentBlocks.length || 1)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {showQuiz ? (
          <div className="card min-h-[400px] p-8">
            {renderQuiz()}
          </div>
        ) : (
          <>
            <motion.div
              key={currentBlockIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              ref={contentRef}
              className="card min-h-[400px] p-8"
            >
              {currentBlock ? renderContent(currentBlock) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No content available</p>
                </div>
              )}
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={goToPrevious}
                disabled={currentBlockIndex === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Previous
              </button>

              <div className="flex gap-2">
                {contentBlocks.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBlockIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentBlockIndex
                        ? 'bg-primary-600'
                        : index < currentBlockIndex
                        ? 'bg-primary-300'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Go to section ${index + 1}`}
                  />
                ))}
              </div>

              {isLastBlock ? (
                lesson.quiz && lesson.quiz.questions.length > 0 ? (
                  <button onClick={startQuiz} className="btn-accent">
                    📝 Take Quiz
                  </button>
                ) : (
                  <button onClick={handleComplete} className="btn-calm">
                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                    Complete Lesson
                  </button>
                )
              ) : (
                <button onClick={goToNext} className="btn-primary">
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
