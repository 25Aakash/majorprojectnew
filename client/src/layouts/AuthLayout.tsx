import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 to-accent-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400">
            NeuroLearn
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Adaptive Learning for Everyone
          </p>
        </div>
        <div className="card">
          <Outlet />
        </div>
      </motion.div>
    </div>
  )
}
