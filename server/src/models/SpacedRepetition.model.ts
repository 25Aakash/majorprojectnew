import mongoose, { Document, Schema } from 'mongoose';

/**
 * Spaced Repetition / Knowledge Tracing Model
 * Tracks per-concept mastery using Bayesian Knowledge Tracing (BKT)
 * with Leitner box spaced repetition scheduling.
 */

export interface IConceptState {
  conceptId: string;
  conceptName: string;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;

  // BKT parameters (condition-tuned)
  pInit: number;
  pTransit: number;
  pGuess: number;
  pSlip: number;

  // Current mastery state
  pMastery: number;        // P(L_n) — current mastery probability
  attempts: number;
  correctAttempts: number;
  lastAttempt?: Date;
  responseTimes: number[];

  // Leitner spaced repetition
  leitnerBox: number;       // 1-5
  nextReview?: Date;
  reviewCount: number;
  isMastered: boolean;
}

export interface ISpacedRepetition extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;

  // Per-concept tracking
  concepts: IConceptState[];

  // Aggregate stats
  overallMastery: number;
  totalConcepts: number;
  masteredConcepts: number;
  conceptsDueForReview: number;

  // Pre/Post assessment
  preAssessmentScore?: number;
  postAssessmentScore?: number;
  normalizedGain?: number;   // (post - pre) / (100 - pre)

  createdAt: Date;
  updatedAt: Date;
}

const conceptStateSchema = new Schema({
  conceptId: { type: String, required: true },
  conceptName: { type: String, required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },

  pInit: { type: Number, default: 0.1 },
  pTransit: { type: Number, default: 0.15 },
  pGuess: { type: Number, default: 0.25 },
  pSlip: { type: Number, default: 0.10 },

  pMastery: { type: Number, default: 0.1 },
  attempts: { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  responseTimes: { type: [Number], default: [] },

  leitnerBox: { type: Number, default: 1, min: 1, max: 5 },
  nextReview: { type: Date },
  reviewCount: { type: Number, default: 0 },
  isMastered: { type: Boolean, default: false },
}, { _id: false });

const spacedRepetitionSchema = new Schema<ISpacedRepetition>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },

    concepts: { type: [conceptStateSchema], default: [] },

    overallMastery: { type: Number, default: 0 },
    totalConcepts: { type: Number, default: 0 },
    masteredConcepts: { type: Number, default: 0 },
    conceptsDueForReview: { type: Number, default: 0 },

    preAssessmentScore: { type: Number },
    postAssessmentScore: { type: Number },
    normalizedGain: { type: Number },
  },
  { timestamps: true }
);

spacedRepetitionSchema.index({ userId: 1, courseId: 1 }, { unique: true });
spacedRepetitionSchema.index({ 'concepts.nextReview': 1 });

export const SpacedRepetition = mongoose.model<ISpacedRepetition>(
  'SpacedRepetition',
  spacedRepetitionSchema
);
