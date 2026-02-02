import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { useConfigStore } from '../stores/configStore'
import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const { getConditions, getLearningStyles } = useConfigStore()
  
  // Get dynamic config
  const conditions = getConditions()
  const learningStyles = getLearningStyles()
  
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    conditions: user?.neurodiverseProfile?.conditions || [],
    preferredLearningStyle: user?.neurodiverseProfile?.sensoryPreferences?.preferredLearningStyle || [],
  })
  const [saving, setSaving] = useState(false)

  const handleConditionToggle = (conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(conditionId)
        ? prev.conditions.filter(c => c !== conditionId)
        : [...prev.conditions, conditionId],
    }))
  }

  const handleStyleToggle = (styleId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredLearningStyle: prev.preferredLearningStyle.includes(styleId)
        ? prev.preferredLearningStyle.filter(s => s !== styleId)
        : [...prev.preferredLearningStyle, styleId],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/users/me', {
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      await api.put('/users/me/neurodiverse-profile', {
        neurodiverseProfile: {
          ...user?.neurodiverseProfile,
          conditions: formData.conditions,
          sensoryPreferences: {
            ...user?.neurodiverseProfile?.sensoryPreferences,
            preferredLearningStyle: formData.preferredLearningStyle,
          },
        },
      })

      updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      toast.success('Profile updated successfully!')
      setEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                <XMarkIcon className="h-5 w-5 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                <CheckIcon className="h-5 w-5 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="card mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-16 w-16 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full text-sm capitalize">
                    {user?.role}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            My Rewards
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-3xl">🏆</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {user?.rewards?.points || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Points</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <span className="text-3xl">🔥</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {user?.rewards?.streakDays || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Day Streak</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-3xl">🎖️</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {user?.rewards?.badges?.length || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Badges</p>
            </div>
          </div>
        </div>

        {/* Neurodiverse Profile */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            My Learning Profile
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Help us personalize your learning experience
          </p>

          <div className="mb-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Learning Differences (Optional)
            </h4>
            <div className="flex flex-wrap gap-3">
              {conditions.map((condition) => (
                <button
                  key={condition.id}
                  onClick={() => editing && handleConditionToggle(condition.id)}
                  disabled={!editing}
                  className={`px-4 py-2 rounded-full border-2 transition-colors ${
                    formData.conditions.includes(condition.id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  } ${editing ? 'cursor-pointer hover:border-primary-300' : 'cursor-default'}`}
                >
                  <span className="mr-2">{condition.emoji}</span>
                  {condition.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Preferred Learning Styles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {learningStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => editing && handleStyleToggle(style.id)}
                  disabled={!editing}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.preferredLearningStyle.includes(style.id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${editing ? 'cursor-pointer hover:border-primary-300' : 'cursor-default'}`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    {style.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {style.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
