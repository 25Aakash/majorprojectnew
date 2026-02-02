import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  PlayIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline'

interface Lesson {
  _id: string
  title: string
  order: number
  duration: number
  type: string
}

interface Course {
  _id: string
  title: string
  lessons: Lesson[]
}

export default function LessonManager() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/courses/${courseId}`)
      setCourse(response.data)
      setLessons(response.data.lessons || [])
    } catch (error) {
      toast.error('Failed to load course')
      navigate('/educator')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    try {
      await api.delete(`/courses/${courseId}/lessons/${lessonId}`)
      toast.success('Lesson deleted')
      fetchCourse()
    } catch (error) {
      toast.error('Failed to delete lesson')
    }
  }

  const moveLesson = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= lessons.length) return

    const items = Array.from(lessons)
    const [item] = items.splice(index, 1)
    items.splice(newIndex, 0, item)

    // Update order
    const updatedLessons = items.map((lesson, idx) => ({
      ...lesson,
      order: idx + 1,
    }))

    setLessons(updatedLessons)

    try {
      await api.put(`/courses/${courseId}/lessons/reorder`, {
        lessons: updatedLessons.map(l => ({ _id: l._id, order: l.order })),
      })
      toast.success('Lesson order updated')
    } catch (error) {
      toast.error('Failed to update order')
      fetchCourse() // Revert
    }
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <PlayIcon className="h-5 w-5" />
      case 'text':
        return <DocumentTextIcon className="h-5 w-5" />
      default:
        return <DocumentTextIcon className="h-5 w-5" />
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/educator')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Manage Lessons
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Course: {course?.title}
            </p>
          </div>
          <Link
            to={`/educator/courses/${courseId}/lessons/new`}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Lesson
          </Link>
        </div>
      </div>

      {/* Lessons List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Lessons ({lessons.length})
          </h2>
          <p className="text-sm text-gray-500">Use arrows to reorder</p>
        </div>

        {lessons.length > 0 ? (
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson._id}
                className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveLesson(index, 'up')}
                    disabled={index === 0}
                    className={`p-1 rounded ${
                      index === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveLesson(index, 'down')}
                    disabled={index === lessons.length - 1}
                    className={`p-1 rounded ${
                      index === lessons.length - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                  {getLessonIcon(lesson.type)}
                </div>

                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>Lesson {index + 1}</span>
                    <span>•</span>
                    <span>{lesson.duration} min</span>
                    <span>•</span>
                    <span className="capitalize">{lesson.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/educator/courses/${courseId}/lessons/${lesson._id}/edit`}
                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(lesson._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No lessons yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add your first lesson to get started
            </p>
            <Link
              to={`/educator/courses/${courseId}/lessons/new`}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Lesson
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
