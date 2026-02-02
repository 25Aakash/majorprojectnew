import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  DocumentTextIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface LessonForm {
  title: string
  content: string
  type: 'text' | 'video' | 'interactive'
  duration: number
  videoUrl?: string
  quiz: QuizQuestion[]
  learningObjectives: string[]
  accessibilityNotes: string
}

export default function LessonEditor() {
  const navigate = useNavigate()
  const { courseId, lessonId } = useParams()
  const isEditing = !!lessonId

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'settings'>('content')
  
  const [form, setForm] = useState<LessonForm>({
    title: '',
    content: '',
    type: 'text',
    duration: 10,
    videoUrl: '',
    quiz: [],
    learningObjectives: [''],
    accessibilityNotes: '',
  })

  // Check for AI-generated content in localStorage
  useEffect(() => {
    const generatedLesson = localStorage.getItem('generated_lesson')
    if (generatedLesson && !isEditing) {
      try {
        const lesson = JSON.parse(generatedLesson)
        setForm({
          title: lesson.title || '',
          content: lesson.content || '',
          type: lesson.type || 'text',
          duration: lesson.duration || 10,
          videoUrl: '',
          quiz: lesson.quiz || [],
          learningObjectives: lesson.learningObjectives?.length ? lesson.learningObjectives : [''],
          accessibilityNotes: `Adapted for: ${lesson.adaptations_applied?.join(', ') || 'General'}`,
        })
        toast.success('AI-generated content loaded!')
        // Clear localStorage after loading
        localStorage.removeItem('generated_lesson')
      } catch (error) {
        console.error('Error loading generated lesson:', error)
      }
    }
  }, [isEditing])

  useEffect(() => {
    if (isEditing) {
      fetchLesson()
    }
  }, [lessonId])

  const fetchLesson = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`)
      const lesson = response.data
      setForm({
        title: lesson.title || '',
        content: lesson.content || '',
        type: lesson.type || 'text',
        duration: lesson.duration || 10,
        videoUrl: lesson.videoUrl || '',
        quiz: lesson.quiz || [],
        learningObjectives: lesson.learningObjectives?.length ? lesson.learningObjectives : [''],
        accessibilityNotes: lesson.accessibilityNotes || '',
      })
    } catch (error) {
      toast.error('Failed to load lesson')
      navigate(`/educator/courses/${courseId}/lessons`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Filter out empty objectives
    const cleanedForm = {
      ...form,
      learningObjectives: form.learningObjectives.filter(obj => obj.trim() !== ''),
    }

    try {
      if (isEditing) {
        await api.put(`/courses/${courseId}/lessons/${lessonId}`, cleanedForm)
        toast.success('Lesson updated successfully')
      } else {
        await api.post(`/courses/${courseId}/lessons`, cleanedForm)
        toast.success('Lesson created successfully')
      }
      navigate(`/educator/courses/${courseId}/lessons`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save lesson')
    } finally {
      setSaving(false)
    }
  }

  // Quiz management
  const addQuestion = () => {
    setForm({
      ...form,
      quiz: [
        ...form.quiz,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: '',
        },
      ],
    })
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuiz = [...form.quiz]
    newQuiz[index] = { ...newQuiz[index], [field]: value }
    setForm({ ...form, quiz: newQuiz })
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuiz = [...form.quiz]
    newQuiz[questionIndex].options[optionIndex] = value
    setForm({ ...form, quiz: newQuiz })
  }

  const removeQuestion = (index: number) => {
    setForm({
      ...form,
      quiz: form.quiz.filter((_, i) => i !== index),
    })
  }

  // Learning objectives management
  const addObjective = () => {
    setForm({
      ...form,
      learningObjectives: [...form.learningObjectives, ''],
    })
  }

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...form.learningObjectives]
    newObjectives[index] = value
    setForm({ ...form, learningObjectives: newObjectives })
  }

  const removeObjective = (index: number) => {
    setForm({
      ...form,
      learningObjectives: form.learningObjectives.filter((_, i) => i !== index),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/educator/courses/${courseId}/lessons`)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Lessons
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Lesson' : 'Create New Lesson'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex gap-6">
            {[
              { id: 'content', label: 'Content', icon: DocumentTextIcon },
              { id: 'quiz', label: 'Quiz', icon: PuzzlePieceIcon },
              { id: 'settings', label: 'Settings', icon: PlayIcon },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
                {tab.id === 'quiz' && form.quiz.length > 0 && (
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                    {form.quiz.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Lesson Content
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="e.g., Understanding Fractions"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content Type
                  </label>
                  <div className="flex gap-4">
                    {['text', 'video', 'interactive'].map(type => (
                      <label
                        key={type}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer ${
                          form.type === type
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={form.type === type}
                          onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                          className="sr-only"
                        />
                        <span className="capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {form.type === 'video' && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Video URL *
                      </label>
                      <input
                        type="url"
                        value={form.videoUrl}
                        onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Supports: YouTube, Vimeo, or direct video URLs (.mp4)
                      </p>
                    </div>
                    
                    {/* Video Preview */}
                    {form.videoUrl && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Preview
                        </label>
                        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden max-w-2xl">
                          {(() => {
                            let embedUrl = form.videoUrl
                            if (form.videoUrl.includes('youtube.com/watch')) {
                              const videoId = form.videoUrl.split('v=')[1]?.split('&')[0]
                              embedUrl = `https://www.youtube.com/embed/${videoId}`
                            } else if (form.videoUrl.includes('youtu.be/')) {
                              const videoId = form.videoUrl.split('youtu.be/')[1]?.split('?')[0]
                              embedUrl = `https://www.youtube.com/embed/${videoId}`
                            } else if (form.videoUrl.includes('vimeo.com/')) {
                              const videoId = form.videoUrl.split('vimeo.com/')[1]?.split('?')[0]
                              embedUrl = `https://player.vimeo.com/video/${videoId}`
                            }
                            
                            if (embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com')) {
                              return (
                                <iframe
                                  src={embedUrl}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title="Video preview"
                                />
                              )
                            }
                            return (
                              <div className="flex items-center justify-center h-full text-white">
                                <p>Video: {form.videoUrl}</p>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lesson Content (Markdown supported) *
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                    rows={15}
                    placeholder={`# Lesson Title

## Introduction
Start with an engaging introduction...

## Key Concepts
- Point 1
- Point 2
- Point 3

## Examples
Provide clear examples...

## Summary
Recap the main points...`}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use Markdown for formatting: # Heading, **bold**, *italic*, - bullet points
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Objectives */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Learning Objectives
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                What will students learn from this lesson?
              </p>

              <div className="space-y-3">
                {form.learningObjectives.map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      placeholder={`Objective ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                    {form.learningObjectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeObjective(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addObjective}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Objective
              </button>
            </div>
          </motion.div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Quiz Questions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add questions to test student understanding
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn-primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Question
                </button>
              </div>

              {form.quiz.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <PuzzlePieceIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No quiz questions yet
                  </p>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="btn-secondary"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Your First Question
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {form.quiz.map((question, qIndex) => (
                    <div
                      key={qIndex}
                      className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Question {qIndex + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Question Text *
                          </label>
                          <input
                            type="text"
                            value={question.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            placeholder="Enter your question..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Answer Options
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name={`correct-${qIndex}`}
                                  checked={question.correctAnswer === oIndex}
                                  onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                  className="w-4 h-4 text-primary-600"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                  placeholder={`Option ${oIndex + 1}`}
                                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                />
                                {question.correctAnswer === oIndex && (
                                  <span className="text-green-600 text-sm font-medium">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Select the radio button next to the correct answer
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Explanation (optional)
                          </label>
                          <textarea
                            value={question.explanation || ''}
                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                            placeholder="Explain why this is the correct answer..."
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Lesson Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 10 })}
                  min={1}
                  max={120}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Accessibility Notes
                </label>
                <textarea
                  value={form.accessibilityNotes}
                  onChange={(e) => setForm({ ...form, accessibilityNotes: e.target.value })}
                  placeholder="Notes for students with specific learning needs..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate(`/educator/courses/${courseId}/lessons`)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Lesson' : 'Create Lesson'}
          </button>
        </div>
      </form>
    </div>
  )
}
