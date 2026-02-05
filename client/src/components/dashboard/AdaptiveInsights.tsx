import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import {
  SparklesIcon,
  LightBulbIcon,
  ClockIcon,
  DocumentTextIcon,
  FilmIcon,
  SpeakerWaveIcon,
  SunIcon,
  MoonIcon,
  ChartBarIcon,
  HeartIcon,
  BoltIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface ContentPreferences {
  preferredFormats: { format: string; score: number }[]
  readingSpeed: string
  attentionSpan: string
  visualVsText: number
  detailLevel: string
}

interface LearningPatterns {
  bestTimeOfDay: string
  optimalSessionDuration: number
  breakFrequency: string
  focusPatterns: { environment: string; score: number }[]
}

interface EngagementIndicators {
  engagementLevel: string
  motivationTriggers: string[]
  stressIndicators: string[]
  copingStrategies: string[]
}

interface AdaptiveProfile {
  isOnboardingComplete: boolean
  onboardingProgress: {
    daysCompleted: number
    totalDays: number
    sessionsCompleted: number
    insightsDiscovered: string[]
  }
  discoveredPreferences: {
    contentPreferences: ContentPreferences
    learningPatterns: LearningPatterns
    engagementIndicators: EngagementIndicators
    accessibilityNeeds: {
      preferredContrast: string
      fontSizePreference: string
      animationSensitivity: string
    }
  }
  confidenceScores: Record<string, number>
}

export function AdaptiveInsights() {
  const [profile, setProfile] = useState<AdaptiveProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patterns' | 'preferences'>('overview')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/adaptive-learning/profile')
      setProfile(response.data)
    } catch (error) {
      console.error('Failed to fetch adaptive profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card p-6 text-center">
        <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Start learning to discover your personalized learning profile!
        </p>
      </div>
    )
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'video':
        return <FilmIcon className="h-5 w-5" />
      case 'audio':
        return <SpeakerWaveIcon className="h-5 w-5" />
      default:
        return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const getTimeIcon = (time: string) => {
    if (time === 'morning' || time === 'afternoon') {
      return <SunIcon className="h-5 w-5 text-yellow-500" />
    }
    return <MoonIcon className="h-5 w-5 text-indigo-500" />
  }

  const renderOnboardingProgress = () => {
    const progress = profile?.onboardingProgress
    if (!progress) return null
    
    const percentComplete = (progress.daysCompleted / progress.totalDays) * 100

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="h-6 w-6 text-primary-500" />
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            Learning Discovery
          </h3>
          <span className="ml-auto text-sm bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full">
            Day {progress.daysCompleted} of {progress.totalDays}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Profile building progress</span>
            <span>{Math.round(percentComplete)}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentComplete}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <ClockIcon className="h-5 w-5 text-primary-500 mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {progress.sessionsCompleted}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Sessions completed</p>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <LightBulbIcon className="h-5 w-5 text-accent-500 mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {progress.insightsDiscovered.length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Insights discovered</p>
          </div>
        </div>

        {/* Recent insights */}
        {(progress.insightsDiscovered?.length || 0) > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent discoveries:
            </p>
            <div className="flex flex-wrap gap-2">
              {(progress.insightsDiscovered || []).slice(-3).map((insight, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300"
                >
                  ✨ {insight}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const renderOverview = () => {
    const prefs = profile?.discoveredPreferences
    if (!prefs) return <div className="text-gray-500">No preferences discovered yet</div>
    const patterns = prefs.learningPatterns
    const content = prefs.contentPreferences
    if (!patterns || !content) return <div className="text-gray-500">Still learning your preferences...</div>

    return (
      <div className="space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-4 text-center">
            {getTimeIcon(patterns.bestTimeOfDay)}
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              Best at {patterns.bestTimeOfDay}
            </p>
          </div>
          <div className="bg-accent-50 dark:bg-accent-900/30 rounded-xl p-4 text-center">
            <ClockIcon className="h-5 w-5 mx-auto text-accent-500" />
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {patterns.optimalSessionDuration} min sessions
            </p>
          </div>
          <div className="bg-calm-50 dark:bg-calm-900/30 rounded-xl p-4 text-center">
            {getFormatIcon(content.preferredFormats[0]?.format || 'text')}
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              Prefers {content.preferredFormats[0]?.format || 'text'}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
            <BoltIcon className="h-5 w-5 mx-auto text-green-500" />
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {content.readingSpeed} pace
            </p>
          </div>
        </div>

        {/* Learning profile summary */}
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-primary-500" />
            Your Learning Profile
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            You learn best during the <strong>{patterns.bestTimeOfDay}</strong> in{' '}
            <strong>{patterns.optimalSessionDuration}-minute sessions</strong>. You prefer{' '}
            <strong>{content.preferredFormats[0]?.format || 'text'}</strong> content with a{' '}
            <strong>{content.detailLevel}</strong> level of detail. You're a{' '}
            <strong>{content.readingSpeed}</strong> reader with{' '}
            <strong>{content.attentionSpan}</strong> attention span.
          </p>
        </div>
      </div>
    )
  }

  const renderPatterns = () => {
    const prefs = profile?.discoveredPreferences
    if (!prefs) return <div className="text-gray-500">No patterns discovered yet</div>
    const patterns = prefs.learningPatterns
    const engagement = prefs.engagementIndicators
    if (!patterns || !engagement) return <div className="text-gray-500">Still learning your patterns...</div>

    return (
      <div className="space-y-6">
        {/* Focus patterns */}
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            Focus Patterns
          </h4>
          <div className="space-y-3">
            {(patterns.focusPatterns || []).map((pattern, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-24 capitalize">
                  {pattern.environment}
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${pattern.score * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(pattern.score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Motivation & Stress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <HeartIcon className="h-5 w-5 text-red-500" />
              What Motivates You
            </h4>
            <div className="flex flex-wrap gap-2">
              {(engagement.motivationTriggers || []).map((trigger, idx) => (
                <span
                  key={idx}
                  className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full"
                >
                  {trigger}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-calm-500" />
              Helpful Strategies
            </h4>
            <div className="flex flex-wrap gap-2">
              {(engagement.copingStrategies || []).map((strategy, idx) => (
                <span
                  key={idx}
                  className="text-sm bg-calm-100 dark:bg-calm-900/30 text-calm-700 dark:text-calm-300 px-3 py-1 rounded-full"
                >
                  {strategy}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPreferences = () => {
    const prefs = profile?.discoveredPreferences
    if (!prefs) return <div className="text-gray-500">No preferences discovered yet</div>
    const content = prefs.contentPreferences
    const accessibility = prefs.accessibilityNeeds
    if (!content || !accessibility) return <div className="text-gray-500">Still learning your preferences...</div>

    return (
      <div className="space-y-6">
        {/* Content format preferences */}
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            Content Format Preferences
          </h4>
          <div className="space-y-4">
                        {(content.preferredFormats || []).map((pref, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  {getFormatIcon(pref.format)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {pref.format}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(pref.score * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                      style={{ width: `${pref.score * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Visual vs Text preference */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Visual</span>
              <span>Text</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-primary-500 rounded-full"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-0 h-full w-1 bg-white dark:bg-gray-900 rounded-full"
                style={{ left: `${content.visualVsText * 100}%`, transform: 'translateX(-50%)' }}
              />
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              You prefer a {Math.round(content.visualVsText * 100)}% visual / {Math.round((1 - content.visualVsText) * 100)}% text mix
            </p>
          </div>
        </div>

        {/* Accessibility needs */}
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            Accessibility Preferences
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Contrast</p>
              <p className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {accessibility.preferredContrast}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Font Size</p>
              <p className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {accessibility.fontSizePreference}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Animations</p>
              <p className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {accessibility.animationSensitivity}
              </p>
            </div>
          </div>
        </div>

        {/* Confidence scores */}
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            Profile Confidence
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            How confident we are in each aspect of your profile based on observed data.
          </p>
          <div className="space-y-3">
            {Object.entries(profile?.confidenceScores || {}).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-32 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      value > 0.7 ? 'bg-green-500' : value > 0.4 ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(value * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <SparklesIcon className="h-7 w-7 text-primary-500" />
          Adaptive Learning Insights
        </h2>
      </div>

      {/* Onboarding progress if not complete */}
      {profile && !profile.isOnboardingComplete && renderOnboardingProgress()}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'patterns', 'preferences'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              selectedTab === tab
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {selectedTab === 'overview' && renderOverview()}
          {selectedTab === 'patterns' && renderPatterns()}
          {selectedTab === 'preferences' && renderPreferences()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default AdaptiveInsights
