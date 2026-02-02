import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useConfigStore } from '../../stores/configStore'
import {
  SparklesIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface GeneratedLesson {
  title: string
  content: string
  type: string
  duration: number
  quiz: {
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }[]
  learningObjectives: string[]
  adaptations_applied: string[]
  learning_styles: string[]
}

interface GenerationResult {
  success: boolean
  generated: boolean
  method: string
  lesson: GeneratedLesson
}

export default function AIContentGenerator() {
  const navigate = useNavigate()
  const { getCategories, getConditions } = useConfigStore()
  const categories = getCategories()
  const conditions = getConditions()

  const [formData, setFormData] = useState({
    topic: '',
    subject: categories[0]?.id || 'math',
    difficulty: 'beginner',
    conditions: [] as string[],
    learningStyles: ['visual'] as string[],
  })

  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedLesson | null>(null)
  const [generationMethod, setGenerationMethod] = useState<string>('')

  const learningStyles = [
    { id: 'visual', label: 'Visual', emoji: '👁️' },
    { id: 'auditory', label: 'Auditory', emoji: '🎧' },
    { id: 'kinesthetic', label: 'Hands-on', emoji: '🖐️' },
    { id: 'reading', label: 'Reading', emoji: '📖' },
  ]

  const difficulties = [
    { id: 'beginner', label: 'Beginner', emoji: '🌱' },
    { id: 'intermediate', label: 'Intermediate', emoji: '🌿' },
    { id: 'advanced', label: 'Advanced', emoji: '🌳' },
  ]

  const toggleCondition = (conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(conditionId)
        ? prev.conditions.filter(c => c !== conditionId)
        : [...prev.conditions, conditionId]
    }))
  }

  const toggleLearningStyle = (styleId: string) => {
    setFormData(prev => ({
      ...prev,
      learningStyles: prev.learningStyles.includes(styleId)
        ? prev.learningStyles.filter(s => s !== styleId)
        : [...prev.learningStyles, styleId]
    }))
  }

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      toast.error('Please enter a topic')
      return
    }

    setGenerating(true)
    setGeneratedContent(null)

    try {
      const response = await fetch('http://localhost:8000/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: formData.topic,
          subject: formData.subject,
          conditions: formData.conditions,
          learning_styles: formData.learningStyles,
          difficulty: formData.difficulty,
        }),
      })

      const result: GenerationResult = await response.json()

      if (result.success) {
        setGeneratedContent(result.lesson)
        setGenerationMethod(result.method)
        toast.success(`Content generated using ${result.method === 'openai' ? 'AI' : 'smart templates'}!`)
      } else {
        toast.error('Failed to generate content')
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to connect to AI service')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const handleUseContent = () => {
    if (generatedContent) {
      // Store in localStorage for the lesson editor to pick up
      localStorage.setItem('generated_lesson', JSON.stringify(generatedContent))
      toast.success('Content saved! Redirecting to create lesson...')
      // Navigate to course selection or show a modal to select course
      // For now, redirect to educator dashboard to select a course
      setTimeout(() => {
        navigate('/educator')
      }, 1000)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <SparklesIcon className="h-8 w-8 mr-3 text-yellow-500" />
          AI Content Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Generate personalized lesson content adapted for neurodiverse learners
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-primary-500" />
            Configure Content
          </h2>

          <div className="space-y-6">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g., Introduction to Fractions, Photosynthesis, Reading Maps"
                className="input"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Level
              </label>
              <div className="flex gap-2">
                {difficulties.map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty: diff.id })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      formData.difficulty === diff.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className="text-lg">{diff.emoji}</span>
                    <span className="ml-2 text-sm">{diff.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adapt for Conditions (optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Select conditions to customize content format and style
              </p>
              <div className="grid grid-cols-2 gap-2">
                {conditions.map((condition) => (
                  <button
                    key={condition.id}
                    type="button"
                    onClick={() => toggleCondition(condition.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      formData.conditions.includes(condition.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mr-2">{condition.emoji}</span>
                    <span className="text-sm font-medium">{condition.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Styles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Learning Styles
              </label>
              <div className="flex flex-wrap gap-2">
                {learningStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleLearningStyle(style.id)}
                    className={`py-2 px-4 rounded-full border-2 transition-all ${
                      formData.learningStyles.includes(style.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span>{style.emoji}</span>
                    <span className="ml-1 text-sm">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !formData.topic.trim()}
              className="btn-primary w-full py-3 flex items-center justify-center"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Generated Content Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <AcademicCapIcon className="h-6 w-6 mr-2 text-accent-500" />
            Generated Content
          </h2>

          {generating && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Creating personalized content...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Applying adaptations for: {formData.conditions.join(', ') || 'General audience'}
              </p>
            </div>
          )}

          {!generating && !generatedContent && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DocumentTextIcon className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Enter a topic and click "Generate Content" to create a personalized lesson
              </p>
            </div>
          )}

          {generatedContent && (
            <div className="space-y-4">
              {/* Generation Info */}
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Generated using {generationMethod === 'openai' ? 'OpenAI GPT' : 'Smart Templates'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  ~{generatedContent.duration} min read
                </span>
              </div>

              {/* Adaptations Applied */}
              {generatedContent.adaptations_applied.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {generatedContent.adaptations_applied.map((adapt) => (
                    <span
                      key={adapt}
                      className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs"
                    >
                      ✓ {adapt} adapted
                    </span>
                  ))}
                </div>
              )}

              {/* Learning Objectives */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  🎯 Learning Objectives
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  {generatedContent.learningObjectives.map((obj, i) => (
                    <li key={i}>• {obj}</li>
                  ))}
                </ul>
              </div>

              {/* Content Preview */}
              <div className="border dark:border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded">
                    {generatedContent.content.substring(0, 1000)}
                    {generatedContent.content.length > 1000 && '...'}
                  </pre>
                </div>
              </div>

              {/* Quiz Preview */}
              {generatedContent.quiz.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                    📝 Quiz Questions ({generatedContent.quiz.length})
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    {generatedContent.quiz[0].question}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => copyToClipboard(generatedContent.content)}
                  className="btn-secondary flex-1 flex items-center justify-center"
                >
                  <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                  Copy Content
                </button>
                <button
                  onClick={handleUseContent}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Use in Lesson
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 card bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          💡 Tips for Better Content Generation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <strong className="text-gray-900 dark:text-white">Be Specific</strong>
            <p>Instead of "Math", try "Adding fractions with different denominators"</p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">Select Conditions</strong>
            <p>Content adapts format, length, and style based on selected conditions</p>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">Mix Learning Styles</strong>
            <p>Selecting multiple styles creates more varied, engaging content</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
