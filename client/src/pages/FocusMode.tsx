import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface FocusSettings {
  sessionDuration: number
  breakDuration: number
}

export default function FocusMode() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<FocusSettings>({
    sessionDuration: 25,
    breakDuration: 5,
  })
  const [timeLeft, setTimeLeft] = useState(settings.sessionDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [showSettings, setShowSettings] = useState(true)

  // Fetch user's focus settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/adaptive/focus-mode')
        if (response.data.recommendations) {
          setSettings({
            sessionDuration: response.data.recommendations.sessionDuration,
            breakDuration: response.data.recommendations.breakDuration,
          })
          setTimeLeft(response.data.recommendations.sessionDuration * 60)
        }
      } catch (error) {
        console.error('Error fetching focus settings:', error)
      }
    }

    fetchSettings()
  }, [])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      // Timer completed
      if (isBreak) {
        // Break ended, start new session
        setIsBreak(false)
        setTimeLeft(settings.sessionDuration * 60)
        playSound('session')
      } else {
        // Session ended, start break
        setIsBreak(true)
        setTimeLeft(settings.breakDuration * 60)
        setSessionsCompleted((prev) => prev + 1)
        playSound('break')
      }
      setIsRunning(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, isBreak, settings])

  const playSound = (type: 'session' | 'break') => {
    // Simple notification sound (would use actual audio in production)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(type === 'break' ? '🎉 Great work! Time for a break!' : '💪 Break over! Ready to focus?')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setShowSettings(false)
    setIsRunning(true)
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(settings.sessionDuration * 60)
  }

  const handleExit = () => {
    navigate('/dashboard')
  }

  const progress = isBreak
    ? ((settings.breakDuration * 60 - timeLeft) / (settings.breakDuration * 60)) * 100
    : ((settings.sessionDuration * 60 - timeLeft) / (settings.sessionDuration * 60)) * 100

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${
      isBreak ? 'bg-calm-400' : 'bg-gradient-to-br from-primary-500 to-accent-600'
    }`}>
      {/* Exit Button */}
      <button
        onClick={handleExit}
        className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
        aria-label="Exit focus mode"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center text-white max-w-md w-full"
      >
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8"
            >
              <h2 className="text-xl font-semibold mb-4">Focus Session Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Session Duration (minutes)</label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={settings.sessionDuration}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setSettings({ ...settings, sessionDuration: value })
                      setTimeLeft(value * 60)
                    }}
                    className="w-full"
                  />
                  <span className="text-2xl font-bold">{settings.sessionDuration} min</span>
                </div>

                <div>
                  <label className="block text-sm mb-2">Break Duration (minutes)</label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={settings.breakDuration}
                    onChange={(e) => setSettings({ ...settings, breakDuration: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-2xl font-bold">{settings.breakDuration} min</span>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="mt-6 w-full py-3 bg-white text-primary-600 rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                Start Focus Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer Display */}
        <AnimatePresence>
          {!showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4">
                <SparklesIcon className="h-8 w-8 mx-auto mb-2" />
                <h1 className="text-2xl font-semibold">
                  {isBreak ? 'Break Time! 🌿' : 'Focus Mode 🎯'}
                </h1>
              </div>

              {/* Circular Progress */}
              <div className="relative w-64 h-64 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold font-mono">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                {isRunning ? (
                  <button
                    onClick={handlePause}
                    className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    aria-label="Pause"
                  >
                    <PauseIcon className="h-8 w-8" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsRunning(true)}
                    className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    aria-label="Play"
                  >
                    <PlayIcon className="h-8 w-8" />
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="p-4 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  aria-label="Reset"
                >
                  <ArrowPathIcon className="h-8 w-8" />
                </button>
              </div>

              {/* Sessions Counter */}
              <p className="mt-8 text-lg">
                Sessions completed: <span className="font-bold">{sessionsCompleted}</span>
              </p>

              {/* Tips */}
              <div className="mt-8 p-4 bg-white/10 rounded-xl">
                <p className="text-sm">
                  {isBreak
                    ? '💡 Stand up, stretch, or grab some water!'
                    : '💡 Stay focused on one task. You got this!'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
