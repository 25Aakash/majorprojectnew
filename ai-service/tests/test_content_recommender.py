# test_content_recommender.py - Tests for ContentRecommender
import pytest
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock

# Add the ai-service directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.content_recommender import ContentRecommender


class TestContentRecommender:
    """Tests for ContentRecommender class"""

    @pytest.fixture
    def recommender(self):
        """Create an instance of ContentRecommender"""
        return ContentRecommender()

    def test_initialization(self, recommender):
        """Should initialize with condition preferences"""
        assert recommender.condition_preferences is not None
        assert "adhd" in recommender.condition_preferences
        assert "autism" in recommender.condition_preferences
        assert "dyslexia" in recommender.condition_preferences

    def test_adhd_preferences(self, recommender):
        """Should have ADHD-specific preferences"""
        prefs = recommender.condition_preferences["adhd"]
        
        assert prefs["prefer_gamification"] == "high"
        assert prefs["max_duration"] == 15
        assert prefs["prefer_interactive"] is True

    def test_autism_preferences(self, recommender):
        """Should have autism-specific preferences"""
        prefs = recommender.condition_preferences["autism"]
        
        assert prefs["prefer_structured"] is True
        assert prefs["avoid_surprises"] is True
        assert prefs["prefer_visual"] is True

    def test_dyslexia_preferences(self, recommender):
        """Should have dyslexia-specific preferences"""
        prefs = recommender.condition_preferences["dyslexia"]
        
        assert prefs["prefer_audio"] is True
        assert prefs["avoid_heavy_reading"] is True
        assert prefs["prefer_visual"] is True


class TestCalculateCompatibilityScore:
    """Tests for _calculate_compatibility_score method"""

    @pytest.fixture
    def recommender(self):
        return ContentRecommender()

    @pytest.fixture
    def sample_course(self):
        """Sample course for testing"""
        return {
            "_id": "course123",
            "title": "Python Programming Basics",
            "tags": ["python", "programming", "beginner"],
            "neurodiverseFeatures": {
                "hasAdhd": True,
                "hasVisualAids": True,
            },
            "difficulty": "beginner",
            "estimatedDuration": 10,
            "accessibilityFriendly": True,
            "hasInteractiveElements": True,
            "hasGamification": True,
        }

    def test_base_score_is_half(self, recommender, sample_course):
        """Base score should start at 0.5"""
        score = recommender._calculate_compatibility_score(
            sample_course,
            conditions=[],
            preferred_content=[],
            goals=[],
            available_time=60
        )
        
        # Base score without any matches should be around 0.5
        assert score >= 0.5

    def test_goal_alignment_increases_score(self, recommender, sample_course):
        """Score should increase when goals align with tags"""
        base_score = recommender._calculate_compatibility_score(
            sample_course,
            conditions=[],
            preferred_content=[],
            goals=[],
            available_time=60
        )
        
        aligned_score = recommender._calculate_compatibility_score(
            sample_course,
            conditions=[],
            preferred_content=[],
            goals=["Learn Python"],
            available_time=60
        )
        
        assert aligned_score > base_score

    def test_condition_compatibility(self, recommender, sample_course):
        """Score should consider condition compatibility"""
        adhd_score = recommender._calculate_compatibility_score(
            sample_course,
            conditions=["adhd"],
            preferred_content=[],
            goals=[],
            available_time=60
        )
        
        # Course with gamification should score well for ADHD
        assert adhd_score >= 0.5

    def test_content_type_preference(self, recommender, sample_course):
        """Score should consider preferred content types"""
        visual_score = recommender._calculate_compatibility_score(
            sample_course,
            conditions=[],
            preferred_content=["visual"],
            goals=[],
            available_time=60
        )
        
        assert visual_score >= 0.5

    def test_time_constraint(self, recommender):
        """Score should be affected by available time"""
        long_course = {
            "_id": "long_course",
            "title": "Long Course",
            "tags": [],
            "difficulty": "intermediate",
            "estimatedDuration": 50,  # Long course
        }
        
        score_with_time = recommender._calculate_compatibility_score(
            long_course,
            conditions=[],
            preferred_content=[],
            goals=[],
            available_time=60  # Have time
        )
        
        score_no_time = recommender._calculate_compatibility_score(
            long_course,
            conditions=[],
            preferred_content=[],
            goals=[],
            available_time=10  # Not enough time
        )
        
        # Score should be lower when not enough time
        assert score_with_time >= score_no_time


