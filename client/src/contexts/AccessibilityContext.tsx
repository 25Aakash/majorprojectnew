import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'

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
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)

  // Speech synthesis
  const [synth] = useState(() => typeof window !== 'undefined' ? window.speechSynthesis : null)


  // Load settings from backend on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get('/user/accessibility-preferences')
        if (res.data?.preferences) {
          setSettings({ ...defaultSettings, ...res.data.preferences })
        }
      } catch {
        // fallback to localStorage or default
        const saved = localStorage.getItem('neurolearn-accessibility')
        if (saved) {
          try {
            setSettings({ ...defaultSettings, ...JSON.parse(saved) })
          } catch {
            setSettings(defaultSettings)
          }
        } else {
          setSettings(defaultSettings)
        }
      }
    }
    fetchSettings()
  }, [])

  // Save settings to backend and localStorage
  useEffect(() => {
    localStorage.setItem('neurolearn-accessibility', JSON.stringify(settings))
    api.post('/user/accessibility-preferences', { preferences: settings }).catch(() => {})
  }, [settings])

  // Apply reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches && !settings.reducedMotion) {
      setSettings(prev => ({ ...prev, reducedMotion: true }))
    }
  }, [])

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
