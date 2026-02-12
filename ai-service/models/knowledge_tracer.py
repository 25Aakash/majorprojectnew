"""
Bayesian Knowledge Tracing (BKT) for NeuroLearn
Implements per-concept mastery tracking with spaced repetition scheduling.

BKT models the probability that a student has mastered a concept using:
  P(L_n) = P(L_{n-1}) + (1 - P(L_{n-1})) * P(T)
  P(correct | mastered) = 1 - P(S)
  P(correct | not mastered) = P(G)

Where:
  P(L_0) = prior probability of mastery
  P(T) = probability of transitioning from unlearned to learned
  P(G) = probability of guessing correctly
  P(S) = probability of slipping (wrong despite mastery)

Spaced repetition uses a Leitner-style box system:
  Box 1 (new/failed)  → review in 1 day
  Box 2               → review in 3 days
  Box 3               → review in 7 days
  Box 4               → review in 14 days
  Box 5 (mastered)    → review in 30 days
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json


# Leitner box intervals (days)
LEITNER_INTERVALS = {
    1: 1,
    2: 3,
    3: 7,
    4: 14,
    5: 30,
}

MASTERY_THRESHOLD = 0.80  # P(mastery) >= 0.80 means concept is mastered


@dataclass
class ConceptState:
    """Tracks the BKT state of a single concept for a student."""
    concept_id: str
    concept_name: str
    course_id: str
    lesson_id: str

    # BKT parameters (can be customized per condition)
    p_init: float = 0.1       # P(L_0) — prior probability of knowing
    p_transit: float = 0.15   # P(T) — probability of learning per attempt
    p_guess: float = 0.25     # P(G) — probability of guessing correctly
    p_slip: float = 0.10      # P(S) — probability of mistake despite mastery

    # Current state
    p_mastery: float = 0.1    # Current P(L_n)
    attempts: int = 0
    correct_attempts: int = 0
    last_attempt: Optional[str] = None
    response_times: List[float] = field(default_factory=list)

    # Spaced repetition
    leitner_box: int = 1
    next_review: Optional[str] = None
    review_count: int = 0
    is_mastered: bool = False


class BayesianKnowledgeTracer:
    """
    Implements Bayesian Knowledge Tracing with condition-aware parameters
    and Leitner spaced repetition scheduling.
    """

    def __init__(self):
        # Condition-specific BKT parameter adjustments
        self.condition_params = {
            'adhd': {
                'p_init': 0.1,
                'p_transit': 0.12,   # Slightly slower learning transitions
                'p_guess': 0.30,     # Higher guessing (impulsive answers)
                'p_slip': 0.15,      # Higher slip (attention lapses)
            },
            'autism': {
                'p_init': 0.1,
                'p_transit': 0.20,   # Faster once pattern is recognized
                'p_guess': 0.15,     # Lower guessing (methodical approach)
                'p_slip': 0.08,      # Lower slip (consistent when mastered)
            },
            'dyslexia': {
                'p_init': 0.08,
                'p_transit': 0.12,   # Slower for text-heavy concepts
                'p_guess': 0.20,
                'p_slip': 0.12,
            },
            'dyscalculia': {
                'p_init': 0.05,      # Lower initial probability for math
                'p_transit': 0.10,
                'p_guess': 0.25,
                'p_slip': 0.15,
            },
            'default': {
                'p_init': 0.1,
                'p_transit': 0.15,
                'p_guess': 0.25,
                'p_slip': 0.10,
            },
        }

    def get_bkt_params(self, conditions: List[str], subject: str = 'general') -> Dict[str, float]:
        """
        Get BKT parameters adjusted for student conditions.
        If multiple conditions, blend parameters.
        """
        if not conditions:
            return self.condition_params['default'].copy()

        params = {'p_init': 0.0, 'p_transit': 0.0, 'p_guess': 0.0, 'p_slip': 0.0}
        count = 0

        for cond in conditions:
            cond_lower = cond.lower()
            if cond_lower in self.condition_params:
                for key in params:
                    params[key] += self.condition_params[cond_lower][key]
                count += 1

        if count == 0:
            return self.condition_params['default'].copy()

        for key in params:
            params[key] /= count

        return params

    def update_mastery(self, concept: ConceptState, is_correct: bool, response_time: float = 0.0) -> ConceptState:
        """
        Update concept mastery using BKT formula after a student response.

        BKT update:
          If correct:
            P(L_n | correct) = P(L_{n-1}) * (1 - P(S)) / P(correct)
          If incorrect:
            P(L_n | incorrect) = P(L_{n-1}) * P(S) / P(incorrect)

          Then apply learning transition:
            P(L_n) = P(L_n | obs) + (1 - P(L_n | obs)) * P(T)
        """
        p_l = concept.p_mastery
        p_g = concept.p_guess
        p_s = concept.p_slip
        p_t = concept.p_transit

        # Calculate P(correct) for normalization
        p_correct = p_l * (1 - p_s) + (1 - p_l) * p_g

        # Posterior update
        if is_correct:
            p_l_given_obs = (p_l * (1 - p_s)) / max(p_correct, 1e-10)
        else:
            p_incorrect = 1 - p_correct
            p_l_given_obs = (p_l * p_s) / max(p_incorrect, 1e-10)

        # Learning transition
        p_l_new = p_l_given_obs + (1 - p_l_given_obs) * p_t

        # Clamp to [0, 1]
        p_l_new = max(0.0, min(1.0, p_l_new))

        # Update concept state
        concept.p_mastery = round(p_l_new, 4)
        concept.attempts += 1
        if is_correct:
            concept.correct_attempts += 1
        concept.last_attempt = datetime.utcnow().isoformat()
        if response_time > 0:
            concept.response_times.append(response_time)

        # Update mastery flag
        concept.is_mastered = concept.p_mastery >= MASTERY_THRESHOLD

        # Update Leitner box
        concept = self._update_leitner_box(concept, is_correct)

        return concept

    def _update_leitner_box(self, concept: ConceptState, is_correct: bool) -> ConceptState:
        """
        Move concept between Leitner boxes based on correctness.
        Correct → promote one box (max 5)
        Incorrect → demote to box 1
        """
        if is_correct:
            concept.leitner_box = min(5, concept.leitner_box + 1)
        else:
            concept.leitner_box = 1

        # Schedule next review
        interval_days = LEITNER_INTERVALS.get(concept.leitner_box, 1)
        concept.next_review = (datetime.utcnow() + timedelta(days=interval_days)).isoformat()
        concept.review_count += 1

        return concept

    def get_due_concepts(self, concept_states: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Return concepts that are due for review, sorted by priority.
        Priority: overdue items first, then by mastery (lowest first).
        """
        now = datetime.utcnow()
        due = []

        for cs in concept_states:
            next_review = cs.get('next_review')
            if next_review:
                review_dt = datetime.fromisoformat(next_review)
                if review_dt <= now:
                    overdue_days = (now - review_dt).days
                    due.append({
                        **cs,
                        'overdue_days': overdue_days,
                        'priority_score': self._calculate_priority(cs, overdue_days),
                    })
            elif not cs.get('is_mastered', False):
                # Never reviewed — highest priority
                due.append({
                    **cs,
                    'overdue_days': 999,
                    'priority_score': 100.0,
                })

        # Sort by priority (highest first)
        due.sort(key=lambda x: x['priority_score'], reverse=True)
        return due

    def _calculate_priority(self, concept: Dict[str, Any], overdue_days: int) -> float:
        """
        Priority = (1 - mastery) * 50 + overdue_days * 10 + (5 - leitner_box) * 5
        Lower mastery = higher priority
        More overdue = higher priority
        Lower box = higher priority
        """
        mastery = concept.get('p_mastery', 0.1)
        box = concept.get('leitner_box', 1)
        priority = (1 - mastery) * 50 + min(overdue_days, 30) * 10 + (5 - box) * 5
        return round(priority, 2)

    def get_mastery_summary(self, concept_states: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a summary of mastery across all concepts.
        """
        if not concept_states:
            return {
                'total_concepts': 0,
                'mastered': 0,
                'in_progress': 0,
                'needs_review': 0,
                'overall_mastery': 0.0,
                'weakest_concepts': [],
                'strongest_concepts': [],
            }

        masteries = [cs.get('p_mastery', 0.0) for cs in concept_states]
        mastered_count = sum(1 for m in masteries if m >= MASTERY_THRESHOLD)
        now = datetime.utcnow()

        needs_review = 0
        for cs in concept_states:
            nr = cs.get('next_review')
            if nr and datetime.fromisoformat(nr) <= now:
                needs_review += 1

        sorted_by_mastery = sorted(concept_states, key=lambda x: x.get('p_mastery', 0.0))
        weakest = sorted_by_mastery[:5]
        strongest = sorted_by_mastery[-5:][::-1]

        return {
            'total_concepts': len(concept_states),
            'mastered': mastered_count,
            'in_progress': len(concept_states) - mastered_count,
            'needs_review': needs_review,
            'overall_mastery': round(float(np.mean(masteries)), 4),
            'mastery_distribution': {
                'low': sum(1 for m in masteries if m < 0.4),
                'medium': sum(1 for m in masteries if 0.4 <= m < MASTERY_THRESHOLD),
                'high': sum(1 for m in masteries if m >= MASTERY_THRESHOLD),
            },
            'weakest_concepts': [
                {'concept_id': c.get('concept_id'), 'concept_name': c.get('concept_name', ''),
                 'p_mastery': c.get('p_mastery', 0.0), 'leitner_box': c.get('leitner_box', 1)}
                for c in weakest
            ],
            'strongest_concepts': [
                {'concept_id': c.get('concept_id'), 'concept_name': c.get('concept_name', ''),
                 'p_mastery': c.get('p_mastery', 0.0), 'leitner_box': c.get('leitner_box', 1)}
                for c in strongest
            ],
        }

    def predict_time_to_mastery(self, concept: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estimate how many more attempts needed to reach mastery threshold.
        Uses iterative BKT projection.
        """
        p_l = concept.get('p_mastery', 0.1)
        p_t = concept.get('p_transit', 0.15)
        p_g = concept.get('p_guess', 0.25)
        p_s = concept.get('p_slip', 0.10)

        if p_l >= MASTERY_THRESHOLD:
            return {'estimated_attempts': 0, 'already_mastered': True}

        # Simulate correct answers (optimistic path)
        p_sim = p_l
        attempts_optimistic = 0
        while p_sim < MASTERY_THRESHOLD and attempts_optimistic < 100:
            p_correct = p_sim * (1 - p_s) + (1 - p_sim) * p_g
            p_sim = (p_sim * (1 - p_s)) / max(p_correct, 1e-10)
            p_sim = p_sim + (1 - p_sim) * p_t
            attempts_optimistic += 1

        # Simulate with expected accuracy (~70%)
        p_sim = p_l
        attempts_expected = 0
        while p_sim < MASTERY_THRESHOLD and attempts_expected < 200:
            is_correct = np.random.random() < 0.7
            p_correct = p_sim * (1 - p_s) + (1 - p_sim) * p_g
            if is_correct:
                p_sim = (p_sim * (1 - p_s)) / max(p_correct, 1e-10)
            else:
                p_sim = (p_sim * p_s) / max(1 - p_correct, 1e-10)
            p_sim = p_sim + (1 - p_sim) * p_t
            p_sim = max(0, min(1, p_sim))
            attempts_expected += 1

        return {
            'estimated_attempts': attempts_expected,
            'optimistic_attempts': attempts_optimistic,
            'current_mastery': round(p_l, 4),
            'target_mastery': MASTERY_THRESHOLD,
            'already_mastered': False,
        }


# Singleton
knowledge_tracer = BayesianKnowledgeTracer()
