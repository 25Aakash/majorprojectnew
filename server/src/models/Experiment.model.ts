import mongoose, { Schema, Document } from 'mongoose';

/**
 * A/B Testing (Experiment) Model
 *
 * Tracks experiments so the platform can compare different
 * adaptive strategies and measure which adaptations actually
 * improve outcomes for which neurodiverse conditions.
 *
 * Example experiment:
 *   "Does Leitner spaced-repetition improve quiz scores for
 *    ADHD students vs. standard review?"
 */

export interface IVariant {
  name: string;
  description?: string;
  config: Record<string, unknown>;
  /** Weight for random assignment (higher = more likely). */
  weight: number;
}

export interface IExperimentDocument extends Document {
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  /** Conditions this experiment targets (empty = all). */
  targetConditions: string[];
  variants: IVariant[];
  /** Map of userId → variant name */
  assignments: Map<string, string>;
  /** Metric to optimise (e.g. engagement, completion, quizScore). */
  primaryMetric: string;
  /** Results per variant, populated when experiment is completed. */
  results: Map<string, Record<string, unknown>>;
  startDate?: Date;
  endDate?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IVariant>(
  {
    name: { type: String, required: true },
    description: String,
    config: { type: Schema.Types.Mixed, default: {} },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const ExperimentSchema = new Schema<IExperimentDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: String,
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
    },
    targetConditions: { type: [String], default: [] },
    variants: { type: [VariantSchema], default: [] },
    assignments: { type: Map, of: String, default: {} },
    primaryMetric: { type: String, default: 'engagement' },
    results: { type: Map, of: Schema.Types.Mixed, default: {} },
    startDate: Date,
    endDate: Date,
    createdBy: String,
  },
  { timestamps: true }
);

export default mongoose.model<IExperimentDocument>('Experiment', ExperimentSchema);
