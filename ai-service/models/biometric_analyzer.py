"""
Biometric Analysis Module for NeuroLearn
Analyzes voice patterns, eye tracking, and mouse movements to build adaptive profiles
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import numpy as np
from enum import Enum


class EmotionalState(Enum):
    NEUTRAL = "neutral"
    STRESSED = "stressed"
    CONFIDENT = "confident"
    HESITANT = "hesitant"
    FRUSTRATED = "frustrated"
    ENGAGED = "engaged"
    DISTRACTED = "distracted"
    OVERWHELMED = "overwhelmed"


@dataclass
class VoiceAnalysisResult:
    """Results from voice pattern analysis"""
    speaking_pace: str  # slow, normal, fast
    confidence_level: float  # 0-100
    stress_level: float  # 0-100
    hesitation_score: float  # 0-100
    reading_fluency: float  # 0-100
    emotional_state: EmotionalState
    recommendations: List[str] = field(default_factory=list)
    
    # Neurodiverse-specific indicators
    adhd_indicators: Dict[str, float] = field(default_factory=dict)
    dyslexia_indicators: Dict[str, float] = field(default_factory=dict)
    anxiety_indicators: Dict[str, float] = field(default_factory=dict)


@dataclass
class EyeTrackingResult:
    """Results from eye tracking analysis"""
    attention_score: float  # 0-100
    focus_quality: str  # poor, moderate, good, excellent
    reading_pattern: str  # normal, regressive, skipping, erratic
    distraction_level: float  # 0-100
    content_engagement: Dict[str, float]  # engagement per content area
    fatigue_indicators: float  # 0-100
    recommendations: List[str] = field(default_factory=list)
    
    # Neurodiverse-specific patterns
    adhd_attention_pattern: Dict[str, Any] = field(default_factory=dict)
    dyslexia_reading_pattern: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MouseTrackingResult:
    """Results from mouse movement analysis"""
    frustration_score: float  # 0-100
    engagement_score: float  # 0-100
    navigation_confidence: float  # 0-100
    hesitation_level: float  # 0-100
    erratic_behavior_score: float  # 0-100
    interaction_pattern: str  # efficient, exploratory, hesitant, frustrated
    recommendations: List[str] = field(default_factory=list)


@dataclass
class BiometricProfile:
    """Combined biometric profile for a student"""
    user_id: str
    
    # Aggregated scores
    overall_attention: float
    overall_engagement: float
    overall_stress: float
    overall_confidence: float
    overall_frustration: float
    
    # Discovered preferences
    optimal_content_pace: str
    preferred_break_frequency: int  # minutes between breaks
    best_session_duration: int  # optimal session length
    environmental_preferences: Dict[str, Any]
    
    # Learning style indicators
    visual_learner_score: float
    auditory_learner_score: float
    kinesthetic_learner_score: float
    reading_preference_score: float
    
    # Neurodiverse adaptations
    recommended_adaptations: List[Dict[str, Any]]
    
    # Confidence in profile
    profile_confidence: float
    data_points_analyzed: int


class BiometricAnalyzer:
    """
    Analyzes voice, eye tracking, and mouse data to build adaptive profiles
    for neurodiverse students.
    """
    
    def __init__(self):
        # Thresholds for different conditions
        self.adhd_thresholds = {
            'attention_drop_threshold': 0.3,
            'rapid_gaze_shift_threshold': 5,
            'hyperactive_mouse_threshold': 500,
            'task_switching_threshold': 3,
        }
        
        self.dyslexia_thresholds = {
            'regression_threshold': 5,
            'reading_pace_variance': 0.4,
            'word_skip_threshold': 3,
            'hesitation_threshold': 0.5,
        }
        
        self.anxiety_thresholds = {
            'stress_voice_threshold': 60,
            'tremor_threshold': 40,
            'avoidance_pattern_threshold': 0.4,
        }
    
    # ==================== VOICE ANALYSIS ====================
    
    def analyze_voice(
        self,
        voice_metrics: Dict[str, Any],
        conditions: List[str] = None
    ) -> VoiceAnalysisResult:
        """
        Analyze voice patterns to detect stress, confidence, and learning difficulties.
        """
        conditions = conditions or []
        
        # Extract metrics with defaults
        pace = voice_metrics.get('averagePace', 120)  # words per minute
        pace_var = voice_metrics.get('paceVariability', 0.2)
        pause_freq = voice_metrics.get('pauseFrequency', 2)
        avg_pause = voice_metrics.get('averagePauseDuration', 500)
        filler_count = voice_metrics.get('fillerWordCount', 0)
        volume = voice_metrics.get('volumeLevel', 50)
        volume_var = voice_metrics.get('volumeVariability', 0.2)
        pitch_var = voice_metrics.get('pitchVariability', 0.3)
        clarity = voice_metrics.get('speechClarity', 70)
        hesitation = voice_metrics.get('hesitationPatterns', 0)
        tremor = voice_metrics.get('voiceTremor', 0)
        reading_acc = voice_metrics.get('readingAccuracy', 100)
        self_corrections = voice_metrics.get('selfCorrections', 0)
        
        # Determine speaking pace category
        if pace < 100:
            speaking_pace = 'slow'
        elif pace > 160:
            speaking_pace = 'fast'
        else:
            speaking_pace = 'normal'
        
        # Calculate confidence level
        confidence_factors = [
            (100 - tremor) * 0.3,
            volume * 0.2 if volume > 30 else 0,
            (100 - hesitation) * 0.2,
            clarity * 0.2,
            (100 - filler_count * 5) * 0.1 if filler_count < 10 else 0,
        ]
        confidence_level = min(100, max(0, sum(confidence_factors)))
        
        # Calculate stress level
        stress_factors = [
            tremor * 0.3,
            pace_var * 100 * 0.2,
            hesitation * 0.2,
            (100 - clarity) * 0.15,
            filler_count * 3 * 0.15,
        ]
        stress_level = min(100, max(0, sum(stress_factors)))
        
        # Hesitation score
        hesitation_score = min(100, (
            pause_freq * 10 +
            avg_pause / 50 +
            self_corrections * 5 +
            hesitation
        ) / 4)
        
        # Reading fluency
        reading_fluency = (
            reading_acc * 0.4 +
            (100 - pace_var * 100) * 0.3 +
            clarity * 0.3
        )
        
        # Determine emotional state
        emotional_state = self._determine_voice_emotional_state(
            stress_level, confidence_level, hesitation_score
        )
        
        # Neurodiverse indicators
        adhd_indicators = self._analyze_adhd_voice_patterns(voice_metrics)
        dyslexia_indicators = self._analyze_dyslexia_voice_patterns(voice_metrics)
        anxiety_indicators = self._analyze_anxiety_voice_patterns(voice_metrics)
        
        # Generate recommendations
        recommendations = self._generate_voice_recommendations(
            speaking_pace, confidence_level, stress_level, 
            hesitation_score, conditions, reading_fluency
        )
        
        return VoiceAnalysisResult(
            speaking_pace=speaking_pace,
            confidence_level=round(confidence_level, 1),
            stress_level=round(stress_level, 1),
            hesitation_score=round(hesitation_score, 1),
            reading_fluency=round(reading_fluency, 1),
            emotional_state=emotional_state,
            recommendations=recommendations,
            adhd_indicators=adhd_indicators,
            dyslexia_indicators=dyslexia_indicators,
            anxiety_indicators=anxiety_indicators,
        )
    
    def _determine_voice_emotional_state(
        self, stress: float, confidence: float, hesitation: float
    ) -> EmotionalState:
        """Determine emotional state from voice metrics"""
        if stress > 70:
            return EmotionalState.STRESSED
        if confidence > 70 and stress < 30:
            return EmotionalState.CONFIDENT
        if hesitation > 60:
            return EmotionalState.HESITANT
        if stress > 50 and hesitation > 50:
            return EmotionalState.FRUSTRATED
        return EmotionalState.NEUTRAL
    
    def _analyze_adhd_voice_patterns(self, metrics: Dict) -> Dict[str, float]:
        """Analyze voice patterns indicative of ADHD"""
        pace_var = metrics.get('paceVariability', 0)
        
        return {
            'speech_impulsivity': min(100, pace_var * 100 + 
                                      metrics.get('averagePace', 120) / 2),
            'attention_variation': min(100, metrics.get('pauseFrequency', 0) * 15),
            'topic_consistency': max(0, 100 - pace_var * 150),
        }
    
    def _analyze_dyslexia_voice_patterns(self, metrics: Dict) -> Dict[str, float]:
        """Analyze voice patterns indicative of dyslexia"""
        return {
            'reading_difficulty': min(100, (
                100 - metrics.get('readingAccuracy', 100) +
                metrics.get('selfCorrections', 0) * 10 +
                metrics.get('skippedWords', 0) * 15
            )),
            'word_finding_difficulty': metrics.get('hesitationPatterns', 0),
            'phonological_struggles': min(100, metrics.get('pauseFrequency', 0) * 20),
        }
    
    def _analyze_anxiety_voice_patterns(self, metrics: Dict) -> Dict[str, float]:
        """Analyze voice patterns indicative of anxiety"""
        return {
            'vocal_tremor': metrics.get('voiceTremor', 0),
            'speech_avoidance': min(100, metrics.get('pauseFrequency', 0) * 25),
            'volume_suppression': max(0, 50 - metrics.get('volumeLevel', 50)),
        }
    
    def _generate_voice_recommendations(
        self, pace: str, confidence: float, stress: float,
        hesitation: float, conditions: List[str], fluency: float
    ) -> List[str]:
        """Generate recommendations based on voice analysis"""
        recommendations = []
        
        if stress > 60:
            recommendations.append("Consider a calming break - high stress detected in voice")
        
        if 'dyslexia' in conditions and fluency < 60:
            recommendations.append("Switch to audio content or text-to-speech")
            recommendations.append("Enable dyslexia-friendly font and spacing")
        
        if hesitation > 50:
            recommendations.append("Simplify current content - hesitation patterns detected")
        
        if pace == 'fast' and 'adhd' in conditions:
            recommendations.append("Slow down - take your time with the content")
        
        if confidence < 40:
            recommendations.append("Provide encouragement and positive reinforcement")
        
        return recommendations
    
    # ==================== EYE TRACKING ANALYSIS ====================
    
    def analyze_eye_tracking(
        self,
        eye_metrics: Dict[str, Any],
        conditions: List[str] = None
    ) -> EyeTrackingResult:
        """
        Analyze eye tracking data to assess attention, reading patterns, and engagement.
        """
        conditions = conditions or []
        
        # Extract metrics
        fixation_duration = eye_metrics.get('averageFixationDuration', 200)
        fixation_count = eye_metrics.get('fixationCount', 0)
        saccade_count = eye_metrics.get('saccadeCount', 0)
        regression_count = eye_metrics.get('regressionCount', 0)
        line_skip_count = eye_metrics.get('lineSkipCount', 0)
        content_focus = eye_metrics.get('contentFocusPercentage', 50)
        blink_rate = eye_metrics.get('blinkRate', 15)
        tracking_confidence = eye_metrics.get('trackingConfidence', 50)
        
        # Calculate attention score
        attention_factors = [
            content_focus * 0.4,
            min(100, fixation_duration / 3) * 0.3,
            max(0, 100 - regression_count * 5) * 0.15,
            max(0, 100 - line_skip_count * 10) * 0.15,
        ]
        attention_score = sum(attention_factors) * (tracking_confidence / 100)
        
        # Determine focus quality
        if attention_score >= 80:
            focus_quality = 'excellent'
        elif attention_score >= 60:
            focus_quality = 'good'
        elif attention_score >= 40:
            focus_quality = 'moderate'
        else:
            focus_quality = 'poor'
        
        # Determine reading pattern
        reading_pattern = self._determine_reading_pattern(
            regression_count, line_skip_count, saccade_count, fixation_count
        )
        
        # Distraction level
        distraction_level = max(0, 100 - content_focus)
        
        # Content engagement from heatmap
        content_engagement = self._calculate_content_engagement(
            eye_metrics.get('attentionHeatmap', [])
        )
        
        # Fatigue indicators (high blink rate, longer fixations)
        fatigue_indicators = self._calculate_fatigue(blink_rate, fixation_duration)
        
        # Neurodiverse-specific patterns
        adhd_pattern = self._analyze_adhd_eye_patterns(eye_metrics)
        dyslexia_pattern = self._analyze_dyslexia_eye_patterns(eye_metrics)
        
        # Recommendations
        recommendations = self._generate_eye_tracking_recommendations(
            attention_score, reading_pattern, distraction_level,
            fatigue_indicators, conditions
        )
        
        return EyeTrackingResult(
            attention_score=round(attention_score, 1),
            focus_quality=focus_quality,
            reading_pattern=reading_pattern,
            distraction_level=round(distraction_level, 1),
            content_engagement=content_engagement,
            fatigue_indicators=round(fatigue_indicators, 1),
            recommendations=recommendations,
            adhd_attention_pattern=adhd_pattern,
            dyslexia_reading_pattern=dyslexia_pattern,
        )
    
    def _determine_reading_pattern(
        self, regressions: int, skips: int, saccades: int, fixations: int
    ) -> str:
        """Determine the reading pattern from eye movements"""
        if fixations == 0:
            return 'erratic'
        
        regression_rate = regressions / max(1, fixations) * 100
        skip_rate = skips / max(1, fixations) * 100
        
        if regression_rate > 20:
            return 'regressive'
        if skip_rate > 15:
            return 'skipping'
        if saccades > fixations * 3:
            return 'erratic'
        return 'normal'
    
    def _calculate_content_engagement(
        self, heatmap: List[Dict]
    ) -> Dict[str, float]:
        """Calculate engagement scores per content area"""
        if not heatmap:
            return {}
        
        total_gaze_time = sum(h.get('totalGazeTime', 0) for h in heatmap)
        if total_gaze_time == 0:
            return {}
        
        engagement = {}
        for item in heatmap:
            block_id = item.get('contentBlockId', 'unknown')
            gaze_time = item.get('totalGazeTime', 0)
            gaze_count = item.get('gazeCount', 0)
            avg_duration = item.get('averageGazeDuration', 0)
            
            # Engagement = time proportion * gaze quality
            time_proportion = gaze_time / total_gaze_time
            gaze_quality = min(1, avg_duration / 300)  # normalize to ~300ms optimal
            
            engagement[block_id] = round(time_proportion * gaze_quality * 100, 1)
        
        return engagement
    
    def _calculate_fatigue(self, blink_rate: float, fixation_duration: float) -> float:
        """Calculate fatigue level from eye metrics"""
        # Normal blink rate: 15-20 per minute
        # Higher = fatigue, lower = strain
        blink_fatigue = 0
        if blink_rate > 25:
            blink_fatigue = (blink_rate - 25) * 3
        elif blink_rate < 10:
            blink_fatigue = (10 - blink_rate) * 5  # eye strain
        
        # Longer fixations can indicate fatigue
        fixation_fatigue = max(0, (fixation_duration - 300) / 10)
        
        return min(100, blink_fatigue + fixation_fatigue)
    
    def _analyze_adhd_eye_patterns(self, metrics: Dict) -> Dict[str, Any]:
        """Analyze eye patterns indicative of ADHD"""
        saccade_count = metrics.get('saccadeCount', 0)
        fixation_count = metrics.get('fixationCount', 1)
        content_focus = metrics.get('contentFocusPercentage', 50)
        distraction_zones = metrics.get('distractionZones', [])
        
        # Calculate hyperactivity in eye movements
        saccade_ratio = saccade_count / max(1, fixation_count)
        
        # Distraction frequency
        distraction_frequency = sum(z.get('frequency', 0) for z in distraction_zones)
        
        return {
            'gaze_hyperactivity': min(100, saccade_ratio * 30),
            'distraction_frequency': distraction_frequency,
            'attention_switching': len(distraction_zones),
            'sustained_focus_score': content_focus,
            'needs_frequent_breaks': saccade_ratio > 2 or content_focus < 50,
        }
    
    def _analyse_dyslexia_eye_patterns(self, metrics: Dict) -> Dict[str, Any]:
        """Analyze eye patterns indicative of dyslexia"""
        return self._analyze_dyslexia_eye_patterns(metrics)
    
    def _analyze_dyslexia_eye_patterns(self, metrics: Dict) -> Dict[str, Any]:
        """Analyze eye patterns indicative of dyslexia"""
        regression_count = metrics.get('regressionCount', 0)
        line_skip_count = metrics.get('lineSkipCount', 0)
        reading_dir = metrics.get('readingDirection', 'left-to-right')
        avg_fixation = metrics.get('averageFixationDuration', 200)
        
        return {
            'regression_frequency': regression_count,
            'line_tracking_difficulty': line_skip_count,
            'reading_direction_issues': reading_dir == 'erratic',
            'fixation_struggles': avg_fixation > 400,
            'needs_reading_guide': regression_count > 5 or line_skip_count > 3,
            'recommended_line_spacing': 'double' if line_skip_count > 2 else 'normal',
        }
    
    def _generate_eye_tracking_recommendations(
        self, attention: float, pattern: str, distraction: float,
        fatigue: float, conditions: List[str]
    ) -> List[str]:
        """Generate recommendations based on eye tracking"""
        recommendations = []
        
        if attention < 40:
            recommendations.append("Content may be too complex - consider simplifying")
        
        if pattern == 'regressive' and 'dyslexia' in conditions:
            recommendations.append("Enable line highlighting to help with reading")
            recommendations.append("Increase line spacing for easier tracking")
        
        if distraction > 60:
            recommendations.append("Enable focus mode to reduce distractions")
        
        if fatigue > 60:
            recommendations.append("Eye fatigue detected - take a screen break")
        
        if 'adhd' in conditions and distraction > 40:
            recommendations.append("Break content into smaller chunks")
            recommendations.append("Add more visual elements to maintain attention")
        
        return recommendations
    
    # ==================== MOUSE TRACKING ANALYSIS ====================
    
    def analyze_mouse_tracking(
        self,
        mouse_metrics: Dict[str, Any],
        conditions: List[str] = None
    ) -> MouseTrackingResult:
        """
        Analyze mouse movements to detect frustration, engagement, and navigation patterns.
        """
        conditions = conditions or []
        
        # Extract metrics
        total_distance = mouse_metrics.get('totalDistance', 0)
        avg_speed = mouse_metrics.get('averageSpeed', 0)
        speed_var = mouse_metrics.get('speedVariability', 0)
        direction_changes = mouse_metrics.get('directionChanges', 0)
        erratic_count = mouse_metrics.get('erraticMovementCount', 0)
        avg_hover = mouse_metrics.get('averageHoverDuration', 0)
        hover_abandon = mouse_metrics.get('hoverAbandonRate', 0)
        click_count = mouse_metrics.get('clickCount', 0)
        miss_clicks = mouse_metrics.get('missClickCount', 0)
        rapid_clicks = mouse_metrics.get('rapidClickEvents', 0)
        back_forth = mouse_metrics.get('backAndForthMovements', 0)
        idle_time = mouse_metrics.get('idleTimeTotal', 0)
        path_straightness = mouse_metrics.get('pathStraightness', 0.5)
        
        scroll_patterns = mouse_metrics.get('scrollPatterns', {})
        scroll_back = scroll_patterns.get('scrollBackCount', 0)
        rapid_scroll = scroll_patterns.get('rapidScrollCount', 0)
        
        # Calculate frustration score
        frustration_factors = [
            erratic_count * 3,
            miss_clicks * 10,
            rapid_clicks * 15,
            back_forth * 5,
            scroll_back * 5,
            rapid_scroll * 3,
            hover_abandon * 20,
        ]
        frustration_score = min(100, sum(frustration_factors) / 5)
        
        # Engagement score
        engagement_factors = [
            min(50, click_count) * 0.3,
            min(50, avg_hover / 100) * 0.2,
            (1 - hover_abandon) * 30,
            path_straightness * 20,
            max(0, 20 - idle_time / 1000),
        ]
        engagement_score = min(100, sum(engagement_factors))
        
        # Navigation confidence
        confidence_factors = [
            path_straightness * 40,
            max(0, 30 - miss_clicks * 5),
            max(0, 30 - direction_changes / 10),
        ]
        navigation_confidence = min(100, sum(confidence_factors))
        
        # Hesitation level
        hesitation_level = min(100, (
            avg_hover / 20 +
            idle_time / 500 +
            hover_abandon * 50
        ))
        
        # Erratic behavior score
        erratic_score = min(100, (
            erratic_count * 5 +
            speed_var * 50 +
            direction_changes / 5
        ))
        
        # Determine interaction pattern
        pattern = self._determine_interaction_pattern(
            frustration_score, engagement_score, 
            navigation_confidence, hesitation_level
        )
        
        # Recommendations
        recommendations = self._generate_mouse_recommendations(
            frustration_score, engagement_score, pattern, conditions
        )
        
        return MouseTrackingResult(
            frustration_score=round(frustration_score, 1),
            engagement_score=round(engagement_score, 1),
            navigation_confidence=round(navigation_confidence, 1),
            hesitation_level=round(hesitation_level, 1),
            erratic_behavior_score=round(erratic_score, 1),
            interaction_pattern=pattern,
            recommendations=recommendations,
        )
    
    def _determine_interaction_pattern(
        self, frustration: float, engagement: float,
        confidence: float, hesitation: float
    ) -> str:
        """Determine the overall interaction pattern"""
        if frustration > 60:
            return 'frustrated'
        if hesitation > 60:
            return 'hesitant'
        if confidence > 70 and engagement > 60:
            return 'efficient'
        if engagement > 50:
            return 'exploratory'
        return 'hesitant'
    
    def _generate_mouse_recommendations(
        self, frustration: float, engagement: float,
        pattern: str, conditions: List[str]
    ) -> List[str]:
        """Generate recommendations based on mouse analysis"""
        recommendations = []
        
        if frustration > 60:
            recommendations.append("High frustration detected - offer assistance or simplify")
        
        if engagement < 30:
            recommendations.append("Low engagement - try interactive content")
        
        if pattern == 'hesitant':
            recommendations.append("Provide clearer navigation hints")
            recommendations.append("Add tooltip guidance")
        
        if 'adhd' in conditions and pattern == 'exploratory':
            recommendations.append("Good exploration! Keep engagement high with variety")
        
        return recommendations
    
    # ==================== COMBINED BIOMETRIC ANALYSIS ====================
    
    def analyze_combined_biometrics(
        self,
        voice_metrics: Optional[Dict] = None,
        eye_metrics: Optional[Dict] = None,
        mouse_metrics: Optional[Dict] = None,
        conditions: List[str] = None
    ) -> Dict[str, Any]:
        """
        Perform combined analysis of all biometric data sources.
        """
        conditions = conditions or []
        results = {}
        
        # Analyze available data
        if voice_metrics:
            results['voice'] = self.analyze_voice(voice_metrics, conditions)
        
        if eye_metrics:
            results['eye_tracking'] = self.analyze_eye_tracking(eye_metrics, conditions)
        
        if mouse_metrics:
            results['mouse'] = self.analyze_mouse_tracking(mouse_metrics, conditions)
        
        # Compute combined scores
        combined_scores = self._compute_combined_scores(results)
        
        # Generate adaptive profile update
        profile_update = self._generate_profile_update(results, combined_scores, conditions)
        
        # Real-time interventions
        interventions = self._determine_interventions(combined_scores, conditions)
        
        return {
            'individual_analysis': {
                'voice': results.get('voice').__dict__ if 'voice' in results else None,
                'eye_tracking': results.get('eye_tracking').__dict__ if 'eye_tracking' in results else None,
                'mouse': results.get('mouse').__dict__ if 'mouse' in results else None,
            },
            'combined_scores': combined_scores,
            'profile_update': profile_update,
            'interventions': interventions,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _compute_combined_scores(self, results: Dict) -> Dict[str, float]:
        """Compute combined scores from all biometric sources"""
        scores = {
            'attention': 50,
            'engagement': 50,
            'stress': 50,
            'confidence': 50,
            'frustration': 50,
            'focus_quality': 50,
        }
        
        weights = {'voice': 0.3, 'eye_tracking': 0.4, 'mouse': 0.3}
        active_weight = sum(weights[k] for k in results.keys())
        
        for source, weight in weights.items():
            if source not in results:
                continue
            
            normalized_weight = weight / active_weight
            data = results[source]
            
            if source == 'voice':
                scores['stress'] = scores['stress'] * (1 - normalized_weight) + data.stress_level * normalized_weight
                scores['confidence'] = scores['confidence'] * (1 - normalized_weight) + data.confidence_level * normalized_weight
            
            elif source == 'eye_tracking':
                scores['attention'] = scores['attention'] * (1 - normalized_weight) + data.attention_score * normalized_weight
                scores['focus_quality'] = scores['focus_quality'] * (1 - normalized_weight) + (100 if data.focus_quality == 'excellent' else 75 if data.focus_quality == 'good' else 50 if data.focus_quality == 'moderate' else 25) * normalized_weight
            
            elif source == 'mouse':
                scores['frustration'] = scores['frustration'] * (1 - normalized_weight) + data.frustration_score * normalized_weight
                scores['engagement'] = scores['engagement'] * (1 - normalized_weight) + data.engagement_score * normalized_weight
        
        return {k: round(v, 1) for k, v in scores.items()}
    
    def _generate_profile_update(
        self, results: Dict, scores: Dict, conditions: List[str]
    ) -> Dict[str, Any]:
        """Generate updates to the student's adaptive profile"""
        update = {
            'learning_style_indicators': {},
            'content_preferences': {},
            'session_preferences': {},
            'accessibility_needs': [],
        }
        
        # Determine learning style from biometrics
        if 'eye_tracking' in results:
            eye_data = results['eye_tracking']
            update['learning_style_indicators']['visual_engagement'] = eye_data.attention_score
        
        if 'voice' in results:
            voice_data = results['voice']
            update['learning_style_indicators']['verbal_comfort'] = voice_data.confidence_level
        
        # Content preferences based on patterns
        if scores['frustration'] > 60:
            update['content_preferences']['simplify_content'] = True
        
        if scores['attention'] < 40:
            update['content_preferences']['shorter_segments'] = True
            update['session_preferences']['break_frequency'] = 10  # minutes
        
        # Accessibility needs
        if 'dyslexia' in conditions:
            if 'eye_tracking' in results:
                pattern = results['eye_tracking'].dyslexia_reading_pattern
                if pattern.get('needs_reading_guide'):
                    update['accessibility_needs'].append('reading_guide')
                if pattern.get('recommended_line_spacing') == 'double':
                    update['accessibility_needs'].append('increased_line_spacing')
        
        if 'adhd' in conditions:
            if 'eye_tracking' in results:
                pattern = results['eye_tracking'].adhd_attention_pattern
                if pattern.get('needs_frequent_breaks'):
                    update['accessibility_needs'].append('frequent_breaks')
                    update['session_preferences']['break_frequency'] = 15
        
        return update
    
    def _determine_interventions(
        self, scores: Dict, conditions: List[str]
    ) -> List[Dict[str, Any]]:
        """Determine immediate interventions based on biometric analysis"""
        interventions = []
        
        if scores['stress'] > 70:
            interventions.append({
                'type': 'calming',
                'priority': 'high',
                'message': 'High stress detected. Would you like to try a calming exercise?',
                'suggested_action': 'breathing_exercise',
            })
        
        if scores['frustration'] > 70:
            interventions.append({
                'type': 'simplify',
                'priority': 'high',
                'message': 'This seems challenging. Let me simplify the content.',
                'suggested_action': 'reduce_difficulty',
            })
        
        if scores['attention'] < 30:
            interventions.append({
                'type': 'break',
                'priority': 'medium',
                'message': 'Your attention seems to be wandering. Time for a quick break?',
                'suggested_action': 'take_break',
            })
        
        if scores['focus_quality'] < 40 and 'adhd' in conditions:
            interventions.append({
                'type': 'restructure',
                'priority': 'medium',
                'message': 'Let\'s try a different format to keep things interesting.',
                'suggested_action': 'change_format',
            })
        
        return interventions
    
    def build_biometric_profile(
        self,
        sessions: List[Dict[str, Any]],
        conditions: List[str]
    ) -> BiometricProfile:
        """
        Build a comprehensive biometric profile from historical session data.
        """
        if not sessions:
            return self._get_default_biometric_profile(conditions)
        
        # Aggregate scores across sessions
        all_attention = []
        all_engagement = []
        all_stress = []
        all_confidence = []
        all_frustration = []
        
        # Track patterns
        session_durations = []
        break_triggers = []
        
        for session in sessions:
            scores = session.get('scores', {})
            all_attention.append(scores.get('attentionScore', 50))
            all_engagement.append(scores.get('engagementScore', 50))
            all_stress.append(scores.get('stressLevel', 50))
            all_confidence.append(scores.get('confidenceLevel', 50))
            all_frustration.append(scores.get('frustrationLevel', 50))
            
            start = session.get('startTime')
            end = session.get('endTime')
            if start and end:
                try:
                    duration = (datetime.fromisoformat(str(end)) - datetime.fromisoformat(str(start))).seconds / 60
                    session_durations.append(duration)
                except:
                    pass
        
        # Calculate averages
        avg_attention = np.mean(all_attention) if all_attention else 50
        avg_engagement = np.mean(all_engagement) if all_engagement else 50
        avg_stress = np.mean(all_stress) if all_stress else 50
        avg_confidence = np.mean(all_confidence) if all_confidence else 50
        avg_frustration = np.mean(all_frustration) if all_frustration else 50
        
        # Determine optimal session duration
        optimal_duration = int(np.median(session_durations)) if session_durations else 25
        
        # Determine break frequency based on attention patterns
        break_frequency = 20
        if avg_attention < 50 or 'adhd' in conditions:
            break_frequency = 15
        if avg_frustration > 60:
            break_frequency = 10
        
        # Learning style from biometrics
        visual_score = avg_attention if avg_attention > 60 else 50
        auditory_score = avg_confidence if avg_confidence > 60 else 50
        
        # Generate adaptations
        adaptations = self._generate_biometric_adaptations(
            avg_attention, avg_engagement, avg_stress,
            avg_confidence, avg_frustration, conditions
        )
        
        return BiometricProfile(
            user_id="",
            overall_attention=round(avg_attention, 1),
            overall_engagement=round(avg_engagement, 1),
            overall_stress=round(avg_stress, 1),
            overall_confidence=round(avg_confidence, 1),
            overall_frustration=round(avg_frustration, 1),
            optimal_content_pace='slow' if avg_attention < 50 else 'normal',
            preferred_break_frequency=break_frequency,
            best_session_duration=optimal_duration,
            environmental_preferences={
                'reduce_distractions': avg_attention < 50,
                'calm_colors': avg_stress > 50,
                'simplified_ui': avg_frustration > 50,
            },
            visual_learner_score=visual_score,
            auditory_learner_score=auditory_score,
            kinesthetic_learner_score=avg_engagement,
            reading_preference_score=100 - avg_frustration,
            recommended_adaptations=adaptations,
            profile_confidence=min(100, len(sessions) * 10),
            data_points_analyzed=len(sessions),
        )
    
    def _get_default_biometric_profile(self, conditions: List[str]) -> BiometricProfile:
        """Get default profile based on conditions"""
        break_freq = 20
        session_dur = 25
        
        if 'adhd' in conditions:
            break_freq = 15
            session_dur = 20
        
        return BiometricProfile(
            user_id="",
            overall_attention=50,
            overall_engagement=50,
            overall_stress=50,
            overall_confidence=50,
            overall_frustration=50,
            optimal_content_pace='normal',
            preferred_break_frequency=break_freq,
            best_session_duration=session_dur,
            environmental_preferences={},
            visual_learner_score=50,
            auditory_learner_score=50,
            kinesthetic_learner_score=50,
            reading_preference_score=50,
            recommended_adaptations=[],
            profile_confidence=0,
            data_points_analyzed=0,
        )
    
    def _generate_biometric_adaptations(
        self, attention: float, engagement: float, stress: float,
        confidence: float, frustration: float, conditions: List[str]
    ) -> List[Dict[str, Any]]:
        """Generate recommended adaptations based on biometric profile"""
        adaptations = []
        
        if attention < 50:
            adaptations.append({
                'category': 'content',
                'adaptation': 'shorter_segments',
                'reason': 'Lower sustained attention detected',
                'priority': 'high',
            })
        
        if stress > 60:
            adaptations.append({
                'category': 'environment',
                'adaptation': 'calm_theme',
                'reason': 'Elevated stress levels in sessions',
                'priority': 'high',
            })
        
        if frustration > 50:
            adaptations.append({
                'category': 'difficulty',
                'adaptation': 'reduce_complexity',
                'reason': 'Frustration patterns detected',
                'priority': 'high',
            })
        
        if confidence < 40:
            adaptations.append({
                'category': 'feedback',
                'adaptation': 'increased_encouragement',
                'reason': 'Low confidence indicators',
                'priority': 'medium',
            })
        
        if 'dyslexia' in conditions and attention < 60:
            adaptations.append({
                'category': 'accessibility',
                'adaptation': 'reading_aids',
                'reason': 'Reading support needed',
                'priority': 'high',
            })
        
        return adaptations


# Create singleton instance
biometric_analyzer = BiometricAnalyzer()
