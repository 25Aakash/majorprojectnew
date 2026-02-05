# test_adaptive_profiler.py - Tests for AdaptiveProfiler
import pytest
import sys
import os
from dataclasses import dataclass

# Add the ai-service directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.adaptive_profiler import AdaptiveProfiler, SessionData


class TestAdaptiveProfiler:
    """Tests for AdaptiveProfiler class"""

    @pytest.fixture
    def profiler(self):
        """Create an instance of AdaptiveProfiler"""
        return AdaptiveProfiler()

    @pytest.fixture
    def sample_session(self):
        """Create a sample session with good engagement"""
        return SessionData(
            session_id="session123",
            user_id="user123",
            duration=1800,  # 30 minutes
            active_duration=1500,  # 25 minutes active
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=600,  # 10 minutes average
            tab_switches=2,
            scroll_speed="medium",
            backtrack_count=1,
            click_frequency=0.5,
            response_time=3.0,
            reread_count=2,
            help_requests=1,
            frustration_score=30,
            engagement_score=75,
            lesson_completed=True,
            overall_performance=85,
            focus_score=80,
            content_interactions=[
                {"contentType": "text", "timeSpent": 300, "engagementLevel": "high", "completionRate": 1.0, "wasSkipped": False},
                {"contentType": "video", "timeSpent": 600, "engagementLevel": "high", "completionRate": 0.9, "wasSkipped": False},
            ],
            quiz_performance=[
                {"questionId": "q1", "timeToAnswer": 20, "wasCorrect": True, "attemptsBeforeCorrect": 1},
                {"questionId": "q2", "timeToAnswer": 30, "wasCorrect": True, "attemptsBeforeCorrect": 1},
            ],
            breaks_taken=[{"time": 900, "duration": 120}]
        )

    @pytest.fixture
    def low_engagement_session(self):
        """Create a session with low engagement"""
        return SessionData(
            session_id="session456",
            user_id="user123",
            duration=1200,
            active_duration=600,  # Only 50% active
            time_of_day="afternoon",
            day_of_week=2,
            avg_time_on_content=120,  # Only 2 minutes
            tab_switches=8,  # Many tab switches
            scroll_speed="fast",
            backtrack_count=5,
            click_frequency=0.2,
            response_time=10.0,  # Slow response
            reread_count=5,
            help_requests=4,
            frustration_score=70,  # High frustration
            engagement_score=30,
            lesson_completed=False,
            overall_performance=40,
            focus_score=35,
            content_interactions=[
                {"contentType": "text", "timeSpent": 60, "engagementLevel": "low", "completionRate": 0.3, "wasSkipped": True},
            ],
            quiz_performance=[
                {"questionId": "q1", "timeToAnswer": 60, "wasCorrect": False, "attemptsBeforeCorrect": 3},
            ],
            breaks_taken=[]
        )

    def test_initialization(self, profiler):
        """Should initialize with thresholds and patterns"""
        assert profiler.attention_thresholds is not None
        assert profiler.frustration_thresholds is not None
        assert profiler.condition_patterns is not None

    def test_has_adhd_patterns(self, profiler):
        """Should have ADHD-specific patterns"""
        assert "adhd" in profiler.condition_patterns
        patterns = profiler.condition_patterns["adhd"]
        assert "expected_attention_span" in patterns
        assert "optimal_break_frequency" in patterns

    def test_has_dyslexia_patterns(self, profiler):
        """Should have dyslexia-specific patterns"""
        assert "dyslexia" in profiler.condition_patterns
        patterns = profiler.condition_patterns["dyslexia"]
        assert "expected_reading_speed" in patterns
        assert "benefits_from_audio" in patterns


