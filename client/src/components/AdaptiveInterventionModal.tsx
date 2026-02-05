import { motion, AnimatePresence } from 'framer-motion'
import {
  HeartIcon,
  SparklesIcon,
  PauseIcon,
  ArrowPathIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  FilmIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface AdaptiveInterventionProps {
  isVisible: boolean
  type: 'break' | 'simplify' | 'alternative' | 'calming' | 'encouragement'
  message: string
  suggestedFormat?: string | null
  onDismiss: () => void
  onAccept: (action: string) => void
  onTakeBreak?: () => void
}

// Calming activities for different states
const calmingActivities = {
  breathing: {
    title: "4-7-8 Breathing",
    instructions: [
      "Breathe in through your nose for 4 seconds",
      "Hold your breath for 7 seconds",
      "Exhale slowly through your mouth for 8 seconds",
      "Repeat 3 times"
    ],
    duration: 60,
    emoji: "🌬️"
  },
  grounding: {
    title: "5-4-3-2-1 Grounding",
    instructions: [
      "Name 5 things you can see",
      "Name 4 things you can touch",
      "Name 3 things you can hear",
      "Name 2 things you can smell",
      "Name 1 thing you can taste"
    ],
    duration: 120,
    emoji: "🌿"
  },
  stretch: {
    title: "Quick Stretch Break",
    instructions: [
      "Roll your shoulders back 5 times",
      "Stretch your arms above your head",
      "Turn your head slowly left, then right",
      "Shake out your hands",
      "Take 3 deep breaths"
    ],
    duration: 60,
    emoji: "🧘"
  }
}

export function AdaptiveInterventionModal({
  isVisible,
  type,
  message,
  suggestedFormat,
  onDismiss,
  onAccept,
  onTakeBreak,
}: AdaptiveInterventionProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'break':
        return {
          icon: PauseIcon,
          color: 'bg-blue-500',
          title: 'Time for a Break?',
          primaryAction: 'Take a Break',
          secondaryAction: 'Keep Going',
        }
      case 'simplify':
        return {
          icon: SparklesIcon,
          color: 'bg-purple-500',
          title: 'Let\'s Make it Easier',
          primaryAction: 'Simplify Content',
          secondaryAction: 'Keep Current Level',
        }
      case 'alternative':
        return {
          icon: ArrowPathIcon,
          color: 'bg-green-500',
          title: 'Try Something Different?',
          primaryAction: `Switch to ${suggestedFormat || 'Video'}`,
          secondaryAction: 'Stay with Text',
        }
      case 'calming':
        return {
          icon: HeartIcon,
          color: 'bg-calm-500',
          title: 'Let\'s Take a Moment',
          primaryAction: 'Start Activity',
          secondaryAction: 'Continue Learning',
        }
      case 'encouragement':
        return {
          icon: SparklesIcon,
          color: 'bg-accent-500',
          title: 'You\'re Doing Great!',
          primaryAction: 'Keep Going!',
          secondaryAction: 'Take a Break',
        }
      default:
        return {
          icon: SparklesIcon,
          color: 'bg-primary-500',
          title: 'Suggestion',
          primaryAction: 'Accept',
          secondaryAction: 'Dismiss',
        }
    }
  }

  const config = getTypeConfig()
  const Icon = config.icon

  // Get a random calming activity
  const getRandomActivity = () => {
    const activities = Object.values(calmingActivities)
    return activities[Math.floor(Math.random() * activities.length)]
  }

  const calmingActivity = getRandomActivity()

  const formatIcon = (format: string) => {
    switch (format) {
      case 'video':
        return <FilmIcon className="h-5 w-5" />
      case 'audio':
        return <SpeakerWaveIcon className="h-5 w-5" />
      default:
        return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 
                       w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 
                         dark:hover:text-gray-300 rounded-full hover:bg-gray-100 
                         dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Icon */}
            <div className={`w-16 h-16 ${config.color} rounded-2xl flex items-center 
                            justify-center mx-auto mb-4`}>
              <Icon className="h-8 w-8 text-white" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-2">
              {config.title}
            </h3>

            {/* Message */}
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>

            {/* Calming Activity (for calming type) */}
            {type === 'calming' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-calm-50 dark:bg-calm-900/20 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{calmingActivity.emoji}</span>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {calmingActivity.title}
                  </h4>
                </div>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {calmingActivity.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-calm-200 dark:bg-calm-700 
                                     rounded-full flex items-center justify-center text-xs 
                                     font-medium text-calm-700 dark:text-calm-200">
                        {index + 1}
                      </span>
                      {instruction}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                  Duration: ~{calmingActivity.duration} seconds
                </p>
              </motion.div>
            )}

            {/* Alternative Format Options */}
            {type === 'alternative' && suggestedFormat && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-3 justify-center mb-6"
              >
                {['video', 'audio', 'text'].map((format) => (
                  <button
                    key={format}
                    onClick={() => onAccept(format)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 
                               transition-all ${
                      format === suggestedFormat
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {formatIcon(format)}
                    <span className="text-sm font-medium capitalize">{format}</span>
                    {format === suggestedFormat && (
                      <span className="text-xs text-primary-500">Recommended</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 
                           rounded-xl text-gray-700 dark:text-gray-300 font-medium 
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {config.secondaryAction}
              </button>
              <button
                onClick={() => {
                  if (type === 'break' && onTakeBreak) {
                    onTakeBreak()
                  } else {
                    onAccept(type)
                  }
                }}
                className={`flex-1 py-3 px-4 ${config.color} text-white rounded-xl 
                           font-medium hover:opacity-90 transition-opacity`}
              >
                {config.primaryAction}
              </button>
            </div>

            {/* Encouragement message */}
            {type === 'encouragement' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-center"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  🌟 You've earned +10 XP for your persistence!
                </p>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AdaptiveInterventionModal
