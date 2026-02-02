import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useConfigStore } from '../stores/configStore'
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'

// Learning style options
const learningStyles = [
  { id: 'visual', label: 'Visual', emoji: '👁️', description: 'I learn best with images, diagrams, and videos' },
  { id: 'auditory', label: 'Auditory', emoji: '🎧', description: 'I learn best by listening and discussing' },
  { id: 'kinesthetic', label: 'Hands-on', emoji: '🖐️', description: 'I learn best by doing and practicing' },
  { id: 'reading', label: 'Reading/Writing', emoji: '📖', description: 'I learn best through text and notes' },
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    conditions: [] as string[],
    learningStyles: [] as string[],
  })
  const [showPassword, setShowPassword] = useState(false)
  const { register, isLoading, error, clearError } = useAuthStore()
  const { config, fetchConfig } = useConfigStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const conditions = config?.conditions || [
    { id: 'adhd', label: 'ADHD', emoji: '⚡', description: 'Attention Deficit Hyperactivity Disorder' },
    { id: 'autism', label: 'Autism', emoji: '🌈', description: 'Autism Spectrum Disorder' },
    { id: 'dyslexia', label: 'Dyslexia', emoji: '📚', description: 'Reading and language processing differences' },
    { id: 'dyscalculia', label: 'Dyscalculia', emoji: '🔢', description: 'Math and number processing differences' },
    { id: 'dysgraphia', label: 'Dysgraphia', emoji: '✏️', description: 'Writing and fine motor differences' },
    { id: 'other', label: 'Other', emoji: '💡', description: 'Other learning differences' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

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

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast.error('Please fill in all fields')
        return
      }
      if (!formData.email.includes('@')) {
        toast.error('Please enter a valid email')
        return
      }
    }
    if (step === 2) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters')
        return
      }
    }
    setStep(step + 1)
  }

  const prevStep = () => setStep(step - 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        conditions: formData.conditions,
        learningStyles: formData.learningStyles,
      })
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch {
      toast.error('Registration failed. Please try again.')
    }
  }

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
              s < step
                ? 'bg-green-500 text-white'
                : s === step
                ? 'bg-primary-500 text-white scale-110'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}
          >
            {s < step ? <CheckIcon className="h-5 w-5" /> : s}
          </div>
          {s < 4 && (
            <div
              className={`w-12 h-1 mx-1 ${
                s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
        Create Your Account
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
        {step === 1 && 'Let\'s start with your basic info'}
        {step === 2 && 'Create a secure password'}
        {step === 3 && 'Tell us about your learning needs'}
        {step === 4 && 'How do you learn best?'}
      </p>

      {renderStepIndicator()}

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  I am a...
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="student">Student</option>
                  <option value="educator">Educator</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <button type="button" onClick={nextStep} className="btn-primary w-full py-3 flex items-center justify-center">
                Continue <ArrowRightIcon className="h-5 w-5 ml-2" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className="input pr-10"
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3 flex items-center justify-center">
                  <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
                </button>
                <button type="button" onClick={nextStep} className="btn-primary flex-1 py-3 flex items-center justify-center">
                  Continue <ArrowRightIcon className="h-5 w-5 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Learning Needs/Conditions */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                Select any that apply to personalize your experience. This helps us adapt content to your needs.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {conditions.map((condition) => (
                  <button
                    key={condition.id}
                    type="button"
                    onClick={() => toggleCondition(condition.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.conditions.includes(condition.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{condition.emoji}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{condition.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{condition.description}</div>
                    {formData.conditions.includes(condition.id) && (
                      <div className="absolute top-2 right-2">
                        <CheckIcon className="h-5 w-5 text-primary-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, conditions: [] }))
                  nextStep()
                }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 py-2"
              >
                Skip - I prefer not to say
              </button>

              <div className="flex gap-3">
                <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3 flex items-center justify-center">
                  <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
                </button>
                <button type="button" onClick={nextStep} className="btn-primary flex-1 py-3 flex items-center justify-center">
                  Continue <ArrowRightIcon className="h-5 w-5 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Learning Style */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                How do you learn best? Select all that apply.
              </p>
              
              <div className="space-y-3">
                {learningStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleLearningStyle(style.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center ${
                      formData.learningStyles.includes(style.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }`}
                  >
                    <div className="text-3xl mr-4">{style.emoji}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">{style.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{style.description}</div>
                    </div>
                    {formData.learningStyles.includes(style.id) && (
                      <CheckIcon className="h-6 w-6 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg" role="alert">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={prevStep} className="btn-secondary flex-1 py-3 flex items-center justify-center">
                  <ArrowLeftIcon className="h-5 w-5 mr-2" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex-1 py-3"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account 🎉'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
