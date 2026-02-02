import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  SparklesIcon,
  FilmIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Course {
  _id: string
  title: string
  description: string
  category: string
  difficulty: string
  isPublished: boolean
  enrollmentCount: number
  lessons: { _id: string; title: string }[]
}

export default function EducatorDashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalLessons: 0,
    totalStudents: 0,
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/my-courses')
      setCourses(response.data)
      
      // Calculate stats
      const totalLessons = response.data.reduce((acc: number, course: Course) => 
        acc + (course.lessons?.length || 0), 0
      )
      const totalStudents = response.data.reduce((acc: number, course: Course) => 
        acc + (course.enrollmentCount || 0), 0
      )
      
      setStats({
        totalCourses: response.data.length,
        totalLessons,
        totalStudents,
      })
    } catch (error) {
      console.error('Error fetching courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    
    try {
      await api.delete(`/courses/${courseId}`)
      toast.success('Course deleted')
      fetchCourses()
    } catch (error) {
      toast.error('Failed to delete course')
    }
  }

  const togglePublish = async (courseId: string, isPublished: boolean) => {
    try {
      await api.put(`/courses/${courseId}`, { isPublished: !isPublished })
      toast.success(isPublished ? 'Course unpublished' : 'Course published')
      fetchCourses()
    } catch (error) {
      toast.error('Failed to update course')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Educator Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your courses and content
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/educator/courses/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Course
          </Link>
          <Link to="/educator/ai-generator" className="btn-secondary">
            <SparklesIcon className="h-5 w-5 mr-2" />
            AI Text
          </Link>
          <Link to="/educator/video-generator" className="btn-secondary">
            <FilmIcon className="h-5 w-5 mr-2" />
            AI Video
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Courses</p>
              <p className="text-3xl font-bold">{stats.totalCourses}</p>
            </div>
            <AcademicCapIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-br from-accent-500 to-accent-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Lessons</p>
              <p className="text-3xl font-bold">{stats.totalLessons}</p>
            </div>
            <BookOpenIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-br from-calm-400 to-calm-500 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Students</p>
              <p className="text-3xl font-bold">{stats.totalStudents}</p>
            </div>
            <UserGroupIcon className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>
      </div>

      {/* Courses List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Your Courses
        </h2>

        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course._id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <AcademicCapIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{course.category}</span>
                      <span>•</span>
                      <span>{course.lessons?.length || 0} lessons</span>
                      <span>•</span>
                      <span>{course.enrollmentCount || 0} students</span>
                      <span>•</span>
                      <span className={course.isPublished ? 'text-green-600' : 'text-yellow-600'}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePublish(course._id, course.isPublished)}
                    className={`px-3 py-1 rounded text-sm ${
                      course.isPublished
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {course.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link
                    to={`/educator/courses/${course._id}/lessons`}
                    className="btn-secondary text-sm"
                  >
                    <BookOpenIcon className="h-4 w-4 mr-1" />
                    Lessons
                  </Link>
                  <Link
                    to={`/educator/courses/${course._id}/edit`}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(course._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AcademicCapIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No courses yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first course to get started
            </p>
            <Link to="/educator/courses/new" className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Course
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
