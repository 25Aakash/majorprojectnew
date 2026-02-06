# test_new_endpoints.py - Tests for new Gap 1/4/5/6 endpoints
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.fixture
def client():
    return TestClient(app)


# ─── Gap 1: Model Status & Retrain ────────────────────────────────────────────

class TestModelStatusEndpoint:
    """Tests for GET /api/ai/model-status"""

    def test_model_status_returns_200(self, client):
        """Should return model status information"""
        response = client.get("/api/ai/model-status")
        assert response.status_code == 200
        data = response.json()
        assert "ml_models_loaded" in data
        assert "models" in data
        assert isinstance(data["ml_models_loaded"], bool)

    def test_model_status_has_all_model_keys(self, client):
        """Should report status for all four model types"""
        response = client.get("/api/ai/model-status")
        data = response.json()
        models = data["models"]
        assert "engagement_model" in models
        assert "difficulty_model" in models
        assert "content_classifier" in models
        assert "scaler" in models

    def test_model_status_values_are_boolean(self, client):
        """Each model status should be a boolean"""
        response = client.get("/api/ai/model-status")
        data = response.json()
        for key, value in data["models"].items():
            assert isinstance(value, bool), f"{key} should be boolean"

    def test_model_status_has_model_dir(self, client):
        """Should include model directory path"""
        response = client.get("/api/ai/model-status")
        data = response.json()
        assert "model_dir" in data


