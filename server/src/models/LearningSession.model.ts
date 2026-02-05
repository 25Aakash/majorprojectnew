import mongoose, { Document, Schema } from 'mongoose';

/**
 * LearningSession Model
 * Tracks detailed behavioral data during learning sessions
 * Used for adaptive profile building during the first 7 days
 */

export interface IBehavioralMetrics {
  // Attention & Focus
  averageTimeOnContent: number; // seconds spent on content blocks
  attentionDropPoints: number[]; // timestamps where attention dropped
  tabSwitches: number;
  scrollPatterns: {
    speed: 'slow' | 'medium' | 'fast';
    backtrackCount: number;
  };
  
  // Interaction Patterns
  clickFrequency: number; // clicks per minute
  hoverTime: number; // time spent hovering before clicking
  responseTime: number; // time to answer questions
  
  // Comprehension Indicators
  rereadCount: number; // how many times content was re-read
  helpRequests: number; // times help button was clicked
  hintUsage: number;
  
  // Emotional Indicators
  frustrationScore: number; // 0-100 based on rapid wrong answers, quick exits
  engagementScore: number; // 0-100 based on interactions
  confidenceScore: number; // 0-100 based on answer speed and accuracy
}

export interface IContentInteraction {
  contentType: 'text' | 'video' | 'audio' | 'interactive' | 'image' | 'quiz';
  timeSpent: number;
  completionRate: number;
  engagementLevel: 'low' | 'medium' | 'high';
  wasSkipped: boolean;
  wasReplayed: boolean; // for video/audio
}

export interface IQuizPerformance {
  questionId: string;
  timeToAnswer: number;
  wasCorrect: boolean;
  attemptsBeforeCorrect: number;
  usedHint: boolean;
  confidenceBeforeAnswer: number; // if we ask "how sure are you?"
}

export interface ILearningSession extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  
  // Session Timing
  startTime: Date;
  endTime?: Date;
  totalDuration: number; // seconds
  activeDuration: number; // seconds (excluding idle time)
  
  // Session Context
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  isOnboardingPeriod: boolean; // true if within first 7 days
  
  // Behavioral Metrics
  behavioralMetrics: IBehavioralMetrics;
  
  // Content Interactions
  contentInteractions: IContentInteraction[];
  
  // Quiz Performance
  quizPerformance: IQuizPerformance[];
  
  // Break Patterns
  breaksTaken: {
    timestamp: Date;
    duration: number;
    wasPrompted: boolean;
    returnedAfter: boolean;
  }[];
  
  // Adaptive Adjustments Made
  adaptationsApplied: {
    type: string;
    reason: string;
    timestamp: Date;
    effectiveness: number; // -1 to 1, negative = made it worse
  }[];
  
  // Session Outcome
  lessonCompleted: boolean;
  overallPerformance: number; // 0-100
  focusScore: number; // 0-100
  
  createdAt: Date;
  updatedAt: Date;
}

const learningSessionSchema = new Schema<ILearningSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    totalDuration: { type: Number, default: 0 },
    activeDuration: { type: Number, default: 0 },
    
    timeOfDay: { 
      type: String, 
      enum: ['morning', 'afternoon', 'evening', 'night'],
      required: true 
    },
    dayOfWeek: { type: Number, required: true },
    deviceType: { 
      type: String, 
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'desktop' 
    },
    isOnboardingPeriod: { type: Boolean, default: true },
    
    behavioralMetrics: {
      averageTimeOnContent: { type: Number, default: 0 },
      attentionDropPoints: [Number],
      tabSwitches: { type: Number, default: 0 },
      scrollPatterns: {
        speed: { type: String, enum: ['slow', 'medium', 'fast'], default: 'medium' },
        backtrackCount: { type: Number, default: 0 },
      },
      clickFrequency: { type: Number, default: 0 },
      hoverTime: { type: Number, default: 0 },
      responseTime: { type: Number, default: 0 },
      rereadCount: { type: Number, default: 0 },
      helpRequests: { type: Number, default: 0 },
      hintUsage: { type: Number, default: 0 },
      frustrationScore: { type: Number, default: 50 },
      engagementScore: { type: Number, default: 50 },
      confidenceScore: { type: Number, default: 50 },
    },
    
    contentInteractions: {
      type: [{
        contentType: { type: String, enum: ['text', 'video', 'audio', 'interactive', 'image', 'quiz'] },
        timeSpent: Number,
        completionRate: Number,
        engagementLevel: { type: String, enum: ['low', 'medium', 'high'] },
        wasSkipped: Boolean,
        wasReplayed: Boolean,
        _id: false, // Disable auto _id for subdocuments
      }],
      default: [],
    },
    
    quizPerformance: {
      type: [{
        questionId: String,
        timeToAnswer: Number,
        wasCorrect: Boolean,
        attemptsBeforeCorrect: Number,
        usedHint: Boolean,
        confidenceBeforeAnswer: Number,
        _id: false, // Disable auto _id for subdocuments
      }],
      default: [],
    },
    
    breaksTaken: {
      type: [{
        timestamp: Date,
        duration: Number,
        wasPrompted: Boolean,
        returnedAfter: Boolean,
        _id: false, // Disable auto _id for subdocuments
      }],
      default: [],
    },
    
    adaptationsApplied: {
      type: [{
        type: { type: String },
        reason: String,
        timestamp: Date,
        effectiveness: Number,
        _id: false, // Disable auto _id for subdocuments
      }],
      default: [],
    },
    
    lessonCompleted: { type: Boolean, default: false },
    overallPerformance: { type: Number, default: 0 },
    focusScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for efficient querying
