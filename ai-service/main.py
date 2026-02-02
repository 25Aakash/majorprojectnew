
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
from services.analytics_service import AnalyticsService
from services.content_generator import content_generator

load_dotenv()

app = FastAPI(
    title="NeuroLearn AI Service",
    description="AI-powered adaptive learning for neurodiverse students",
    version="1.0.0"
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
    return {"status": "healthy", "service": "neurolearn-ai"}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
