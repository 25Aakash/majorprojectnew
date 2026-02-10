import mongoose, { Schema, Document } from 'mongoose';

// ==================== VOICE ANALYSIS ====================
export interface IVoiceMetrics {
  // Speech patterns
  averagePace: number; // words per minute
  paceVariability: number; // consistency of speech speed
  pauseFrequency: number; // pauses per minute
  averagePauseDuration: number; // milliseconds
  fillerWordCount: number; // "um", "uh", etc.

  // Confidence indicators
  volumeLevel: number; // 0-100 average volume
  volumeVariability: number; // consistency
  pitchLevel: number; // relative pitch
  pitchVariability: number; // monotone vs expressive

  // Stress indicators
  speechClarity: number; // 0-100
  hesitationPatterns: number; // hesitation score
  voiceTremor: number; // stress indicator 0-100

  // Reading performance (for read-aloud exercises)
  readingAccuracy: number; // percentage correct
  selfCorrections: number; // number of self-corrections
  skippedWords: number;

  // Timestamps for analysis
  samples: Array<{
    timestamp: Date;
    duration: number;
    transcription?: string;
    confidence: number;
    emotion?: 'neutral' | 'stressed' | 'confident' | 'hesitant' | 'frustrated';
  }>;
}

// ==================== EYE TRACKING ====================
export interface IEyeTrackingMetrics {
  // Gaze patterns
  averageFixationDuration: number; // milliseconds
  fixationCount: number;
  saccadeCount: number; // rapid eye movements
  averageSaccadeLength: number; // pixels

  // Reading patterns
  readingDirection: 'left-to-right' | 'right-to-left' | 'erratic';
  regressionCount: number; // backward eye movements (re-reading)
  lineSkipCount: number; // skipping lines

  // Attention metrics
  contentFocusPercentage: number; // time looking at main content
  distractionZones: Array<{
    zone: string; // 'navigation', 'sidebar', 'outside', etc.
    duration: number;
    frequency: number;
  }>;

  // Engagement indicators
  blinkRate: number; // blinks per minute
  pupilDilation: number; // relative size (if available)
  gazePath: Array<{
    x: number;
    y: number;
    timestamp: number;
    duration: number;
    elementId?: string;
  }>;

  // Heat map data for content areas
  attentionHeatmap: Array<{
    contentBlockId: string;
    totalGazeTime: number;
    gazeCount: number;
    averageGazeDuration: number;
  }>;

  // Calibration quality
  calibrationAccuracy: number;
  trackingConfidence: number;
}

// ==================== MOUSE TRACKING ====================
export interface IMouseTrackingMetrics {
  // Movement patterns
  totalDistance: number; // pixels traveled
  averageSpeed: number; // pixels per second
  speedVariability: number;
  maxSpeed: number;

  // Path analysis
  pathStraightness: number; // 0-1, how direct movements are
  directionChanges: number;
  erraticMovementCount: number; // sudden direction changes

  // Hover behavior
  hoverEvents: Array<{
    elementId: string;
    duration: number;
    timestamp: number;
    abandoned: boolean; // did they click or leave?
  }>;
  averageHoverDuration: number;
  hoverAbandonRate: number;

  // Click behavior
  clickCount: number;
  missClickCount: number; // clicks on non-interactive areas
  doubleClickCount: number;
  averageClickInterval: number;

  // Frustration indicators
  rapidClickEvents: number; // clicking same area repeatedly
  backAndForthMovements: number;
  idleTimeTotal: number;
  idleEvents: Array<{
    startTime: number;
    duration: number;
  }>;

  // Scroll behavior (enhanced)
  scrollPatterns: {
    totalScrollDistance: number;
    scrollUpCount: number;
    scrollDownCount: number;
    rapidScrollCount: number;
    scrollBackCount: number; // scrolling back to re-read
    averageScrollSpeed: number;
  };

  // Content interaction mapping
  contentInteractions: Array<{
    contentBlockId: string;
    mouseEnterTime: number;
    totalTimeOver: number;
    clicksInArea: number;
    scrollStops: number;
  }>;
}

// ==================== COMBINED BIOMETRIC SESSION ====================
export interface IBiometricSession extends Document {
  userId: mongoose.Types.ObjectId;
  learningSessionId: mongoose.Types.ObjectId;
  lessonId: string;
  courseId: string;

  // Tracking data
  voiceMetrics?: IVoiceMetrics;
  eyeTrackingMetrics?: IEyeTrackingMetrics;
  mouseTrackingMetrics: IMouseTrackingMetrics;

  // Computed scores
  scores: {
    attentionScore: number; // 0-100
    engagementScore: number; // 0-100
    stressLevel: number; // 0-100
    confidenceLevel: number; // 0-100
    frustrationLevel: number; // 0-100
    focusQuality: number; // 0-100
  };

  // Analysis results
  detectedPatterns: Array<{
    pattern: string;
    confidence: number;
    timestamp: Date;
    recommendation?: string;
  }>;

  // Permission status
  permissions: {
    voiceEnabled: boolean;
    eyeTrackingEnabled: boolean;
    mouseTrackingEnabled: boolean;
    webcamEnabled: boolean;
  };

  // Session metadata
  startTime: Date;
  endTime?: Date;
  deviceInfo: {
    screenWidth: number;
    screenHeight: number;
    browser: string;
    hasWebcam: boolean;
    hasMicrophone: boolean;
  };

  // Flagged for review
  flaggedForReview: boolean;
  reviewNotes?: string;
}

