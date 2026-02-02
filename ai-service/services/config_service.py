"""
Dynamic Configuration Service
Fetches configuration from the backend API to keep AI service in sync
"""

import os
import httpx
from typing import Dict, Any, Optional
from functools import lru_cache
import asyncio

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")

# Cache for configuration with TTL
_config_cache: Dict[str, Any] = {}
_cache_timestamp: float = 0
CACHE_TTL = 300  # 5 minutes


async def fetch_config() -> Dict[str, Any]:
    """
    Fetch configuration from backend API
    """
    global _config_cache, _cache_timestamp
    
    import time
    current_time = time.time()
    
    # Return cached config if still valid
    if _config_cache and (current_time - _cache_timestamp) < CACHE_TTL:
        return _config_cache
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_API_URL}/api/config")
            if response.status_code == 200:
                _config_cache = response.json()
                _cache_timestamp = current_time
                return _config_cache
    except Exception as e:
        print(f"Error fetching config from backend: {e}")
    
    # Return cached or default if API fails
    return _config_cache or get_default_config()


def fetch_config_sync() -> Dict[str, Any]:
    """
    Synchronous version for non-async contexts
    """
    global _config_cache, _cache_timestamp
    
    import time
    current_time = time.time()
    
    # Return cached config if still valid
    if _config_cache and (current_time - _cache_timestamp) < CACHE_TTL:
        return _config_cache
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{BACKEND_API_URL}/api/config")
            if response.status_code == 200:
                _config_cache = response.json()
                _cache_timestamp = current_time
                return _config_cache
    except Exception as e:
        print(f"Error fetching config from backend: {e}")
    
    # Return cached or default if API fails
    return _config_cache or get_default_config()


def get_default_config() -> Dict[str, Any]:
    """
    Default configuration fallback
    """
    return {
        "conditions": [
            {"id": "adhd", "label": "ADHD", "emoji": "⚡"},
            {"id": "autism", "label": "Autism", "emoji": "🌈"},
            {"id": "dyslexia", "label": "Dyslexia", "emoji": "📖"},
            {"id": "dyscalculia", "label": "Dyscalculia", "emoji": "🔢"},
            {"id": "dyspraxia", "label": "Dyspraxia", "emoji": "🏃"},
        ],
        "learningStyles": [
            {"id": "visual", "label": "Visual"},
            {"id": "auditory", "label": "Auditory"},
            {"id": "kinesthetic", "label": "Kinesthetic"},
            {"id": "reading", "label": "Reading/Writing"},
        ],
        "focusSettings": {
            "defaultSessionDuration": 25,
            "defaultBreakDuration": 5,
        },
        "conditionAdaptations": {
            "adhd": {
                "chunk_size": "small",
                "break_reminders": True,
                "gamification": "high",
                "max_session_duration": 15,
            },
            "autism": {
                "chunk_size": "medium",
                "break_reminders": True,
                "gamification": "medium",
                "prefer_structured": True,
            },
            "dyslexia": {
                "chunk_size": "small",
                "prefer_audio": True,
                "gamification": "medium",
            },
            "dyscalculia": {
                "chunk_size": "small",
                "gamification": "high",
                "visual_aids": True,
            },
            "dyspraxia": {
                "chunk_size": "medium",
                "break_reminders": True,
            },
        },
        "difficultyParameters": {
            "adhd": {
                "frustration_sensitivity": 1.5,
                "success_boost": 1.2,
                "target_accuracy": 0.75,
                "min_difficulty": 0.2,
                "max_difficulty": 0.8,
            },
            "autism": {
                "frustration_sensitivity": 1.3,
                "success_boost": 1.0,
                "target_accuracy": 0.80,
                "min_difficulty": 0.3,
                "max_difficulty": 0.85,
            },
            "dyslexia": {
                "frustration_sensitivity": 1.4,
                "success_boost": 1.1,
                "target_accuracy": 0.70,
                "min_difficulty": 0.2,
                "max_difficulty": 0.75,
            },
            "default": {
                "frustration_sensitivity": 1.0,
                "success_boost": 1.0,
                "target_accuracy": 0.75,
                "min_difficulty": 0.2,
                "max_difficulty": 0.9,
            },
        },
        "calmingActivities": {
            "frustrated": [
                "Deep breathing exercise (4-7-8 technique)",
                "Quick stretching break",
                "Listen to calming music",
                "Take a 5-minute walk",
            ],
            "anxious": [
                "Guided meditation (2 minutes)",
                "Progressive muscle relaxation",
                "Grounding exercise (5-4-3-2-1)",
                "Coloring activity",
            ],
            "disengaged": [
                "Try a quick game or puzzle",
                "Switch to interactive content",
                "Take a movement break",
                "Set a small, achievable goal",
            ],
            "focused": [
                "Keep going! You're doing great!",
                "Consider setting a timer for a break",
                "Reward yourself after this session",
            ],
        },
    }


def get_condition_adaptations() -> Dict[str, Dict[str, Any]]:
    """
    Get condition-specific adaptations from config
    """
    config = fetch_config_sync()
    return config.get("conditionAdaptations", get_default_config()["conditionAdaptations"])


def get_difficulty_parameters() -> Dict[str, Dict[str, Any]]:
    """
    Get difficulty parameters from config
    """
    config = fetch_config_sync()
    return config.get("difficultyParameters", get_default_config()["difficultyParameters"])


def get_calming_activities() -> Dict[str, list]:
    """
    Get calming activities from config
    """
    config = fetch_config_sync()
    return config.get("calmingActivities", get_default_config()["calmingActivities"])


def get_focus_settings() -> Dict[str, Any]:
    """
    Get focus settings from config
    """
    config = fetch_config_sync()
    return config.get("focusSettings", get_default_config()["focusSettings"])
