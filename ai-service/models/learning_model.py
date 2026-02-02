"""
Adaptive Learning Model
Determines content adaptation based on neurodiverse profiles
Uses dynamic configuration from backend API
"""

import numpy as np
from typing import List, Dict, Any

# Import config service for dynamic configuration
try:
    from services.config_service import (
        get_condition_adaptations,
        get_calming_activities,
        get_default_config
    )
    USE_DYNAMIC_CONFIG = True
except ImportError:
    USE_DYNAMIC_CONFIG = False


class AdaptiveLearningModel:
    @staticmethod
    def load_from_disk(path: str):
        import pickle
        with open(path, "rb") as f:
            return pickle.load(f)

    def __init__(self, use_dynamic_config: bool = True):
        """
        Initialize the model with configuration.
        If use_dynamic_config is True and config service is available,
        fetch configuration from backend API.
        """
        self._use_dynamic_config = use_dynamic_config and USE_DYNAMIC_CONFIG
        
        # Initialize with default configuration
        # These will be updated dynamically if config service is available
        self._init_default_config()
        
        # Try to load dynamic config
        if self._use_dynamic_config:
            self._load_dynamic_config()
    
    def _init_default_config(self):
        """Initialize default configuration values"""
        # Content adaptation mappings based on neurodiverse conditions
        self.condition_adaptations = {
            "adhd": {
                "chunk_size": "small",
                "break_reminders": True,
                "gamification": "high",
                "visual_aids": True,
                "audio": True,
                "colors": "high_contrast",
                "font": "sans-serif"
            },
            "autism": {
                "chunk_size": "medium",
                "break_reminders": True,
                "gamification": "medium",
                "visual_aids": True,
                "audio": False,  # Can be overwhelming
                "colors": "muted",
                "font": "sans-serif"
            },
            "dyslexia": {
                "chunk_size": "small",
                "break_reminders": False,
                "gamification": "medium",
                "visual_aids": True,
                "audio": True,
                "colors": "dyslexia_friendly",
                "font": "OpenDyslexic"
            },
            "dyscalculia": {
                "chunk_size": "small",
                "break_reminders": False,
                "gamification": "high",
                "visual_aids": True,
                "audio": True,
                "colors": "standard",
                "font": "sans-serif"
            },
            "dyspraxia": {
                "chunk_size": "medium",
                "break_reminders": True,
                "gamification": "medium",
                "visual_aids": True,
                "audio": True,
                "colors": "standard",
                "font": "sans-serif"
            }
        }
        
        self.learning_style_variants = {
            "visual": "visual",
            "auditory": "audioEnhanced",
            "kinesthetic": "interactive",
            "reading": "standard"
        }
        
        self.calming_activities = {
            "frustrated": [
                "Deep breathing exercise (4-7-8 technique)",
                "Quick stretching break",
                "Listen to calming music",
                "Take a 5-minute walk"
            ],
            "anxious": [
                "Guided meditation (2 minutes)",
                "Progressive muscle relaxation",
                "Grounding exercise (5-4-3-2-1)",
                "Coloring activity"
            ],
            "disengaged": [
                "Try a quick game or puzzle",
                "Switch to interactive content",
                "Take a movement break",
                "Set a small, achievable goal"
            ],
            "focused": [
                "Keep going! You're doing great!",
                "Consider setting a timer for a break",
                "Reward yourself after this session"
            ]
        }
    
    def _load_dynamic_config(self):
        """Load configuration from backend API"""
        try:
            dynamic_adaptations = get_condition_adaptations()
            if dynamic_adaptations:
                # Merge with defaults - dynamic config takes priority
                for condition, settings in dynamic_adaptations.items():
                    if condition in self.condition_adaptations:
                        self.condition_adaptations[condition].update(settings)
                    else:
                        self.condition_adaptations[condition] = settings
            
            dynamic_activities = get_calming_activities()
            if dynamic_activities:
                self.calming_activities.update(dynamic_activities)
                
            print("Loaded dynamic configuration from backend")
        except Exception as e:
            print(f"Using default configuration: {e}")
    
    def reload_config(self):
        """Reload configuration from backend (call after config updates)"""
        if self._use_dynamic_config:
            self._load_dynamic_config()
    
    def get_content_adaptation(
        self,
        conditions: List[str],
        preferences: Dict[str, Any],
        learning_style: str,
        recent_performance: List[float]
    ) -> Dict[str, Any]:
        """
        Determine optimal content adaptation based on profile and performance
        """
        # Start with default adaptation
        adaptation = {
            "variant": "standard",
            "font": "sans-serif",
            "colors": "standard",
            "audio": False,
            "visual_aids": True,
            "chunk_size": "medium",
            "break_reminders": True,
            "gamification": "medium"
        }
        
        # Apply condition-specific adaptations
        for condition in conditions:
            condition_lower = condition.lower()
            if condition_lower in self.condition_adaptations:
                cond_adapt = self.condition_adaptations[condition_lower]
                
                # Merge adaptations (condition-specific takes priority)
                for key, value in cond_adapt.items():
                    if key == "gamification":
                        # Use highest gamification level among conditions
                        levels = {"low": 1, "medium": 2, "high": 3}
                        current = levels.get(adaptation[key], 2)
                        new = levels.get(value, 2)
                        if new > current:
                            adaptation[key] = value
                    elif key == "chunk_size":
                        # Use smallest chunk size
                        sizes = {"small": 1, "medium": 2, "large": 3}
                        current = sizes.get(adaptation[key], 2)
                        new = sizes.get(value, 2)
                        if new < current:
                            adaptation[key] = value
                    else:
                        adaptation[key] = value
        
        # Apply learning style
        if learning_style in self.learning_style_variants:
            adaptation["variant"] = self.learning_style_variants[learning_style]
        
        # Adjust based on recent performance
        if recent_performance:
            avg_performance = np.mean(recent_performance)
            
            if avg_performance < 0.5:
                # Struggling - simplify content
                adaptation["variant"] = "simplified"
                adaptation["chunk_size"] = "small"
                adaptation["gamification"] = "high"
            elif avg_performance > 0.85:
                # Excelling - can handle more complex content
                adaptation["variant"] = "advanced"
                adaptation["chunk_size"] = "large"
        
        # Apply user preferences
        if preferences:
            if preferences.get("prefersDarkMode"):
                adaptation["colors"] = "dark"
            if preferences.get("prefersReducedMotion"):
                adaptation["visual_aids"] = False
            if preferences.get("prefersAudio"):
                adaptation["audio"] = True
        
        return adaptation
    
    def calculate_optimal_duration(
        self,
        actual_duration: int,
        breaks_taken: int,
        accuracy: float
    ) -> int:
        """
        Calculate optimal session duration based on performance
        """
        # Base optimal duration
        if accuracy >= 0.8:
            # Good performance - current duration works well
            optimal = actual_duration
        elif accuracy >= 0.6:
            # Moderate performance - slightly shorter might help
            optimal = int(actual_duration * 0.85)
        else:
            # Poor performance - significantly shorter sessions
            optimal = int(actual_duration * 0.7)
        
        # Adjust for breaks
        if breaks_taken > 0:
            effective_duration = actual_duration / (breaks_taken + 1)
            # If effective duration between breaks is good, use that
            if effective_duration >= 10 * 60:  # At least 10 minutes
                optimal = int(effective_duration)
        
        # Ensure reasonable bounds (5-45 minutes in seconds)
        optimal = max(5 * 60, min(45 * 60, optimal))
        
        return optimal
    
    def get_calming_activity(self, emotional_state: str) -> str:
        """
        Get a calming activity suggestion based on emotional state
        """
        activities = self.calming_activities.get(
            emotional_state, 
            self.calming_activities["focused"]
        )
        
        # Return random activity from list
        import random
        return random.choice(activities)
    
    def predict_learning_outcome(
        self,
        profile: Dict[str, Any],
        course_difficulty: float,
        historical_performance: List[float]
    ) -> Dict[str, Any]:
        """
        Predict learning outcome for a course
        """
        if not historical_performance:
            # No history - use moderate prediction
            predicted_success = 0.7
        else:
            # Use weighted average with recent performance weighted more
            weights = np.linspace(0.5, 1.0, len(historical_performance))
            weighted_avg = np.average(historical_performance, weights=weights)
            
            # Adjust for course difficulty
            difficulty_factor = 1.0 - (course_difficulty * 0.3)
            predicted_success = min(1.0, weighted_avg * difficulty_factor)
        
        # Confidence based on data amount
        confidence = min(0.9, 0.5 + (len(historical_performance) * 0.05))
        
        return {
            "predicted_success_rate": round(predicted_success, 2),
            "confidence": round(confidence, 2),
            "recommended_pace": "slow" if predicted_success < 0.6 else "normal",
            "extra_support_needed": predicted_success < 0.5
        }
