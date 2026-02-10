import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  fontFamily: 'default' | 'dyslexia-friendly' | 'sans-serif' | 'serif'
  highContrast: boolean
  reducedMotion: boolean
  textToSpeech: boolean
  lineSpacing: 'normal' | 'relaxed' | 'loose'
  colorTheme: 'light' | 'dark' | 'sepia'
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void
  resetSettings: () => void
  speak: (text: string) => void
  forceSpeak: (text: string) => void
  stopSpeaking: () => void
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  fontFamily: 'default',
  highContrast: false,
  reducedMotion: false,
  textToSpeech: false,
  lineSpacing: 'normal',
  colorTheme: 'light',
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Initialize from localStorage synchronously to prevent flash
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neurolearn-accessibility')
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) }
        } catch {
          return defaultSettings
        }
      }
    }
    return defaultSettings
  })
  
  // Track if initial load is completed
  const isInitializedRef = useRef(false)
  
  // Get auth state
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  // Speech synthesis
  const [synth] = useState(() => typeof window !== 'undefined' ? window.speechSynthesis : null)

  // Apply reduced motion preference on mount (before fetch)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      setSettings(prev => {
        if (!prev.reducedMotion) {
          return { ...prev, reducedMotion: true }
        }
        return prev
      })
    }
    // Mark as initialized after checking reduced motion
    isInitializedRef.current = true
  }, [])

  // Load settings from backend when authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    
    let cancelled = false
    
    async function fetchSettings() {
      try {
        const res = await api.get('/user/accessibility-preferences')
        if (!cancelled && res.data?.preferences) {
          setSettings(prev => ({ ...prev, ...res.data.preferences }))
        }
      } catch {
        // Already initialized from localStorage, no need to do anything
      }
    }
    
    fetchSettings()
    
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  // Save settings to backend and localStorage (only when authenticated and initialized)
  const prevSettingsRef = useRef(settings)
  useEffect(() => {
    // Skip if settings haven't actually changed
    if (JSON.stringify(prevSettingsRef.current) === JSON.stringify(settings)) {
      return
    }
    prevSettingsRef.current = settings
    
    // Always save to localStorage
    localStorage.setItem('neurolearn-accessibility', JSON.stringify(settings))
    
    // Only save to backend if authenticated and initialized
    if (isAuthenticated && isInitializedRef.current) {
      api.post('/user/accessibility-preferences', { preferences: settings }).catch(() => {})
    }
  }, [settings, isAuthenticated])

  // Apply color theme
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'theme-sepia')
    document.documentElement.classList.add(
      settings.colorTheme === 'dark' ? 'dark' : 
      settings.colorTheme === 'sepia' ? 'theme-sepia' : 'light'
    )
  }, [settings.colorTheme])

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem('neurolearn-accessibility')
  }

  const speak = (text: string) => {
    if (synth && settings.textToSpeech) {
      synth.cancel() // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9 // Slightly slower for better comprehension
      utterance.pitch = 1
      synth.speak(utterance)
    }
  }

  // Force speak - bypasses textToSpeech setting (for quiz voice assistant)
  const forceSpeak = (text: string) => {
    if (synth) {
      synth.cancel() // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9 // Slightly slower for better comprehension
      utterance.pitch = 1
      synth.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if (synth) {
      synth.cancel()
    }
  }

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        speak,
        forceSpeak,
        stopSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}
