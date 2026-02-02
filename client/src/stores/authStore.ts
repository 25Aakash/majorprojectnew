import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'student' | 'educator' | 'parent' | 'admin'
  neurodiverseProfile?: {
    conditions: string[]
    sensoryPreferences: {
      visualSensitivity: string
      audioSensitivity: string
      preferredLearningStyle: string[]
    }
    focusSettings: {
      sessionDuration: number
      breakDuration: number
      breakReminders: boolean
      distractionBlocker: boolean
    }
    accessibilitySettings: {
      fontSize: string
      fontFamily: string
      highContrast: boolean
      reducedMotion: boolean
      textToSpeech: boolean
      lineSpacing: string
      colorTheme: string
    }
  }
  rewards?: {
    points: number
    badges: string[]
    streakDays: number
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: string
  conditions?: string[]
  learningStyles?: string[]
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { token, user } = response.data
          
          // Set token for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message = error instanceof Error 
            ? error.message 
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', data)
          const { token, user } = response.data
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message = error instanceof Error 
            ? error.message 
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'neurolearn-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Set token from storage on app load
const storedState = localStorage.getItem('neurolearn-auth')
if (storedState) {
  try {
    const { state } = JSON.parse(storedState)
    if (state?.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
    }
  } catch (e) {
    console.error('Failed to parse stored auth state')
  }
}
