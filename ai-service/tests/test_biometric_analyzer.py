# test_biometric_analyzer.py - Tests for BiometricAnalyzer
import pytest
import sys
import os

# Add the ai-service directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.biometric_analyzer import (
    BiometricAnalyzer,
    EmotionalState,
    VoiceAnalysisResult,
    EyeTrackingResult,
    MouseTrackingResult,
    BiometricProfile
)


class TestBiometricAnalyzer:
    """Tests for BiometricAnalyzer class"""

    @pytest.fixture
    def analyzer(self):
        """Create an instance of BiometricAnalyzer"""
        return BiometricAnalyzer()

    def test_initialization(self, analyzer):
        """Should initialize with thresholds"""
        assert analyzer.adhd_thresholds is not None
        assert analyzer.dyslexia_thresholds is not None
        assert analyzer.anxiety_thresholds is not None

    def test_has_adhd_thresholds(self, analyzer):
        """Should have ADHD-specific thresholds"""
        thresholds = analyzer.adhd_thresholds
        assert "attention_drop_threshold" in thresholds
        assert "rapid_gaze_shift_threshold" in thresholds
        assert "hyperactive_mouse_threshold" in thresholds

    def test_has_dyslexia_thresholds(self, analyzer):
        """Should have dyslexia-specific thresholds"""
        thresholds = analyzer.dyslexia_thresholds
        assert "regression_threshold" in thresholds
        assert "reading_pace_variance" in thresholds
        assert "hesitation_threshold" in thresholds


