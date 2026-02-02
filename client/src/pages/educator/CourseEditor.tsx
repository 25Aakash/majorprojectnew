import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import { useConfigStore } from '../../stores/configStore'
import toast from 'react-hot-toast'
import {
  PhotoIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

interface CourseForm {
  title: string
  description: string
  category: string
  difficulty: string
  thumbnail: string
  targetAudience: string[]
  accessibilityFeatures: string[]
  estimatedDuration: number
  isPublished: boolean
}

export default function CourseEditor() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const isEditing = !!courseId
  
  // Get dynamic config from store
  const { getCategories, getDifficulties, getConditions, getAccessibilityFeatures } = useConfigStore()
  const categories = getCategories()
  const difficulties = getDifficulties()
  const conditions = getConditions()
  const accessibilityFeatures = getAccessibilityFeatures()
  
  // Build audience options from conditions
  const audienceOptions = [...conditions.map(c => c.label), 'General']
  
  // Build accessibility options from config
  const accessibilityOptions = accessibilityFeatures.map(f => f.label)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CourseForm>({
    title: '',
    description: '',
    category: categories[0]?.id || 'math',
    difficulty: 'beginner',
    thumbnail: '',
    targetAudience: [],
    accessibilityFeatures: [],
    estimatedDuration: 30,
    isPublished: false,
  })

  useEffect(() => {
    if (isEditing) {
      fetchCourse()
    }
  }, [courseId])

  const fetchCourse = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/courses/${courseId}`)
      const course = response.data
      setForm({
        title: course.title || '',
        description: course.description || '',
        category: course.category || 'math',
        difficulty: course.difficulty || 'beginner',
        thumbnail: course.thumbnail || '',
        targetAudience: course.targetAudience || [],
        accessibilityFeatures: course.accessibilityFeatures || [],
        estimatedDuration: course.estimatedDuration || 30,
        isPublished: course.isPublished || false,
      })
    } catch (error) {
      toast.error('Failed to load course')
      navigate('/educator')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (isEditing) {
        await api.put(`/courses/${courseId}`, form)
        toast.success('Course updated successfully')
      } else {
        await api.post('/courses', form)
        toast.success('Course created successfully')
      }
      navigate('/educator')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save course')
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayValue = (field: 'targetAudience' | 'accessibilityFeatures', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Course' : 'Create New Course'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isEditing ? 'Update your course details' : 'Fill in the details to create a new course'}
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g., Fun with Fractions"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows={4}
                placeholder="Describe what students will learn..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty *
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {difficulties.map(diff => (
                    <option key={diff.id} value={diff.id}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={form.estimatedDuration}
                onChange={(e) => setForm({ ...form, estimatedDuration: parseInt(e.target.value) || 30 })}
                min={5}
                max={300}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Thumbnail */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Course Thumbnail
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Thumbnail URL
            </label>
            <input
              type="url"
              value={form.thumbnail}
              onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Use Unsplash, Pexels, or any image URL. Recommended size: 1280x720
            </p>
          </div>

          {form.thumbnail && (
            <div className="mt-4">
              <img
                src={form.thumbnail}
                alt="Thumbnail preview"
                className="w-full max-w-md h-48 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Invalid+Image'
                }}
              />
            </div>
          )}

          {!form.thumbnail && (
            <div className="mt-4 w-full max-w-md h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <PhotoIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">No thumbnail set</p>
              </div>
            </div>
          )}
        </div>

        {/* Target Audience */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Target Audience
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select which neurodiverse profiles this course is designed for:
          </p>

          <div className="flex flex-wrap gap-3">
            {audienceOptions.map(audience => (
              <button
                key={audience}
                type="button"
                onClick={() => toggleArrayValue('targetAudience', audience)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  form.targetAudience.includes(audience)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {audience}
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility Features */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Accessibility Features
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select the accessibility features included in this course:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accessibilityOptions.map(feature => (
              <label
                key={feature}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={form.accessibilityFeatures.includes(feature)}
                  onChange={() => toggleArrayValue('accessibilityFeatures', feature)}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Publish immediately</span>
          </label>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/educator')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  )
}
