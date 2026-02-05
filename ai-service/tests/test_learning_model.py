# test_learning_model.py - Tests for AdaptiveLearningModel
import pytest
import sys
import os

# Add the ai-service directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.learning_model import AdaptiveLearningModel


class TestAdaptiveLearningModel:
    """Tests for AdaptiveLearningModel class"""

    @pytest.fixture
    def model(self):
        """Create an instance of AdaptiveLearningModel"""
        return AdaptiveLearningModel(use_dynamic_config=False)

    def test_initialization(self, model):
        """Should initialize with default configurations"""
        assert model.condition_adaptations is not None
        assert "adhd" in model.condition_adaptations
        assert "autism" in model.condition_adaptations
        assert "dyslexia" in model.condition_adaptations

    def test_condition_adaptations_have_required_keys(self, model):
        """Each condition should have all required adaptation keys"""
        required_keys = [
            "chunk_size", "break_reminders", "gamification",
            "visual_aids", "audio", "colors", "font"
        ]
        
        for condition, adaptation in model.condition_adaptations.items():
            for key in required_keys:
                assert key in adaptation, f"{condition} missing {key}"


class TestGetContentAdaptation:
    """Tests for get_content_adaptation method"""

    @pytest.fixture
    def model(self):
        return AdaptiveLearningModel(use_dynamic_config=False)

    def test_returns_adaptation_dict(self, model):
        """Should return a dictionary with all adaptation keys"""
        result = model.get_content_adaptation(
            conditions=["adhd"],
            preferences={"visualSensitivity": "medium"},
            learning_style="visual",
            recent_performance=[75, 80, 85]
        )
        
        assert isinstance(result, dict)
        assert "variant" in result
        assert "font" in result
        assert "colors" in result
        assert "audio" in result
        assert "visual_aids" in result
        assert "chunk_size" in result
        assert "break_reminders" in result
        assert "gamification" in result

    def test_adhd_adaptations(self, model):
        """Should apply ADHD-specific adaptations"""
        result = model.get_content_adaptation(
            conditions=["adhd"],
            preferences={},
            learning_style="visual",
            recent_performance=[]
        )
        
        # ADHD should get small chunks and high gamification
        assert result["chunk_size"] == "small"
        assert result["gamification"] == "high"
        assert result["break_reminders"] is True

    def test_dyslexia_adaptations(self, model):
        """Should apply dyslexia-specific adaptations"""
        result = model.get_content_adaptation(
            conditions=["dyslexia"],
            preferences={},
            learning_style="auditory",
            recent_performance=[]
        )
        
        # Dyslexia should get OpenDyslexic font and audio enabled
        assert result["font"] == "OpenDyslexic"
        assert result["audio"] is True
        assert result["colors"] == "dyslexia_friendly"

    def test_autism_adaptations(self, model):
        """Should apply autism-specific adaptations"""
        result = model.get_content_adaptation(
            conditions=["autism"],
            preferences={},
            learning_style="visual",
            recent_performance=[]
        )
        
        # Autism should get muted colors and no audio by default
        assert result["colors"] == "muted"
        assert result["audio"] is False

    def test_multiple_conditions(self, model):
        """Should combine adaptations for multiple conditions"""
        result = model.get_content_adaptation(
            conditions=["adhd", "dyslexia"],
            preferences={},
            learning_style="visual",
            recent_performance=[]
        )
        
        # Should have smallest chunk size
        assert result["chunk_size"] == "small"
        # ADHD high gamification should take priority
        assert result["gamification"] == "high"

    def test_learning_style_affects_variant(self, model):
        """Learning style should affect content variant"""
        visual_result = model.get_content_adaptation(
            conditions=[],
            preferences={},
            learning_style="visual",
            recent_performance=[]
        )
        
        auditory_result = model.get_content_adaptation(
            conditions=[],
            preferences={},
            learning_style="auditory",
            recent_performance=[]
        )
        
        kinesthetic_result = model.get_content_adaptation(
            conditions=[],
            preferences={},
            learning_style="kinesthetic",
            recent_performance=[]
        )
        
        # Learning styles should result in different variants
        assert visual_result["variant"] == "visual"
        assert auditory_result["variant"] == "audioEnhanced"
        assert kinesthetic_result["variant"] == "interactive"

    def test_empty_conditions(self, model):
        """Should return default adaptations for empty conditions"""
        result = model.get_content_adaptation(
            conditions=[],
            preferences={},
            learning_style="reading",
            recent_performance=[]
        )
        
        assert result["variant"] == "standard"
        assert result["font"] == "sans-serif"
        assert result["chunk_size"] == "medium"

    def test_unknown_condition_ignored(self, model):
        """Should ignore unknown conditions gracefully"""
        result = model.get_content_adaptation(
            conditions=["unknown_condition", "adhd"],
            preferences={},
            learning_style="visual",
            recent_performance=[]
        )
        
        # Should still apply ADHD adaptations
        assert result["chunk_size"] == "small"
        assert result["gamification"] == "high"


class TestCalmingActivities:
    """Tests for calming activities functionality"""

    @pytest.fixture
    def model(self):
        return AdaptiveLearningModel(use_dynamic_config=False)

    def test_has_calming_activities(self, model):
        """Should have calming activities defined"""
        assert model.calming_activities is not None
        assert isinstance(model.calming_activities, dict)

    def test_calming_activities_for_frustrated(self, model):
        """Should have activities for frustrated state"""
        assert "frustrated" in model.calming_activities
        assert len(model.calming_activities["frustrated"]) > 0

    def test_calming_activities_for_anxious(self, model):
        """Should have activities for anxious state"""
        assert "anxious" in model.calming_activities
        assert len(model.calming_activities["anxious"]) > 0

    def test_calming_activities_for_disengaged(self, model):
        """Should have activities for disengaged state"""
        assert "disengaged" in model.calming_activities
        assert len(model.calming_activities["disengaged"]) > 0

    def test_calming_activities_for_focused(self, model):
        """Should have activities for focused state"""
        assert "focused" in model.calming_activities
        assert len(model.calming_activities["focused"]) > 0


class TestLearningStyleVariants:
    """Tests for learning style variant mappings"""

    @pytest.fixture
    def model(self):
        return AdaptiveLearningModel(use_dynamic_config=False)

    def test_has_learning_style_variants(self, model):
        """Should have learning style variants defined"""
        assert model.learning_style_variants is not None
        assert isinstance(model.learning_style_variants, dict)

    def test_visual_style_mapped(self, model):
        """Visual learning style should be mapped"""
        assert "visual" in model.learning_style_variants
        assert model.learning_style_variants["visual"] == "visual"

    def test_auditory_style_mapped(self, model):
        """Auditory learning style should be mapped"""
        assert "auditory" in model.learning_style_variants
        assert model.learning_style_variants["auditory"] == "audioEnhanced"

    def test_kinesthetic_style_mapped(self, model):
        """Kinesthetic learning style should be mapped"""
        assert "kinesthetic" in model.learning_style_variants
        assert model.learning_style_variants["kinesthetic"] == "interactive"

    def test_reading_style_mapped(self, model):
        """Reading learning style should be mapped"""
        assert "reading" in model.learning_style_variants
        assert model.learning_style_variants["reading"] == "standard"


class TestReloadConfig:
    """Tests for configuration reload functionality"""

    def test_reload_config_without_dynamic(self):
        """Should not raise error when reloading without dynamic config"""
        model = AdaptiveLearningModel(use_dynamic_config=False)
        # Should not raise
        model.reload_config()
