"""
Content Recommender
Recommends courses and learning content based on user profiles
"""

from typing import List, Dict, Any
import numpy as np
import os
import httpx

# Backend API URL for fetching courses dynamically
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")


class ContentRecommender:
    """
    Recommends personalized content for neurodiverse learners
    """

    def __init__(self):
        # Condition-friendly course mappings
        self.condition_preferences = {
            "adhd": {
                "prefer_gamification": "high",
                "max_duration": 15,
                "prefer_interactive": True
            },
            "autism": {
                "prefer_structured": True,
                "avoid_surprises": True,
                "prefer_visual": True
            },
            "dyslexia": {
                "prefer_audio": True,
                "avoid_heavy_reading": True,
                "prefer_visual": True
            }
        }

    async def fetch_courses_from_db(self) -> List[Dict[str, Any]]:
        """
        Fetch all published courses dynamically from the backend API
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{BACKEND_API_URL}/api/courses")
                if response.status_code == 200:
                    data = response.json()
                    # API returns { courses: [...] }, extract the array
                    if isinstance(data, dict) and "courses" in data:
                        return data["courses"]
                    return data if isinstance(data, list) else []
                return []
            except Exception as e:
                print(f"Error fetching courses: {e}")
                return []

    async def get_recommendations(
        self,
        profile: Dict[str, Any],
        completed: List[str],
        goals: List[str],
        available_time: int
    ) -> Dict[str, Any]:
        """
        Get personalized course recommendations from database
        """
        recommendations = []
        reasoning = []
        conditions = profile.get("conditions", [])
        preferred_content = profile.get("preferred_content_types", [])

        # Fetch all published courses dynamically
        courses = await self.fetch_courses_from_db()

        for course in courses:
            course_id = str(course.get("_id", course.get("id", "")))
            # Skip completed courses
            if course_id in completed:
                continue
            # Check prerequisites
            prereqs = course.get("prerequisites", [])
            if not all(str(pr) in completed for pr in prereqs):
                continue
            # Calculate compatibility score
            score = self._calculate_compatibility_score(
                course, conditions, preferred_content, goals, available_time
            )
            if score > 0.5:
                recommendations.append({
                    "course_id": course_id,
                    "title": course.get("title", ""),
                    "compatibility_score": round(score, 2),
                    "estimated_hours": course.get("estimatedDuration", 10),
                    "difficulty": course.get("difficulty", "beginner"),
                    "subjects": course.get("tags", [])
                })

        # Sort by compatibility score
        recommendations.sort(key=lambda x: x["compatibility_score"], reverse=True)
        # Take top 5
        top_recommendations = recommendations[:5]
        # Generate reasoning
        for rec in top_recommendations:
            course = next((c for c in courses if str(c.get("_id", c.get("id", ""))) == rec["course_id"]), None)
            reasons = self._generate_reasoning(
                rec["course_id"],
                course,
                conditions,
                goals
            )
            reasoning.append({
                "course_id": rec["course_id"],
                "reasons": reasons
            })
        total_hours = sum(r["estimated_hours"] for r in top_recommendations)
        return {
            "courses": top_recommendations,
            "reasoning": reasoning,
            "time_estimate": f"{total_hours} hours total"
        }

    def _calculate_compatibility_score(
        self,
        course: Dict[str, Any],
        conditions: List[str],
        preferred_content: List[str],
        goals: List[str],
        available_time: int
    ) -> float:
        """
        Calculate how compatible a course is with user profile
        """
        score = 0.5  # Base score

        # Extract course features
        tags = course.get("tags", [])
        neuro_features = course.get("neurodiverseFeatures", {})
        difficulty = course.get("difficulty", "beginner")
        duration = course.get("estimatedDuration", 10)

        # Check goal alignment
        for goal in goals:
            goal_lower = goal.lower()
            for tag in tags:
                if tag.lower() in goal_lower or goal_lower in tag.lower():
                    score += 0.2
                    break

        # Check condition compatibility
        for condition in conditions:
            condition_lower = condition.lower()
            prefs = self.condition_preferences.get(condition_lower, {})

            if condition_lower == "adhd" and neuro_features.get("adhdFriendly"):
                score += 0.2
            if condition_lower == "autism" and neuro_features.get("autismFriendly"):
                score += 0.2
            if condition_lower == "dyslexia" and neuro_features.get("dyslexiaFriendly"):
                score += 0.2

            if prefs.get("max_duration") and duration <= prefs["max_duration"]:
                score += 0.1

        # Check content type preferences
        if "visual" in preferred_content:
            score += 0.1
        if "audio" in preferred_content:
            score += 0.1

        # Time compatibility
        if duration <= available_time:
            score += 0.15

        # Normalize to 0-1 range
        return min(1.0, score)

    def _generate_reasoning(
        self,
        course_id: str,
        course: Dict[str, Any],
        conditions: List[str],
        goals: List[str]
    ) -> List[str]:
        """
        Generate human-readable reasoning for recommendation
        """
        if not course:
            return ["Good match for your learning profile"]

        reasons = []
        tags = course.get("tags", [])
        neuro_features = course.get("neurodiverseFeatures", {})

        # Subject alignment
        for goal in goals:
            for tag in tags:
                if tag.lower() in goal.lower():
                    reasons.append(f"Aligns with your goal: {goal}")
                    break

        # Condition-specific reasons
        for condition in conditions:
            condition_lower = condition.lower()

            if condition_lower == "adhd":
                if neuro_features.get("adhdFriendly"):
                    reasons.append("ADHD-friendly course design")
            elif condition_lower == "dyslexia":
                if neuro_features.get("dyslexiaFriendly"):
                    reasons.append("Dyslexia-friendly with audio support")
            elif condition_lower == "autism":
                if neuro_features.get("autismFriendly"):
                    reasons.append("Structured content suitable for autism")

        # General reasons
        if course.get("difficulty") == "beginner":
            reasons.append("Beginner-friendly difficulty level")

        if not reasons:
            reasons.append("Good match for your learning profile")

        return reasons[:3]  # Return top 3 reasons

    async def get_next_lesson(
        self,
        course_id: str,
        completed_lessons: List[str],
        performance_history: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Recommend the next lesson in a course dynamically
        """
        avg_performance = np.mean(list(performance_history.values())) if performance_history else 0.7

        recommendation = {
            "should_review": avg_performance < 0.6,
            "review_lessons": [],
            "next_lesson": None,
            "suggested_pace": "normal"
        }

        if avg_performance < 0.6:
            struggling = [
                lesson for lesson, score in performance_history.items()
                if score < 0.6
            ]
            recommendation["review_lessons"] = struggling[:2]
            recommendation["suggested_pace"] = "slow"
        elif avg_performance > 0.85:
            recommendation["suggested_pace"] = "fast"

        return recommendation
