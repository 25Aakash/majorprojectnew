import mongoose, { Schema, Document } from 'mongoose';

/**
 * Config Model — persists platform configuration in MongoDB
 * so admins can update settings via the API without code changes.
 * Each document represents one config "section" (conditions, themes, etc.).
 */

export interface IConfigDocument extends Document {
  section: string;
  data: Record<string, unknown>;
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

const ConfigSchema = new Schema<IConfigDocument>(
  {
    section: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IConfigDocument>('Config', ConfigSchema);
