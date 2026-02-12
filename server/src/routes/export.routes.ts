import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.middleware';
import { Progress } from '../models/Progress.model';
import { User } from '../models/User.model';
import { Course } from '../models/Course.model';

const router = Router();

/**
 * Data Export API
 * Allows parents and educators to download progress reports as CSV.
 */

// Helper — convert array-of-objects to CSV string
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          // Escape commas / quotes
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    ),
  ];
  return lines.join('\n');
}

/**
 * GET /api/export/progress/csv
 * Export the authenticated student's own progress as CSV.
 */
router.get(
  '/progress/csv',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const progressDocs = await Progress.find({ userId })
        .populate('courseId', 'title category')
        .lean();

      const rows = progressDocs.map((p: any) => ({
        course: p.courseId?.title ?? 'Unknown',
        category: p.courseId?.category ?? '',
        overallProgress: `${p.overallProgress ?? 0}%`,
        lessonsCompleted: p.completedLessons?.length ?? 0,
        quizzesPassed: p.quizzesPassed ?? 0,
        timeSpentMinutes: Math.round((p.timeSpent ?? 0) / 60),
        currentStreak: p.streakData?.currentStreak ?? 0,
        lastAccessed: p.lastAccessedAt
          ? new Date(p.lastAccessedAt).toISOString().slice(0, 10)
          : '',
      }));

      const csv = toCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="my-progress.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Error exporting data' });
    }
  }
);

/**
 * GET /api/export/student/:studentId/csv
 * Parent or educator exports a specific student's progress.
 */
router.get(
  '/student/:studentId/csv',
  authMiddleware,
  roleMiddleware('parent', 'educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { studentId } = req.params;
      const student = await User.findById(studentId).select('firstName lastName email').lean();
      if (!student) return res.status(404).json({ message: 'Student not found' });

      const progressDocs = await Progress.find({ userId: studentId })
        .populate('courseId', 'title category')
        .lean();

      const rows = progressDocs.map((p: any) => ({
        student: `${(student as any).firstName} ${(student as any).lastName}`,
        email: (student as any).email,
        course: p.courseId?.title ?? 'Unknown',
        category: p.courseId?.category ?? '',
        overallProgress: `${p.overallProgress ?? 0}%`,
        lessonsCompleted: p.completedLessons?.length ?? 0,
        quizzesPassed: p.quizzesPassed ?? 0,
        timeSpentMinutes: Math.round((p.timeSpent ?? 0) / 60),
        currentStreak: p.streakData?.currentStreak ?? 0,
        lastAccessed: p.lastAccessedAt
          ? new Date(p.lastAccessedAt).toISOString().slice(0, 10)
          : '',
      }));

      const csv = toCSV(rows);
      const safeName = `${(student as any).firstName}_${(student as any).lastName}`.replace(/\s/g, '_');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_progress.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Error exporting student data' });
    }
  }
);

/**
 * GET /api/export/sessions/csv
 * Export detailed learning session logs for the authenticated user.
 */
router.get(
  '/sessions/csv',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const progressDocs = await Progress.find({ userId })
        .populate('courseId', 'title')
        .lean();

      const rows: Record<string, unknown>[] = [];
      for (const p of progressDocs as any[]) {
        for (const s of p.learningSessions ?? []) {
          rows.push({
            course: p.courseId?.title ?? 'Unknown',
            date: s.startTime
              ? new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ')
              : '',
            durationMinutes: Math.round((s.duration ?? 0) / 60),
            interactions: s.interactions ?? 0,
            completionRate: `${Math.round((s.completion_rate ?? s.completionRate ?? 0) * 100)}%`,
            focusScore: s.focusScore != null ? `${Math.round(s.focusScore * 100)}%` : '',
          });
        }
      }

      const csv = toCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="learning-sessions.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Error exporting sessions' });
    }
  }
);

export default router;
