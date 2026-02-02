import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  VideoCameraIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  AcademicCapIcon,
  FilmIcon,
} from '@heroicons/react/24/outline'

interface VideoSlide {
  id: number
  type: 'intro' | 'content' | 'outro'
  title: string
  narration: string
  visual_description?: string
  key_points?: string[]
  duration: number
  animation: string
  progress?: string
  encouragement?: string
  highlight_words?: string[]
  audio_file?: string
}

interface VideoResult {
  success: boolean
  type: string
  title: string
  total_slides: number
  total_duration: number
  slides: VideoSlide[]
  adaptations: Array<{
    condition: string
    adaptations: Record<string, unknown>
  }>
}

const conditions = [
  { id: 'adhd', label: 'ADHD', color: 'bg-orange-100 text-orange-800' },
  { id: 'autism', label: 'Autism', color: 'bg-blue-100 text-blue-800' },
  { id: 'dyslexia', label: 'Dyslexia', color: 'bg-purple-100 text-purple-800' },
  { id: 'dyscalculia', label: 'Dyscalculia', color: 'bg-green-100 text-green-800' },
  { id: 'dysgraphia', label: 'Dysgraphia', color: 'bg-pink-100 text-pink-800' },
]

const subjects = [
  { id: 'math', label: 'Mathematics', icon: '🔢' },
  { id: 'reading', label: 'Reading & Language', icon: '📚' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'history', label: 'History', icon: '📜' },
  { id: 'art', label: 'Art & Creativity', icon: '🎨' },
]

