import { create } from 'zustand'
import api from '../services/api'

// Types for configuration
export interface Condition {
  id: string
  label: string
  emoji: string
  description: string
}

export interface LearningStyle {
  id: string
  label: string
  description: string
  icon: string
}

export interface Category {
  id: string
  label: string
  icon: string
  color: string
}

export interface Difficulty {
  id: string
  label: string
  description: string
  color: string
}

export interface AccessibilityFeature {
  id: string
  label: string
  description: string
}

export interface Theme {
  id: string
  label: string
  icon: string
  colors: { bg: string; text: string }
}

export interface FontSize {
  id: string
  label: string
  value: string
  scale: number
}

export interface FontFamily {
  id: string
  label: string
  family: string
}

export interface LineSpacing {
  id: string
  label: string
  value: number
}

export interface FocusSettings {
  defaultSessionDuration: number
  defaultBreakDuration: number
  minSessionDuration: number
  maxSessionDuration: number
  minBreakDuration: number
  maxBreakDuration: number
}

export interface PlatformFeature {
  id: string
  title: string
  description: string
  icon: string
}

export interface AppConfig {
  conditions: Condition[]
  learningStyles: LearningStyle[]
  categories: Category[]
  difficulties: Difficulty[]
  accessibilityFeatures: AccessibilityFeature[]
  themes: Theme[]
  fontSizes: FontSize[]
  fontFamilies: FontFamily[]
  lineSpacings: LineSpacing[]
  focusSettings: FocusSettings
  platformFeatures: PlatformFeature[]
  gamification: {
    pointsPerLesson: number
    pointsPerQuiz: number
    streakBonusMultiplier: number
    badgeThresholds: Record<string, number>
  }
}

interface ConfigState {
  config: AppConfig | null
  loading: boolean
  error: string | null
  fetchConfig: () => Promise<void>
  getConditions: () => Condition[]
  getLearningStyles: () => LearningStyle[]
  getCategories: () => Category[]
  getDifficulties: () => Difficulty[]
  getAccessibilityFeatures: () => AccessibilityFeature[]
  getThemes: () => Theme[]
  getFontSizes: () => FontSize[]
  getFontFamilies: () => FontFamily[]
  getLineSpacings: () => LineSpacing[]
  getFocusSettings: () => FocusSettings
  getPlatformFeatures: () => PlatformFeature[]
}

// Default fallback config in case API fails
const defaultConfig: AppConfig = {
  conditions: [
    { id: 'adhd', label: 'ADHD', emoji: '⚡', description: 'Attention Deficit Hyperactivity Disorder' },
    { id: 'autism', label: 'Autism', emoji: '🌈', description: 'Autism Spectrum Disorder' },
    { id: 'dyslexia', label: 'Dyslexia', emoji: '📖', description: 'Reading and language processing difficulty' },
    { id: 'dyscalculia', label: 'Dyscalculia', emoji: '🔢', description: 'Difficulty with numbers and math' },
    { id: 'other', label: 'Other', emoji: '🧠', description: 'Other learning differences' },
  ],
  learningStyles: [
    { id: 'visual', label: 'Visual', description: 'Learn best by seeing', icon: '👁️' },
    { id: 'auditory', label: 'Auditory', description: 'Learn best by hearing', icon: '👂' },
    { id: 'kinesthetic', label: 'Kinesthetic', description: 'Learn best by doing', icon: '🖐️' },
    { id: 'reading', label: 'Reading/Writing', description: 'Learn best through text', icon: '📝' },
  ],
  categories: [
    { id: 'math', label: 'Mathematics', icon: '🔢', color: '#3B82F6' },
    { id: 'reading', label: 'Reading & Language', icon: '📚', color: '#10B981' },
    { id: 'science', label: 'Science', icon: '🔬', color: '#8B5CF6' },
  ],
  difficulties: [
    { id: 'beginner', label: 'Beginner', description: 'New to the subject', color: '#22C55E' },
    { id: 'intermediate', label: 'Intermediate', description: 'Some prior knowledge', color: '#F59E0B' },
    { id: 'advanced', label: 'Advanced', description: 'Experienced learners', color: '#EF4444' },
  ],
  accessibilityFeatures: [],
  themes: [
    { id: 'light', label: 'Light', icon: '☀️', colors: { bg: '#FFFFFF', text: '#1F2937' } },
    { id: 'dark', label: 'Dark', icon: '🌙', colors: { bg: '#1F2937', text: '#F9FAFB' } },
  ],
  fontSizes: [
    { id: 'medium', label: 'Medium', value: '16px', scale: 1 },
  ],
  fontFamilies: [
    { id: 'default', label: 'Default', family: 'system-ui, sans-serif' },
  ],
  lineSpacings: [
    { id: 'normal', label: 'Normal', value: 1.5 },
  ],
  focusSettings: {
    defaultSessionDuration: 25,
    defaultBreakDuration: 5,
    minSessionDuration: 5,
    maxSessionDuration: 60,
    minBreakDuration: 1,
    maxBreakDuration: 30,
  },
  platformFeatures: [],
  gamification: {
    pointsPerLesson: 50,
    pointsPerQuiz: 100,
    streakBonusMultiplier: 1.5,
    badgeThresholds: {},
  },
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  error: null,

  fetchConfig: async () => {
    // Don't fetch if already loaded
    if (get().config) return

    set({ loading: true, error: null })
    try {
      const response = await api.get('/config')
      set({ config: response.data, loading: false })
    } catch (error) {
      console.error('Error fetching config, using defaults:', error)
      set({ config: defaultConfig, loading: false, error: 'Failed to load configuration' })
    }
  },

  getConditions: () => get().config?.conditions || defaultConfig.conditions,
  getLearningStyles: () => get().config?.learningStyles || defaultConfig.learningStyles,
  getCategories: () => get().config?.categories || defaultConfig.categories,
  getDifficulties: () => get().config?.difficulties || defaultConfig.difficulties,
  getAccessibilityFeatures: () => get().config?.accessibilityFeatures || defaultConfig.accessibilityFeatures,
  getThemes: () => get().config?.themes || defaultConfig.themes,
  getFontSizes: () => get().config?.fontSizes || defaultConfig.fontSizes,
  getFontFamilies: () => get().config?.fontFamilies || defaultConfig.fontFamilies,
  getLineSpacings: () => get().config?.lineSpacings || defaultConfig.lineSpacings,
  getFocusSettings: () => get().config?.focusSettings || defaultConfig.focusSettings,
  getPlatformFeatures: () => get().config?.platformFeatures || defaultConfig.platformFeatures,
}))

// Hook to initialize config on app load
export const useInitConfig = () => {
  const { fetchConfig, loading, config } = useConfigStore()
  
  if (!config && !loading) {
    fetchConfig()
  }
  
  return { loading, config }
}
