"""
Analytics Service
Generates learning analytics and insights for neurodiverse learners
Fetches all data dynamically from the backend API
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
import numpy as np
import os
import httpx

# Backend API URL for fetching data dynamically
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")


class AnalyticsService:
    """
    Generates comprehensive learning analytics from database
    """

    def __init__(self):
        pass

    async def fetch_user_progress(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user progress data from the backend API
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{BACKEND_API_URL}/api/progress/{user_id}")
                if response.status_code == 200:
                    return response.json()
                return {}
            except Exception as e:
                print(f"Error fetching user progress: {e}")
                return {}

    async def fetch_user_sessions(self, user_id: str, time_range: str) -> List[Dict[str, Any]]:
        """
        Fetch user learning sessions from the backend API
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{BACKEND_API_URL}/api/progress/{user_id}/sessions",
                    params={"range": time_range}
                )
                if response.status_code == 200:
                    return response.json()
                return []
            except Exception as e:
                print(f"Error fetching user sessions: {e}")
                return []

    async def fetch_user_achievements(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user achievements from the backend API
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{BACKEND_API_URL}/api/users/{user_id}/rewards")
                if response.status_code == 200:
                    return response.json()
                return {}
            except Exception as e:
                print(f"Error fetching user achievements: {e}")
                return {}

    async def generate_analytics(
        self,
        user_id: str,
        time_range: str,
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive learning analytics from database
        """
        # Fetch real data from backend
        progress_data = await self.fetch_user_progress(user_id)
        sessions_data = await self.fetch_user_sessions(user_id, time_range)
        achievements_data = await self.fetch_user_achievements(user_id)

        analytics = {
            "summary": self._generate_summary(progress_data, sessions_data),
            "learning_patterns": self._analyze_learning_patterns(sessions_data, profile),
            "progress": self._calculate_progress(progress_data),
            "strengths_weaknesses": self._identify_strengths_weaknesses(progress_data),
            "recommendations": self._generate_recommendations(progress_data, profile),
            "achievements": self._format_achievements(achievements_data),
            "focus_analysis": self._analyze_focus_patterns(sessions_data, profile),
            "accessibility_insights": self._get_accessibility_insights(profile)
        }

        return analytics

    def _generate_summary(
        self,
        progress_data: Dict[str, Any],
        sessions_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate summary statistics from real data
        """
        total_time_seconds = sum(s.get("duration", 0) for s in sessions_data)
        hours = total_time_seconds // 3600
        minutes = (total_time_seconds % 3600) // 60

        sessions_count = len(sessions_data)
        avg_duration = (total_time_seconds // sessions_count // 60) if sessions_count > 0 else 0

        lessons_completed = progress_data.get("lessonsCompleted", 0)
        quizzes_passed = progress_data.get("quizzesPassed", 0)

        rewards = progress_data.get("rewards", {})
        current_streak = rewards.get("streakDays", 0)
        xp_earned = rewards.get("points", 0)
        badges_count = len(rewards.get("badges", []))

        return {
            "total_learning_time": f"{hours}h {minutes}m",
            "sessions_completed": sessions_count,
            "average_session_duration": f"{avg_duration} minutes",
            "lessons_completed": lessons_completed,
            "quizzes_passed": quizzes_passed,
            "current_streak": current_streak,
            "xp_earned": xp_earned,
            "badges_earned": badges_count
        }

    def _analyze_learning_patterns(
        self,
        sessions_data: List[Dict[str, Any]],
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze learning patterns from session data
        """
        conditions = profile.get("conditions", [])

        # Analyze session times
        morning_sessions = 0
        afternoon_sessions = 0
        evening_sessions = 0

        for session in sessions_data:
            time_of_day = session.get("timeOfDay", "morning")
            if time_of_day == "morning":
                morning_sessions += 1
            elif time_of_day == "afternoon":
                afternoon_sessions += 1
            else:
                evening_sessions += 1

        best_time = "morning"
        if afternoon_sessions > morning_sessions and afternoon_sessions > evening_sessions:
            best_time = "afternoon"
        elif evening_sessions > morning_sessions and evening_sessions > afternoon_sessions:
            best_time = "evening"

        # Calculate optimal session length
        durations = [s.get("duration", 0) / 60 for s in sessions_data]  # in minutes
        optimal_length = int(np.mean(durations)) if durations else 25

        patterns = {
            "best_time_of_day": best_time,
            "optimal_session_length": optimal_length,
            "preferred_content_type": profile.get("learning_style", "visual"),
            "break_frequency": "every 20 minutes",
            "engagement_trend": "stable"
        }

        # Adjust recommendations based on conditions
        condition_insights = []

        for condition in conditions:
            condition_lower = condition.lower()

            if condition_lower == "adhd":
                patterns["optimal_session_length"] = min(optimal_length, 20)
                patterns["break_frequency"] = "every 15 minutes"
                condition_insights.append({
                    "condition": "ADHD",
                    "insight": "Shorter, more frequent sessions work best",
                    "tip": "Try the Pomodoro technique with 15-minute intervals"
                })

            elif condition_lower == "autism":
                condition_insights.append({
                    "condition": "Autism",
                    "insight": "Consistent routine improves learning outcomes",
                    "tip": "Stick to your usual learning schedule for best results"
                })

            elif condition_lower == "dyslexia":
                patterns["preferred_content_type"] = "audio"
                condition_insights.append({
                    "condition": "Dyslexia",
                    "insight": "Audio content shows better retention",
                    "tip": "Enable text-to-speech for reading materials"
                })

        patterns["condition_specific_insights"] = condition_insights

        return patterns

    def _calculate_progress(self, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate overall learning progress from database
        """
        courses_progress = progress_data.get("coursesProgress", [])

        overall = 0
        if courses_progress:
            overall = int(np.mean([c.get("progress", 0) for c in courses_progress]))

        formatted_courses = []
        for cp in courses_progress:
            formatted_courses.append({
                "id": str(cp.get("courseId", "")),
                "name": cp.get("courseName", "Course"),
                "progress": cp.get("progress", 0),
                "lessons_completed": cp.get("lessonsCompleted", 0),
                "total_lessons": cp.get("totalLessons", 1)
            })

        return {
            "overall_completion": overall,
            "courses": formatted_courses,
            "weekly_goals": progress_data.get("weeklyGoals", {
                "target_minutes": 150,
                "completed_minutes": 0,
                "target_lessons": 10,
                "completed_lessons": 0
            }),
            "trend": {
                "direction": "up" if overall > 50 else "stable",
                "percentage": 10,
                "message": "Keep up the good work!"
            }
        }

    def _identify_strengths_weaknesses(self, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Identify learning strengths and areas for improvement
        """
        subject_scores = progress_data.get("subjectPerformance", {})

        strengths = []
        weaknesses = []

        for subject, score in subject_scores.items():
            if score >= 75:
                strengths.append({
                    "area": subject.capitalize(),
                    "score": score,
                    "description": f"Strong performance in {subject}"
                })
            elif score < 60:
                weaknesses.append({
                    "area": subject.capitalize(),
                    "score": score,
                    "description": f"Room for improvement in {subject}",
                    "recommendation": f"Review {subject} fundamentals"
                })

        return {
            "strengths": strengths[:3],
            "areas_to_improve": weaknesses[:3],
            "subject_performance": subject_scores
        }

    def _generate_recommendations(
        self,
        progress_data: Dict[str, Any],
        profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized learning recommendations
        """
        recommendations = []
        conditions = profile.get("conditions", [])

        # Base recommendations
        recommendations.append({
            "type": "schedule",
            "priority": "medium",
            "title": "Optimize Your Learning Schedule",
            "description": "Based on your patterns, schedule important lessons during your peak focus time.",
            "action": "Update learning preferences"
        })

        # Condition-specific recommendations
        for condition in conditions:
            condition_lower = condition.lower()

            if condition_lower == "adhd":
                recommendations.append({
                    "type": "break",
                    "priority": "high",
                    "title": "Enable Break Reminders",
                    "description": "Regular breaks help maintain focus. Enable automatic break reminders.",
                    "action": "Enable break reminders"
                })

            elif condition_lower == "dyslexia":
                recommendations.append({
                    "type": "content",
                    "priority": "high",
                    "title": "Try Audio-Enhanced Content",
                    "description": "Audio content can improve comprehension and reduce reading strain.",
                    "action": "Enable text-to-speech"
                })

        return recommendations

    def _format_achievements(self, achievements_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format user achievements from database
        """
        badges = achievements_data.get("badges", [])
        points = achievements_data.get("points", 0)
        streak = achievements_data.get("streakDays", 0)

        recent_badges = [
            {
                "id": b,
                "name": b.replace("-", " ").title(),
                "icon": "🏆",
                "earned_at": "Recent"
            }
            for b in badges[-3:]
        ]

        return {
            "recent_badges": recent_badges,
            "total_badges": len(badges),
            "total_xp": points,
            "current_streak": streak,
            "next_badge": {
                "name": "Next Achievement",
                "description": "Keep learning to unlock more badges",
                "progress": 50,
                "remaining": "Keep going!"
            }
        }

    def _analyze_focus_patterns(
        self,
        sessions_data: List[Dict[str, Any]],
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze focus and attention patterns from session data
        """
        conditions = profile.get("conditions", [])

        # Calculate average focus duration from sessions
        durations = [s.get("duration", 0) / 60 for s in sessions_data]
        avg_focus = int(np.mean(durations)) if durations else 20

        focus_data = {
            "average_focus_duration": avg_focus,
            "best_focus_time": "Morning",
            "focus_score": min(100, avg_focus * 4),
            "improvement_trend": "stable",
            "focus_tips": []
        }

        # Add condition-specific focus tips
        for condition in conditions:
            condition_lower = condition.lower()

            if condition_lower == "adhd":
                focus_data["focus_tips"].extend([
                    "Use background music or white noise",
                    "Keep fidget tools nearby",
                    "Break tasks into smaller chunks"
                ])
            elif condition_lower == "autism":
                focus_data["focus_tips"].extend([
                    "Maintain a consistent environment",
                    "Use noise-canceling headphones",
                    "Follow a structured routine"
                ])

        if not focus_data["focus_tips"]:
            focus_data["focus_tips"] = [
                "Take regular breaks",
                "Stay hydrated",
                "Find a quiet study space"
            ]

        return focus_data

    def _get_accessibility_insights(
        self,
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate accessibility-related insights
        """
        conditions = profile.get("conditions", [])
        preferences = profile.get("sensory_preferences", {})

        insights = {
            "current_settings": {
                "font_size": preferences.get("fontSize", "medium"),
                "high_contrast": preferences.get("highContrast", False),
                "text_to_speech": preferences.get("textToSpeech", False),
                "reduced_motion": preferences.get("reducedMotion", False)
            },
            "recommendations": []
        }

        for condition in conditions:
            condition_lower = condition.lower()

            if condition_lower == "dyslexia":
                if not preferences.get("textToSpeech"):
                    insights["recommendations"].append({
                        "setting": "Text-to-Speech",
                        "reason": "Can significantly help with reading comprehension",
                        "impact": "High"
                    })

            if condition_lower == "adhd":
                insights["recommendations"].append({
                    "setting": "Focus Mode",
                    "reason": "Reduces distractions and improves concentration",
                    "impact": "High"
                })

        return insights

    def calculate_engagement_score(
        self,
        sessions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate overall engagement score from sessions
        """
        if not sessions:
            return 0.5

        scores = []
        for session in sessions:
            duration = session.get("duration", 0)
            interactions = session.get("interactions", 0)
            completion = session.get("completion_rate", 0)

            time_score = min(1.0, duration / (30 * 60))
            interaction_score = min(1.0, interactions / 50)

            session_score = (time_score * 0.3 + interaction_score * 0.3 + completion * 0.4)
            scores.append(session_score)

        return round(np.mean(scores), 2)
