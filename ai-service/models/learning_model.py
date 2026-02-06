"""
Adaptive Learning Model
Determines content adaptation based on neurodiverse profiles
Uses dynamic configuration from backend API
Loads trained ML models for predictions when available
"""

import numpy as np
import os
import pickle
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

# Paths for trained ML models
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models', 'trained')


class AdaptiveLearningModel:
    @staticmethod
    def load_from_disk(path: str):
        with open(path, "rb") as f:
            return pickle.load(f)

    def __init__(self, use_dynamic_config: bool = True):
        """
        Initialize the model with configuration.
        If use_dynamic_config is True and config service is available,
        fetch configuration from backend API.
        Also loads trained ML models if available for enhanced predictions.
        """
        self._use_dynamic_config = use_dynamic_config and USE_DYNAMIC_CONFIG
        
        # ML model slots
        self._engagement_model = None
        self._difficulty_model = None
        self._content_classifier = None
        self._scaler = None
        self._ml_models_loaded = False
        
        # Initialize with default configuration
        # These will be updated dynamically if config service is available
        self._init_default_config()
        
        # Try to load dynamic config
        if self._use_dynamic_config:
            self._load_dynamic_config()
        
        # Try to load trained ML models
        self._load_ml_models()
    
    def _load_ml_models(self):
        """Load trained ML models from disk if available"""
        try:
            # Load sklearn models
            difficulty_path = os.path.join(MODEL_DIR, 'difficulty_model_latest.pkl')
            content_path = os.path.join(MODEL_DIR, 'content_classifier_latest.pkl')
            scaler_path = os.path.join(MODEL_DIR, 'scaler_latest.pkl')
            engagement_path = os.path.join(MODEL_DIR, 'engagement_model_latest')
            
            if os.path.exists(difficulty_path):
                with open(difficulty_path, 'rb') as f:
                    self._difficulty_model = pickle.load(f)
                print("Loaded trained difficulty model")
            
            if os.path.exists(content_path):
                with open(content_path, 'rb') as f:
                    self._content_classifier = pickle.load(f)
                print("Loaded trained content classifier")
            
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self._scaler = pickle.load(f)
                print("Loaded feature scaler")
            
            # Load TensorFlow model if available
            if os.path.exists(engagement_path):
                try:
                    import tensorflow as tf
                    self._engagement_model = tf.keras.models.load_model(engagement_path)
                    print("Loaded trained engagement model (TensorFlow)")
                except ImportError:
                    print("TensorFlow not available, skipping engagement model")
                except Exception as e:
                    print(f"Could not load engagement model: {e}")
            
            self._ml_models_loaded = any([
                self._difficulty_model, self._content_classifier, self._engagement_model
            ])
            
            if self._ml_models_loaded:
                print(f"ML models loaded successfully from {MODEL_DIR}")
            else:
                print("No trained ML models found — using heuristic-based predictions")
        except Exception as e:
            print(f"Could not load ML models: {e}")
            self._ml_models_loaded = False
    
    @property
    def has_trained_models(self) -> bool:
        """Check if trained ML models are available"""
        return self._ml_models_loaded
    
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
        Predict learning outcome for a course.
        Uses trained ML models when available, falls back to heuristics.
        """
        # Try ML-based prediction first
        if self._ml_models_loaded and self._engagement_model and self._scaler:
            try:
                features = self._build_feature_vector(profile, course_difficulty, historical_performance)
                features_scaled = self._scaler.transform([features])
                
                engagement_pred = float(self._engagement_model.predict(features_scaled, verbose=0)[0][0])
                predicted_success = min(1.0, max(0.0, engagement_pred))
                
                # Higher confidence when using ML model
                confidence = min(0.95, 0.7 + (len(historical_performance) * 0.03))
                
                return {
                    "predicted_success_rate": round(predicted_success, 2),
                    "confidence": round(confidence, 2),
                    "recommended_pace": "slow" if predicted_success < 0.6 else "normal",
                    "extra_support_needed": predicted_success < 0.5,
                    "prediction_method": "ml_model"
                }
            except Exception as e:
                print(f"ML prediction failed, falling back to heuristics: {e}")
        
        # Heuristic fallback
        if not historical_performance:
            predicted_success = 0.7
        else:
            weights = np.linspace(0.5, 1.0, len(historical_performance))
            weighted_avg = np.average(historical_performance, weights=weights)
            difficulty_factor = 1.0 - (course_difficulty * 0.3)
            predicted_success = min(1.0, weighted_avg * difficulty_factor)
        
        confidence = min(0.9, 0.5 + (len(historical_performance) * 0.05))
        
        return {
            "predicted_success_rate": round(predicted_success, 2),
            "confidence": round(confidence, 2),
            "recommended_pace": "slow" if predicted_success < 0.6 else "normal",
            "extra_support_needed": predicted_success < 0.5,
            "prediction_method": "heuristic"
        }
    
    def predict_optimal_content_type(
        self,
        profile: Dict[str, Any],
        historical_performance: List[float]
    ) -> str:
        """
        Predict the best content type using the trained content classifier.
        Falls back to learning_style_variants mapping.
        """
        if self._ml_models_loaded and self._content_classifier and self._scaler:
            try:
                features = self._build_feature_vector(profile, 0.5, historical_performance)
                features_scaled = self._scaler.transform([features])
                prediction = self._content_classifier.predict(features_scaled)[0]
                content_map = {0: 'visual', 1: 'auditory', 2: 'kinesthetic', 3: 'reading'}
                return content_map.get(int(prediction), 'standard')
            except Exception:
                pass
        
        # Fallback to style-based mapping
        style = profile.get('learning_style', 'visual')
        return self.learning_style_variants.get(style, 'standard')
    
    def predict_difficulty(
        self,
        profile: Dict[str, Any],
        current_difficulty: float,
        historical_performance: List[float]
    ) -> float:
        """
        Predict optimal difficulty using trained difficulty model.
        Falls back to simple heuristic.
        """
        if self._ml_models_loaded and self._difficulty_model and self._scaler:
            try:
                features = self._build_feature_vector(profile, current_difficulty, historical_performance)
                features_scaled = self._scaler.transform([features])
                prediction = float(self._difficulty_model.predict(features_scaled)[0])
                return round(min(1.0, max(0.1, prediction)), 2)
            except Exception:
                pass
        
        # Fallback
        if not historical_performance:
            return current_difficulty
        avg = np.mean(historical_performance)
        if avg > 0.85:
            return min(1.0, current_difficulty + 0.1)
        elif avg < 0.5:
            return max(0.1, current_difficulty - 0.1)
        return current_difficulty
    
    def _build_feature_vector(
        self,
        profile: Dict[str, Any],
        difficulty: float,
        performance: List[float]
    ) -> List[float]:
        """
        Build a feature vector matching retrain.py's preprocessor.
        15 features: condition one-hot (5), style one-hot (4), session stats (3), progress (2), difficulty (1)
        """
        conditions = [c.lower() for c in profile.get('conditions', [])]
        style = profile.get('learning_style', 'visual').lower()
        
        # Condition one-hot encoding (5 features)
        condition_features = [
            1.0 if 'adhd' in conditions else 0.0,
            1.0 if 'autism' in conditions else 0.0,
            1.0 if 'dyslexia' in conditions else 0.0,
            1.0 if 'dyscalculia' in conditions else 0.0,
            1.0 if 'dyspraxia' in conditions else 0.0,
        ]
        
        # Learning style one-hot (4 features)
        style_features = [
            1.0 if style == 'visual' else 0.0,
            1.0 if style == 'auditory' else 0.0,
            1.0 if style == 'kinesthetic' else 0.0,
            1.0 if style == 'reading' else 0.0,
        ]
        
        # Session stats (3 features)
        avg_perf = float(np.mean(performance)) if performance else 0.5
        session_count = len(performance)
        perf_trend = float(np.polyfit(range(len(performance)), performance, 1)[0]) if len(performance) > 1 else 0.0
        
        # Progress (2 features)
        progress = profile.get('progress', {})
        overall = progress.get('overallProgress', 50) / 100.0
        lessons_done = min(1.0, progress.get('lessonsCompleted', 0) / 50.0)
        
        # Difficulty (1 feature)
        return condition_features + style_features + [avg_perf, session_count / 10.0, perf_trend, overall, lessons_done, difficulty]
