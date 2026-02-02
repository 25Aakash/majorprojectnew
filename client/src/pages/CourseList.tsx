import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import { useConfigStore } from '../stores/configStore'
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  AcademicCapIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface Course {
  _id: string
  title: string
  description: string
  thumbnail?: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: number
  rating: number
  enrollmentCount: number
  neurodiverseFeatures: {
    adhdFriendly: boolean
    autismFriendly: boolean
    dyslexiaFriendly: boolean
  }
  instructor: {
    firstName: string
    lastName: string
  }
}

export default function CourseList() {
  const { getCategories, getDifficulties } = useConfigStore()
  
  // Get dynamic config
  const categories = getCategories()
  const difficulties = getDifficulties()
  
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    adhdFriendly: false,
    autismFriendly: false,
    dyslexiaFriendly: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (filters.category) params.append('category', filters.category)
        if (filters.difficulty) params.append('difficulty', filters.difficulty)
        if (filters.adhdFriendly) params.append('adhdFriendly', 'true')
        if (filters.autismFriendly) params.append('autismFriendly', 'true')
        if (filters.dyslexiaFriendly) params.append('dyslexiaFriendly', 'true')

        const response = await api.get(`/courses?${params.toString()}`)
        setCourses(response.data.courses)
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchCourses, 300)
    return () => clearTimeout(debounce)
  }, [search, filters])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Explore Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find courses designed for your unique learning style
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
              aria-label="Search courses"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
            aria-expanded={showFilters}
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="input"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="input"
                >
                  <option value="">All Levels</option>
                  {difficulties.map((diff) => (
                    <option key={diff.id} value={diff.id}>{diff.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neurodiverse Features
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.adhdFriendly}
                      onChange={(e) => setFilters({ ...filters, adhdFriendly: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">ADHD Friendly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.autismFriendly}
                      onChange={(e) => setFilters({ ...filters, autismFriendly: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Autism Friendly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.dyslexiaFriendly}
                      onChange={(e) => setFilters({ ...filters, dyslexiaFriendly: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Dyslexia Friendly</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/courses/${course._id}`} className="block">
                <div className="card hover:shadow-xl transition-all duration-300 h-full">
                  {/* Thumbnail */}
                  <div className="h-40 bg-gradient-to-br from-primary-400 to-accent-500 rounded-lg mb-4 overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <AcademicCapIcon className="h-16 w-16 text-white/80" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {course.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Neurodiverse Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {course.neurodiverseFeatures.adhdFriendly && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                          ⚡ ADHD
                        </span>
                      )}
                      {course.neurodiverseFeatures.autismFriendly && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          🌈 Autism
                        </span>
                      )}
                      {course.neurodiverseFeatures.dyslexiaFriendly && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          📖 Dyslexia
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                        <span>{course.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4" />
                        <span>{course.enrollmentCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{course.estimatedDuration} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AcademicCapIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No courses found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  )
}