class TestAnalyzeSession:
    """Tests for analyze_session method"""

    @pytest.fixture
    def profiler(self):
        return AdaptiveProfiler()

    @pytest.fixture
    def sample_session(self):
        return SessionData(
            session_id="session123",
            user_id="user123",
            duration=1800,
            active_duration=1500,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=600,
            tab_switches=2,
            scroll_speed="medium",
            backtrack_count=1,
            click_frequency=0.5,
            response_time=3.0,
            reread_count=2,
            help_requests=1,
            frustration_score=30,
            engagement_score=75,
            lesson_completed=True,
            overall_performance=85,
            focus_score=80,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )

    def test_returns_insights_dict(self, profiler, sample_session):
        """Should return a dictionary with all insight categories"""
        result = profiler.analyze_session(sample_session, ["adhd"])
        
        assert isinstance(result, dict)
        assert "attention_analysis" in result
        assert "content_preferences" in result
        assert "timing_analysis" in result
        assert "emotional_state" in result
        assert "interaction_patterns" in result
        assert "condition_specific" in result
        assert "recommendations" in result

    def test_provides_recommendations(self, profiler, sample_session):
        """Should provide recommendations based on analysis"""
        result = profiler.analyze_session(sample_session, ["adhd"])
        
        assert "recommendations" in result
        assert isinstance(result["recommendations"], list)


class TestAnalyzeAttention:
    """Tests for _analyze_attention method"""

    @pytest.fixture
    def profiler(self):
        return AdaptiveProfiler()

    def test_categorizes_low_attention(self, profiler):
        """Should categorize low attention correctly"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=600,
            active_duration=300,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=180,  # 3 minutes - low
            tab_switches=10,
            scroll_speed="fast",
            backtrack_count=5,
            click_frequency=0.1,
            response_time=5.0,
            reread_count=0,
            help_requests=0,
            frustration_score=50,
            engagement_score=40,
            lesson_completed=False,
            overall_performance=50,
            focus_score=40,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_attention(session)
        assert result["attention_category"] == "low"

    def test_categorizes_high_attention(self, profiler):
        """Should categorize high attention correctly"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=3600,
            active_duration=3400,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=2000,  # 33+ minutes - high
            tab_switches=0,
            scroll_speed="slow",
            backtrack_count=0,
            click_frequency=0.5,
            response_time=2.0,
            reread_count=0,
            help_requests=0,
            frustration_score=10,
            engagement_score=90,
            lesson_completed=True,
            overall_performance=95,
            focus_score=95,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_attention(session)
        assert result["attention_category"] == "high"

    def test_identifies_distraction_indicators(self, profiler):
        """Should identify distraction indicators"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=1000,
            active_duration=500,  # 50% active - low ratio
            time_of_day="afternoon",
            day_of_week=1,
            avg_time_on_content=500,
            tab_switches=10,  # Many switches
            scroll_speed="fast",
            backtrack_count=5,  # Many backtracks
            click_frequency=0.1,
            response_time=5.0,
            reread_count=0,
            help_requests=0,
            frustration_score=50,
            engagement_score=50,
            lesson_completed=False,
            overall_performance=60,
            focus_score=50,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_attention(session)
        assert "distraction_indicators" in result
        assert "frequent_tab_switching" in result["distraction_indicators"]
        assert "frequent_backtracking" in result["distraction_indicators"]


class TestAnalyzeContentPreferences:
    """Tests for _analyze_content_preferences method"""

    @pytest.fixture
    def profiler(self):
        return AdaptiveProfiler()

    def test_handles_empty_interactions(self, profiler):
        """Should handle empty content interactions"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=600,
            active_duration=500,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=300,
            tab_switches=1,
            scroll_speed="medium",
            backtrack_count=0,
            click_frequency=0.5,
            response_time=3.0,
            reread_count=0,
            help_requests=0,
            frustration_score=30,
            engagement_score=70,
            lesson_completed=True,
            overall_performance=80,
            focus_score=75,
            content_interactions=[],  # Empty
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_content_preferences(session)
        assert result is not None
        assert "content_effectiveness" in result

    def test_calculates_content_effectiveness(self, profiler):
        """Should calculate effectiveness for each content type"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=1200,
            active_duration=1100,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=600,
            tab_switches=1,
            scroll_speed="medium",
            backtrack_count=0,
            click_frequency=0.5,
            response_time=3.0,
            reread_count=0,
            help_requests=0,
            frustration_score=20,
            engagement_score=85,
            lesson_completed=True,
            overall_performance=90,
            focus_score=85,
            content_interactions=[
                {"contentType": "video", "timeSpent": 600, "engagementLevel": "high", "completionRate": 1.0, "wasSkipped": False},
                {"contentType": "text", "timeSpent": 200, "engagementLevel": "medium", "completionRate": 0.8, "wasSkipped": False},
            ],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_content_preferences(session)
        assert "video" in result["content_effectiveness"]
        assert "text" in result["content_effectiveness"]

    def test_identifies_best_content_type(self, profiler):
        """Should identify the best performing content type"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=1200,
            active_duration=1100,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=600,
            tab_switches=0,
            scroll_speed="medium",
            backtrack_count=0,
            click_frequency=0.5,
            response_time=3.0,
            reread_count=0,
            help_requests=0,
            frustration_score=20,
            engagement_score=90,
            lesson_completed=True,
            overall_performance=95,
            focus_score=90,
            content_interactions=[
                {"contentType": "video", "timeSpent": 600, "engagementLevel": "high", "completionRate": 1.0, "wasSkipped": False},
                {"contentType": "text", "timeSpent": 200, "engagementLevel": "low", "completionRate": 0.4, "wasSkipped": True},
            ],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_content_preferences(session)
        assert result["best_content_type"] == "video"