class TestAnalyzeVoice:
    """Tests for analyze_voice method"""

    @pytest.fixture
    def analyzer(self):
        return BiometricAnalyzer()

    @pytest.fixture
    def normal_voice_metrics(self):
        """Voice metrics for normal speaking pattern"""
        return {
            "averagePace": 130,
            "paceVariability": 0.15,
            "pauseFrequency": 2,
            "averagePauseDuration": 400,
            "fillerWordCount": 1,
            "volumeLevel": 55,
            "volumeVariability": 0.15,
            "pitchVariability": 0.25,
            "speechClarity": 80,
        }

    @pytest.fixture
    def stressed_voice_metrics(self):
        """Voice metrics indicating stress"""
        return {
            "averagePace": 180,  # Speaking too fast
            "paceVariability": 0.4,  # Highly variable
            "pauseFrequency": 5,
            "averagePauseDuration": 800,
            "fillerWordCount": 8,  # Many filler words
            "volumeLevel": 35,  # Quiet
            "volumeVariability": 0.5,
            "pitchVariability": 0.6,
            "speechClarity": 50,
        }

    @pytest.fixture
    def hesitant_voice_metrics(self):
        """Voice metrics indicating hesitation"""
        return {
            "averagePace": 80,  # Speaking slowly
            "paceVariability": 0.3,
            "pauseFrequency": 8,  # Many pauses
            "averagePauseDuration": 1200,  # Long pauses
            "fillerWordCount": 12,
            "volumeLevel": 40,
            "volumeVariability": 0.3,
            "pitchVariability": 0.2,
            "speechClarity": 60,
            "hesitationPatterns": 50,  # High hesitation
            "selfCorrections": 10,  # Frequent self-corrections
        }

    def test_analyze_voice_returns_result(self, analyzer, normal_voice_metrics):
        """Should return VoiceAnalysisResult"""
        result = analyzer.analyze_voice(normal_voice_metrics)
        
        assert isinstance(result, VoiceAnalysisResult)
        assert hasattr(result, "speaking_pace")
        assert hasattr(result, "confidence_level")
        assert hasattr(result, "stress_level")
        assert hasattr(result, "hesitation_score")
        assert hasattr(result, "reading_fluency")
        assert hasattr(result, "emotional_state")

    def test_speaking_pace_categorization(self, analyzer):
        """Should categorize speaking pace correctly"""
        slow_metrics = {"averagePace": 80}
        normal_metrics = {"averagePace": 130}
        fast_metrics = {"averagePace": 200}
        
        slow_result = analyzer.analyze_voice(slow_metrics)
        normal_result = analyzer.analyze_voice(normal_metrics)
        fast_result = analyzer.analyze_voice(fast_metrics)
        
        assert slow_result.speaking_pace == "slow"
        assert normal_result.speaking_pace == "normal"
        assert fast_result.speaking_pace == "fast"

    def test_confidence_level_calculation(self, analyzer, normal_voice_metrics, stressed_voice_metrics):
        """Should calculate confidence levels"""
        normal_result = analyzer.analyze_voice(normal_voice_metrics)
        stressed_result = analyzer.analyze_voice(stressed_voice_metrics)
        
        # Normal voice should have higher confidence
        assert normal_result.confidence_level >= stressed_result.confidence_level

    def test_stress_level_detection(self, analyzer, normal_voice_metrics, stressed_voice_metrics):
        """Should detect stress levels"""
        normal_result = analyzer.analyze_voice(normal_voice_metrics)
        stressed_result = analyzer.analyze_voice(stressed_voice_metrics)
        
        # Stressed voice should have higher stress level
        assert stressed_result.stress_level >= normal_result.stress_level

    def test_hesitation_detection(self, analyzer, hesitant_voice_metrics):
        """Should detect hesitation"""
        result = analyzer.analyze_voice(hesitant_voice_metrics)
        
        # High hesitation score expected
        assert result.hesitation_score >= 50

    def test_emotional_state_detection(self, analyzer, normal_voice_metrics, stressed_voice_metrics):
        """Should detect emotional state"""
        normal_result = analyzer.analyze_voice(normal_voice_metrics)
        stressed_result = analyzer.analyze_voice(stressed_voice_metrics)
        
        assert isinstance(normal_result.emotional_state, EmotionalState)
        assert isinstance(stressed_result.emotional_state, EmotionalState)

    def test_provides_recommendations(self, analyzer, stressed_voice_metrics):
        """Should provide recommendations for stressed voice"""
        result = analyzer.analyze_voice(stressed_voice_metrics)
        
        assert hasattr(result, "recommendations")
        assert isinstance(result.recommendations, list)

    def test_handles_empty_metrics(self, analyzer):
        """Should handle empty metrics with defaults"""
        result = analyzer.analyze_voice({})
        
        assert isinstance(result, VoiceAnalysisResult)
        assert result.confidence_level >= 0
        assert result.stress_level >= 0

    def test_adhd_indicator_analysis(self, analyzer, normal_voice_metrics):
        """Should analyze ADHD indicators when condition provided"""
        result = analyzer.analyze_voice(normal_voice_metrics, conditions=["adhd"])
        
        assert hasattr(result, "adhd_indicators")
        assert isinstance(result.adhd_indicators, dict)

    def test_dyslexia_indicator_analysis(self, analyzer, hesitant_voice_metrics):
        """Should analyze dyslexia indicators"""
        result = analyzer.analyze_voice(hesitant_voice_metrics, conditions=["dyslexia"])
        
        assert hasattr(result, "dyslexia_indicators")
        assert isinstance(result.dyslexia_indicators, dict)


