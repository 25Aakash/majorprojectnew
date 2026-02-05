import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import {
  AcademicCapIcon,
  ClockIcon,
  UserGroupIcon,
  StarIcon,
  PlayIcon,
  CheckCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'

interface Lesson {
  _id: string
  title: string
  description: string
  order: number
  estimatedDuration: number
}

interface Course {
  _id: string
  title: string
  description: string
  category: string
  difficulty: string
  estimatedDuration: number
  rating: number
  enrollmentCount: number
  lessons: Lesson[]
  instructor: {
    firstName: string
    lastName: string
  }
  neurodiverseFeatures: {
    adhdFriendly: boolean
    autismFriendly: boolean
    dyslexiaFriendly: boolean
  }
}

interface Progress {
  overallProgress: number
  completedLessons: string[] | { _id: string }[]
  currentLesson: string | { _id: string }
}

// Helper to extract lesson ID from either string or populated object
const getLessonId = (lesson: string | { _id: string } | undefined): string | undefined => {
  if (!lesson) return undefined
  if (typeof lesson === 'string') return lesson
  return lesson._id
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await api.get(`/courses/${id}`)
        setCourse(response.data)

        if (isAuthenticated) {
          // Only try to fetch progress - 404 means not enrolled yet
          api.get(`/progress/course/${id}`)
            .then(progressRes => setProgress(progressRes.data))
            .catch(() => { /* Not enrolled yet - this is expected */ })
        }
      } catch (error) {
        console.error('Error fetching course:', error)
        toast.error('Failed to load course')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [id, isAuthenticated])

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/courses/${id}` } } })
      return
    }

    setEnrolling(true)
    try {
      await api.post(`/courses/${id}/enroll`)
      toast.success('Successfully enrolled!')
      // Fetch progress after enrollment
      const progressRes = await api.get(`/progress/course/${id}`)
      setProgress(progressRes.data)
    } catch (error) {
      toast.error('Failed to enroll in course')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Course not found
          </h2>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </div>
      </div>
    )
  }

  const isEnrolled = progress !== null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full text-sm">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full text-sm capitalize">
                  {course.difficulty}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {course.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {course.description}
              </p>
            </div>

            {/* Neurodiverse Features */}
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Accessibility Features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-lg ${
                    course.neurodiverseFeatures.adhdFriendly
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">⚡</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ADHD Friendly
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Short segments, clear goals
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg ${
                    course.neurodiverseFeatures.autismFriendly
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">🌈</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Autism Friendly
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Predictable structure
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg ${
                    course.neurodiverseFeatures.dyslexiaFriendly
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">📖</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Dyslexia Friendly
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Clear fonts, audio support
                  </p>
                </div>
              </div>
            </div>

            {/* Lessons */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Course Content ({course.lessons.length} lessons)
              </h2>

              <div className="space-y-3">
                {course.lessons.map((lesson, index) => {
                  const isCompleted = progress?.completedLessons?.some(
                    (l) => (typeof l === 'string' ? l : l._id) === lesson._id
                  )
                  const isCurrent = getLessonId(progress?.currentLesson) === lesson._id

                  return (
                    <div
                      key={lesson._id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                        isCurrent
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-500" />
                        ) : (
                          <span className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm text-gray-500">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {lesson.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lesson.estimatedDuration} min
                        </p>
                      </div>
                      {isEnrolled && (
                        <Link
                          to={`/learn/${course._id}/${lesson._id}`}
                          className="btn-secondary text-sm"
                        >
                          {isCompleted ? 'Review' : isCurrent ? 'Continue' : 'Start'}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="sticky top-24"
          >
            <div className="card">
              {/* Course Image */}
              <div className="h-48 bg-gradient-to-br from-primary-400 to-accent-500 rounded-lg mb-6 flex items-center justify-center">
                <AcademicCapIcon className="h-20 w-20 text-white/80" />
              </div>

              {/* Progress */}
              {isEnrolled && progress && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {progress.overallProgress}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progress.overallProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ClockIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {course.estimatedDuration} min
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enrolled</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {course.enrollmentCount}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {course.rating.toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">/5.0</span>
              </div>

              {/* Instructor */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Instructor</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
              </div>

              {/* CTA Button */}
              {isEnrolled ? (
                <Link
                  to={`/learn/${course._id}/${getLessonId(progress?.currentLesson) || course.lessons[0]?._id}`}
                  className="btn-primary w-full justify-center text-lg py-3"
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Continue Learning
                </Link>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="btn-primary w-full justify-center text-lg py-3"
                >
                  {enrolling ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Enrolling...
                    </span>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Enroll Now - Free
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
