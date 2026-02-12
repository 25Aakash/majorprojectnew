import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAccessibility } from './contexts/AccessibilityContext'
import { useConfigStore } from './stores/configStore'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'
import LessonView from './pages/LessonView'
import Profile from './pages/Profile'
import AccessibilitySettings from './pages/AccessibilitySettings'
import FocusMode from './pages/FocusMode'
import ParentDashboard from './pages/ParentDashboard'

// Educator Pages
import EducatorDashboard from './pages/educator/EducatorDashboard'
import CourseEditor from './pages/educator/CourseEditor'
import LessonManager from './pages/educator/LessonManager'
import LessonEditor from './pages/educator/LessonEditor'
import AIContentGenerator from './pages/educator/AIContentGenerator'
import AIVideoGenerator from './pages/educator/AIVideoGenerator'
import Assessment from './pages/Assessment'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import SkipLink from './components/accessibility/SkipLink'

function App() {
  const { settings } = useAccessibility()
  const fetchConfig = useConfigStore(state => state.fetchConfig)

  // Initialize dynamic configuration on app load
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Build class names based on accessibility settings
  const appClasses = [
    settings.colorTheme === 'dark' ? 'dark' : '',
    settings.colorTheme === 'sepia' ? 'theme-sepia' : '',
    settings.highContrast ? 'high-contrast' : '',
    settings.fontFamily === 'dyslexia-friendly' ? 'dyslexia-friendly' : '',
    settings.reducedMotion ? 'motion-reduce' : '',
    `font-size-${settings.fontSize}`,
    `line-height-${settings.lineSpacing}`,
  ].filter(Boolean).join(' ')

  return (
    <div className={appClasses}>
      <SkipLink />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: settings.fontSize === 'large' ? '1.125rem' : '1rem',
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<CourseList />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/learn/:courseId/:lessonId" element={<LessonView />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/accessibility" element={<AccessibilitySettings />} />
            <Route path="/settings/accessibility" element={<AccessibilitySettings />} />
            <Route path="/focus-mode" element={<FocusMode />} />
            <Route path="/parent-dashboard" element={<ParentDashboard />} />
            <Route path="/assessment" element={<Assessment />} />
            
            {/* Educator Routes */}
            <Route path="/educator" element={<EducatorDashboard />} />
            <Route path="/educator/courses/new" element={<CourseEditor />} />
            <Route path="/educator/courses/:courseId/edit" element={<CourseEditor />} />
            <Route path="/educator/courses/:courseId/lessons" element={<LessonManager />} />
            <Route path="/educator/courses/:courseId/lessons/new" element={<LessonEditor />} />
            <Route path="/educator/courses/:courseId/lessons/:lessonId/edit" element={<LessonEditor />} />
            <Route path="/educator/ai-generator" element={<AIContentGenerator />} />
            <Route path="/educator/video-generator" element={<AIVideoGenerator />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App