const difficulties = [
  { id: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
  { id: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-800' },
]

export default function AIVideoGenerator() {
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('math')
  const [difficulty, setDifficulty] = useState('beginner')
  const [duration, setDuration] = useState(5)
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [preferAvatar, setPreferAvatar] = useState(false)
  
  const [generating, setGenerating] = useState(false)
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showScript, setShowScript] = useState(false)

  const toggleCondition = (conditionId: string) => {
    setSelectedConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(c => c !== conditionId)
        : [...prev, conditionId]
    )
  }

  const generateVideo = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic')
      return
    }

    setGenerating(true)
    setVideoResult(null)

    try {
      const response = await fetch('http://localhost:8000/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          conditions: selectedConditions,
          learning_styles: ['visual'],
          duration_minutes: duration,
          difficulty,
          prefer_avatar: preferAvatar,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setVideoResult(data)
        setCurrentSlideIndex(0)
        toast.success('Video generated successfully!')
      } else {
        toast.error(data.error || 'Failed to generate video')
      }
    } catch (error) {
      console.error('Error generating video:', error)
      toast.error('Failed to connect to AI service')
    } finally {
      setGenerating(false)
    }
  }

  const playSlide = () => {
    if (!videoResult) return
    
    setIsPlaying(true)
    
    // Auto-advance slides
    const slideTimer = setInterval(() => {
      setCurrentSlideIndex(prev => {
        if (prev >= videoResult.slides.length - 1) {
          setIsPlaying(false)
          clearInterval(slideTimer)
          return prev
        }
        return prev + 1
      })
    }, 5000) // 5 seconds per slide for preview
    
    return () => clearInterval(slideTimer)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FilmIcon className="h-10 w-10 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Video Generator
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Create personalized educational videos for neurodiverse learners
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Topic Input */}
            <div className="card p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Multiplication Tables, Reading Comprehension..."
                className="input w-full"
              />
            </div>

            {/* Subject Selection */}
            <div className="card p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Subject Area
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubject(s.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      subject === s.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-sm mt-1">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration & Difficulty */}
            <div className="card p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration: {duration} minutes
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>2 min</span>
                    <span>15 min</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <div className="space-y-2">
                    {difficulties.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDifficulty(d.id)}
                        className={`w-full px-3 py-1.5 rounded text-sm ${
                          difficulty === d.id
                            ? d.color + ' ring-2 ring-offset-2 ring-current'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="card p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Adapt for Conditions
              </label>
              <div className="flex flex-wrap gap-2">
                {conditions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCondition(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedConditions.includes(c.id)
                        ? c.color + ' ring-2 ring-offset-2 ring-current'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              
              {selectedConditions.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Adaptations will include:</strong>
                    {selectedConditions.includes('adhd') && ' Short segments, progress tracking,'}
                    {selectedConditions.includes('autism') && ' Structured format, predictable layout,'}
                    {selectedConditions.includes('dyslexia') && ' Captions, highlighted keywords,'}
                    {selectedConditions.includes('dyscalculia') && ' Step-by-step visuals,'}
                    {selectedConditions.includes('dysgraphia') && ' Voice input support,'} and more.
                  </p>
                </div>
              )}
            </div>

            {/* Avatar Option */}
            <div className="card p-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferAvatar}
                  onChange={(e) => setPreferAvatar(e.target.checked)}
                  className="w-5 h-5 rounded text-primary-600"
                />
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Use AI Avatar (D-ID)
                  </span>
                  <p className="text-sm text-gray-500">
                    Creates a talking avatar video. Requires D-ID API key.
                  </p>
                </div>
              </label>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateVideo}
              disabled={generating || !topic.trim()}
              className="btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="h-6 w-6 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-6 w-6" />
                  Generate Educational Video
                </>
              )}
            </button>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {videoResult ? (
              <>
                {/* Video Preview */}
                <div className="card overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-primary-600 to-primary-800 relative">
                    <AnimatePresence mode="wait">
                      {videoResult.slides[currentSlideIndex] && (
                        <motion.div
                          key={currentSlideIndex}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          className="absolute inset-0 flex flex-col items-center justify-center text-white p-8"
                        >
                          <h2 className="text-2xl font-bold mb-4">
                            {videoResult.slides[currentSlideIndex].title}
                          </h2>
                          
                          {videoResult.slides[currentSlideIndex].key_points && (
                            <ul className="space-y-2 text-left max-w-md">
                              {videoResult.slides[currentSlideIndex].key_points?.map((point, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {videoResult.slides[currentSlideIndex].progress && (
                            <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-sm">
                              {videoResult.slides[currentSlideIndex].progress}
                            </div>
                          )}
                          
                          {videoResult.slides[currentSlideIndex].encouragement && (
                            <div className="absolute bottom-4 left-4 right-4 text-center bg-yellow-500/90 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium">
                              {videoResult.slides[currentSlideIndex].encouragement}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Playback Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                      <button
                        onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                        disabled={currentSlideIndex === 0}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50"
                      >
                        <PlayIcon className="h-5 w-5 rotate-180" />
                      </button>
                      
                      <button
                        onClick={() => isPlaying ? setIsPlaying(false) : playSlide()}
                        className="p-3 bg-white rounded-full text-primary-600 hover:bg-gray-100"
                      >
                        {isPlaying ? (
                          <PauseIcon className="h-6 w-6" />
                        ) : (
                          <PlayIcon className="h-6 w-6" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => setCurrentSlideIndex(Math.min(videoResult.slides.length - 1, currentSlideIndex + 1))}
                        disabled={currentSlideIndex === videoResult.slides.length - 1}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Dots */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-center gap-2">
                    {videoResult.slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlideIndex(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentSlideIndex
                            ? 'bg-primary-600 w-6'
                            : index < currentSlideIndex
                            ? 'bg-primary-300'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Video Info */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{videoResult.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {formatDuration(videoResult.total_duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DocumentTextIcon className="h-4 w-4" />
                        {videoResult.total_slides} slides
                      </span>
                    </div>
                  </div>
                  
                  {videoResult.adaptations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Adaptations applied:</p>
                      <div className="flex flex-wrap gap-2">
                        {videoResult.adaptations.map((a, i) => (
                          <span key={i} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                            {a.condition.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowScript(!showScript)}
                      className="btn-secondary flex-1"
                    >
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      {showScript ? 'Hide Script' : 'View Script'}
                    </button>
                    <button className="btn-primary flex-1">
                      <SpeakerWaveIcon className="h-5 w-5 mr-2" />
                      Generate Audio
                    </button>
                  </div>
                </div>

                {/* Script View */}
                {showScript && (
                  <div className="card p-6 max-h-96 overflow-y-auto">
                    <h4 className="font-semibold mb-4">Video Script</h4>
                    <div className="space-y-4">
                      {videoResult.slides.map((slide, index) => (
                        <div 
                          key={index}
                          className={`p-4 rounded-lg ${
                            index === currentSlideIndex
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                              : 'bg-gray-50 dark:bg-gray-800'
                          }`}
                          onClick={() => setCurrentSlideIndex(index)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                              {slide.type.toUpperCase()}
                            </span>
                            <h5 className="font-medium">{slide.title}</h5>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {slide.narration}
                          </p>
                          {slide.highlight_words && slide.highlight_words.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              <span className="text-xs text-gray-500">Keywords:</span>
                              {slide.highlight_words.map((w, i) => (
                                <span key={i} className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                                  {w}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="card p-12 text-center">
                <VideoCameraIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No Video Generated Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Fill in the details on the left and click "Generate" to create 
                  a personalized educational video.
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <AcademicCapIcon className="h-5 w-5 text-primary-500" />
                    Adaptive content
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <SpeakerWaveIcon className="h-5 w-5 text-primary-500" />
                    Audio narration
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <SparklesIcon className="h-5 w-5 text-primary-500" />
                    AI-powered scripts
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500" />
                    Progress tracking
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