class TestAnalyzeEyeTracking:
    """Tests for analyze_eye_tracking method"""

    @pytest.fixture
    def analyzer(self):
        return BiometricAnalyzer()

    @pytest.fixture
    def good_focus_data(self):
        """Eye tracking data with good focus"""
        return {
            "gazePoints": [
                {"x": 500, "y": 300, "timestamp": 0},
                {"x": 510, "y": 305, "timestamp": 100},
                {"x": 520, "y": 310, "timestamp": 200},
            ],
            "fixationCount": 30,
            "averageFixationDuration": 250,
            "saccadeCount": 25,
            "regressionCount": 2,
            "blinkRate": 15,
            "pupilDilation": 0,
            "contentAreas": [
                {"area": "main_content", "timeSpent": 4500, "fixations": 25},
                {"area": "sidebar", "timeSpent": 500, "fixations": 5},
            ],
        }

    @pytest.fixture
    def distracted_data(self):
        """Eye tracking data showing distraction"""
        return {
            "gazePoints": [
                {"x": 100, "y": 100, "timestamp": 0},
                {"x": 800, "y": 600, "timestamp": 100},
                {"x": 200, "y": 300, "timestamp": 200},
            ],
            "fixationCount": 50,
            "averageFixationDuration": 100,  # Short fixations
            "saccadeCount": 80,  # Many saccades
            "regressionCount": 15,
            "blinkRate": 25,  # High blink rate
            "pupilDilation": 30,
            "contentAreas": [
                {"area": "main_content", "timeSpent": 1000, "fixations": 10},
                {"area": "navigation", "timeSpent": 2000, "fixations": 30},
                {"area": "ads", "timeSpent": 2000, "fixations": 20},
            ],
        }

    def test_analyze_returns_result(self, analyzer, good_focus_data):
        """Should return EyeTrackingResult"""
        result = analyzer.analyze_eye_tracking(good_focus_data)
        
        assert isinstance(result, EyeTrackingResult)
        assert hasattr(result, "attention_score")
        assert hasattr(result, "focus_quality")
        assert hasattr(result, "reading_pattern")
        assert hasattr(result, "distraction_level")

    def test_attention_score_calculation(self, analyzer, good_focus_data, distracted_data):
        """Should calculate attention scores"""
        good_result = analyzer.analyze_eye_tracking(good_focus_data)
        distracted_result = analyzer.analyze_eye_tracking(distracted_data)
        
        # Good focus should have higher attention score
        assert good_result.attention_score > distracted_result.attention_score

    def test_focus_quality_categorization(self, analyzer, good_focus_data):
        """Should categorize focus quality"""
        result = analyzer.analyze_eye_tracking(good_focus_data)
        
        assert result.focus_quality in ["poor", "moderate", "good", "excellent"]

    def test_distraction_level_detection(self, analyzer, distracted_data):
        """Should detect distraction"""
        result = analyzer.analyze_eye_tracking(distracted_data)
        
        # Distracted data should have high distraction level
        assert result.distraction_level >= 50

    def test_content_engagement_calculation(self, analyzer, good_focus_data):
        """Should calculate engagement per content area"""
        result = analyzer.analyze_eye_tracking(good_focus_data)
        
        assert hasattr(result, "content_engagement")
        assert isinstance(result.content_engagement, dict)

    def test_fatigue_detection(self, analyzer):
        """Should detect fatigue indicators"""
        fatigued_data = {
            "gazePoints": [],
            "fixationCount": 10,
            "averageFixationDuration": 400,  # Long fixations
            "saccadeCount": 5,  # Few saccades
            "regressionCount": 10,
            "blinkRate": 30,  # High blink rate indicates fatigue
            "pupilDilation": -10,  # Constricted pupils
            "contentAreas": [],
        }
        
        result = analyzer.analyze_eye_tracking(fatigued_data)
        
        assert result.fatigue_indicators >= 0

    def test_handles_empty_data(self, analyzer):
        """Should handle empty data"""
        result = analyzer.analyze_eye_tracking({})
        
        assert isinstance(result, EyeTrackingResult)

    def test_adhd_pattern_detection(self, analyzer, distracted_data):
        """Should detect ADHD patterns when condition provided"""
        result = analyzer.analyze_eye_tracking(distracted_data, conditions=["adhd"])
        
        assert hasattr(result, "adhd_attention_pattern")

    def test_dyslexia_pattern_detection(self, analyzer, good_focus_data):
        """Should detect dyslexia patterns when condition provided"""
        result = analyzer.analyze_eye_tracking(good_focus_data, conditions=["dyslexia"])
        
        assert hasattr(result, "dyslexia_reading_pattern")


