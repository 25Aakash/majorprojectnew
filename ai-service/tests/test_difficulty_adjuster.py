# test_difficulty_adjuster.py - Tests for DifficultyAdjuster
import pytest
import sys
import os

# Add the ai-service directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.difficulty_adjuster import DifficultyAdjuster


class TestDifficultyAdjuster:
    """Tests for DifficultyAdjuster class"""

    @pytest.fixture
    def adjuster(self):
        """Create an instance of DifficultyAdjuster"""
        return DifficultyAdjuster()

    def test_initialization(self, adjuster):
        """Should initialize with condition parameters"""
        assert adjuster.condition_parameters is not None
        assert isinstance(adjuster.condition_parameters, dict)

    def test_has_adhd_parameters(self, adjuster):
        """Should have ADHD-specific parameters"""
        assert "adhd" in adjuster.condition_parameters
        params = adjuster.condition_parameters["adhd"]
        assert "frustration_sensitivity" in params
        assert "success_boost" in params
        assert "target_accuracy" in params

    def test_has_dyslexia_parameters(self, adjuster):
        """Should have dyslexia-specific parameters"""
        assert "dyslexia" in adjuster.condition_parameters
        params = adjuster.condition_parameters["dyslexia"]
        assert "frustration_sensitivity" in params
        assert "min_difficulty" in params
        assert "max_difficulty" in params

    def test_has_default_parameters(self, adjuster):
        """Should have default parameters"""
        assert "default" in adjuster.condition_parameters