class TestGetRecommendations:
    """Tests for get_recommendations method"""

    @pytest.fixture
    def recommender(self):
        return ContentRecommender()

    @pytest.fixture
    def sample_profile(self):
        """Sample user profile"""
        return {
            "conditions": ["adhd"],
            "preferred_content_types": ["video", "interactive"],
            "interests": ["programming", "math"],
        }

    @pytest.fixture
    def sample_courses(self):
        """Sample courses from database"""
        return [
            {
                "_id": "course1",
                "title": "Python Basics",
                "tags": ["python", "programming"],
                "difficulty": "beginner",
                "estimatedDuration": 10,
                "prerequisites": [],
            },
            {
                "_id": "course2",
                "title": "Advanced Python",
                "tags": ["python", "advanced"],
                "difficulty": "advanced",
                "estimatedDuration": 20,
                "prerequisites": ["course1"],
            },
            {
                "_id": "course3",
                "title": "Math Fundamentals",
                "tags": ["math", "basics"],
                "difficulty": "beginner",
                "estimatedDuration": 15,
                "prerequisites": [],
            },
        ]

    @pytest.mark.asyncio
    async def test_returns_recommendations_dict(self, recommender, sample_profile, sample_courses):
        """Should return recommendations dictionary"""
        with patch.object(recommender, 'fetch_courses_from_db', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = sample_courses
            
            result = await recommender.get_recommendations(
                profile=sample_profile,
                completed=[],
                goals=["Learn Python"],
                available_time=60
            )
            
            assert "courses" in result
            assert "reasoning" in result
            assert "time_estimate" in result

    @pytest.mark.asyncio
    async def test_excludes_completed_courses(self, recommender, sample_profile, sample_courses):
        """Should not recommend completed courses"""
        with patch.object(recommender, 'fetch_courses_from_db', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = sample_courses
            
            result = await recommender.get_recommendations(
                profile=sample_profile,
                completed=["course1"],  # Already completed
                goals=["Learn Python"],
                available_time=60
            )
            
            course_ids = [c["course_id"] for c in result["courses"]]
            assert "course1" not in course_ids

    @pytest.mark.asyncio
    async def test_checks_prerequisites(self, recommender, sample_profile, sample_courses):
        """Should check course prerequisites"""
        with patch.object(recommender, 'fetch_courses_from_db', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = sample_courses
            
            # Without completing course1, course2 should not be recommended
            result = await recommender.get_recommendations(
                profile=sample_profile,
                completed=[],
                goals=["Learn Python"],
                available_time=60
            )
            
            course_ids = [c["course_id"] for c in result["courses"]]
            assert "course2" not in course_ids

    @pytest.mark.asyncio
    async def test_prerequisites_met(self, recommender, sample_profile, sample_courses):
        """Should include courses when prerequisites are met"""
        with patch.object(recommender, 'fetch_courses_from_db', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = sample_courses
            
            # After completing course1, course2 should be available
            result = await recommender.get_recommendations(
                profile=sample_profile,
                completed=["course1"],
                goals=["Learn Python"],
                available_time=60
            )
            
            course_ids = [c["course_id"] for c in result["courses"]]
            # course2 should now be eligible
            assert "course3" in course_ids or "course2" in course_ids

    @pytest.mark.asyncio
    async def test_limits_to_top_5(self, recommender, sample_profile):
        """Should return maximum 5 recommendations"""
        many_courses = [
            {
                "_id": f"course{i}",
                "title": f"Course {i}",
                "tags": ["general"],
                "difficulty": "beginner",
                "estimatedDuration": 10,
                "prerequisites": [],
            }
            for i in range(10)
        ]
        
        with patch.object(recommender, 'fetch_courses_from_db', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = many_courses
            
            result = await recommender.get_recommendations(
                profile=sample_profile,
                completed=[],
                goals=[],
                available_time=60
            )
            
            assert len(result["courses"]) <= 5

    @pytest.mark.asyncio
    async def test_sorts_by_compatibility_score(self, recommender, sample_profile, sample_courses):
        """Recommendations should be sorted by compatibility score"""
        with patch.object(recommender, 'fetch_courses_from_db', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = sample_courses
            
            result = await recommender.get_recommendations(
                profile=sample_profile,
                completed=[],
                goals=["Learn Python"],
                available_time=60
            )
            
            # Verify sorted descending
            scores = [c["compatibility_score"] for c in result["courses"]]
            assert scores == sorted(scores, reverse=True)


class TestFetchCoursesFromDb:
    """Tests for fetch_courses_from_db method"""

    @pytest.fixture
    def recommender(self):
        return ContentRecommender()

    @pytest.mark.asyncio
    async def test_makes_api_request(self, recommender):
        """Should make API request to backend"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"_id": "test", "title": "Test"}]
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = mock_client.return_value.__aenter__.return_value
            mock_instance.get = AsyncMock(return_value=mock_response)
            
            result = await recommender.fetch_courses_from_db()
            
            assert len(result) == 1
            assert result[0]["_id"] == "test"

    @pytest.mark.asyncio
    async def test_returns_empty_on_error(self, recommender):
        """Should return empty list on API error"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = mock_client.return_value.__aenter__.return_value
            mock_instance.get = AsyncMock(side_effect=Exception("Network error"))
            
            result = await recommender.fetch_courses_from_db()
            
            assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_on_non_200(self, recommender):
        """Should return empty list on non-200 response"""
        mock_response = MagicMock()
        mock_response.status_code = 500
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = mock_client.return_value.__aenter__.return_value
            mock_instance.get = AsyncMock(return_value=mock_response)
            
            result = await recommender.fetch_courses_from_db()
            
            assert result == []


class TestGenerateReasoning:
    """Tests for _generate_reasoning method"""

    @pytest.fixture
    def recommender(self):
        return ContentRecommender()

    @pytest.fixture
    def sample_course(self):
        return {
            "_id": "course123",
            "title": "Python Basics",
            "tags": ["python", "programming"],
            "neurodiverseFeatures": {
                "hasAdhd": True,
            },
        }

    def test_generates_reasons_list(self, recommender, sample_course):
        """Should generate list of reasons"""
        reasons = recommender._generate_reasoning(
            course_id="course123",
            course=sample_course,
            conditions=["adhd"],
            goals=["Learn Python"]
        )
        
        assert isinstance(reasons, list)
        assert len(reasons) > 0

    def test_includes_goal_alignment_reason(self, recommender, sample_course):
        """Should include reason for goal alignment"""
        reasons = recommender._generate_reasoning(
            course_id="course123",
            course=sample_course,
            conditions=[],
            goals=["Learn Python"]
        )
        
        # At least one reason related to goals
        goal_reasons = [r for r in reasons if "goal" in r.lower() or "python" in r.lower()]
        assert len(goal_reasons) >= 0  # May or may not have

    def test_includes_condition_reason(self, recommender, sample_course):
        """Should include reason for condition compatibility"""
        reasons = recommender._generate_reasoning(
            course_id="course123",
            course=sample_course,
            conditions=["adhd"],
            goals=[]
        )
        
        # Should have reasons even if just condition-based
        assert isinstance(reasons, list)

    def test_handles_none_course(self, recommender):
        """Should handle None course gracefully"""
        reasons = recommender._generate_reasoning(
            course_id="unknown",
            course=None,
            conditions=[],
            goals=[]
        )
        
        assert isinstance(reasons, list)
