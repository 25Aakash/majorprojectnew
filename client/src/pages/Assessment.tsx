import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../services/api'
import {
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

/* ---------- Types ---------- */
interface Question {
  id: string
  conceptId: string
  text: string
  options: string[]
  correctIndex: number
  difficulty: number
}

interface AssessmentResult {
  score: number
  total: number
  percentage: number
  conceptBreakdown: { conceptId: string; correct: number; total: number }[]
}

type Phase = 'intro' | 'quiz' | 'result'

/* ---------- Component ---------- */
export default function Assessment() {
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([])
  const [phase, setPhase] = useState<Phase>('intro')
  const [assessmentType, setAssessmentType] = useState<'pre' | 'post'>('pre')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState(0)

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data?.courses ?? r.data ?? []))
  }, [])

  /* Fetch questions from AI service */
  const startAssessment = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const res = await api.post('/ai/generate-content', {
        topic: `assessment-${assessmentType}`,
        course_id: courseId,
        difficulty: assessmentType === 'pre' ? 3 : 6,
        content_type: 'quiz',
        count: 10,
      })
      const raw: any[] = res.data?.questions ?? res.data?.content?.questions ?? []

      // Normalise — the generator may return varied shapes
      const qs: Question[] = raw.map((q: any, i: number) => ({
        id: q.id ?? `q-${i}`,
        conceptId: q.conceptId ?? q.concept_id ?? `concept-${i}`,
        text: q.text ?? q.question ?? `Question ${i + 1}`,
        options: q.options ?? ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: q.correctIndex ?? q.correct_index ?? 0,
        difficulty: q.difficulty ?? 5,
      }))

      // If AI didn't return questions, fall back to a small static set
      if (qs.length === 0) {
        for (let i = 0; i < 5; i++) {
          qs.push({
            id: `fallback-${i}`,
            conceptId: `concept-${i}`,
            text: `Sample ${assessmentType === 'pre' ? 'diagnostic' : 'summative'} question ${i + 1} — replace with real items from your course content.`,
            options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
            correctIndex: 0,
            difficulty: assessmentType === 'pre' ? 3 : 6,
          })
        }
      }

      setQuestions(qs)
      setAnswers(new Array(qs.length).fill(null))
      setCurrentQ(0)
      setStartTime(Date.now())
      setPhase('quiz')
    } catch (e) {
      console.error('Failed to start assessment:', e)
    } finally {
      setLoading(false)
    }
  }

  /* Submit and compute results */
  const submitAssessment = async () => {
    const conceptMap: Record<string, { correct: number; total: number }> = {}
    let totalCorrect = 0

    questions.forEach((q, i) => {
      const correct = answers[i] === q.correctIndex
      if (correct) totalCorrect++
      if (!conceptMap[q.conceptId]) conceptMap[q.conceptId] = { correct: 0, total: 0 }
      conceptMap[q.conceptId].total++
      if (correct) conceptMap[q.conceptId].correct++
    })

    const res: AssessmentResult = {
      score: totalCorrect,
      total: questions.length,
      percentage: Math.round((totalCorrect / questions.length) * 100),
      conceptBreakdown: Object.entries(conceptMap).map(([conceptId, d]) => ({
        conceptId,
        ...d,
      })),
    }
    setResult(res)
    setPhase('result')

    // Persist to spaced-repetition service
    try {
      await api.post('/spaced-repetition/assessment', {
        courseId,
        type: assessmentType,
        score: res.percentage,
        conceptScores: res.conceptBreakdown.map((c) => ({
          conceptId: c.conceptId,
          score: c.total > 0 ? c.correct / c.total : 0,
        })),
      })
    } catch {
      // non-critical
    }

    // Also feed concept-level results into BKT
    try {
      const attempts = questions.map((q, i) => ({
        concept_id: q.conceptId,
        correct: answers[i] === q.correctIndex,
        response_time_ms: Math.round((Date.now() - startTime) / questions.length),
      }))
      await api.post('/ai/knowledge-trace/batch-update', { user_id: 'current', attempts })
    } catch {
      // non-critical
    }
  }

  /* ---- Pick answer ---- */
  const selectAnswer = (optionIdx: number) => {
    const copy = [...answers]
    copy[currentQ] = optionIdx
    setAnswers(copy)
  }

  /* ---------- Intro ---------- */
  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <AcademicCapIcon className="h-14 w-14 mx-auto text-primary-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Learning Assessment</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Take a <strong>pre-assessment</strong> before starting a course to measure your baseline, then a{' '}
            <strong>post-assessment</strong> after to quantify your learning gain.
          </p>
        </motion.div>

        {/* Type selector */}
        <div className="flex gap-4 justify-center">
          {(['pre', 'post'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAssessmentType(t)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                assessmentType === t
                  ? 'bg-primary-500 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t === 'pre' ? '📋 Pre-Assessment' : '🎓 Post-Assessment'}
            </button>
          ))}
        </div>

        {/* Course picker */}
        <div className="card p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Course
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">— choose a course —</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            disabled={!courseId || loading}
            onClick={startAssessment}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Generating questions…' : 'Start Assessment'}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          The normalized learning gain is calculated as{' '}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
            g = (post − pre) / (100 − pre)
          </code>
        </p>
      </div>
    )
  }

  /* ---------- Quiz ---------- */
  if (phase === 'quiz') {
    const q = questions[currentQ]
    const progress = ((currentQ + 1) / questions.length) * 100
    const isLast = currentQ === questions.length - 1

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <ClockIcon className="h-4 w-4" />
          Question {currentQ + 1} of {questions.length}
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>

        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          className="card p-6 space-y-5"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{q.text}</h2>
          <div className="space-y-3">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  answers[currentQ] === idx
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex justify-between">
          <button
            disabled={currentQ === 0}
            onClick={() => setCurrentQ((p) => p - 1)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-30"
          >
            ← Previous
          </button>
          {isLast ? (
            <button
              disabled={answers.includes(null)}
              onClick={submitAssessment}
              className="btn-primary px-6 disabled:opacity-50"
            >
              Submit Assessment
            </button>
          ) : (
            <button
              disabled={answers[currentQ] === null}
              onClick={() => setCurrentQ((p) => p + 1)}
              className="btn-primary px-6 disabled:opacity-50"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ---------- Result ---------- */
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            (result?.percentage ?? 0) >= 70
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}
        >
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {result?.percentage ?? 0}%
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {assessmentType === 'pre' ? 'Pre-Assessment' : 'Post-Assessment'} Complete
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          You scored {result?.score} / {result?.total}
        </p>
      </motion.div>

      {/* Concept breakdown */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-primary-500" />
          Concept Breakdown
        </h3>
        {result?.conceptBreakdown.map((c) => {
          const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0
          return (
            <div key={c.conceptId} className="flex items-center gap-3">
              {pct >= 70 ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300 w-28 truncate capitalize">
                {c.conceptId.replace(/-/g, ' ')}
              </span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {c.correct}/{c.total}
              </span>
            </div>
          )
        })}
      </div>

      {/* Next steps */}
      <div className="flex gap-4 justify-center">
        {assessmentType === 'pre' && (
          <p className="text-sm text-gray-500 text-center">
            Great! Your baseline is recorded. Complete the course, then take the <strong>Post-Assessment</strong> to
            measure your learning gain.
          </p>
        )}
        {assessmentType === 'post' && (
          <p className="text-sm text-gray-500 text-center">
            Your normalized gain has been calculated and stored. Check the{' '}
            <strong>Performance Analytics</strong> dashboard for a visual comparison.
          </p>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={() => {
            setPhase('intro')
            setResult(null)
            setQuestions([])
            setAnswers([])
          }}
          className="btn-primary px-8"
        >
          Take Another Assessment
        </button>
      </div>
    </div>
  )
}