class TestCalculateOptimalDifficulty:
    """Tests for calculate_optimal_difficulty method"""

    @pytest.fixture
    def adjuster(self):
        return DifficultyAdjuster()

    def test_returns_dict_with_required_keys(self, adjuster):
        """Should return a dictionary with all required keys"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[75, 80, 85],
            avg_time=30.0,
            frustration=0,
            conditions=["adhd"]
        )
        
        assert isinstance(result, dict)
        assert "level" in result
        assert "reason" in result
        assert "recommendations" in result

    def test_increases_difficulty_on_high_scores(self, adjuster):
        """Should increase difficulty when scores are consistently high"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[95, 92, 90, 88],  # High scores
            avg_time=20.0,
            frustration=0,
            conditions=[]
        )
        
        # Should suggest higher difficulty
        assert result["level"] >= 5.0

    def test_decreases_difficulty_on_low_scores(self, adjuster):
        """Should decrease difficulty when scores are consistently low"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=7.0,
            recent_scores=[40, 45, 38, 42],  # Low scores
            avg_time=60.0,
            frustration=0,
            conditions=[]
        )
        
        # Should suggest lower difficulty
        assert result["level"] <= 7.0

    def test_considers_frustration_indicators(self, adjuster):
        """Should decrease difficulty when frustration is high"""
        result_no_frustration = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[70, 72, 75],
            avg_time=30.0,
            frustration=0,
            conditions=[]
        )
        
        result_high_frustration = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[70, 72, 75],
            avg_time=30.0,
            frustration=5,  # High frustration
            conditions=[]
        )
        
        # Higher frustration should result in lower difficulty
        assert result_high_frustration["level"] <= result_no_frustration["level"]

    def test_adhd_frustration_sensitivity(self, adjuster):
        """ADHD should have higher frustration sensitivity"""
        result_adhd = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[70, 72, 75],
            avg_time=30.0,
            frustration=3,
            conditions=["adhd"]
        )
        
        result_default = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[70, 72, 75],
            avg_time=30.0,
            frustration=3,
            conditions=[]
        )
        
        # ADHD should have higher sensitivity to frustration
        # This means difficulty should be reduced more for ADHD
        assert result_adhd["level"] <= result_default["level"]

    def test_handles_empty_scores(self, adjuster):
        """Should handle empty recent scores"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[],
            avg_time=30.0,
            frustration=0,
            conditions=["adhd"]
        )
        
        # Should still return valid result
        assert isinstance(result, dict)
        assert "level" in result

    def test_handles_multiple_conditions(self, adjuster):
        """Should combine parameters for multiple conditions"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[70, 75, 80],
            avg_time=30.0,
            frustration=2,
            conditions=["adhd", "dyslexia"]
        )
        
        assert isinstance(result, dict)
        assert "level" in result

    def test_provides_recommendations(self, adjuster):
        """Should provide recommendations in result"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[40, 45, 50],  # Low scores
            avg_time=60.0,
            frustration=5,  # High frustration
            conditions=["adhd"]
        )
        
        # Should include some recommendations
        assert "recommendations" in result
        assert isinstance(result["recommendations"], list)

    def test_provides_reason(self, adjuster):
        """Should provide reason for adjustment"""
        result = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[95, 92, 90],  # High scores
            avg_time=20.0,
            frustration=0,
            conditions=[]
        )
        
        assert "reason" in result
        assert len(result["reason"]) > 0

    def test_respects_min_max_difficulty(self, adjuster):
        """Should respect minimum and maximum difficulty bounds"""
        # Test minimum bound
        result_low = adjuster.calculate_optimal_difficulty(
            current_difficulty=1.0,
            recent_scores=[20, 25, 30],  # Very low scores
            avg_time=120.0,
            frustration=10,
            conditions=["adhd"]
        )
        
        # Should not go below minimum
        assert result_low["level"] >= 0

        # Test maximum bound
        result_high = adjuster.calculate_optimal_difficulty(
            current_difficulty=9.5,
            recent_scores=[100, 100, 100],  # Perfect scores
            avg_time=5.0,
            frustration=0,
            conditions=[]
        )
        
        # Should not exceed maximum (10)
        assert result_high["level"] <= 10

    def test_weights_recent_scores_more(self, adjuster):
        """More recent scores should be weighted more heavily"""
        # Old high scores, recent low scores
        result1 = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[90, 85, 50, 45],  # Declining performance
            avg_time=30.0,
            frustration=0,
            conditions=[]
        )
        
        # Old low scores, recent high scores
        result2 = adjuster.calculate_optimal_difficulty(
            current_difficulty=5.0,
            recent_scores=[45, 50, 85, 90],  # Improving performance
            avg_time=30.0,
            frustration=0,
            conditions=[]
        )
        
        # Improving performance should result in higher suggested difficulty
        assert result2["level"] >= result1["level"]


class TestGetCombinedParameters:
    """Tests for _get_combined_parameters method"""

    @pytest.fixture
    def adjuster(self):
        return DifficultyAdjuster()

    def test_returns_default_for_empty_conditions(self, adjuster):
        """Should return default parameters for empty conditions"""
        params = adjuster._get_combined_parameters([])
        
        assert params is not None
        assert "frustration_sensitivity" in params

    def test_returns_condition_params_for_single_condition(self, adjuster):
        """Should return condition-specific parameters"""
        params = adjuster._get_combined_parameters(["adhd"])
        
        # ADHD has higher frustration sensitivity than default
        default_params = adjuster.condition_parameters["default"]
        assert params["frustration_sensitivity"] >= default_params["frustration_sensitivity"]

    def test_combines_multiple_conditions(self, adjuster):
        """Should combine parameters for multiple conditions"""
        params = adjuster._get_combined_parameters(["adhd", "dyslexia"])
        
        # Should return combined/averaged parameters
        assert params is not None
        assert "frustration_sensitivity" in params
        assert "target_accuracy" in params


class TestReloadConfig:
    """Tests for configuration reload"""

    def test_reload_does_not_raise(self):
        """Reload should not raise errors"""
        adjuster = DifficultyAdjuster()
        # Should not raise even if backend is unavailable
        adjuster.reload_config()
        
        # Should still have parameters after reload
        assert adjuster.condition_parameters is not None