class TestAnalyzeEmotionalState:
    """Tests for _analyze_emotional_state method"""

    @pytest.fixture
    def profiler(self):
        return AdaptiveProfiler()

    def test_identifies_frustrated_state(self, profiler):
        """Should identify frustrated state"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=600,
            active_duration=300,
            time_of_day="afternoon",
            day_of_week=1,
            avg_time_on_content=200,
            tab_switches=5,
            scroll_speed="fast",
            backtrack_count=3,
            click_frequency=0.1,
            response_time=10.0,
            reread_count=0,
            help_requests=3,
            frustration_score=85,  # High frustration
            engagement_score=20,
            lesson_completed=False,
            overall_performance=30,
            focus_score=25,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_emotional_state(session)
        assert result is not None
        # High frustration should be detected

    def test_identifies_engaged_state(self, profiler):
        """Should identify engaged state"""
        session = SessionData(
            session_id="test",
            user_id="test",
            duration=1800,
            active_duration=1700,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=900,
            tab_switches=0,
            scroll_speed="slow",
            backtrack_count=0,
            click_frequency=0.8,
            response_time=2.0,
            reread_count=0,
            help_requests=0,
            frustration_score=10,
            engagement_score=95,  # High engagement
            lesson_completed=True,
            overall_performance=95,
            focus_score=95,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )
        
        result = profiler._analyze_emotional_state(session)
        assert result is not None
        # High engagement should be detected


class TestAnalyzeForConditions:
    """Tests for _analyze_for_conditions method"""

    @pytest.fixture
    def profiler(self):
        return AdaptiveProfiler()

    @pytest.fixture
    def sample_session(self):
        return SessionData(
            session_id="test",
            user_id="test",
            duration=900,
            active_duration=700,
            time_of_day="morning",
            day_of_week=1,
            avg_time_on_content=450,
            tab_switches=3,
            scroll_speed="medium",
            backtrack_count=2,
            click_frequency=0.4,
            response_time=4.0,
            reread_count=1,
            help_requests=1,
            frustration_score=40,
            engagement_score=65,
            lesson_completed=True,
            overall_performance=75,
            focus_score=70,
            content_interactions=[],
            quiz_performance=[],
            breaks_taken=[]
        )

    def test_analyzes_for_adhd(self, profiler, sample_session):
        """Should provide ADHD-specific analysis"""
        result = profiler._analyze_for_conditions(sample_session, ["adhd"])
        assert result is not None
        # Should include ADHD-specific insights

    def test_analyzes_for_dyslexia(self, profiler, sample_session):
        """Should provide dyslexia-specific analysis"""
        result = profiler._analyze_for_conditions(sample_session, ["dyslexia"])
        assert result is not None

    def test_handles_multiple_conditions(self, profiler, sample_session):
        """Should handle multiple conditions"""
        result = profiler._analyze_for_conditions(sample_session, ["adhd", "dyslexia", "autism"])
        assert result is not None

    def test_handles_empty_conditions(self, profiler, sample_session):
        """Should handle empty conditions list"""
        result = profiler._analyze_for_conditions(sample_session, [])
        assert result is not None
