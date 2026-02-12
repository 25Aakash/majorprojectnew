import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import AIRecommendations from '../components/AIRecommendations'
import AdaptiveInsights from '../components/dashboard/AdaptiveInsights'
import PerformanceCharts from '../components/dashboard/PerformanceCharts'
import OnboardingProgress from '../components/OnboardingProgress'
import {
  AcademicCapIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon,
  ChartBarIcon,
  PlayIcon,
  SparklesIcon,
  HeartIcon,
  LightBulbIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

interface CourseProgress {
  _id: string
  courseId: {
    _id: string
    title: string
    thumbnail?: string
    category: string
  }
  currentLesson?: {
    title: string
  }
  overallProgress: number
  timeSpent: number
  streakData: {
    currentStreak: number
  }
}

interface LearningInsights {
  optimalSessionDuration: number
  bestTimeOfDay: string
  preferredContentType: string
  recommendedPace: string
  totalLearningTime: number
}

// Condition-specific tips and messages
const conditionTips: Record<string, { greeting: string; tips: string[]; emoji: string }> = {
  adhd: {
    greeting: "Let's keep things focused and fun!",
    emoji: "⚡",
    tips: [
      "Take breaks every 15-20 minutes",
      "Use Focus Mode to block distractions",
      "Try the Pomodoro technique",
      "Move around between sessions",
    ],
  },
  autism: {
    greeting: "Your structured learning space is ready!",
    emoji: "🌈",
    tips: [
      "Stick to your routine for best results",
      "Use the calm color theme if needed",
      "Take sensory breaks when overwhelmed",
      "Preview lesson content before starting",
    ],
  },
  dyslexia: {
    greeting: "Your dyslexia-friendly experience awaits!",
    emoji: "📚",
    tips: [
      "Use text-to-speech for reading help",
      "Try the OpenDyslexic font in settings",
      "Break text into smaller chunks",
      "Use audio/video content when available",
    ],
  },
  dyscalculia: {
    greeting: "Math at your own pace!",
    emoji: "🔢",
    tips: [
      "Use visual aids for number concepts",
      "Take extra time with math content",
      "Try hands-on practice exercises",
      "Use calculators when needed",
    ],
  },
  dysgraphia: {
    greeting: "Learning without writing barriers!",
    emoji: "✏️",
    tips: [
      "Use voice-to-text when possible",
      "Try typing instead of handwriting",
      "Use graphic organizers for notes",
      "Take frequent hand breaks",
    ],
  },
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [progress, setProgress] = useState<CourseProgress[]>([])
  const [insights, setInsights] = useState<LearningInsights | null>(null)
  const [loading, setLoading] = useState(true)

  // Redirect educators to their dashboard
  if (user?.role === 'educator') {
    return <Navigate to="/educator" replace />
  }

  // Redirect parents to their dashboard
  if (user?.role === 'parent') {
    return <Navigate to="/parent-dashboard" replace />
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressRes, insightsRes] = await Promise.all([
          api.get('/progress/my-progress'),
          api.get('/adaptive/insights'),
        ])
        setProgress(progressRes.data)
        // Backend now returns {insights: {...}, insightsArray: [...]}
        setInsights(insightsRes.data.insights)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const userConditions = user?.neurodiverseProfile?.conditions || []
  const primaryCondition = userConditions[0]
  const conditionInfo = primaryCondition ? conditionTips[primaryCondition] : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Personalized Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName}! {conditionInfo?.emoji || '👋'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {conditionInfo?.greeting || 'Ready to continue your learning journey?'}
        </p>
      </motion.div>

      {/* Condition-Specific Tips Card */}
      {conditionInfo && userConditions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 card bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 border border-primary-200 dark:border-primary-800"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-800 rounded-xl">
              <LightBulbIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-yellow-500" />
                Tips for Your Learning Style
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({userConditions.map(c => c.toUpperCase()).join(', ')})
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {conditionInfo.tips.map((tip, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <HeartIcon className="h-4 w-4 mr-2 text-pink-500 flex-shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>
              <Link
                to="/accessibility"
                className="inline-flex items-center mt-3 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <CogIcon className="h-4 w-4 mr-1" />
                Customize your accessibility settings
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Onboarding Progress - Show during first 7 days */}
      <OnboardingProgress />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Learning Streak</p>
              <p className="text-3xl font-bold">{user?.rewards?.streakDays || 0} days</p>
            </div>
            <FireIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-br from-accent-500 to-accent-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Points</p>
              <p className="text-3xl font-bold">{user?.rewards?.points || 0}</p>
            </div>
            <TrophyIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-gradient-to-br from-calm-400 to-calm-500 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Courses Enrolled</p>
              <p className="text-3xl font-bold">{progress.length}</p>
            </div>
            <AcademicCapIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Time Learned</p>
              <p className="text-3xl font-bold">{insights?.totalLearningTime || 0} min</p>
            </div>
            <ClockIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Continue Learning */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <PlayIcon className="h-6 w-6 mr-2 text-primary-500" />
            Continue Learning
          </h2>

          {progress.length > 0 ? (
            <div className="space-y-4">
              {progress.filter(item => item.courseId).map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <AcademicCapIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.courseId?.title || 'Unknown Course'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.currentLesson?.title || 'Start learning'}
                      </p>
                      <div className="mt-2">
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${item.overallProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.overallProgress}% complete
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/courses/${item.courseId?._id}`}
                      className="btn-primary"
                    >
                      Continue
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <AcademicCapIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No courses yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Start your learning journey by enrolling in a course
              </p>
              <Link to="/courses" className="btn-primary">
                Browse Courses
              </Link>
            </div>
          )}
        </div>

        {/* Learning Insights */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-primary-500" />
            Your Learning Style
          </h2>

          <div className="card space-y-4">
            {insights ? (
              <>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Optimal Session Length
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {insights.optimalSessionDuration} minutes
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Best Time to Learn
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {insights.bestTimeOfDay}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Preferred Content Type
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {insights.preferredContentType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Recommended Pace
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {insights.recommendedPace}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Complete more lessons to see your learning insights!
              </p>
            )}

            <Link
              to="/focus-mode"
              className="btn-calm w-full justify-center mt-4"
            >
              Enter Focus Mode
            </Link>
          </div>

          {/* Badges */}
          {user?.rewards?.badges && user.rewards.badges.length > 0 && (
            <div className="card mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Your Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.rewards.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                  >
                    🏆 {badge}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          <div className="mt-6">
            <AIRecommendations />
          </div>
        </div>
      </div>

      {/* Adaptive Learning Insights - Full Width Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <AdaptiveInsights />
      </motion.div>

      {/* Interactive Performance Charts (Recharts) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <PerformanceCharts />
      </motion.div>
    </div>
  )
}
