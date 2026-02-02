import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  HeartIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: SparklesIcon,
    title: 'AI-Powered Adaptation',
    description: 'Our AI learns your unique learning style and adjusts content in real-time.',
  },
  {
    icon: AdjustmentsHorizontalIcon,
    title: 'Customizable Experience',
    description: 'Adjust fonts, colors, spacing, and more to match your sensory preferences.',
  },
  {
    icon: ChartBarIcon,
    title: 'Progress Tracking',
    description: 'Track your learning journey with detailed analytics and insights.',
  },
  {
    icon: HeartIcon,
    title: 'Neurodiversity Focused',
    description: 'Designed specifically for ADHD, autism, dyslexia, and other neurodiverse learners.',
  },
  {
    icon: AcademicCapIcon,
    title: 'Multi-Sensory Content',
    description: 'Learn through visual, audio, and interactive content formats.',
  },
  {
    icon: UserGroupIcon,
    title: 'Parent & Educator Portal',
    description: 'Monitor progress and support learning from a dedicated dashboard.',
  },
]

export default function Home() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Learning Designed for{' '}
              <span className="text-yellow-300">Your Unique Mind</span>
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-white/90">
              An AI-powered adaptive learning platform that understands and supports 
              neurodiverse students. Learn your way, at your pace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/courses"
                    className="btn bg-transparent border-2 border-white hover:bg-white/10 text-lg px-8 py-3"
                  >
                    Explore Courses
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Decorative shapes */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent-300/20 rounded-full blur-2xl" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Built for Neurodiverse Minds
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Every feature is designed with accessibility and neurodiversity at its core.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tailored Support for Every Learner
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'ADHD', emoji: '⚡', color: 'bg-yellow-100 text-yellow-800' },
              { name: 'Autism', emoji: '🌈', color: 'bg-blue-100 text-blue-800' },
              { name: 'Dyslexia', emoji: '📖', color: 'bg-green-100 text-green-800' },
              { name: 'Dyscalculia', emoji: '🔢', color: 'bg-purple-100 text-purple-800' },
            ].map((condition, index) => (
              <motion.div
                key={condition.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`${condition.color} rounded-2xl p-6 text-center`}
              >
                <span className="text-4xl mb-3 block">{condition.emoji}</span>
                <span className="font-semibold text-lg">{condition.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Start Your Learning Journey?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of neurodiverse learners who are discovering their potential.
            </p>
            <Link
              to="/register"
              className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-10 py-4"
            >
              Create Free Account
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
