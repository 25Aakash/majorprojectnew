import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  CursorArrowRaysIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface BiometricPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (permissions: {
    voice: boolean
    eyeTracking: boolean
    mouseTracking: boolean
  }) => void
  currentPermissions?: {
    microphone: boolean
    camera: boolean
  }
}

export function BiometricPermissionsModal({
  isOpen,
  onClose,
  onSubmit,
  currentPermissions,
}: BiometricPermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState({
    voice: false,
    eyeTracking: false,
    mouseTracking: true, // Enabled by default
  })
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false)
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    setIsRequestingPermissions(true)
    setPermissionErrors({})
    
    const grantedPermissions = {
      voice: false,
      eyeTracking: false,
      mouseTracking: selectedPermissions.mouseTracking,
    }
    const errors: Record<string, string> = {}

    // Request microphone permission if voice is selected
    if (selectedPermissions.voice) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop the stream immediately - we just needed to get permission
        stream.getTracks().forEach(track => track.stop())
        grantedPermissions.voice = true
      } catch (error) {
        console.error('Microphone permission denied:', error)
        errors.voice = 'Microphone access denied. Please allow access in your browser settings.'
      }
    }

    // Request camera permission if eye tracking is selected
    if (selectedPermissions.eyeTracking) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Stop the stream immediately - we just needed to get permission
        stream.getTracks().forEach(track => track.stop())
        grantedPermissions.eyeTracking = true
      } catch (error) {
        console.error('Camera permission denied:', error)
        errors.eyeTracking = 'Camera access denied. Please allow access in your browser settings.'
      }
    }

    setIsRequestingPermissions(false)

    if (Object.keys(errors).length > 0) {
      setPermissionErrors(errors)
      // Still submit what was granted
      if (grantedPermissions.voice || grantedPermissions.eyeTracking || grantedPermissions.mouseTracking) {
        onSubmit(grantedPermissions)
      }
    } else {
      onSubmit(grantedPermissions)
      onClose()
    }
  }

  const permissions = [
    {
      id: 'mouseTracking',
      label: 'Mouse Movement Tracking',
      description: 'Track how you navigate and interact with content to detect frustration and engagement patterns.',
      icon: CursorArrowRaysIcon,
      required: false,
      benefits: [
        'Detects when you might be struggling',
        'Identifies navigation confusion',
        'Measures engagement levels',
      ],
    },
    {
      id: 'voice',
      label: 'Voice Analysis',
      description: 'Analyze your voice during read-aloud exercises to assess confidence and reading fluency.',
      icon: MicrophoneIcon,
      required: false,
      requiresHardware: true,
      hasPermission: currentPermissions?.microphone,
      benefits: [
        'Measures reading confidence',
        'Detects stress and hesitation',
        'Helps with dyslexia support',
      ],
    },
    {
      id: 'eyeTracking',
      label: 'Eye Gaze Tracking',
      description: 'Use your webcam to track where you look on the screen to measure attention and reading patterns.',
      icon: VideoCameraIcon,
      required: false,
      requiresHardware: true,
      hasPermission: currentPermissions?.camera,
      benefits: [
        'Measures sustained attention',
        'Detects reading difficulties',
        'Identifies when content is confusing',
      ],
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-full max-w-lg max-h-[90vh] overflow-y-auto
                       bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600
                           dark:hover:text-gray-300 rounded-full hover:bg-gray-100
                           dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                  <SparklesIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Adaptive Learning Sensors
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Enable optional sensors to help us personalize your learning experience.
                All data is processed locally and never shared.
              </p>
            </div>

            {/* Privacy Notice */}
            <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl
                            border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800 dark:text-green-300">
                    Your privacy is protected
                  </p>
                  <p className="text-green-700 dark:text-green-400 mt-1">
                    No audio or video is recorded. Only behavioral patterns are analyzed
                    to improve your learning experience.
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions List */}
            <div className="p-6 space-y-4">
              {permissions.map((permission) => {
                const Icon = permission.icon
                const isSelected = selectedPermissions[permission.id as keyof typeof selectedPermissions]
                
                return (
                  <div
                    key={permission.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => {
                      setSelectedPermissions(prev => ({
                        ...prev,
                        [permission.id]: !prev[permission.id as keyof typeof prev],
                      }))
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {permission.label}
                          </h3>
                          <div className={`w-10 h-6 rounded-full transition-colors ${
                            isSelected ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            <div className={`w-4 h-4 m-1 rounded-full bg-white transition-transform ${
                              isSelected ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {permission.description}
                        </p>

                        {permission.requiresHardware && !permission.hasPermission && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                            ⚠️ Requires browser permission
                          </p>
                        )}

                        {permissionErrors[permission.id] && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                            ❌ {permissionErrors[permission.id]}
                          </p>
                        )}

                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 space-y-1"
                          >
                            {permission.benefits.map((benefit, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                                {benefit}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={onClose}
                disabled={isRequestingPermissions}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600
                           rounded-xl text-gray-700 dark:text-gray-300 font-medium
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip for Now
              </button>
              <button
                onClick={handleSubmit}
                disabled={isRequestingPermissions}
                className="flex-1 py-3 px-4 bg-primary-500 text-white rounded-xl
                           font-medium hover:bg-primary-600 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {isRequestingPermissions ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Requesting Permissions...
                  </>
                ) : (
                  'Enable Selected'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default BiometricPermissionsModal
