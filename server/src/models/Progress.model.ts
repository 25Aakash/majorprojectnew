import mongoose, { Document, Schema } from 'mongoose';

// Learning session data for AI analysis
export interface LearningSession {
  startTime: Date;
  endTime: Date;
  lessonId: mongoose.Types.ObjectId;
  focusScore: number; // 0-100
  completionRate: number; // 0-100
  interactionCount: number;
  pauseCount: number;
  contentPreferences: {
    preferredType: 'text' | 'video' | 'audio' | 'interactive';
    timeSpentPerType: Record<string, number>;
  };
}

export interface QuizAttempt {
  quizId: mongoose.Types.ObjectId;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  attemptDate: Date;
  questionDetails: {
    questionId: string;
    correct: boolean;
    timeSpent: number;
    selectedAnswer: string;
  }[];
}

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  enrolledAt: Date;
  completedLessons: mongoose.Types.ObjectId[];
  currentLesson: mongoose.Types.ObjectId;
  overallProgress: number; // 0-100
  learningSessions: LearningSession[];
  quizAttempts: QuizAttempt[];
  adaptiveMetrics: {
    currentDifficultyLevel: number; // 1-10
    recommendedPace: 'slower' | 'normal' | 'faster';
    strongAreas: string[];
    improvementAreas: string[];
    optimalSessionDuration: number;
    bestTimeOfDay: string;
  };
  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: Date;
  };
  timeSpent: number; // total minutes
  lastAccessedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrolledAt: { type: Date, default: Date.now },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    currentLesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    overallProgress: { type: Number, default: 0 },
    learningSessions: [{
      startTime: Date,
      endTime: Date,
      lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
      focusScore: Number,
      completionRate: Number,
      interactionCount: Number,
      pauseCount: Number,
      contentPreferences: {
        preferredType: String,
        timeSpentPerType: Schema.Types.Mixed,
      },
    }],
    quizAttempts: [{
      quizId: Schema.Types.ObjectId,
      score: Number,
      totalQuestions: Number,
      correctAnswers: Number,
      timeSpent: Number,
      attemptDate: Date,
      questionDetails: [{
        questionId: String,
        correct: Boolean,
        timeSpent: Number,
        selectedAnswer: String,
      }],
    }],
    adaptiveMetrics: {
      currentDifficultyLevel: { type: Number, default: 5 },
      recommendedPace: {
        type: String,
        enum: ['slower', 'normal', 'faster'],
        default: 'normal',
      },
      strongAreas: [String],
      improvementAreas: [String],
      optimalSessionDuration: { type: Number, default: 25 },
      bestTimeOfDay: String,
    },
    streakData: {
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastStudyDate: Date,
    },
    timeSpent: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for efficient queries
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Progress = mongoose.model<IProgress>('Progress', progressSchema);
