"""
Adaptive Profiler
Analyzes student behavioral data to build personalized learning profiles
Uses machine learning to discover optimal learning patterns during onboarding
"""

import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import json


@dataclass
class SessionData:
    """Represents a single learning session's data"""
    session_id: str
    user_id: str
    duration: int
    active_duration: int
    time_of_day: str
    day_of_week: int
    
    # Behavioral metrics
    avg_time_on_content: float
    tab_switches: int
    scroll_speed: str
    backtrack_count: int
    click_frequency: float
    response_time: float
    reread_count: int
    help_requests: int
    frustration_score: float
    engagement_score: float
    
    # Content interactions
    content_interactions: List[Dict]
    quiz_performance: List[Dict]
    breaks_taken: List[Dict]
    
    # Outcomes
    lesson_completed: bool
    overall_performance: float
    focus_score: float


class AdaptiveProfiler:
    """
    Builds and updates adaptive learning profiles based on behavioral analysis.
    Uses a combination of rule-based analysis and pattern recognition.
    """
    
    def __init__(self):
        # Thresholds for classification
        self.attention_thresholds = {
            'low': 300,      # < 5 minutes
            'medium': 900,   # 5-15 minutes  
            'high': 1800     # > 15 minutes
        }
        
        self.frustration_thresholds = {
            'low': 30,
            'medium': 60,
            'high': 80
        }
        
        # Neurodiverse-specific patterns
        self.condition_patterns = {
            'adhd': {
                'expected_attention_span': 600,  # 10 minutes
                'optimal_break_frequency': 15,
                'high_tab_switch_threshold': 5,
                'benefits_from_gamification': True,
                'needs_chunked_content': True
            },
            'autism': {
                'expected_attention_span': 1200,  # 20 minutes when interested
                'optimal_break_frequency': 30,
                'prefers_predictability': True,
                'sensitive_to_changes': True,
                'needs_structured_content': True
            },
            'dyslexia': {
                'expected_reading_speed': 0.5,  # relative to average
                'benefits_from_audio': True,
                'benefits_from_visual': True,
                'needs_larger_text': True,
                'optimal_line_length': 60  # characters
            },
            'dyscalculia': {
                'needs_visual_math': True,
                'benefits_from_manipulatives': True,
                'needs_extra_time': True,
                'avoid_timed_exercises': True
            },
            'dysgraphia': {
                'minimize_writing': True,
                'benefits_from_typing': True,
                'benefits_from_voice_input': True
            }
        }
    
    def analyze_session(self, session: SessionData, conditions: List[str]) -> Dict[str, Any]:
        """
        Analyze a single session and extract learning pattern insights.
        """
        insights = {
            'attention_analysis': self._analyze_attention(session),
            'content_preferences': self._analyze_content_preferences(session),
            'timing_analysis': self._analyze_timing(session),
            'emotional_state': self._analyze_emotional_state(session),
            'interaction_patterns': self._analyze_interactions(session),
            'condition_specific': self._analyze_for_conditions(session, conditions),
            'recommendations': []
        }
        
        # Generate recommendations based on analysis
        insights['recommendations'] = self._generate_session_recommendations(insights, conditions)
        
        return insights
    
    def _analyze_attention(self, session: SessionData) -> Dict[str, Any]:
        """Analyze attention patterns from session data"""
        attention_data = {
            'average_focus_time': session.avg_time_on_content,
            'attention_category': 'medium',
            'distraction_indicators': [],
            'focus_quality': 'good'
        }
        
        # Categorize attention span
        if session.avg_time_on_content < self.attention_thresholds['low']:
            attention_data['attention_category'] = 'low'
            attention_data['focus_quality'] = 'needs_support'
        elif session.avg_time_on_content > self.attention_thresholds['high']:
            attention_data['attention_category'] = 'high'
            attention_data['focus_quality'] = 'excellent'
        
        # Identify distraction indicators
        if session.tab_switches > 5:
            attention_data['distraction_indicators'].append('frequent_tab_switching')
        if session.backtrack_count > 3:
            attention_data['distraction_indicators'].append('frequent_backtracking')
        if session.active_duration < session.duration * 0.7:
            attention_data['distraction_indicators'].append('low_active_time_ratio')
        
        return attention_data
    
    def _analyze_content_preferences(self, session: SessionData) -> Dict[str, Any]:
        """Analyze which content types work best"""
        preferences = {
            'content_effectiveness': {},
            'best_content_type': None,
            'worst_content_type': None,
            'skip_patterns': []
        }
        
        if not session.content_interactions:
            return preferences
        
        # Calculate effectiveness for each content type
        type_scores = {}
        type_counts = {}
        
        for interaction in session.content_interactions:
            content_type = interaction.get('contentType', 'text')
            engagement = interaction.get('engagementLevel', 'medium')
            completion = interaction.get('completionRate', 0.5)
            was_skipped = interaction.get('wasSkipped', False)
            
            # Calculate score
            engagement_score = {'low': 0.3, 'medium': 0.6, 'high': 1.0}.get(engagement, 0.6)
            skip_penalty = 0.2 if was_skipped else 0
            score = (engagement_score * 0.5 + completion * 0.5) - skip_penalty
            
            if content_type not in type_scores:
                type_scores[content_type] = []
                type_counts[content_type] = 0
            
            type_scores[content_type].append(score)
            type_counts[content_type] += 1
            
            if was_skipped:
                preferences['skip_patterns'].append(content_type)
        
        # Average scores
        for content_type, scores in type_scores.items():
            preferences['content_effectiveness'][content_type] = {
                'score': np.mean(scores) * 100,
                'count': type_counts[content_type]
            }
        
        # Find best and worst
        if preferences['content_effectiveness']:
            sorted_types = sorted(
                preferences['content_effectiveness'].items(),
                key=lambda x: x[1]['score'],
                reverse=True
            )
            preferences['best_content_type'] = sorted_types[0][0]
            if len(sorted_types) > 1:
                preferences['worst_content_type'] = sorted_types[-1][0]
        
        return preferences
    
    def _analyze_timing(self, session: SessionData) -> Dict[str, Any]:
        """Analyze when the student learns best"""
        return {
            'time_of_day': session.time_of_day,
            'day_of_week': session.day_of_week,
            'session_duration': session.duration,
            'active_ratio': session.active_duration / max(session.duration, 1),
            'performance_at_time': session.overall_performance,
            'focus_at_time': session.focus_score
        }
    
    def _analyze_emotional_state(self, session: SessionData) -> Dict[str, Any]:
        """Analyze emotional state during session"""
        return {
            'frustration_level': session.frustration_score,
            'engagement_level': session.engagement_score,
            'needs_intervention': session.frustration_score > 70,
            'emotional_stability': 'stable' if abs(session.frustration_score - 50) < 20 else 'variable',
            'help_seeking_behavior': 'active' if session.help_requests > 0 else 'passive'
        }
    
    def _analyze_interactions(self, session: SessionData) -> Dict[str, Any]:
        """Analyze interaction patterns"""
        return {
            'click_frequency': session.click_frequency,
            'interaction_style': self._classify_interaction_style(session),
            'response_speed': self._classify_response_speed(session.response_time),
            'reread_behavior': 'frequent' if session.reread_count > 2 else 'normal',
            'breaks_pattern': self._analyze_breaks(session.breaks_taken)
        }
    
    def _classify_interaction_style(self, session: SessionData) -> str:
        """Classify how the student interacts with content"""
        if session.click_frequency > 2:
            return 'exploratory'
        elif session.click_frequency < 0.5:
            return 'passive'
        else:
            return 'balanced'
    
    def _classify_response_speed(self, response_time: float) -> str:
        """Classify response speed for answers"""
        if response_time < 5:
            return 'impulsive'
        elif response_time > 30:
            return 'deliberate'
        else:
            return 'balanced'
    
    def _analyze_breaks(self, breaks: List[Dict]) -> Dict[str, Any]:
        """Analyze break-taking patterns"""
        if not breaks:
            return {'pattern': 'no_breaks', 'recommendation': 'encourage_breaks'}
        
        prompted_breaks = sum(1 for b in breaks if b.get('wasPrompted', False))
        voluntary_breaks = len(breaks) - prompted_breaks
        returned_after = sum(1 for b in breaks if b.get('returnedAfter', True))
        
        return {
            'total_breaks': len(breaks),
            'prompted_vs_voluntary': prompted_breaks / max(len(breaks), 1),
            'return_rate': returned_after / max(len(breaks), 1),
            'pattern': 'self_regulated' if voluntary_breaks > prompted_breaks else 'needs_prompting'
        }
    
    def _analyze_for_conditions(self, session: SessionData, conditions: List[str]) -> Dict[str, Any]:
        """Condition-specific analysis"""
        analysis = {}
        
        for condition in conditions:
            condition_lower = condition.lower()
            if condition_lower in self.condition_patterns:
                pattern = self.condition_patterns[condition_lower]
                
                if condition_lower == 'adhd':
                    analysis['adhd'] = {
                        'attention_within_expected': session.avg_time_on_content >= pattern['expected_attention_span'] * 0.7,
                        'needs_more_frequent_breaks': session.tab_switches > pattern['high_tab_switch_threshold'],
                        'gamification_effective': session.engagement_score > 60,
                        'chunking_recommendation': session.backtrack_count > 2
                    }
                
                elif condition_lower == 'autism':
                    analysis['autism'] = {
                        'comfortable_with_structure': session.frustration_score < 50,
                        'needs_predictability': session.frustration_score > 60,
                        'deep_focus_achieved': session.avg_time_on_content > pattern['expected_attention_span']
                    }
                
                elif condition_lower == 'dyslexia':
                    text_interactions = [i for i in session.content_interactions if i.get('contentType') == 'text']
                    audio_interactions = [i for i in session.content_interactions if i.get('contentType') == 'audio']
                    
                    analysis['dyslexia'] = {
                        'text_engagement': np.mean([i.get('completionRate', 0) for i in text_interactions]) if text_interactions else 0.5,
                        'audio_preference': len(audio_interactions) > len(text_interactions),
                        'reread_frequency': session.reread_count,
                        'needs_audio_support': session.reread_count > 3 or session.help_requests > 2
                    }
        
        return analysis
    
    def _generate_session_recommendations(self, insights: Dict, conditions: List[str]) -> List[Dict]:
        """Generate actionable recommendations based on session analysis"""
        recommendations = []
        
        # Attention-based recommendations
        attention = insights['attention_analysis']
        if attention['attention_category'] == 'low':
            recommendations.append({
                'type': 'attention',
                'priority': 'high',
                'action': 'reduce_content_chunk_size',
                'reason': 'Short attention span detected',
                'suggested_value': 'tiny'
            })
        
        if 'frequent_tab_switching' in attention.get('distraction_indicators', []):
            recommendations.append({
                'type': 'focus',
                'priority': 'high',
                'action': 'enable_focus_mode',
                'reason': 'Frequent distractions detected'
            })
        
        # Content preference recommendations
        content = insights['content_preferences']
        if content.get('best_content_type'):
            recommendations.append({
                'type': 'content',
                'priority': 'medium',
                'action': 'prioritize_content_type',
                'reason': f"Student engages best with {content['best_content_type']} content",
                'suggested_value': content['best_content_type']
            })
        
        # Emotional state recommendations
        emotional = insights['emotional_state']
        if emotional['needs_intervention']:
            recommendations.append({
                'type': 'emotional',
                'priority': 'high',
                'action': 'trigger_calming_intervention',
                'reason': 'High frustration level detected'
            })
        
        # Break recommendations
        interaction = insights['interaction_patterns']
        if interaction['breaks_pattern'].get('pattern') == 'needs_prompting':
            recommendations.append({
                'type': 'breaks',
                'priority': 'medium',
                'action': 'increase_break_reminders',
                'reason': 'Student benefits from prompted breaks'
            })
        
        return recommendations
    
    def build_adaptive_profile(
        self,
        sessions: List[Dict],
        conditions: List[str],
        existing_profile: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Build or update an adaptive profile based on multiple sessions.
        This is the main function called after analyzing behavioral data.
        """
        if not sessions:
            return self._get_default_profile(conditions)
        
        # Convert to SessionData objects
        session_objects = [self._dict_to_session(s) for s in sessions]
        
        # Analyze all sessions
        all_insights = [self.analyze_session(s, conditions) for s in session_objects]
        
        # Aggregate insights
        profile = {
            'discovered_preferences': self._aggregate_preferences(all_insights, session_objects),
            'attention_profile': self._aggregate_attention(all_insights, session_objects),
            'emotional_thresholds': self._aggregate_emotional(all_insights),
            'insights': self._generate_insights(all_insights, session_objects, conditions),
            'confidence_scores': self._calculate_confidence(len(sessions))
        }
        
        # Merge with existing profile if provided
        if existing_profile:
            profile = self._merge_profiles(existing_profile, profile)
        
        return profile
    
    def _dict_to_session(self, data: Dict) -> SessionData:
        """Convert dictionary to SessionData object"""
        behavioral = data.get('behavioralMetrics', {})
        scroll = behavioral.get('scrollPatterns', {})
        
        return SessionData(
            session_id=str(data.get('_id', '')),
            user_id=str(data.get('userId', '')),
            duration=data.get('totalDuration', 0),
            active_duration=data.get('activeDuration', 0),
            time_of_day=data.get('timeOfDay', 'afternoon'),
            day_of_week=data.get('dayOfWeek', 1),
            avg_time_on_content=behavioral.get('averageTimeOnContent', 0),
            tab_switches=behavioral.get('tabSwitches', 0),
            scroll_speed=scroll.get('speed', 'medium'),
            backtrack_count=scroll.get('backtrackCount', 0),
            click_frequency=behavioral.get('clickFrequency', 0),
            response_time=behavioral.get('responseTime', 0),
            reread_count=behavioral.get('rereadCount', 0),
            help_requests=behavioral.get('helpRequests', 0),
            frustration_score=behavioral.get('frustrationScore', 50),
            engagement_score=behavioral.get('engagementScore', 50),
            content_interactions=data.get('contentInteractions', []),
            quiz_performance=data.get('quizPerformance', []),
            breaks_taken=data.get('breaksTaken', []),
            lesson_completed=data.get('lessonCompleted', False),
            overall_performance=data.get('overallPerformance', 0),
            focus_score=data.get('focusScore', 0)
        )
    
    def _aggregate_preferences(self, insights: List[Dict], sessions: List[SessionData]) -> Dict:
        """Aggregate preferences from multiple sessions"""
        # Calculate optimal chunk size based on attention patterns
        avg_attention = np.mean([s.avg_time_on_content for s in sessions])
        if avg_attention < 180:
            chunk_size = 'tiny'
        elif avg_attention < 400:
            chunk_size = 'small'
        elif avg_attention < 900:
            chunk_size = 'medium'
        else:
            chunk_size = 'large'
        
        # Calculate optimal session duration
        successful_sessions = [s for s in sessions if s.lesson_completed and s.overall_performance > 60]
        if successful_sessions:
            optimal_duration = int(np.median([s.duration / 60 for s in successful_sessions]))
        else:
            optimal_duration = 15
        
        # Determine break frequency based on attention drops
        avg_tab_switches = np.mean([s.tab_switches for s in sessions])
        if avg_tab_switches > 5:
            break_frequency = 10
        elif avg_tab_switches > 2:
            break_frequency = 15
        else:
            break_frequency = 25
        
        # Aggregate content type effectiveness
        content_scores = {}
        for insight in insights:
            content_prefs = insight.get('content_preferences', {}).get('content_effectiveness', {})
            for content_type, data in content_prefs.items():
                if content_type not in content_scores:
                    content_scores[content_type] = []
                content_scores[content_type].append(data.get('score', 50))
        
        preferred_content_types = [
            {'type': t, 'effectivenessScore': np.mean(scores)}
            for t, scores in content_scores.items()
        ]
        preferred_content_types.sort(key=lambda x: x['effectivenessScore'], reverse=True)
        
        # Analyze time slot performance
        time_performance = {}
        for s in sessions:
            if s.time_of_day not in time_performance:
                time_performance[s.time_of_day] = []
            time_performance[s.time_of_day].append(s.overall_performance)
        
        optimal_time_slots = [
            {'timeOfDay': t, 'performanceScore': np.mean(scores)}
            for t, scores in time_performance.items()
        ]
        optimal_time_slots.sort(key=lambda x: x['performanceScore'], reverse=True)
        
        # Determine if needs more examples/practice
        avg_help_requests = np.mean([s.help_requests for s in sessions])
        avg_reread = np.mean([s.reread_count for s in sessions])
        
        return {
            'optimalChunkSize': chunk_size,
            'optimalSessionDuration': min(optimal_duration, 45),
            'optimalBreakFrequency': break_frequency,
            'optimalBreakDuration': 5,
            'preferredContentTypes': preferred_content_types[:5],
            'optimalTimeSlots': optimal_time_slots,
            'idealDifficultyProgression': self._determine_difficulty_progression(sessions),
            'needsMoreExamples': avg_help_requests > 2,
            'needsMorePractice': avg_reread > 3,
            'visualComplexityTolerance': self._determine_visual_tolerance(sessions),
            'audioComplexityTolerance': 'medium',
            'animationTolerance': 'minimal' if np.mean([s.frustration_score for s in sessions]) > 60 else 'moderate',
            'prefersGuidedLearning': avg_help_requests > 1,
            'prefersExploration': np.mean([s.click_frequency for s in sessions]) > 1.5,
            'needsFrequentFeedback': True,
            'respondsToGamification': np.mean([s.engagement_score for s in sessions]) > 60
        }
    
    def _determine_difficulty_progression(self, sessions: List[SessionData]) -> str:
        """Determine ideal difficulty progression speed"""
        avg_frustration = np.mean([s.frustration_score for s in sessions])
        avg_performance = np.mean([s.overall_performance for s in sessions])
        
        if avg_frustration > 65 or avg_performance < 50:
            return 'slow'
        elif avg_frustration < 40 and avg_performance > 75:
            return 'fast'
        else:
            return 'moderate'
    
    def _determine_visual_tolerance(self, sessions: List[SessionData]) -> str:
        """Determine visual complexity tolerance"""
        avg_backtrack = np.mean([s.backtrack_count for s in sessions])
        if avg_backtrack > 4:
            return 'low'
        elif avg_backtrack < 2:
            return 'high'
        return 'medium'
    
    def _aggregate_attention(self, insights: List[Dict], sessions: List[SessionData]) -> Dict:
        """Aggregate attention patterns"""
        attention_durations = [s.avg_time_on_content for s in sessions]
        
        return {
            'averageFocusDuration': int(np.mean(attention_durations)),
            'focusRecoveryTime': 300,  # Default 5 minutes
            'distractionSensitivity': 'high' if np.mean([s.tab_switches for s in sessions]) > 3 else 'medium',
            'optimalContentLength': int(np.mean(attention_durations) * 0.8)  # Content should be slightly shorter than focus time
        }
    
    def _aggregate_emotional(self, insights: List[Dict]) -> Dict:
        """Aggregate emotional thresholds"""
        frustration_scores = [i['emotional_state']['frustration_level'] for i in insights]
        engagement_scores = [i['emotional_state']['engagement_level'] for i in insights]
        
        return {
            'frustrationTriggerPoint': max(50, np.percentile(frustration_scores, 75)),
            'disengagementTriggerPoint': max(20, np.percentile(engagement_scores, 25)),
            'optimalChallengeLevel': np.mean(engagement_scores)
        }
    
    def _generate_insights(
        self,
        insights: List[Dict],
        sessions: List[SessionData],
        conditions: List[str]
    ) -> List[Dict]:
        """Generate human-readable insights"""
        generated_insights = []
        num_sessions = len(sessions)
        
        # Best time to learn
        time_performance = {}
        for s in sessions:
            if s.time_of_day not in time_performance:
                time_performance[s.time_of_day] = []
            time_performance[s.time_of_day].append(s.overall_performance)
        
        if time_performance:
            best_time = max(time_performance.items(), key=lambda x: np.mean(x[1]))
            generated_insights.append({
                'insight': f"You learn best in the {best_time[0]} with {int(np.mean(best_time[1]))}% average performance",
                'confidence': min(90, num_sessions * 10),
                'discoveredOn': datetime.now().isoformat(),
                'basedOnSessions': num_sessions
            })
        
        # Content preference insight
        all_content = {}
        for insight in insights:
            for ctype, data in insight.get('content_preferences', {}).get('content_effectiveness', {}).items():
                if ctype not in all_content:
                    all_content[ctype] = []
                all_content[ctype].append(data.get('score', 50))
        
        if all_content:
            best_content = max(all_content.items(), key=lambda x: np.mean(x[1]))
            generated_insights.append({
                'insight': f"{best_content[0].capitalize()} content works best for you ({int(np.mean(best_content[1]))}% effectiveness)",
                'confidence': min(85, num_sessions * 8),
                'discoveredOn': datetime.now().isoformat(),
                'basedOnSessions': num_sessions
            })
        
        # Attention span insight
        avg_focus = np.mean([s.avg_time_on_content for s in sessions])
        generated_insights.append({
            'insight': f"Your optimal focus period is about {int(avg_focus / 60)} minutes before needing a break",
            'confidence': min(80, num_sessions * 7),
            'discoveredOn': datetime.now().isoformat(),
            'basedOnSessions': num_sessions
        })
        
        # Condition-specific insights
        for condition in conditions:
            condition_lower = condition.lower()
            condition_data = [i.get('condition_specific', {}).get(condition_lower, {}) for i in insights]
            
            if condition_lower == 'adhd' and condition_data:
                if any(d.get('needs_more_frequent_breaks') for d in condition_data):
                    generated_insights.append({
                        'insight': "More frequent breaks help you maintain focus better",
                        'confidence': 75,
                        'discoveredOn': datetime.now().isoformat(),
                        'basedOnSessions': num_sessions
                    })
            
            elif condition_lower == 'dyslexia' and condition_data:
                audio_pref = sum(1 for d in condition_data if d.get('audio_preference', False))
                if audio_pref > len(condition_data) * 0.6:
                    generated_insights.append({
                        'insight': "Audio content helps you learn more effectively than text",
                        'confidence': 80,
                        'discoveredOn': datetime.now().isoformat(),
                        'basedOnSessions': num_sessions
                    })
        
        return generated_insights
    
    def _calculate_confidence(self, num_sessions: int) -> Dict:
        """Calculate confidence scores based on amount of data"""
        base_confidence = min(100, num_sessions * 15)
        
        return {
            'overallConfidence': base_confidence,
            'contentPreferenceConfidence': min(100, num_sessions * 12),
            'timingPreferenceConfidence': min(100, num_sessions * 10),
            'attentionPatternConfidence': min(100, num_sessions * 18)
        }
    
    def _merge_profiles(self, existing: Dict, new: Dict) -> Dict:
        """Merge existing profile with new data, weighted by confidence"""
        # For now, prefer new data if confidence is higher
        merged = existing.copy()
        
        existing_confidence = existing.get('confidenceScores', {}).get('overallConfidence', 0)
        new_confidence = new.get('confidenceScores', {}).get('overallConfidence', 0)
        
        if new_confidence >= existing_confidence:
            merged.update(new)
        
        return merged
    
    def _get_default_profile(self, conditions: List[str]) -> Dict:
        """Get default profile based on conditions"""
        profile = {
            'discovered_preferences': {
                'optimalChunkSize': 'medium',
                'optimalSessionDuration': 25,
                'optimalBreakFrequency': 25,
                'optimalBreakDuration': 5,
                'preferredContentTypes': [],
                'optimalTimeSlots': [],
                'idealDifficultyProgression': 'moderate',
                'needsMoreExamples': False,
                'needsMorePractice': False,
                'visualComplexityTolerance': 'medium',
                'audioComplexityTolerance': 'medium',
                'animationTolerance': 'moderate',
                'prefersGuidedLearning': True,
                'prefersExploration': False,
                'needsFrequentFeedback': True,
                'respondsToGamification': True
            },
            'attention_profile': {
                'averageFocusDuration': 900,
                'focusRecoveryTime': 300,
                'distractionSensitivity': 'medium',
                'optimalContentLength': 500
            },
            'emotional_thresholds': {
                'frustrationTriggerPoint': 70,
                'disengagementTriggerPoint': 30,
                'optimalChallengeLevel': 60
            },
            'insights': [],
            'confidence_scores': {
                'overallConfidence': 0,
                'contentPreferenceConfidence': 0,
                'timingPreferenceConfidence': 0,
                'attentionPatternConfidence': 0
            }
        }
        
        # Apply condition-specific defaults
        for condition in conditions:
            condition_lower = condition.lower()
            if condition_lower == 'adhd':
                profile['discovered_preferences']['optimalChunkSize'] = 'small'
                profile['discovered_preferences']['optimalSessionDuration'] = 15
                profile['discovered_preferences']['optimalBreakFrequency'] = 15
                profile['attention_profile']['distractionSensitivity'] = 'high'
            elif condition_lower == 'dyslexia':
                profile['discovered_preferences']['optimalChunkSize'] = 'small'
                profile['discovered_preferences']['preferredContentTypes'] = [
                    {'type': 'audio', 'effectivenessScore': 80},
                    {'type': 'video', 'effectivenessScore': 75}
                ]
        
        return profile
    
    def get_real_time_adaptation(
        self,
        current_session: Dict,
        profile: Dict,
        conditions: List[str]
    ) -> Dict[str, Any]:
        """
        Get real-time adaptations during an active learning session.
        Called periodically to adjust content on the fly.
        """
        session = self._dict_to_session(current_session)
        
        adaptations = {
            'should_suggest_break': False,
            'should_simplify_content': False,
            'should_offer_alternative_format': False,
            'suggested_format': None,
            'should_reduce_difficulty': False,
            'calming_intervention_needed': False,
            'encouragement_needed': False,
            'messages': []
        }
        
        # Check if break is needed
        if session.avg_time_on_content > profile.get('attention_profile', {}).get('averageFocusDuration', 900):
            adaptations['should_suggest_break'] = True
            adaptations['messages'].append("You've been focusing well! Time for a quick break?")
        
        # Check frustration level
        threshold = profile.get('emotional_thresholds', {}).get('frustrationTriggerPoint', 70)
        if session.frustration_score > threshold:
            adaptations['calming_intervention_needed'] = True
            adaptations['should_simplify_content'] = True
            adaptations['messages'].append("Let's take it easier. Would you like a simpler explanation?")
        
        # Check engagement
        if session.engagement_score < profile.get('emotional_thresholds', {}).get('disengagementTriggerPoint', 30):
            adaptations['encouragement_needed'] = True
            if profile.get('discovered_preferences', {}).get('respondsToGamification'):
                adaptations['messages'].append("You're making progress! Keep going to earn bonus points!")
            else:
                adaptations['messages'].append("You're doing great. Just a little more to go!")
        
        # Check if alternative content format would help
        preferred_types = profile.get('discovered_preferences', {}).get('preferredContentTypes', [])
        if preferred_types and session.engagement_score < 50:
            best_type = preferred_types[0].get('type') if preferred_types else None
            if best_type:
                adaptations['should_offer_alternative_format'] = True
                adaptations['suggested_format'] = best_type
                adaptations['messages'].append(f"Would you like to try the {best_type} version instead?")
        
        return adaptations


# Create singleton instance
adaptive_profiler = AdaptiveProfiler()