learningSessionSchema.index({ userId: 1, startTime: -1 });
learningSessionSchema.index({ userId: 1, isOnboardingPeriod: 1 });
learningSessionSchema.index({ userId: 1, courseId: 1 });

export const LearningSession = mongoose.model<ILearningSession>('LearningSession', learningSessionSchema);


/**
 * AdaptiveProfile Model
 * Stores the learned adaptive preferences for each user
 * Built progressively during the first 7 days
 */

export interface IAdaptiveProfile extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Onboarding Status
  onboardingStartDate: Date;
  onboardingComplete: boolean;
  daysCompleted: number;
  totalSessionsAnalyzed: number;
  
  // Discovered Preferences (learned from behavior)
  discoveredPreferences: {
    // Optimal Content Settings
    optimalChunkSize: 'tiny' | 'small' | 'medium' | 'large';
    optimalSessionDuration: number; // minutes
    optimalBreakFrequency: number; // minutes between breaks
    optimalBreakDuration: number; // minutes
    
    // Best Content Types
    preferredContentTypes: {
      type: 'text' | 'video' | 'audio' | 'interactive' | 'image';
      effectivenessScore: number; // 0-100
    }[];
    
    // Best Learning Times
    optimalTimeSlots: {
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      performanceScore: number;
    }[];
    
    // Pace & Difficulty
    idealDifficultyProgression: 'slow' | 'moderate' | 'fast';
    needsMoreExamples: boolean;
    needsMorePractice: boolean;
    
    // Sensory Preferences (discovered)
    visualComplexityTolerance: 'low' | 'medium' | 'high';
    audioComplexityTolerance: 'low' | 'medium' | 'high';
    animationTolerance: 'none' | 'minimal' | 'moderate' | 'full';
    
    // Interaction Style
    prefersGuidedLearning: boolean;
    prefersExploration: boolean;
    needsFrequentFeedback: boolean;
    respondsToGamification: boolean;
  };
  
  // Attention Patterns
  attentionProfile: {
    averageFocusDuration: number; // seconds before attention drops
    focusRecoveryTime: number; // seconds to regain focus after break
    distractionSensitivity: 'low' | 'medium' | 'high';
    optimalContentLength: number; // words or seconds
  };
  
  // Frustration & Engagement Thresholds
  emotionalThresholds: {
    frustrationTriggerPoint: number; // 0-100, when to intervene
    disengagementTriggerPoint: number;
    optimalChallengeLevel: number; // 0-100
  };
  
  // Learning Pattern Insights
  insights: {
    insight: string;
    confidence: number; // 0-100
    discoveredOn: Date;
    basedOnSessions: number;
  }[];
  
  // Confidence Scores for Discovered Preferences
  confidenceScores: {
    overallConfidence: number; // 0-100, increases with more data
    contentPreferenceConfidence: number;
    timingPreferenceConfidence: number;
    attentionPatternConfidence: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const adaptiveProfileSchema = new Schema<IAdaptiveProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    onboardingStartDate: { type: Date, required: true, default: Date.now },
    onboardingComplete: { type: Boolean, default: false },
    daysCompleted: { type: Number, default: 0 },
    totalSessionsAnalyzed: { type: Number, default: 0 },
    
    discoveredPreferences: {
      optimalChunkSize: { type: String, enum: ['tiny', 'small', 'medium', 'large'], default: 'medium' },
      optimalSessionDuration: { type: Number, default: 25 },
      optimalBreakFrequency: { type: Number, default: 25 },
      optimalBreakDuration: { type: Number, default: 5 },
      
      preferredContentTypes: [{
        type: { type: String, enum: ['text', 'video', 'audio', 'interactive', 'image'] },
        effectivenessScore: { type: Number, default: 50 },
      }],
      
      optimalTimeSlots: [{
        timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'] },
        performanceScore: { type: Number, default: 50 },
      }],
      
      idealDifficultyProgression: { type: String, enum: ['slow', 'moderate', 'fast'], default: 'moderate' },
      needsMoreExamples: { type: Boolean, default: false },
      needsMorePractice: { type: Boolean, default: false },
      
      visualComplexityTolerance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      audioComplexityTolerance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      animationTolerance: { type: String, enum: ['none', 'minimal', 'moderate', 'full'], default: 'moderate' },
      
      prefersGuidedLearning: { type: Boolean, default: true },
      prefersExploration: { type: Boolean, default: false },
      needsFrequentFeedback: { type: Boolean, default: true },
      respondsToGamification: { type: Boolean, default: true },
    },
    
    attentionProfile: {
      averageFocusDuration: { type: Number, default: 900 }, // 15 minutes default
      focusRecoveryTime: { type: Number, default: 300 }, // 5 minutes
      distractionSensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      optimalContentLength: { type: Number, default: 500 },
    },
    
    emotionalThresholds: {
      frustrationTriggerPoint: { type: Number, default: 70 },
      disengagementTriggerPoint: { type: Number, default: 30 },
      optimalChallengeLevel: { type: Number, default: 60 },
    },
    
    insights: [{
      insight: String,
      confidence: Number,
      discoveredOn: Date,
      basedOnSessions: Number,
    }],
    
    confidenceScores: {
      overallConfidence: { type: Number, default: 0 },
      contentPreferenceConfidence: { type: Number, default: 0 },
      timingPreferenceConfidence: { type: Number, default: 0 },
      attentionPatternConfidence: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const AdaptiveProfile = mongoose.model<IAdaptiveProfile>('AdaptiveProfile', adaptiveProfileSchema);
