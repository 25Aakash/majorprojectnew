import mongoose, { Document, Schema } from 'mongoose';

// Content types for multi-sensory learning
export interface ContentBlock {
  type: 'text' | 'video' | 'audio' | 'interactive' | 'image' | 'quiz';
  content: string;
  altText?: string; // Accessibility
  duration?: number; // For video/audio in seconds
  transcription?: string; // For audio/video accessibility
  interactiveData?: Record<string, unknown>;
}

export interface ILesson extends Document {
  title: string;
  description: string;
  courseId: mongoose.Types.ObjectId;
  order: number;
  content?: string; // Legacy field for backward compatibility
  contentBlocks: ContentBlock[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in minutes
  quiz?: unknown; // Can be array or Quiz object
  adaptiveContent: {
    simplifiedVersion?: ContentBlock[];
    advancedVersion?: ContentBlock[];
    visualEnhanced?: ContentBlock[];
    audioEnhanced?: ContentBlock[];
  };
  prerequisites: mongoose.Types.ObjectId[];
  learningObjectives: string[];
  keywords: string[];
  isPublished: boolean;
}

const lessonSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, required: true },
    content: { type: String }, // Legacy field for backward compatibility
    contentBlocks: [{
      type: {
        type: String,
        enum: ['text', 'video', 'audio', 'interactive', 'image', 'quiz'],
        required: true,
      },
      content: { type: String, required: true },
      altText: String,
      duration: Number,
      transcription: String,
      interactiveData: Schema.Types.Mixed,
    }],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    estimatedDuration: { type: Number, default: 10 },
    quiz: { type: Schema.Types.Mixed }, // Can be array or object
    adaptiveContent: {
      simplifiedVersion: [Schema.Types.Mixed],
      advancedVersion: [Schema.Types.Mixed],
      visualEnhanced: [Schema.Types.Mixed],
      audioEnhanced: [Schema.Types.Mixed],
    },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    learningObjectives: [String],
    keywords: [String],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnail?: string;
  category: string;
  subcategory?: string;
  instructor: mongoose.Types.ObjectId;
  lessons: mongoose.Types.ObjectId[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
  neurodiverseFeatures: {
    adhdFriendly: boolean;
    autismFriendly: boolean;
    dyslexiaFriendly: boolean;
  };
  rating: number;
  enrollmentCount: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: String,
    category: { type: String, required: true },
    subcategory: String,
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    estimatedDuration: { type: Number, default: 0 },
    tags: [String],
    neurodiverseFeatures: {
      adhdFriendly: { type: Boolean, default: false },
      autismFriendly: { type: Boolean, default: false },
      dyslexiaFriendly: { type: Boolean, default: false },
    },
    rating: { type: Number, default: 0 },
    enrollmentCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>('Course', courseSchema);
export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
