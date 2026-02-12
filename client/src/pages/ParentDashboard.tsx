import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import {
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  AcademicCapIcon,
  FireIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

interface StudentProgress {
  student: {
    firstName: string
    lastName: string
    rewards: {
      points: number
      streakDays: number
    }
  }
  progress: Array<{
    courseId: {
      title: string
      category: string
    }
    overallProgress: number
    timeSpent: number
  }>
  summary: {
    totalCourses: number
    totalTimeSpent: number
    averageProgress: number
    currentStreak: number
  }
}

interface LinkedStudent {
  _id: string
  email: string
  firstName: string
  lastName: string
}

export default function ParentDashboard() {
  const { user } = useAuthStore()
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<StudentProgress | null>(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    const fetchLinkedStudents = async () => {
      try {
        const response = await api.get('/users/me')
        if (response.data.linkedAccounts) {
          setLinkedStudents(response.data.linkedAccounts)
          if (response.data.linkedAccounts.length > 0) {
            setSelectedStudent(response.data.linkedAccounts[0]._id)
          }
        }
      } catch (error) {
        console.error('Error fetching linked students:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLinkedStudents()
  }, [])

  useEffect(() => {
    const fetchStudentProgress = async () => {
      if (!selectedStudent) return

      try {
        const response = await api.get(`/progress/student/${selectedStudent}`)
        setStudentData(response.data)
      } catch (error) {
        console.error('Error fetching student progress:', error)
      }
    }

    fetchStudentProgress()
  }, [selectedStudent])

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinking(true)

    try {
      await api.post('/users/link-account', { studentEmail: linkEmail })
      // Refresh linked students
      const response = await api.get('/users/me')
      setLinkedStudents(response.data.linkedAccounts || [])
      setLinkEmail('')
    } catch (error) {
      console.error('Error linking account:', error)
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (user?.role !== 'parent' && user?.role !== 'educator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">
          This page is only accessible to parents and educators.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {user?.role === 'parent' ? 'Parent' : 'Educator'} Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Monitor and support student learning progress
        </p>

        {/* Export button */}
        {selectedStudent && (
          <div className="mb-6 flex gap-3">
            <a
              href={`/api/export/student/${selectedStudent}/csv`}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download Progress Report (CSV)
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Student List */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Linked Students
              </h2>

              {linkedStudents.length > 0 ? (
                <div className="space-y-2">
                  {linkedStudents.map((student) => (
                    <button
                      key={student._id}
                      onClick={() => setSelectedStudent(student._id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedStudent === student._id
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <p className="font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No students linked yet
                </p>
              )}

              {/* Link Student Form */}
              <form onSubmit={handleLinkStudent} className="mt-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Link a Student
                </h3>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="Student's email"
                  className="input mb-2"
                  required
                />
                <button
                  type="submit"
                  disabled={linking}
                  className="btn-primary w-full"
                >
                  {linking ? 'Linking...' : 'Link Account'}
                </button>
              </form>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {studentData ? (
              <>
                {/* Student Header */}
                <div className="card mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-600">
                        {studentData.student.firstName[0]}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {studentData.student.firstName} {studentData.student.lastName}
                      </h2>
                      <div className="flex gap-4 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          🏆 {studentData.student.rewards.points} points
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          🔥 {studentData.student.rewards.streakDays} day streak
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="card text-center">
                    <AcademicCapIcon className="h-8 w-8 mx-auto text-primary-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {studentData.summary.totalCourses}
                    </p>
                    <p className="text-sm text-gray-500">Courses</p>
                  </div>
                  <div className="card text-center">
                    <ChartBarIcon className="h-8 w-8 mx-auto text-accent-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(studentData.summary.averageProgress)}%
                    </p>
                    <p className="text-sm text-gray-500">Avg Progress</p>
                  </div>
                  <div className="card text-center">
                    <ClockIcon className="h-8 w-8 mx-auto text-calm-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {studentData.summary.totalTimeSpent}
                    </p>
                    <p className="text-sm text-gray-500">Minutes</p>
                  </div>
                  <div className="card text-center">
                    <FireIcon className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {studentData.summary.currentStreak}
                    </p>
                    <p className="text-sm text-gray-500">Day Streak</p>
                  </div>
                </div>

                {/* Course Progress */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Course Progress
                  </h3>
                  
                  {studentData.progress.length > 0 ? (
                    <div className="space-y-4">
                      {studentData.progress.map((course, index) => (
                        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {course.courseId.title}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {course.courseId.category} • {course.timeSpent} min spent
                              </p>
                            </div>
                            <span className="text-lg font-bold text-primary-600">
                              {course.overallProgress}%
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${course.overallProgress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No course progress yet
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="card text-center py-12">
                <UserGroupIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a student to view progress
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Link a student account to start monitoring their learning journey
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
