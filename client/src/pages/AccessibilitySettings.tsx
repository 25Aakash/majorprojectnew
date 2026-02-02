import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAccessibility } from '../contexts/AccessibilityContext'
import {
  SunIcon,
  MoonIcon,
  EyeIcon,
  SpeakerWaveIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export default function AccessibilitySettings() {
  const { settings, updateSettings, resetSettings } = useAccessibility()

  const handleReset = () => {
    resetSettings()
    toast.success('Settings reset to defaults')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Accessibility Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Customize your learning experience
            </p>
          </div>
          <button onClick={handleReset} className="btn-secondary">
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Reset to Defaults
          </button>
        </div>

        {/* Color Theme */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <SunIcon className="h-5 w-5 mr-2" />
            Color Theme
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { id: 'light', label: 'Light', icon: SunIcon, bg: 'bg-white', text: 'text-gray-900' },
              { id: 'dark', label: 'Dark', icon: MoonIcon, bg: 'bg-gray-900', text: 'text-white' },
              { id: 'sepia', label: 'Sepia', icon: EyeIcon, bg: 'bg-sepia-100', text: 'text-gray-900' },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSettings({ colorTheme: theme.id as 'light' | 'dark' | 'sepia' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.colorTheme === theme.id
                    ? 'border-primary-500 ring-2 ring-primary-200'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`w-full h-16 rounded ${theme.bg} ${theme.text} flex items-center justify-center mb-2`}>
                  <theme.icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{theme.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Font Settings */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Text & Font
          </h2>

          <div className="space-y-6">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['small', 'medium', 'large', 'extra-large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size as 'small' | 'medium' | 'large' | 'extra-large' })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.fontSize === size
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className={`font-size-${size}`}>Aa</span>
                    <p className="text-xs mt-1 text-gray-500 capitalize">{size}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'default', label: 'Default', sample: 'Inter' },
                  { id: 'dyslexia-friendly', label: 'Dyslexia Friendly', sample: 'OpenDyslexic' },
                  { id: 'sans-serif', label: 'Sans Serif', sample: 'Arial' },
                  { id: 'serif', label: 'Serif', sample: 'Times' },
                ].map((font) => (
                  <button
                    key={font.id}
                    onClick={() => updateSettings({ fontFamily: font.id as typeof settings.fontFamily })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.fontFamily === font.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{font.label}</p>
                    <p className="text-xs text-gray-500">{font.sample}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Line Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal' },
                  { id: 'relaxed', label: 'Relaxed' },
                  { id: 'loose', label: 'Loose' },
                ].map((spacing) => (
                  <button
                    key={spacing.id}
                    onClick={() => updateSettings({ lineSpacing: spacing.id as typeof settings.lineSpacing })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.lineSpacing === spacing.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className={`line-height-${spacing.id} text-sm`}>
                      <p>Line 1</p>
                      <p>Line 2</p>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">{spacing.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Settings */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <EyeIcon className="h-5 w-5 mr-2" />
            Visual Settings
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">High Contrast</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Increase contrast for better visibility
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Reduce Motion</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Minimize animations and transitions
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </div>
        </div>

        {/* Audio Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <SpeakerWaveIcon className="h-5 w-5 mr-2" />
            Audio Settings
          </h2>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Text-to-Speech</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable read-aloud feature for lesson content
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.textToSpeech}
              onChange={(e) => updateSettings({ textToSpeech: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>

        {/* Preview */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Preview
          </h2>
          <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Sample Lesson Content</h3>
            <p className="mb-4">
              This is how your lesson content will appear with your current settings. 
              The text should be comfortable to read and easy on your eyes.
            </p>
            <p>
              NeuroLearn adapts to your unique learning style, making education 
              accessible and enjoyable for everyone.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
