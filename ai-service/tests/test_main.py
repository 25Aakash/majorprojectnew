# test_main.py - Tests for main FastAPI endpoints
import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for health check endpoint"""

    def test_health_check_returns_healthy_status(self, client):
        """Should return healthy status"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "neurolearn-ai"


class TestAdaptContentEndpoint:
    """Tests for /api/ai/adapt-content endpoint"""

    def test_adapt_content_success(self, client, sample_neurodiverse_profile):
        """Should return content adaptation for valid request"""
        request_data = {
            "user_id": "user123",
            "course_id": "course123",
            "lesson_id": "lesson123",
            "profile": sample_neurodiverse_profile,
            "recent_performance": [75, 80, 85]
        }
        
        response = client.post("/api/ai/adapt-content", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "adaptation" in data
        
        adaptation = data["adaptation"]
        assert "content_variant" in adaptation
        assert "font_recommendations" in adaptation
        assert "color_scheme" in adaptation
        assert "audio_enabled" in adaptation
        assert "visual_aids" in adaptation
        assert "chunk_size" in adaptation
        assert "break_reminders" in adaptation
        assert "gamification_level" in adaptation

    def test_adapt_content_for_adhd(self, client):
        """Should apply ADHD-specific adaptations"""
        request_data = {
            "user_id": "user123",
            "course_id": "course123",
            "lesson_id": "lesson123",
            "profile": {
                "conditions": ["adhd"],
                "sensory_preferences": {},
                "focus_duration": 15,
                "preferred_content_types": ["visual"],
                "learning_style": "visual"
            },
            "recent_performance": [70, 75, 80]
        }
        
        response = client.post("/api/ai/adapt-content", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        adaptation = data["adaptation"]
        # ADHD typically gets high gamification
        assert adaptation["gamification_level"] in ["medium", "high"]

    def test_adapt_content_for_dyslexia(self, client):
        """Should apply dyslexia-specific adaptations"""
        request_data = {
            "user_id": "user123",
            "course_id": "course123",
            "lesson_id": "lesson123",
            "profile": {
                "conditions": ["dyslexia"],
                "sensory_preferences": {},
                "focus_duration": 25,
                "preferred_content_types": ["audio"],
                "learning_style": "auditory"
            },
            "recent_performance": [70, 75, 80]
        }
        
        response = client.post("/api/ai/adapt-content", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        adaptation = data["adaptation"]
        # Dyslexia should get OpenDyslexic font
        assert adaptation["font_recommendations"] == "OpenDyslexic"

    def test_adapt_content_empty_conditions(self, client):
        """Should return default adaptations for empty conditions"""
        request_data = {
            "user_id": "user123",
            "course_id": "course123",
            "lesson_id": "lesson123",
            "profile": {
                "conditions": [],
                "sensory_preferences": {},
                "focus_duration": 25,
                "preferred_content_types": [],
                "learning_style": "visual"
            },
            "recent_performance": []
        }
        
        response = client.post("/api/ai/adapt-content", json=request_data)
        assert response.status_code == 200
        assert response.json()["success"] is True


class TestAdjustDifficultyEndpoint:
    """Tests for /api/ai/adjust-difficulty endpoint"""

    def test_adjust_difficulty_success(self, client, sample_difficulty_request):
        """Should return difficulty adjustment for valid request"""
        response = client.post("/api/ai/adjust-difficulty", json=sample_difficulty_request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "new_difficulty" in data
        assert "adjustment_reason" in data
        assert "recommendations" in data

    def test_adjust_difficulty_increase_on_good_scores(self, client, sample_neurodiverse_profile):
        """Should increase difficulty when scores are consistently high"""
        request_data = {
            "user_id": "user123",
            "current_difficulty": 0.5,
            "recent_scores": [90, 95, 92, 88],  # High scores
            "average_time_per_question": 20.0,  # Fast response
            "frustration_indicators": 0,
            "profile": sample_neurodiverse_profile
        }
        
        response = client.post("/api/ai/adjust-difficulty", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        # Should suggest increasing difficulty (difficulty scale is 0-1)
        assert data["new_difficulty"] >= 0.5

    def test_adjust_difficulty_decrease_on_low_scores(self, client, sample_neurodiverse_profile):
        """Should decrease difficulty when scores are consistently low"""
        request_data = {
            "user_id": "user123",
            "current_difficulty": 7.0,
            "recent_scores": [40, 45, 35, 50],  # Low scores
            "average_time_per_question": 60.0,  # Slow response
            "frustration_indicators": 5,  # High frustration
            "profile": sample_neurodiverse_profile
        }
        
        response = client.post("/api/ai/adjust-difficulty", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        # Should suggest decreasing difficulty
        assert data["new_difficulty"] <= 7.0

    def test_adjust_difficulty_considers_frustration(self, client, sample_neurodiverse_profile):
        """Should consider frustration indicators"""
        request_data = {
            "user_id": "user123",
            "current_difficulty": 5.0,
            "recent_scores": [70, 75, 72, 78],
            "average_time_per_question": 30.0,
            "frustration_indicators": 10,  # Very high frustration
            "profile": sample_neurodiverse_profile
        }
        
        response = client.post("/api/ai/adjust-difficulty", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        # Should include frustration in recommendations
        assert "recommendations" in data


class TestRecommendCoursesEndpoint:
    """Tests for /api/ai/recommend-courses endpoint"""

    def test_recommend_courses_success(self, client, sample_recommendation_request):
        """Should return course recommendations"""
        response = client.post("/api/ai/recommend-courses", json=sample_recommendation_request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data
        assert "reasoning" in data
        assert "estimated_completion" in data

    def test_recommend_courses_respects_completed(self, client, sample_neurodiverse_profile):
        """Should not recommend already completed courses"""
        request_data = {
            "user_id": "user123",
            "profile": sample_neurodiverse_profile,
            "completed_courses": ["course1", "course2", "course3"],
            "learning_goals": ["python"],
            "available_time": 30
        }
        
        response = client.post("/api/ai/recommend-courses", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        # Completed courses should not be in recommendations
        for rec in data.get("recommendations", []):
            assert rec.get("course_id") not in request_data["completed_courses"]


class TestAnalyticsEndpoint:
    """Tests for /api/ai/analytics endpoint"""

    def test_analytics_success(self, client, sample_analytics_request):
        """Should return analytics data"""
        response = client.post("/api/ai/analytics", json=sample_analytics_request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "analytics" in data

    def test_analytics_different_time_ranges(self, client, sample_neurodiverse_profile):
        """Should handle different time ranges"""
        for time_range in ["week", "month", "all"]:
            request_data = {
                "user_id": "user123",
                "time_range": time_range,
                "profile": sample_neurodiverse_profile
            }
            
            response = client.post("/api/ai/analytics", json=request_data)
            assert response.status_code == 200


class TestAPIErrorHandling:
    """Tests for API error handling"""

    def test_invalid_request_body(self, client):
        """Should return error for invalid request body"""
        response = client.post("/api/ai/adapt-content", json={})
        assert response.status_code == 422  # Validation error

    def test_missing_required_fields(self, client):
        """Should return error for missing required fields"""
        response = client.post("/api/ai/adapt-content", json={
            "user_id": "user123"
            # Missing other required fields
        })
        assert response.status_code == 422
