
"""
NeuroLearn AI Service
Adaptive learning algorithms for neurodiverse students
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv

from models.learning_model import AdaptiveLearningModel
from models.content_recommender import ContentRecommender
from models.difficulty_adjuster import DifficultyAdjuster
from models.adaptive_profiler import adaptive_profiler
from models.biometric_analyzer import biometric_analyzer
from services.analytics_service import AnalyticsService
from services.content_generator import content_generator

load_dotenv()

app = FastAPI(
    title="NeuroLearn AI Service",
    description="AI-powered adaptive learning for neurodiverse students",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
learning_model = AdaptiveLearningModel()
content_recommender = ContentRecommender()
difficulty_adjuster = DifficultyAdjuster()
analytics_service = AnalyticsService()

# SSE clients registry for push-based interventions (Gap 6)
import asyncio
from fastapi.responses import StreamingResponse
import json as json_module

sse_clients: Dict[str, asyncio.Queue] = {}  # userId -> event queue


# Pydantic Models
class NeurodiverseProfile(BaseModel):
    conditions: List[str]  # ADHD, autism, dyslexia, etc.
    sensory_preferences: Dict[str, Any]
    focus_duration: int  # minutes
    preferred_content_types: List[str]
    learning_style: str  # visual, auditory, kinesthetic


class LearningSession(BaseModel):
    user_id: str
    course_id: str
    lesson_id: str
    duration: int  # seconds
    interactions: int
    correct_answers: int
    total_questions: int
    attention_breaks: int
    time_of_day: str


class ContentRequest(BaseModel):
    user_id: str
    course_id: str
    lesson_id: str
    profile: NeurodiverseProfile
    recent_performance: List[float]


class DifficultyRequest(BaseModel):
    user_id: str
    current_difficulty: float
    recent_scores: List[float]
    average_time_per_question: float
    frustration_indicators: int
    profile: NeurodiverseProfile


class RecommendationRequest(BaseModel):
    user_id: str
    profile: NeurodiverseProfile
    completed_courses: List[str]
    learning_goals: List[str]
    available_time: int  # minutes


class AnalyticsRequest(BaseModel):
    user_id: str
    time_range: str  # week, month, all
    profile: NeurodiverseProfile


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "neurolearn-ai",
        "ml_models_loaded": learning_model.has_trained_models,
    }


# Adaptive content selection
@app.post("/api/ai/adapt-content")
async def adapt_content(request: ContentRequest):
    """
    Select the best content variant based on user's neurodiverse profile
    and recent performance
    """
    try:
        # Analyze profile to determine content adaptation
        adaptation = learning_model.get_content_adaptation(
            conditions=request.profile.conditions,
            preferences=request.profile.sensory_preferences,
            learning_style=request.profile.learning_style,
            recent_performance=request.recent_performance
        )
        
        return {
            "success": True,
            "adaptation": {
                "content_variant": adaptation["variant"],
                "font_recommendations": adaptation["font"],
                "color_scheme": adaptation["colors"],
                "audio_enabled": adaptation["audio"],
                "visual_aids": adaptation["visual_aids"],
                "chunk_size": adaptation["chunk_size"],
                "break_reminders": adaptation["break_reminders"],
                "gamification_level": adaptation["gamification"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Difficulty adjustment
@app.post("/api/ai/adjust-difficulty")
async def adjust_difficulty(request: DifficultyRequest):
    """
    Dynamically adjust difficulty based on performance and neurodiverse profile
    """
    try:
        new_difficulty = difficulty_adjuster.calculate_optimal_difficulty(
            current_difficulty=request.current_difficulty,
            recent_scores=request.recent_scores,
            avg_time=request.average_time_per_question,
            frustration=request.frustration_indicators,
            conditions=request.profile.conditions
        )
        
        return {
            "success": True,
            "new_difficulty": new_difficulty["level"],
            "adjustment_reason": new_difficulty["reason"],
            "recommendations": new_difficulty["recommendations"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Course recommendations
@app.post("/api/ai/recommend-courses")
async def recommend_courses(request: RecommendationRequest):
    """
    Recommend courses based on profile, goals, and learning patterns
    """
    try:
        recommendations = await content_recommender.get_recommendations(
            profile=request.profile.dict(),
            completed=request.completed_courses,
            goals=request.learning_goals,
            available_time=request.available_time
        )
        
        return {
            "success": True,
            "recommendations": recommendations.get("courses", []),
            "reasoning": recommendations.get("reasoning", []),
            "estimated_completion": recommendations.get("time_estimate", "Unknown")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Learning analytics
@app.post("/api/ai/analytics")
async def get_analytics(request: AnalyticsRequest):
    """
    Generate learning analytics and insights
    """
    try:
        analytics = await analytics_service.generate_analytics(
            user_id=request.user_id,
            time_range=request.time_range,
            profile=request.profile.dict()
        )
        
        return {
            "success": True,
            "analytics": analytics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Session analysis
@app.post("/api/ai/analyze-session")
async def analyze_session(session: LearningSession):
    """
    Analyze a learning session and provide insights
    """
    try:
        accuracy = session.correct_answers / max(session.total_questions, 1)
        engagement_score = min(1.0, session.interactions / (session.duration / 60))
        
        # Calculate optimal session length based on breaks
        optimal_duration = learning_model.calculate_optimal_duration(
            actual_duration=session.duration,
            breaks_taken=session.attention_breaks,
            accuracy=accuracy
        )
        
        insights = {
            "accuracy": round(accuracy * 100, 1),
            "engagement_score": round(engagement_score * 100, 1),
            "optimal_session_duration": optimal_duration,
            "productivity_index": round((accuracy * 0.6 + engagement_score * 0.4) * 100, 1),
            "recommendations": []
        }
        
        # Generate recommendations based on analysis
        if accuracy < 0.6:
            insights["recommendations"].append({
                "type": "difficulty",
                "message": "Consider reducing difficulty or reviewing previous material"
            })
        
        if session.attention_breaks > 3:
            insights["recommendations"].append({
                "type": "breaks",
                "message": "Great job taking breaks! Consider shorter focused sessions"
            })
        
        if engagement_score < 0.5:
            insights["recommendations"].append({
                "type": "engagement",
                "message": "Try interactive content or gamified lessons"
            })
        
        return {
            "success": True,
            "session_analysis": insights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Focus time prediction
@app.post("/api/ai/predict-focus-time")
async def predict_focus_time(profile: NeurodiverseProfile):
    """
    Predict optimal focus time based on neurodiverse profile
    """
    try:
        base_focus = profile.focus_duration
        
        # Adjust based on conditions
        adjustments = {
            "adhd": 0.7,
            "autism": 1.1,
            "dyslexia": 0.9,
            "dyscalculia": 0.9,
            "dyspraxia": 0.85
        }
        
        modifier = 1.0
        for condition in profile.conditions:
            condition_lower = condition.lower()
            if condition_lower in adjustments:
                modifier *= adjustments[condition_lower]
        
        predicted_focus = int(base_focus * modifier)
        
        # Ensure reasonable bounds
        predicted_focus = max(5, min(45, predicted_focus))
        
        return {
            "success": True,
            "predicted_focus_minutes": predicted_focus,
            "recommended_break_duration": max(5, predicted_focus // 4),
            "sessions_per_day": max(2, 120 // predicted_focus)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Emotional state analysis (simplified - would use more advanced NLP in production)
@app.post("/api/ai/analyze-emotional-state")
async def analyze_emotional_state(data: Dict[str, Any]):
    """
    Analyze emotional indicators from learning behavior
    """
    try:
        # Simplified emotional analysis based on behavioral indicators
        indicators = data.get("behavioral_indicators", {})
        
        click_patterns = indicators.get("click_frequency", 0)
        scroll_patterns = indicators.get("scroll_behavior", "normal")
        time_between_answers = indicators.get("avg_answer_time", 10)
        
        # Determine emotional state
        if click_patterns > 5 and time_between_answers < 3:
            state = "frustrated"
            recommendation = "Take a short break and try calming activities"
        elif click_patterns < 1 and time_between_answers > 30:
            state = "disengaged"
            recommendation = "Try a more interactive or gamified activity"
        elif scroll_patterns == "erratic":
            state = "anxious"
            recommendation = "Deep breathing exercises and simplified content"
        else:
            state = "focused"
            recommendation = "Great job! Continue at your current pace"
        
        return {
            "success": True,
            "emotional_state": state,
            "confidence": 0.75,
            "recommendation": recommendation,
            "suggested_activity": learning_model.get_calming_activity(state)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Content Generation Endpoints
class ContentGenerationRequest(BaseModel):
    topic: str
    subject: str
    conditions: List[str] = []
    learning_styles: List[str] = ["visual"]
    difficulty: str = "beginner"


class ContentAdaptRequest(BaseModel):
    content: str
    conditions: List[str]
    learning_styles: List[str] = []


@app.post("/api/ai/generate-content")
async def generate_content(request: ContentGenerationRequest):
    """
    Generate personalized lesson content based on student's neurodiverse profile
    
    This endpoint creates custom educational content adapted for:
    - ADHD: Short chunks, breaks, gamification
    - Autism: Structured, literal language, predictable
    - Dyslexia: Simple words, audio support, visuals
    - Dyscalculia: Visual math, step-by-step
    - Dysgraphia: Minimal writing, voice alternatives
    """
    try:
        result = await content_generator.generate_lesson_content(
            topic=request.topic,
            subject=request.subject,
            conditions=request.conditions,
            learning_styles=request.learning_styles,
            difficulty=request.difficulty
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/adapt-content")
async def adapt_content(request: ContentAdaptRequest):
    """
    Adapt existing content for specific neurodiverse conditions
    Adds breaks, tips, and formatting adjustments
    """
    try:
        result = content_generator.adapt_existing_content(
            content=request.content,
            conditions=request.conditions,
            learning_styles=request.learning_styles
        )
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/content-adaptations")
async def get_content_adaptations():
    """
    Get all available content adaptations and their descriptions
    """
    return {
        "conditions": content_generator.condition_adaptations,
        "learning_styles": content_generator.learning_style_formats
    }


@app.post("/api/ai/generate-quiz")
async def generate_quiz(data: Dict[str, Any]):
    """
    Generate quiz questions for a topic adapted to student conditions
    """
    topic = data.get("topic", "")
    conditions = data.get("conditions", [])
    num_questions = data.get("num_questions", 3)
    
    # Generate condition-appropriate quiz
    quiz = []
    
    base_questions = [
        {
            "question": f"What is the main idea of {topic}?",
            "options": [
                f"Understanding {topic} basics",
                "Something unrelated",
                "None of these",
                "All of the above"
            ],
            "correctAnswer": 0,
            "explanation": f"The main idea is understanding the basics of {topic}."
        },
        {
            "question": "What helps you learn best?",
            "options": [
                "Taking breaks when needed",
                "Rushing through everything",
                "Skipping the hard parts",
                "Not asking questions"
            ],
            "correctAnswer": 0,
            "explanation": "Taking breaks helps your brain process information better!"
        },
        {
            "question": f"How can you use {topic} in real life?",
            "options": [
                "You can't use it",
                "In everyday problem-solving",
                "Only in school",
                "Never"
            ],
            "correctAnswer": 1,
            "explanation": f"{topic} has many real-world applications in everyday life!"
        }
    ]
    
    # Add condition-specific accommodations to quiz
    for i, q in enumerate(base_questions[:num_questions]):
        if "dyslexia" in [c.lower() for c in conditions]:
            q["audio_available"] = True
        if "adhd" in [c.lower() for c in conditions]:
            q["hint"] = "Take your time and read each option carefully."
        if "autism" in [c.lower() for c in conditions]:
            q["visual_support"] = True
        quiz.append(q)
    
    return {
        "success": True,
        "topic": topic,
        "quiz": quiz,
        "conditions_applied": conditions
    }


# Video Generation Endpoints
from services.video_generator import video_generator


# ==================== ADAPTIVE LEARNING ENDPOINTS ====================

class AdaptiveSessionRequest(BaseModel):
    currentSession: Dict[str, Any]
    profile: Dict[str, Any]
    conditions: List[str]


class BuildProfileRequest(BaseModel):
    sessions: List[Dict[str, Any]]
    conditions: List[str]


class AnalyzeSessionRequest(BaseModel):
    session: Dict[str, Any]
    conditions: List[str]


@app.post("/api/adaptive/real-time")
async def get_real_time_adaptations(request: AdaptiveSessionRequest):
    """
    Get real-time learning adaptations during an active session.
    Called periodically to adjust content on-the-fly based on:
    - Current frustration/engagement levels
    - Attention patterns
    - Time since last break
    - Content effectiveness
    """
    try:
        adaptations = adaptive_profiler.get_real_time_adaptation(
            current_session=request.currentSession,
            profile=request.profile,
            conditions=request.conditions
        )
        return {
            "success": True,
            **adaptations
        }
    except Exception as e:
        return {
            "success": False,
            "should_suggest_break": False,
            "should_simplify_content": False,
            "messages": [f"Adaptation error: {str(e)}"]
        }


@app.post("/api/adaptive/build-profile")
async def build_adaptive_profile(request: BuildProfileRequest):
    """
    Build or update an adaptive learning profile based on session history.
    This analyzes behavioral patterns to discover:
    - Optimal content types
    - Best learning times
    - Attention span patterns
    - Frustration thresholds
    - Break frequency needs
    """
    try:
        profile = adaptive_profiler.build_adaptive_profile(
            sessions=request.sessions,
            conditions=request.conditions
        )
        return {
            "success": True,
            **profile
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/adaptive/analyze-session")
async def analyze_single_session(request: AnalyzeSessionRequest):
    """
    Analyze a single learning session for immediate insights.
    Returns detailed analysis including:
    - Attention patterns
    - Content preferences
    - Emotional state
    - Condition-specific observations
    - Immediate recommendations
    """
    try:
        from models.adaptive_profiler import SessionData
        
        session_data = adaptive_profiler._dict_to_session(request.session)
        analysis = adaptive_profiler.analyze_session(session_data, request.conditions)
        
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/adaptive/default-profile/{conditions}")
async def get_default_profile(conditions: str):
    """
    Get default adaptive profile settings based on neurodiverse conditions.
    Used for new users before behavioral data is collected.
    """
    try:
        condition_list = conditions.split(",") if conditions else []
        profile = adaptive_profiler._get_default_profile(condition_list)
        return {
            "success": True,
            "profile": profile
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/adaptive/optimal-settings")
async def get_optimal_settings(data: Dict[str, Any]):
    """
    Get optimal learning settings based on profile and current context.
    Returns personalized recommendations for:
    - Content chunk size
    - Session duration
    - Break frequency
    - Content format priority
    - UI adjustments
    """
    try:
        profile = data.get("profile", {})
        conditions = data.get("conditions", [])
        time_of_day = data.get("timeOfDay", "afternoon")
        device_type = data.get("deviceType", "desktop")
        
        discovered = profile.get("discoveredPreferences", {})
        
        # Get base settings from profile or defaults
        settings = {
            "chunkSize": discovered.get("optimalChunkSize", "medium"),
            "sessionDuration": discovered.get("optimalSessionDuration", 25),
            "breakFrequency": discovered.get("optimalBreakFrequency", 25),
            "breakDuration": discovered.get("optimalBreakDuration", 5),
            "contentPriority": [ct.get("type") for ct in discovered.get("preferredContentTypes", [])[:3]],
            "gamificationLevel": "high" if discovered.get("respondsToGamification", True) else "low",
            "feedbackFrequency": "high" if discovered.get("needsFrequentFeedback", True) else "normal",
            "animationLevel": discovered.get("animationTolerance", "moderate"),
        }
        
        # Apply condition-specific adjustments
        for condition in conditions:
            condition_lower = condition.lower()
            if condition_lower == "adhd":
                settings["chunkSize"] = "small" if settings["chunkSize"] in ["medium", "large"] else settings["chunkSize"]
                settings["breakFrequency"] = min(settings["breakFrequency"], 15)
            elif condition_lower == "autism":
                settings["animationLevel"] = "minimal"
            elif condition_lower == "dyslexia":
                if "audio" not in settings["contentPriority"]:
                    settings["contentPriority"].insert(0, "audio")
        
        # Adjust for device
        if device_type == "mobile":
            settings["chunkSize"] = "tiny" if settings["chunkSize"] == "small" else "small"
            settings["sessionDuration"] = min(settings["sessionDuration"], 15)
        
        return {
            "success": True,
            "settings": settings,
            "confidence": profile.get("confidenceScores", {}).get("overallConfidence", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/adaptive/frustration-intervention")
async def get_frustration_intervention(data: Dict[str, Any]):
    """
    Get appropriate intervention when frustration is detected.
    Returns calming activities and content adjustments.
    """
    try:
        frustration_level = data.get("frustrationLevel", 50)
        conditions = data.get("conditions", [])
        current_content_type = data.get("currentContentType", "text")
        
        response = {
            "interventionNeeded": frustration_level > 65,
            "severity": "high" if frustration_level > 80 else "medium" if frustration_level > 65 else "low",
            "suggestions": []
        }
        
        if frustration_level > 65:
            # Get calming activities based on emotional state
            state = "frustrated" if frustration_level > 80 else "anxious"
            activities = learning_model.get_calming_activity(state)
            
            response["suggestions"].append({
                "type": "break",
                "message": "Let's take a short break. You're doing great!",
                "activity": activities
            })
            
            response["suggestions"].append({
                "type": "content_switch",
                "message": "Would you like to try a different format?",
                "alternatives": ["video", "interactive"] if current_content_type == "text" else ["text", "audio"]
            })
            
            if frustration_level > 80:
                response["suggestions"].append({
                    "type": "difficulty",
                    "message": "Let me give you an easier version to build confidence.",
                    "action": "simplify_content"
                })
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class VideoGenerationRequest(BaseModel):
    topic: str
    subject: str
    conditions: List[str] = []
    learning_styles: List[str] = ["visual"]
    duration_minutes: int = 5
    difficulty: str = "beginner"
    prefer_avatar: bool = False  # D-ID avatar video (requires API key)


class VideoScriptRequest(BaseModel):
    topic: str
    subject: str
    conditions: List[str] = []
    learning_styles: List[str] = []
    duration_minutes: int = 5
    difficulty: str = "beginner"


@app.post("/api/ai/generate-video")
async def generate_video(request: VideoGenerationRequest):
    """
    Generate an educational video based on topic and student's neurodiverse profile.
    
    This creates either:
    1. AI avatar video (if D-ID API key is configured)
    2. Slide presentation with audio narration (fallback)
    
    Videos are adapted for:
    - ADHD: Short segments, progress indicators, encouragement
    - Autism: Predictable format, clear structure, literal language
    - Dyslexia: Captions, highlighted keywords, slow pace
    - Dyscalculia: Step-by-step visuals, number animations
    """
    try:
        result = await video_generator.generate_educational_video(
            topic=request.topic,
            subject=request.subject,
            conditions=request.conditions,
            learning_styles=request.learning_styles,
            duration_minutes=request.duration_minutes,
            difficulty=request.difficulty,
            prefer_avatar=request.prefer_avatar
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/generate-video-script")
async def generate_video_script(request: VideoScriptRequest):
    """
    Generate just the video script without creating the actual video.
    Useful for previewing or editing the content before video generation.
    """
    try:
        script = await video_generator.generate_video_script(
            topic=request.topic,
            subject=request.subject,
            conditions=request.conditions,
            learning_styles=request.learning_styles,
            duration_minutes=request.duration_minutes,
            difficulty=request.difficulty
        )
        return {
            "success": True,
            "script": script
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FullVideoRequest(BaseModel):
    """Request for creating a complete MP4 video file"""
    topic: str
    subject: str = "reading"
    conditions: List[str] = []
    learning_styles: List[str] = []
    duration_minutes: int = 5
    difficulty: str = "beginner"
    output_filename: Optional[str] = None


@app.post("/api/ai/create-full-video")
async def create_full_video(request: FullVideoRequest):
    """
    Create a complete MP4 video file with slides and audio narration.
    
    This generates:
    1. Slide images with visual content
    2. Audio narration for each slide using TTS
    3. A combined MP4 video file
    
    The video is adapted for neurodiverse learners based on conditions:
    - ADHD: Progress indicators, short segments, encouragement
    - Autism: Predictable format, clear structure
    - Dyslexia: Highlighted keywords, slow pace
    - Dyscalculia: Step-by-step visuals
    
    Returns the path to the generated MP4 file.
    """
    try:
        result = await video_generator.create_full_video(
            topic=request.topic,
            subject=request.subject,
            conditions=request.conditions,
            learning_styles=request.learning_styles,
            duration_minutes=request.duration_minutes,
            difficulty=request.difficulty,
            output_filename=request.output_filename
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/generate-audio")
async def generate_audio(data: Dict[str, Any]):
    """
    Generate audio narration from text using ElevenLabs or gTTS.
    """
    text = data.get("text", "")
    voice = data.get("voice", "default")
    
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        result = await video_generator.generate_audio_narration(text, voice)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/video-avatars")
async def get_video_avatars():
    """
    Get available AI avatar options for video generation.
    """
    return {
        "avatars": video_generator.avatars,
        "conditions_adaptations": video_generator.condition_adaptations
    }


class AvatarVideoRequest(BaseModel):
    """Request for creating AI avatar videos using D-ID"""
    topic: str
    subject: str = "reading"
    conditions: List[str] = []
    learning_styles: List[str] = []
    duration_minutes: int = 3
    difficulty: str = "beginner"
    avatar: str = "friendly_teacher"  # friendly_teacher, professional, young_tutor


@app.post("/api/ai/create-avatar-video")
async def create_avatar_video(request: AvatarVideoRequest):
    """
    Create an AI avatar video using D-ID.
    
    This generates a video with a realistic AI-generated talking avatar
    that speaks the educational content.
    
    **Requirements:**
    - D-ID API key must be set in environment variable DID_API_KEY
    - Get your API key at https://www.d-id.com/
    - The key should be base64 encoded (your_email:your_api_key)
    
    **Available Avatars:**
    - friendly_teacher: Friendly female presenter
    - professional: Professional male presenter
    - young_tutor: Casual young female tutor
    
    **Usage:**
    ```json
    {
        "topic": "Introduction to Fractions",
        "subject": "math",
        "conditions": ["adhd"],
        "avatar": "friendly_teacher"
    }
    ```
    
    Returns video URL and local file path.
    """
    try:
        # First generate the script
        script = await video_generator.generate_video_script(
            topic=request.topic,
            subject=request.subject,
            conditions=request.conditions,
            learning_styles=request.learning_styles,
            duration_minutes=request.duration_minutes,
            difficulty=request.difficulty
        )
        
        # Generate avatar video with D-ID
        result = await video_generator.generate_video_with_did(
            script=script,
            avatar=request.avatar
        )
        
        # If D-ID fails, return error with fallback suggestion
        if not result.get("success"):
            return {
                "success": False,
                "error": result.get("error", "Failed to create avatar video"),
                "suggestion": "Try /api/ai/create-full-video for slide-based videos without an API key",
                "fallback_endpoint": "/api/ai/create-full-video"
            }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/did-status")
async def check_did_status():
    """
    Check if D-ID API is configured and working.
    """
    import os
    did_key = os.getenv("DID_API_KEY", "")
    
    return {
        "configured": bool(did_key),
        "key_length": len(did_key) if did_key else 0,
        "setup_instructions": {
            "step1": "Sign up at https://www.d-id.com/",
            "step2": "Go to dashboard and copy your API key",
            "step3": "Encode credentials: echo -n 'your_email:your_api_key' | base64",
            "step4": "Set environment variable: DID_API_KEY=your_base64_encoded_key",
            "step5": "Restart the AI service"
        },
        "available_avatars": list(video_generator.avatars.keys())
    }


# ==================== BIOMETRIC ANALYSIS ENDPOINTS ====================

class VoiceAnalysisRequest(BaseModel):
    voice_metrics: Dict[str, Any]
    conditions: Optional[List[str]] = None


class EyeTrackingAnalysisRequest(BaseModel):
    eye_metrics: Dict[str, Any]
    conditions: Optional[List[str]] = None


class MouseTrackingAnalysisRequest(BaseModel):
    mouse_metrics: Dict[str, Any]
    conditions: Optional[List[str]] = None


class CombinedBiometricRequest(BaseModel):
    user_id: Optional[str] = None
    voice_metrics: Optional[Dict[str, Any]] = None
    eye_metrics: Optional[Dict[str, Any]] = None
    mouse_metrics: Optional[Dict[str, Any]] = None
    conditions: Optional[List[str]] = None


class BiometricProfileRequest(BaseModel):
    sessions: List[Dict[str, Any]]
    conditions: List[str]


@app.post("/api/biometric/analyze-voice")
async def analyze_voice(request: VoiceAnalysisRequest):
    """
    Analyze voice patterns for stress, confidence, and learning indicators.
    """
    try:
        result = biometric_analyzer.analyze_voice(
            request.voice_metrics,
            request.conditions or []
        )
        return {
            "success": True,
            "analysis": {
                "speaking_pace": result.speaking_pace,
                "confidence_level": result.confidence_level,
                "stress_level": result.stress_level,
                "hesitation_score": result.hesitation_score,
                "reading_fluency": result.reading_fluency,
                "emotional_state": result.emotional_state.value,
                "recommendations": result.recommendations,
                "adhd_indicators": result.adhd_indicators,
                "dyslexia_indicators": result.dyslexia_indicators,
                "anxiety_indicators": result.anxiety_indicators,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/biometric/analyze-eye-tracking")
async def analyze_eye_tracking(request: EyeTrackingAnalysisRequest):
    """
    Analyze eye tracking data for attention, reading patterns, and engagement.
    """
    try:
        result = biometric_analyzer.analyze_eye_tracking(
            request.eye_metrics,
            request.conditions or []
        )
        return {
            "success": True,
            "analysis": {
                "attention_score": result.attention_score,
                "focus_quality": result.focus_quality,
                "reading_pattern": result.reading_pattern,
                "distraction_level": result.distraction_level,
                "content_engagement": result.content_engagement,
                "fatigue_indicators": result.fatigue_indicators,
                "recommendations": result.recommendations,
                "adhd_attention_pattern": result.adhd_attention_pattern,
                "dyslexia_reading_pattern": result.dyslexia_reading_pattern,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/biometric/analyze-mouse")
async def analyze_mouse_tracking(request: MouseTrackingAnalysisRequest):
    """
    Analyze mouse movement patterns for frustration, engagement, and navigation.
    """
    try:
        result = biometric_analyzer.analyze_mouse_tracking(
            request.mouse_metrics,
            request.conditions or []
        )
        return {
            "success": True,
            "analysis": {
                "frustration_score": result.frustration_score,
                "engagement_score": result.engagement_score,
                "navigation_confidence": result.navigation_confidence,
                "hesitation_level": result.hesitation_level,
                "erratic_behavior_score": result.erratic_behavior_score,
                "interaction_pattern": result.interaction_pattern,
                "recommendations": result.recommendations,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/biometric/analyze-combined")
async def analyze_combined_biometrics(request: CombinedBiometricRequest):
    """
    Perform combined analysis of all biometric data sources.
    Returns combined scores, profile updates, and intervention recommendations.
    """
    try:
        result = biometric_analyzer.analyze_combined_biometrics(
            voice_metrics=request.voice_metrics,
            eye_metrics=request.eye_metrics,
            mouse_metrics=request.mouse_metrics,
            conditions=request.conditions or []
        )
        return {
            "success": True,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/biometric/build-profile")
async def build_biometric_profile(request: BiometricProfileRequest):
    """
    Build a comprehensive biometric profile from historical session data.
    """
    try:
        profile = biometric_analyzer.build_biometric_profile(
            request.sessions,
            request.conditions
        )
        return {
            "success": True,
            "profile": {
                "overall_attention": profile.overall_attention,
                "overall_engagement": profile.overall_engagement,
                "overall_stress": profile.overall_stress,
                "overall_confidence": profile.overall_confidence,
                "overall_frustration": profile.overall_frustration,
                "optimal_content_pace": profile.optimal_content_pace,
                "preferred_break_frequency": profile.preferred_break_frequency,
                "best_session_duration": profile.best_session_duration,
                "environmental_preferences": profile.environmental_preferences,
                "visual_learner_score": profile.visual_learner_score,
                "auditory_learner_score": profile.auditory_learner_score,
                "kinesthetic_learner_score": profile.kinesthetic_learner_score,
                "reading_preference_score": profile.reading_preference_score,
                "recommended_adaptations": profile.recommended_adaptations,
                "profile_confidence": profile.profile_confidence,
                "data_points_analyzed": profile.data_points_analyzed,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/biometric/real-time-intervention")
async def get_biometric_intervention(request: CombinedBiometricRequest):
    """
    Get real-time intervention recommendations based on current biometric state.
    """
    try:
        result = biometric_analyzer.analyze_combined_biometrics(
            voice_metrics=request.voice_metrics,
            eye_metrics=request.eye_metrics,
            mouse_metrics=request.mouse_metrics,
            conditions=request.conditions or []
        )
        
        interventions = result.get('interventions', [])
        combined_scores = result.get('combined_scores', {})
        
        # Determine most urgent intervention
        urgent_intervention = None
        if interventions:
            high_priority = [i for i in interventions if i.get('priority') == 'high']
            urgent_intervention = high_priority[0] if high_priority else interventions[0]

        # Push urgent interventions via SSE
        user_id = request.user_id if hasattr(request, 'user_id') else None
        if user_id and urgent_intervention and urgent_intervention.get('priority') == 'high':
            if user_id in sse_clients:
                event = {
                    "type": "intervention",
                    "data": {
                        "intervention": urgent_intervention,
                        "scores": combined_scores,
                        "timestamp": datetime.now().isoformat()
                    }
                }
                try:
                    sse_clients[user_id].put_nowait(event)
                except asyncio.QueueFull:
                    pass  # Drop if client isn't consuming fast enough

        return {
            "success": True,
            "scores": combined_scores,
            "interventions": interventions,
            "urgent_intervention": urgent_intervention,
            "requires_immediate_action": bool(urgent_intervention and urgent_intervention.get('priority') == 'high'),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Gap 1: ML Model Status & Retrain ─────────────────────────────────────────

@app.get("/api/ai/model-status")
async def model_status():
    """Report ML model availability and metadata."""
    return {
        "ml_models_loaded": learning_model.has_trained_models,
        "models": {
            "engagement_model": learning_model._engagement_model is not None,
            "difficulty_model": learning_model._difficulty_model is not None,
            "content_classifier": learning_model._content_classifier is not None,
            "scaler": learning_model._scaler is not None,
        },
        "model_dir": str(learning_model.MODEL_DIR) if hasattr(learning_model, 'MODEL_DIR') else None,
    }


@app.post("/api/ai/retrain")
async def trigger_retrain():
    """Trigger model retraining."""
    try:
        from retrain import retrain_model
        result = retrain_model()
        # Reload models after retraining
        learning_model._load_ml_models()
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")


# ─── Gap 5: Auto-Generate Content Variants ────────────────────────────────────

class ContentVariantRequest(BaseModel):
    content: Dict[str, Any]
    conditions: List[str] = []
    target_styles: List[str] = ["visual", "auditory", "kinesthetic"]


@app.post("/api/ai/generate-variants")
async def generate_content_variants(request: ContentVariantRequest):
    """Auto-generate simplified / visual / audio variants of lesson content."""
    try:
        # Flatten content dict to a string for the adapter
        content_text = request.content.get("text", "") or str(request.content)
        conditions = request.conditions if request.conditions else ["general"]

        variants = {}
        for style in request.target_styles:
            adapted = content_generator.adapt_existing_content(
                content=content_text,
                conditions=conditions,
                learning_styles=[style],
            )
            variants[style] = adapted

        # Also produce a simplified version
        simplified = content_generator.adapt_existing_content(
            content=content_text,
            conditions=["dyslexia"],
            learning_styles=["reading"],
        )
        variants["simplified"] = simplified

        return {"success": True, "variants": variants}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Gap 6: SSE Event Stream ──────────────────────────────────────────────────

@app.get("/api/ai/events/{user_id}")
async def sse_event_stream(user_id: str):
    """Server-Sent Events stream for real-time push interventions."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    sse_clients[user_id] = queue

    async def event_generator():
        try:
            # Send initial connection event
            yield f"data: {json_module.dumps({'type': 'connected', 'userId': user_id})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {json_module.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_clients.pop(user_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Enhanced Recommendation Endpoint (Gap 4 backend) ─────────────────────────

class SmartRecommendRequest(BaseModel):
    user_id: str
    conditions: List[str] = []
    learning_style: str = "visual"
    recent_topics: List[str] = []
    performance_level: float = 0.5
    limit: int = 10


@app.post("/api/ai/smart-recommend")
async def smart_recommendations(request: SmartRecommendRequest):
    """AI-powered recommendations using the full recommender + ML models."""
    try:
        profile = {
            "conditions": request.conditions,
            "learning_style": request.learning_style,
            "preferred_content_types": [request.learning_style],
        }
        # Use the recommender's get_recommendations (async)
        result = await content_recommender.get_recommendations(
            profile=profile,
            completed=request.recent_topics,
            goals=[],
            available_time=60,
        )
        recs = result.get("courses", [])[:request.limit]

        # Enhance with ML predictions if available
        if learning_model.has_trained_models:
            for rec in recs:
                optimal_type = learning_model.predict_optimal_content_type(
                    profile, [request.performance_level]
                )
                rec["ml_optimal_content_type"] = optimal_type
                rec["ml_confidence"] = 0.8 if optimal_type != "standard" else 0.3

        return {"success": True, "recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
