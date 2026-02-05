# conftest.py - pytest configuration and fixtures
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add the ai-service directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
def client():
    """Create a test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def sample_neurodiverse_profile():
    """Sample neurodiverse profile for testing"""
    return {
        "conditions": ["adhd", "dyslexia"],
        "sensory_preferences": {
            "visualSensitivity": "high",
            "audioSensitivity": "medium"
        },
        "focus_duration": 15,
        "preferred_content_types": ["visual", "audio"],
        "learning_style": "visual"
    }


@pytest.fixture
def sample_learning_session():
    """Sample learning session for testing"""
    return {
        "user_id": "user123",
        "course_id": "course123",
        "lesson_id": "lesson123",
        "duration": 900,
        "interactions": 25,
        "correct_answers": 8,
        "total_questions": 10,
        "attention_breaks": 2,
        "time_of_day": "morning"
    }


@pytest.fixture
def sample_difficulty_request(sample_neurodiverse_profile):
    """Sample difficulty adjustment request"""
    return {
        "user_id": "user123",
        "current_difficulty": 5.0,
        "recent_scores": [75, 80, 85, 90],
        "average_time_per_question": 30.0,
        "frustration_indicators": 2,
        "profile": sample_neurodiverse_profile
    }


@pytest.fixture
def sample_recommendation_request(sample_neurodiverse_profile):
    """Sample recommendation request"""
    return {
        "user_id": "user123",
        "profile": sample_neurodiverse_profile,
        "completed_courses": ["course1", "course2"],
        "learning_goals": ["python programming", "web development"],
        "available_time": 60
    }


@pytest.fixture
def sample_analytics_request(sample_neurodiverse_profile):
    """Sample analytics request"""
    return {
        "user_id": "user123",
        "time_range": "week",
        "profile": sample_neurodiverse_profile
    }
