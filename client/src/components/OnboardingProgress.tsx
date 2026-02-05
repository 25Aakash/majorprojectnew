import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  SparklesIcon,
  LightBulbIcon,
  ArrowRightIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline'

interface OnboardingStatus {
  isOnboarding: boolean
  daysCompleted: number
  daysRemaining: number
  sessionsCompleted: number
  insightsDiscovered: number
  confidenceLevel: number
  topInsights: Array<{
    insight: string
    confidence: number
    basedOnSessions: number
  }>
  discoveredPreferences: {
    bestContentType?: string
    bestTimeOfDay?: string
    optimalSessionLength?: number
    needsFrequentBreaks?: boolean
  }
  message: string
}

export default function OnboardingProgress() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchOnboardingStatus()
  }, [])

  const fetchOnboardingStatus = async () => {
    try {
      const response = await api.get('/adaptive-learning/onboarding-status')
      setStatus(response.data)
    } catch (error) {
      console.error('Error fetching onboarding status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  if (!status) return null

  const progressPercent = (status.daysCompleted / 7) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-primary-500 to-accent-600 text-white overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <BeakerIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {status.isOnboarding ? 'Learning Discovery Period' : 'Your Learning Profile'}
            </h3>
            <p className="text-sm text-white/80">
              {status.isOnboarding 
                ? `Day ${status.daysCompleted + 1} of 7` 
                : 'Personalization complete!'}
            </p>
          </div>
        </div>
        
        {status.confidenceLevel > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(status.confidenceLevel)}%</div>
            <div className="text-xs text-white/70">Profile Confidence</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status.isOnboarding && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Discovery Progress</span>
            <span>{status.daysCompleted}/7 days</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-2 bg-white/10 rounded-lg">
          <div className="text-2xl font-bold">{status.sessionsCompleted}</div>
          <div className="text-xs text-white/70">Sessions</div>
        </div>
        <div className="text-center p-2 bg-white/10 rounded-lg">
          <div className="text-2xl font-bold">{status.insightsDiscovered}</div>
          <div className="text-xs text-white/70">Insights</div>
        </div>
        <div className="text-center p-2 bg-white/10 rounded-lg">
          <div className="text-2xl font-bold">
            {status.discoveredPreferences.optimalSessionLength || '--'}
          </div>
          <div className="text-xs text-white/70">Min/Session</div>
        </div>
      </div>

      {/* Message */}
      <div className="bg-white/10 rounded-lg p-3 mb-4">
        <p className="text-sm">{status.message}</p>
      </div>

      {/* Discovered Preferences */}
      {(status.discoveredPreferences.bestContentType || status.discoveredPreferences.bestTimeOfDay) && (
        <div className="space-y-2 mb-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <LightBulbIcon className="h-4 w-4" />
            What We've Learned About You
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {status.discoveredPreferences.bestContentType && (
              <div className="bg-white/10 rounded-lg p-2 text-sm">
                <span className="text-white/70">Best format:</span>{' '}
                <span className="font-medium capitalize">
                  {status.discoveredPreferences.bestContentType}
                </span>
              </div>
            )}
            {status.discoveredPreferences.bestTimeOfDay && (
              <div className="bg-white/10 rounded-lg p-2 text-sm">
                <span className="text-white/70">Best time:</span>{' '}
                <span className="font-medium capitalize">
                  {status.discoveredPreferences.bestTimeOfDay}
                </span>
              </div>
            )}
            {status.discoveredPreferences.needsFrequentBreaks !== undefined && (
              <div className="bg-white/10 rounded-lg p-2 text-sm col-span-2">
                <span className="text-white/70">Break style:</span>{' '}
                <span className="font-medium">
                  {status.discoveredPreferences.needsFrequentBreaks 
                    ? 'Frequent short breaks work best'
                    : 'Longer focus periods suit you'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Insights */}
      {status.topInsights.length > 0 && (
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 mb-4"
            >
              <h4 className="font-medium text-sm flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                Discovered Insights
              </h4>
              {status.topInsights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 rounded-lg p-3 text-sm"
                >
                  <p>{insight.insight}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                    <span>{insight.confidence}% confidence</span>
                    <span>•</span>
                    <span>Based on {insight.basedOnSessions} sessions</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {status.topInsights.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-white/80 hover:text-white flex items-center gap-1"
          >
            {showDetails ? 'Hide insights' : 'Show insights'}
            <ArrowRightIcon className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
        )}
        
        <button
          onClick={() => navigate('/courses')}
          className="btn bg-white text-primary-600 hover:bg-white/90 text-sm"
        >
          {status.isOnboarding ? 'Continue Learning' : 'Start Learning'}
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-300/10 rounded-full blur-xl -ml-12 -mb-12" />
    </motion.div>
  )
}