class TestHealthCheckMLStatus:
    """Tests for updated health check with ML status"""

    def test_health_check_includes_ml_models_loaded(self, client):
        """Health check should now include ml_models_loaded field"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "ml_models_loaded" in data
        assert data["status"] == "healthy"
        assert data["service"] == "neurolearn-ai"


# ─── Gap 5: Generate Content Variants ─────────────────────────────────────────

class TestGenerateVariantsEndpoint:
    """Tests for POST /api/ai/generate-variants"""

    def test_generate_variants_returns_200(self, client):
        """Should return content variants"""
        request_data = {
            "content": {
                "title": "Introduction to Fractions",
                "text": "A fraction represents a part of a whole. The top number is the numerator.",
                "difficulty": "beginner",
            },
            "conditions": ["dyslexia"],
            "target_styles": ["visual", "auditory"],
        }
        response = client.post("/api/ai/generate-variants", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "variants" in data

    def test_generate_variants_has_requested_styles(self, client):
        """Should produce variants for each requested style"""
        request_data = {
            "content": {"title": "Test", "text": "Some content here."},
            "conditions": ["adhd"],
            "target_styles": ["visual", "kinesthetic"],
        }
        response = client.post("/api/ai/generate-variants", json=request_data)
        data = response.json()
        assert "visual" in data["variants"]
        assert "kinesthetic" in data["variants"]

    def test_generate_variants_always_includes_simplified(self, client):
        """Should always produce a simplified variant"""
        request_data = {
            "content": {"title": "Test", "text": "Content."},
            "conditions": [],
            "target_styles": ["visual"],
        }
        response = client.post("/api/ai/generate-variants", json=request_data)
        data = response.json()
        assert "simplified" in data["variants"]

    def test_generate_variants_default_styles(self, client):
        """Should use default styles if none specified"""
        request_data = {
            "content": {"title": "Test", "text": "Content."},
        }
        response = client.post("/api/ai/generate-variants", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Default styles: visual, auditory, kinesthetic
        assert "visual" in data["variants"]
        assert "auditory" in data["variants"]
        assert "kinesthetic" in data["variants"]

    def test_generate_variants_empty_content(self, client):
        """Should handle empty content dict"""
        request_data = {
            "content": {},
            "conditions": ["adhd"],
            "target_styles": ["visual"],
        }
        response = client.post("/api/ai/generate-variants", json=request_data)
        assert response.status_code == 200


# ─── Gap 4: Smart Recommend ───────────────────────────────────────────────────

class TestSmartRecommendEndpoint:
    """Tests for POST /api/ai/smart-recommend"""

    def test_smart_recommend_returns_200(self, client):
        """Should return recommendations"""
        request_data = {
            "user_id": "user123",
            "conditions": ["adhd"],
            "learning_style": "visual",
            "recent_topics": [],
            "performance_level": 0.7,
            "limit": 5,
        }
        response = client.post("/api/ai/smart-recommend", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)

    def test_smart_recommend_respects_limit(self, client):
        """Should not return more than the requested limit"""
        request_data = {
            "user_id": "user123",
            "conditions": [],
            "limit": 2,
        }
        response = client.post("/api/ai/smart-recommend", json=request_data)
        data = response.json()
        assert len(data["recommendations"]) <= 2

    def test_smart_recommend_defaults(self, client):
        """Should work with minimal fields"""
        request_data = {"user_id": "user123"}
        response = client.post("/api/ai/smart-recommend", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


# ─── Gap 6: SSE Event Stream ──────────────────────────────────────────────────

class TestSSEEventStream:
    """Tests for GET /api/ai/events/{user_id}"""

    def test_sse_endpoint_exists(self, client):
        """SSE endpoint should be registered in the app"""
        routes = [r.path for r in app.routes]
        assert "/api/ai/events/{user_id}" in routes

    def test_sse_clients_registry_exists(self):
        """The sse_clients dict should be importable from main"""
        from main import sse_clients
        assert isinstance(sse_clients, dict)


class TestCombinedBiometricRequestUserId:
    """Tests for user_id field on CombinedBiometricRequest"""

    def test_biometric_analyze_combined_accepts_user_id(self, client):
        """Should accept user_id in the biometric analysis request"""
        request_data = {
            "user_id": "user_abc",
            "voice_metrics": {
                "averagePitch": 150,
                "pitchVariation": 20,
                "speakingRate": 130,
                "volumeLevel": 0.6,
                "pauseFrequency": 3,
                "pauseDuration": 0.5,
                "fillerWordCount": 2,
                "speechClarity": 0.8,
            },
            "eye_metrics": None,
            "mouse_metrics": None,
            "conditions": ["adhd"],
        }
        response = client.post("/api/biometric/analyze-combined", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


# ─── ML Model Integration (learning_model.py) ─────────────────────────────────

class TestMLModelIntegration:
    """Tests for ML model loading and prediction methods"""

    def test_has_trained_models_property(self):
        from models.learning_model import AdaptiveLearningModel
        model = AdaptiveLearningModel(use_dynamic_config=False)
        # Without trained models on disk, should be False
        assert isinstance(model.has_trained_models, bool)

    def test_predict_optimal_content_type_heuristic(self):
        """Should return heuristic prediction when no ML models loaded"""
        from models.learning_model import AdaptiveLearningModel
        model = AdaptiveLearningModel(use_dynamic_config=False)
        result = model.predict_optimal_content_type(
            profile={"conditions": ["adhd"], "learning_style": "visual"},
            historical_performance=[0.7, 0.8, 0.75],
        )
        assert isinstance(result, str)
        assert result in ('visual', 'auditory', 'kinesthetic', 'reading', 'standard')

    def test_predict_difficulty_heuristic(self):
        """Should return heuristic difficulty prediction when no ML models loaded"""
        from models.learning_model import AdaptiveLearningModel
        model = AdaptiveLearningModel(use_dynamic_config=False)
        result = model.predict_difficulty(
            profile={"conditions": ["dyslexia"], "learning_style": "auditory"},
            current_difficulty=0.5,
            historical_performance=[0.7, 0.75],
        )
        assert isinstance(result, float)
        assert 0.1 <= result <= 1.0

    def test_build_feature_vector_length(self):
        """Feature vector should have exactly 15 elements"""
        from models.learning_model import AdaptiveLearningModel
        model = AdaptiveLearningModel(use_dynamic_config=False)
        vec = model._build_feature_vector(
            profile={"conditions": ["adhd"], "learning_style": "visual"},
            difficulty=0.5,
            performance=[0.8, 0.7, 0.9],
        )
        assert len(vec) == 15

    def test_build_feature_vector_one_hot_encoding(self):
        """Condition one-hot should be correct"""
        from models.learning_model import AdaptiveLearningModel
        model = AdaptiveLearningModel(use_dynamic_config=False)
        vec = model._build_feature_vector(
            profile={"conditions": ["adhd", "dyslexia"], "learning_style": "visual"},
            difficulty=0.5,
            performance=[0.7],
        )
        # ADHD at index 0, dyslexia at index 2 should be 1
        assert vec[0] == 1  # adhd
        assert vec[2] == 1  # dyslexia
        # visual at index 5 should be 1
        assert vec[5] == 1