const VoiceMetricsSchema = new Schema({
  averagePace: { type: Number, default: 0 },
  paceVariability: { type: Number, default: 0 },
  pauseFrequency: { type: Number, default: 0 },
  averagePauseDuration: { type: Number, default: 0 },
  fillerWordCount: { type: Number, default: 0 },
  volumeLevel: { type: Number, default: 50 },
  volumeVariability: { type: Number, default: 0 },
  pitchLevel: { type: Number, default: 50 },
  pitchVariability: { type: Number, default: 0 },
  speechClarity: { type: Number, default: 50 },
  hesitationPatterns: { type: Number, default: 0 },
  voiceTremor: { type: Number, default: 0 },
  readingAccuracy: { type: Number, default: 0 },
  selfCorrections: { type: Number, default: 0 },
  skippedWords: { type: Number, default: 0 },
  samples: [{
    timestamp: Date,
    duration: Number,
    transcription: String,
    confidence: Number,
    emotion: { type: String, enum: ['neutral', 'stressed', 'confident', 'hesitant', 'frustrated'] },
  }],
}, { _id: false });

const EyeTrackingMetricsSchema = new Schema({
  averageFixationDuration: { type: Number, default: 0 },
  fixationCount: { type: Number, default: 0 },
  saccadeCount: { type: Number, default: 0 },
  averageSaccadeLength: { type: Number, default: 0 },
  readingDirection: { type: String, enum: ['left-to-right', 'right-to-left', 'erratic'], default: 'left-to-right' },
  regressionCount: { type: Number, default: 0 },
  lineSkipCount: { type: Number, default: 0 },
  contentFocusPercentage: { type: Number, default: 0 },
  distractionZones: [{
    zone: String,
    duration: Number,
    frequency: Number,
  }],
  blinkRate: { type: Number, default: 0 },
  pupilDilation: { type: Number, default: 0 },
  gazePath: [{
    x: Number,
    y: Number,
    timestamp: Number,
    duration: Number,
    elementId: String,
  }],
  attentionHeatmap: [{
    contentBlockId: String,
    totalGazeTime: Number,
    gazeCount: Number,
    averageGazeDuration: Number,
  }],
  calibrationAccuracy: { type: Number, default: 0 },
  trackingConfidence: { type: Number, default: 0 },
}, { _id: false });

const MouseTrackingMetricsSchema = new Schema({
  totalDistance: { type: Number, default: 0 },
  averageSpeed: { type: Number, default: 0 },
  speedVariability: { type: Number, default: 0 },
  maxSpeed: { type: Number, default: 0 },
  pathStraightness: { type: Number, default: 0 },
  directionChanges: { type: Number, default: 0 },
  erraticMovementCount: { type: Number, default: 0 },
  hoverEvents: [{
    elementId: String,
    duration: Number,
    timestamp: Number,
    abandoned: Boolean,
  }],
  averageHoverDuration: { type: Number, default: 0 },
  hoverAbandonRate: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  missClickCount: { type: Number, default: 0 },
  doubleClickCount: { type: Number, default: 0 },
  averageClickInterval: { type: Number, default: 0 },
  rapidClickEvents: { type: Number, default: 0 },
  backAndForthMovements: { type: Number, default: 0 },
  idleTimeTotal: { type: Number, default: 0 },
  idleEvents: [{
    startTime: Number,
    duration: Number,
  }],
  scrollPatterns: {
    totalScrollDistance: { type: Number, default: 0 },
    scrollUpCount: { type: Number, default: 0 },
    scrollDownCount: { type: Number, default: 0 },
    rapidScrollCount: { type: Number, default: 0 },
    scrollBackCount: { type: Number, default: 0 },
    averageScrollSpeed: { type: Number, default: 0 },
  },
  contentInteractions: [{
    contentBlockId: String,
    mouseEnterTime: Number,
    totalTimeOver: Number,
    clicksInArea: Number,
    scrollStops: Number,
  }],
}, { _id: false });

const BiometricSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  learningSessionId: { type: Schema.Types.ObjectId, ref: 'LearningSession', required: false },
  lessonId: { type: String, required: true },
  courseId: { type: String, required: true },

  voiceMetrics: VoiceMetricsSchema,
  eyeTrackingMetrics: EyeTrackingMetricsSchema,
  mouseTrackingMetrics: { type: MouseTrackingMetricsSchema, default: () => ({}) },

  scores: {
    attentionScore: { type: Number, default: 50 },
    engagementScore: { type: Number, default: 50 },
    stressLevel: { type: Number, default: 50 },
    confidenceLevel: { type: Number, default: 50 },
    frustrationLevel: { type: Number, default: 50 },
    focusQuality: { type: Number, default: 50 },
  },

  detectedPatterns: [{
    pattern: String,
    confidence: Number,
    timestamp: Date,
    recommendation: String,
  }],

  permissions: {
    voiceEnabled: { type: Boolean, default: false },
    eyeTrackingEnabled: { type: Boolean, default: false },
    mouseTrackingEnabled: { type: Boolean, default: true },
    webcamEnabled: { type: Boolean, default: false },
  },

  startTime: { type: Date, default: Date.now },
  endTime: Date,

  deviceInfo: {
    screenWidth: Number,
    screenHeight: Number,
    browser: String,
    hasWebcam: Boolean,
    hasMicrophone: Boolean,
  },

  flaggedForReview: { type: Boolean, default: false },
  reviewNotes: String,
}, {
  timestamps: true,
});

// Indexes for efficient querying
BiometricSessionSchema.index({ userId: 1, startTime: -1 });
BiometricSessionSchema.index({ learningSessionId: 1 });
BiometricSessionSchema.index({ 'scores.frustrationLevel': 1 });

export const BiometricSession = mongoose.model<IBiometricSession>('BiometricSession', BiometricSessionSchema);
export default BiometricSession;
