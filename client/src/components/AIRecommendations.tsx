import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import {
  SparklesIcon,
  AcademicCapIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'

interface Recommendation {
  _id: string
  title: string
  description: string
  category: string
  difficulty: string
  thumbnail?: string
  neurodiverseFeatures: {
    adhdFriendly: boolean
    autismFriendly: boolean
    dyslexiaFriendly: boolean
  }
}

interface AIInsight {
  type: string
  message: string
  icon: string
}

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Fetch course recommendations
        const response = await api.get('/adaptive/recommendations')
        setRecommendations(response.data.slice(0, 3))
        
        // Fetch AI-generated insights from the backend
        try {
          const insightsResponse = await api.get('/adaptive/insights')
          if (insightsResponse.data && insightsResponse.data.length > 0) {
            setInsights(insightsResponse.data)
          } else {
            // Fallback to default insights if API returns empty
            setInsights([
              { type: 'tip', message: 'Start learning to get personalized AI insights!', icon: '💡' }
            ])
          }
        } catch {
          // If insights endpoint fails, show encouraging default
          setInsights([
            { type: 'tip', message: 'Complete a few lessons to unlock personalized AI tips!', icon: '🎯' }
          ])
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [])

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <div className="card bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Learning Tips
          </h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg"
            >
              <span className="text-2xl">{insight.icon}</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{insight.message}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommended Courses */}
      {recommendations.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <LightBulbIcon className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recommended for You
            </h3>
          </div>
          <div className="space-y-3">
            {recommendations.map((course, index) => (
              <motion.div
                key={course._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/courses/${course._id}`}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AcademicCapIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {course.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {course.category}
                      </span>
                      {course.neurodiverseFeatures.adhdFriendly && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                          ⚡ ADHD
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                    View →
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
          <Link
            to="/courses"
            className="mt-4 block text-center text-primary-600 dark:text-primary-400 hover:underline text-sm"
          >
            Browse all courses
          </Link>
        </div>
      )}
    </div>
  )
}
