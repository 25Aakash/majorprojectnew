"""
Difficulty Adjuster
Dynamically adjusts content difficulty based on performance
Fetches configuration from backend API for dynamic updates
"""

from typing import List, Dict, Any
import numpy as np
import os
import httpx

# Backend API URL for fetching dynamic configuration
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")


class DifficultyAdjuster:
    """
    Adjusts difficulty levels for neurodiverse learners
    Configuration is loaded dynamically from backend
    """
    
    def __init__(self):
        # Default difficulty adjustment parameters per condition
        # These will be overridden by dynamic config if available
        self._default_condition_parameters = {
            "adhd": {
                "frustration_sensitivity": 1.5,
                "success_boost": 1.2,
                "target_accuracy": 0.75,
                "min_difficulty": 0.2,
                "max_difficulty": 0.8
            },
            "autism": {
                "frustration_sensitivity": 1.3,
                "success_boost": 1.0,
                "target_accuracy": 0.80,
                "min_difficulty": 0.3,
                "max_difficulty": 0.85
            },
            "dyslexia": {
                "frustration_sensitivity": 1.4,
                "success_boost": 1.1,
                "target_accuracy": 0.70,
                "min_difficulty": 0.2,
                "max_difficulty": 0.75
            },
            "dyscalculia": {
                "frustration_sensitivity": 1.5,
                "success_boost": 1.2,
                "target_accuracy": 0.70,
                "min_difficulty": 0.15,
                "max_difficulty": 0.7
            },
            "dyspraxia": {
                "frustration_sensitivity": 1.3,
                "success_boost": 1.1,
                "target_accuracy": 0.72,
                "min_difficulty": 0.2,
                "max_difficulty": 0.75
            },
            "default": {
                "frustration_sensitivity": 1.0,
                "success_boost": 1.0,
                "target_accuracy": 0.75,
                "min_difficulty": 0.2,
                "max_difficulty": 0.9
            }
        }
        
        # Expected time per question (seconds) - can be overridden
        self._expected_time_per_question = 15
        
        # Load dynamic config
        self.condition_parameters = self._load_dynamic_config()
    
    def _load_dynamic_config(self) -> Dict[str, Dict[str, Any]]:
        """
        Load difficulty parameters from backend config API
        Falls back to defaults if API unavailable
        """
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(f"{BACKEND_API_URL}/api/config/difficultyParameters")
                if response.status_code == 200:
                    data = response.json()
                    if data and isinstance(data, dict):
                        # Merge with defaults
                        merged = self._default_condition_parameters.copy()
                        for condition, params in data.items():
                            if condition in merged:
                                merged[condition].update(params)
                            else:
                                merged[condition] = params
                        return merged
        except Exception as e:
            print(f"Could not load dynamic difficulty config: {e}")
        
        return self._default_condition_parameters.copy()
    
    def reload_config(self):
        """
        Reload configuration from backend
        """
        self.condition_parameters = self._load_dynamic_config()
    
    def calculate_optimal_difficulty(
        self,
        current_difficulty: float,
        recent_scores: List[float],
        avg_time: float,
        frustration: int,
        conditions: List[str]
    ) -> Dict[str, Any]:
        """
        Calculate the optimal difficulty level
        """
        # Get parameters for conditions
        params = self._get_combined_parameters(conditions)
        
        # Calculate average recent performance
        if not recent_scores:
            avg_score = 0.7  # Default assumption
        else:
            # Weight recent scores more heavily
            weights = np.linspace(0.5, 1.0, len(recent_scores))
            avg_score = np.average(recent_scores, weights=weights)
        
        # Calculate difficulty adjustment
        target = params["target_accuracy"]
        adjustment = 0.0
        reasons = []
        recommendations = []
        
        # Accuracy-based adjustment
        if avg_score > target + 0.15:
            # Too easy - increase difficulty
            adjustment += 0.1 * params["success_boost"]
            reasons.append("Performance above target - increasing challenge")
        elif avg_score < target - 0.15:
            # Too hard - decrease difficulty
            adjustment -= 0.1
            reasons.append("Performance below target - reducing difficulty")
        
        # Frustration-based adjustment
        if frustration > 2:
            frustration_penalty = 0.05 * frustration * params["frustration_sensitivity"]
            adjustment -= frustration_penalty
            reasons.append("Frustration detected - making content more accessible")
            recommendations.append("Consider taking a short break")
        
        # Time-based adjustment
        expected_time = self._expected_time_per_question
        if avg_time > expected_time * 2:
            adjustment -= 0.05
            reasons.append("Response time indicates struggle")
            recommendations.append("Try breaking problems into smaller steps")
        elif avg_time < expected_time * 0.5:
            adjustment += 0.05
            reasons.append("Quick responses suggest material is easy")
        
        # Calculate new difficulty
        new_difficulty = current_difficulty + adjustment
        
        # Clamp to bounds
        new_difficulty = max(
            params["min_difficulty"],
            min(params["max_difficulty"], new_difficulty)
        )
        
        # Generate recommendations
        if new_difficulty < current_difficulty:
            recommendations.append("Review foundational concepts")
            recommendations.append("Try visual explanations of the material")
        elif new_difficulty > current_difficulty:
            recommendations.append("Great progress! Ready for more challenge")
            recommendations.append("Try explaining concepts to reinforce learning")
        
        if not recommendations:
            recommendations.append("Continue at current pace - you're doing well!")
        
        if not reasons:
            reasons.append("Maintaining current difficulty level")
        
        return {
            "level": round(new_difficulty, 2),
            "reason": " | ".join(reasons),
            "recommendations": recommendations,
            "adjustment": round(adjustment, 3),
            "metrics": {
                "avg_score": round(avg_score, 2),
                "target_accuracy": target,
                "frustration_level": frustration
            }
        }
    
    def _get_combined_parameters(self, conditions: List[str]) -> Dict[str, Any]:
        """
        Combine parameters from multiple conditions
        """
        if not conditions:
            return self.condition_parameters["default"]
        
        # Start with default
        combined = self.condition_parameters["default"].copy()
        
        # Adjust based on conditions
        for condition in conditions:
            condition_lower = condition.lower()
            if condition_lower in self.condition_parameters:
                params = self.condition_parameters[condition_lower]
                
                # Use most sensitive frustration setting
                if params["frustration_sensitivity"] > combined["frustration_sensitivity"]:
                    combined["frustration_sensitivity"] = params["frustration_sensitivity"]
                
                # Use lowest target accuracy (most accessible)
                if params["target_accuracy"] < combined["target_accuracy"]:
                    combined["target_accuracy"] = params["target_accuracy"]
                
                # Use lowest min difficulty
                if params["min_difficulty"] < combined["min_difficulty"]:
                    combined["min_difficulty"] = params["min_difficulty"]
                
                # Use lowest max difficulty (prevent overwhelming)
                if params["max_difficulty"] < combined["max_difficulty"]:
                    combined["max_difficulty"] = params["max_difficulty"]
        
        return combined
    
    def get_difficulty_progression(
        self,
        course_id: str,
        user_id: str,
        lesson_count: int
    ) -> List[float]:
        """
        Generate a difficulty progression curve for a course
        """
        # Gradual difficulty increase following a sigmoid curve
        # This ensures smooth progression
        
        x = np.linspace(-4, 4, lesson_count)
        progression = 1 / (1 + np.exp(-x))
        
        # Scale to 0.2 - 0.8 range
        progression = 0.2 + (progression * 0.6)
        
        return progression.tolist()
    
    def analyze_difficulty_history(
        self,
        difficulty_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze difficulty adjustment history for insights
        """
        if not difficulty_history:
            return {"insights": [], "trend": "stable"}
        
        difficulties = [h["level"] for h in difficulty_history]
        scores = [h.get("score", 0.7) for h in difficulty_history]
        
        # Calculate trends
        difficulty_trend = np.polyfit(range(len(difficulties)), difficulties, 1)[0]
        score_trend = np.polyfit(range(len(scores)), scores, 1)[0]
        
        insights = []
        
        if difficulty_trend > 0.01:
            insights.append("Difficulty has been increasing - good progress!")
        elif difficulty_trend < -0.01:
            insights.append("Difficulty has been decreasing - consider extra support")
        
        if score_trend > 0.01:
            insights.append("Scores are improving over time")
        elif score_trend < -0.01:
            insights.append("Scores declining - may need content adjustment")
        
        # Check for oscillation (difficulty bouncing up and down)
        if len(difficulties) > 3:
            diffs = np.diff(difficulties)
            sign_changes = np.sum(np.diff(np.sign(diffs)) != 0)
            if sign_changes > len(difficulties) * 0.5:
                insights.append("Difficulty oscillating - consider stabilizing at current level")
        
        return {
            "insights": insights,
            "trend": "increasing" if difficulty_trend > 0.01 else "decreasing" if difficulty_trend < -0.01 else "stable",
            "avg_difficulty": round(np.mean(difficulties), 2),
            "avg_score": round(np.mean(scores), 2)
        }