class TestAnalyzeMouseTracking:
    """Tests for analyze_mouse_tracking method"""

    @pytest.fixture
    def analyzer(self):
        return BiometricAnalyzer()

    @pytest.fixture
    def confident_mouse_data(self):
        """Mouse data showing confident navigation"""
        return {
            "movements": [
                {"x": 100, "y": 100, "timestamp": 0},
                {"x": 200, "y": 150, "timestamp": 100},
                {"x": 300, "y": 200, "timestamp": 200},
            ],
            "clicks": [
                {"x": 300, "y": 200, "timestamp": 200, "type": "left"},
            ],
            "scrollEvents": [
                {"direction": "down", "amount": 100, "timestamp": 300},
            ],
            "totalDistance": 300,
            "averageSpeed": 1.5,
            "hesitationCount": 1,
            "backtrackCount": 0,
            "erraticMovementCount": 0,
            "pathStraightness": 0.9,
            "missClickCount": 0,
            "directionChanges": 5,
        }

    @pytest.fixture
    def frustrated_mouse_data(self):
        """Mouse data showing frustration"""
        return {
            "movements": [
                {"x": 100, "y": 100, "timestamp": 0},
                {"x": 150, "y": 120, "timestamp": 50},
                {"x": 100, "y": 100, "timestamp": 100},  # Back
                {"x": 300, "y": 400, "timestamp": 150},
                {"x": 50, "y": 50, "timestamp": 200},  # Erratic
            ],
            "clicks": [
                {"x": 100, "y": 100, "timestamp": 100, "type": "left"},
                {"x": 100, "y": 100, "timestamp": 150, "type": "left"},  # Multiple clicks
                {"x": 100, "y": 100, "timestamp": 200, "type": "left"},
            ],
            "scrollEvents": [
                {"direction": "down", "amount": 500, "timestamp": 100},
                {"direction": "up", "amount": 400, "timestamp": 200},  # Scrolling back
            ],
            "totalDistance": 1500,
            "averageSpeed": 5.0,  # High speed
            "hesitationCount": 8,
            "backtrackCount": 5,
            "erraticMovementCount": 10,
            "pathStraightness": 0.2,
            "missClickCount": 5,
            "directionChanges": 200,
        }

    def test_analyze_returns_result(self, analyzer, confident_mouse_data):
        """Should return MouseTrackingResult"""
        result = analyzer.analyze_mouse_tracking(confident_mouse_data)
        
        assert isinstance(result, MouseTrackingResult)
        assert hasattr(result, "frustration_score")
        assert hasattr(result, "engagement_score")
        assert hasattr(result, "navigation_confidence")
        assert hasattr(result, "hesitation_level")

    def test_frustration_detection(self, analyzer, confident_mouse_data, frustrated_mouse_data):
        """Should detect frustration"""
        confident_result = analyzer.analyze_mouse_tracking(confident_mouse_data)
        frustrated_result = analyzer.analyze_mouse_tracking(frustrated_mouse_data)
        
        assert frustrated_result.frustration_score > confident_result.frustration_score

    def test_navigation_confidence(self, analyzer, confident_mouse_data, frustrated_mouse_data):
        """Should calculate navigation confidence"""
        confident_result = analyzer.analyze_mouse_tracking(confident_mouse_data)
        frustrated_result = analyzer.analyze_mouse_tracking(frustrated_mouse_data)
        
        assert confident_result.navigation_confidence > frustrated_result.navigation_confidence

    def test_interaction_pattern_categorization(self, analyzer, confident_mouse_data):
        """Should categorize interaction pattern"""
        result = analyzer.analyze_mouse_tracking(confident_mouse_data)
        
        assert result.interaction_pattern in ["efficient", "exploratory", "hesitant", "frustrated"]

    def test_erratic_behavior_detection(self, analyzer, frustrated_mouse_data):
        """Should detect erratic behavior"""
        result = analyzer.analyze_mouse_tracking(frustrated_mouse_data)
        
        assert result.erratic_behavior_score >= 50

    def test_handles_empty_data(self, analyzer):
        """Should handle empty data"""
        result = analyzer.analyze_mouse_tracking({})
        
        assert isinstance(result, MouseTrackingResult)


