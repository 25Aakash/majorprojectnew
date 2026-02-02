import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Neurodiverse profile preferences
export interface NeurodiverseProfile {
  conditions: ('adhd' | 'autism' | 'dyslexia' | 'dyscalculia' | 'dysgraphia' | 'other')[];
  sensoryPreferences: {
    visualSensitivity: 'low' | 'medium' | 'high';
    audioSensitivity: 'low' | 'medium' | 'high';
    preferredLearningStyle: ('visual' | 'auditory' | 'kinesthetic' | 'reading')[];
  };
  focusSettings: {
    sessionDuration: number; // in minutes
    breakDuration: number;
    breakReminders: boolean;
    distractionBlocker: boolean;
  };
  accessibilitySettings: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    fontFamily: 'default' | 'dyslexia-friendly' | 'sans-serif' | 'serif';
    highContrast: boolean;
    reducedMotion: boolean;
    textToSpeech: boolean;
    lineSpacing: 'normal' | 'relaxed' | 'loose';
    colorTheme: 'light' | 'dark' | 'sepia' | 'custom';
  };
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'educator' | 'parent' | 'admin';
  avatar?: string;
  dateOfBirth?: Date;
  neurodiverseProfile?: NeurodiverseProfile;
  linkedAccounts?: mongoose.Types.ObjectId[]; // For parent-student linking
  rewards: {
    points: number;
    badges: string[];
    streakDays: number;
    lastActiveDate: Date;
  };
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'educator', 'parent', 'admin'],
      default: 'student',
    },
    avatar: String,
    dateOfBirth: Date,
    neurodiverseProfile: {
      conditions: [{
        type: String,
        enum: ['adhd', 'autism', 'dyslexia', 'dyscalculia', 'dysgraphia', 'other'],
      }],
      sensoryPreferences: {
        visualSensitivity: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
        audioSensitivity: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
        preferredLearningStyle: [{
          type: String,
          enum: ['visual', 'auditory', 'kinesthetic', 'reading'],
        }],
      },
      focusSettings: {
        sessionDuration: { type: Number, default: 25 },
        breakDuration: { type: Number, default: 5 },
        breakReminders: { type: Boolean, default: true },
        distractionBlocker: { type: Boolean, default: false },
      },
      accessibilitySettings: {
        fontSize: {
          type: String,
          enum: ['small', 'medium', 'large', 'extra-large'],
          default: 'medium',
        },
        fontFamily: {
          type: String,
          enum: ['default', 'dyslexia-friendly', 'sans-serif', 'serif'],
          default: 'default',
        },
        highContrast: { type: Boolean, default: false },
        reducedMotion: { type: Boolean, default: false },
        textToSpeech: { type: Boolean, default: false },
        lineSpacing: {
          type: String,
          enum: ['normal', 'relaxed', 'loose'],
          default: 'normal',
        },
        colorTheme: {
          type: String,
          enum: ['light', 'dark', 'sepia', 'custom'],
          default: 'light',
        },
      },
    },
    linkedAccounts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    rewards: {
      points: { type: Number, default: 0 },
      badges: [String],
      streakDays: { type: Number, default: 0 },
      lastActiveDate: { type: Date, default: Date.now },
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      emailUpdates: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