class TestBuildProfile:
    """Tests for build_biometric_profile method"""

    @pytest.fixture
    def analyzer(self):
        return BiometricAnalyzer()

    @pytest.fixture
    def sample_biometric_data(self):
        """Complete biometric data for profile building"""
        return {
            "userId": "user123",
            "sessions": [
                {
                    "voice": {
                        "averagePace": 130,
                        "speechClarity": 80,
                    },
                    "eye": {
                        "fixationCount": 30,
                        "averageFixationDuration": 250,
                    },
                    "mouse": {
                        "hesitationCount": 2,
                        "backtrackCount": 1,
                    },
                },
            ],
            "conditions": ["adhd"],
        }

    def test_build_profile_returns_result(self, analyzer, sample_biometric_data):
        """Should return BiometricProfile"""
        result = analyzer.build_biometric_profile(
            sample_biometric_data["sessions"],
            sample_biometric_data["conditions"]
        )
        
        assert isinstance(result, BiometricProfile)

    def test_profile_has_aggregated_scores(self, analyzer, sample_biometric_data):
        """Profile should have aggregated scores"""
        result = analyzer.build_biometric_profile(
            sample_biometric_data["sessions"],
            sample_biometric_data["conditions"]
        )
        
        assert hasattr(result, "overall_attention")
        assert hasattr(result, "overall_engagement")
        assert hasattr(result, "overall_stress")
        assert hasattr(result, "overall_confidence")

    def test_profile_has_learning_style_scores(self, analyzer, sample_biometric_data):
        """Profile should have learning style indicators"""
        result = analyzer.build_biometric_profile(
            sample_biometric_data["sessions"],
            sample_biometric_data["conditions"]
        )
        
        assert hasattr(result, "visual_learner_score")
        assert hasattr(result, "auditory_learner_score")
        assert hasattr(result, "kinesthetic_learner_score")

    def test_profile_has_adaptations(self, analyzer, sample_biometric_data):
        """Profile should have recommended adaptations"""
        result = analyzer.build_biometric_profile(
            sample_biometric_data["sessions"],
            sample_biometric_data["conditions"]
        )
        
        assert hasattr(result, "recommended_adaptations")
        assert isinstance(result.recommended_adaptations, list)

    def test_profile_confidence_calculation(self, analyzer, sample_biometric_data):
        """Profile should have confidence score"""
        result = analyzer.build_biometric_profile(
            sample_biometric_data["sessions"],
            sample_biometric_data["conditions"]
        )
        
        assert hasattr(result, "profile_confidence")
        assert 0 <= result.profile_confidence <= 100


class TestDataclasses:
    """Tests for dataclass structures"""

    def test_voice_analysis_result_creation(self):
        """VoiceAnalysisResult should be properly created"""
        result = VoiceAnalysisResult(
            speaking_pace="normal",
            confidence_level=75.0,
            stress_level=25.0,
            hesitation_score=15.0,
            reading_fluency=80.0,
            emotional_state=EmotionalState.CONFIDENT
        )
        
        assert result.speaking_pace == "normal"
        assert result.confidence_level == 75.0
        assert len(result.recommendations) == 0

    def test_eye_tracking_result_creation(self):
        """EyeTrackingResult should be properly created"""
        result = EyeTrackingResult(
            attention_score=85.0,
            focus_quality="good",
            reading_pattern="normal",
            distraction_level=15.0,
            content_engagement={"main": 80.0},
            fatigue_indicators=10.0
        )
        
        assert result.attention_score == 85.0
        assert result.focus_quality == "good"

    def test_mouse_tracking_result_creation(self):
        """MouseTrackingResult should be properly created"""
        result = MouseTrackingResult(
            frustration_score=20.0,
            engagement_score=80.0,
            navigation_confidence=85.0,
            hesitation_level=10.0,
            erratic_behavior_score=5.0,
            interaction_pattern="efficient"
        )
        
        assert result.frustration_score == 20.0
        assert result.interaction_pattern == "efficient"

    def test_emotional_state_enum(self):
        """EmotionalState enum should have all states"""
        assert EmotionalState.NEUTRAL.value == "neutral"
        assert EmotionalState.STRESSED.value == "stressed"
        assert EmotionalState.CONFIDENT.value == "confident"
        assert EmotionalState.FRUSTRATED.value == "frustrated"
        assert EmotionalState.ENGAGED.value == "engaged"
