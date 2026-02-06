# NeuroLearn – Adaptive Platform Implementation Log

**Author:** Aakash  
**Date:** February 6, 2026

---

## Summary

NeuroLearn was approximately **70% adaptive** before today's work. Six critical gaps were identified and fully implemented, bringing the platform to a **fully adaptive, closed-loop learning system**. All **303 tests** (Server 95 + Client 56 + AI Service 152) pass after the changes, including **34 new tests** covering all newly added functionality.

---

## How the Adaptive System Works (End-to-End Flow)

```
Student opens a lesson
        │
        ▼
┌──────────────────────┐
│   LessonView.tsx     │  ← Frontend lesson page
│  ┌────────────────┐  │
│  │ useAdaptiveTracking │  Tracks: time-on-content, tab switches, scroll patterns,
│  │                     │          click frequency, hover time, pause count
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │ useBiometricTracking│  Tracks: voice (pace, pitch, confidence, stress),
│  │                     │          eye tracking (fixations, saccades, fatigue),
│  │                     │          mouse (movement, clicks, scroll, frustration)
│  └────────────────┘  │
│  ┌────────────────┐  │
│  │ useSSEInterventions │  Listens for server-pushed real-time interventions
│  └────────────────┘  │
└──────────┬───────────┘
           │  Every 30s (periodic updates)
           ▼
┌──────────────────────┐
│  Express Server      │  Routes: /api/adaptive-learning, /api/biometric, /api/ai/*
│  (Node.js + MongoDB) │
│                      │  • Proxies AI requests to FastAPI
│                      │  • Persists biometric data to MongoDB (NEW)
│                      │  • Streams SSE events to client (NEW)
│                      │  • Updates adaptive profile for ALL users (NEW)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  AI Service (FastAPI) │
│                      │
│  Models:             │
│  • AdaptiveLearningModel  → Predicts engagement, optimal content type, difficulty
│  • ContentRecommender     → Compatibility-scored course recommendations
│  • DifficultyAdjuster     → Adjusts difficulty based on performance + frustration
│  • BiometricAnalyzer      → Analyzes voice/eye/mouse for stress, focus, attention
│  • AdaptiveProfiler       → Builds long-term learner profiles from session history
│  │
│  ML Pipeline (NEW):      │
│  • Loads trained TensorFlow engagement model from disk
│  • Loads scikit-learn difficulty & content classifiers
│  • Falls back to heuristics when models aren't trained yet
│  │
│  SSE Push (NEW):         │
│  • Maintains per-user event queues
│  • Pushes high-priority interventions instantly
│  │
│  Content Generation (NEW):│
│  • Auto-generates visual/auditory/kinesthetic/simplified variants
└──────────────────────┘
```

**The adaptive loop:** Collect behavioral + biometric data → Send to AI → Get real-time adaptations (break suggestions, difficulty changes, format switches, calming activities) → Push interventions to the student via SSE → Student responds → Data feeds back into the model → Profile continuously improves.

---

## Changes Implemented Today

### Gap 1: Wire Trained ML Models into Inference Pipeline

**Problem:** `retrain.py` trained TensorFlow and scikit-learn models and saved them to `models/trained/`, but the runtime `AdaptiveLearningModel` never loaded or used them. All predictions were heuristic-only.

**Files Changed:**
| File | Change |
|------|--------|
| `ai-service/models/learning_model.py` | Added `_load_ml_models()` — loads `engagement_model_latest/` (TensorFlow), `difficulty_model_latest.pkl`, `content_classifier_latest.pkl`, `scaler_latest.pkl` from disk |
| `ai-service/models/learning_model.py` | Added `has_trained_models` property to report model availability |
| `ai-service/models/learning_model.py` | Enhanced `predict_learning_outcome()` — uses TF engagement model when available, falls back to heuristic |
| `ai-service/models/learning_model.py` | Added `predict_optimal_content_type()` — uses content classifier to suggest best content format |
| `ai-service/models/learning_model.py` | Added `predict_difficulty()` — uses difficulty model to suggest optimal difficulty level |
| `ai-service/models/learning_model.py` | Added `_build_feature_vector()` — builds 15-feature vectors matching `retrain.py`'s preprocessor (5 condition one-hot + 4 style one-hot + 3 session stats + 2 progress + 1 difficulty) |
| `ai-service/main.py` | Added `GET /api/ai/model-status` — reports which ML models are loaded |
| `ai-service/main.py` | Added `POST /api/ai/retrain` — triggers model retraining and reloads models |
| `ai-service/main.py` | Health check now includes `ml_models_loaded` status |

---

### Gap 2: Real-Time Adaptation Post-Onboarding

**Problem:** The server only called the AI service for real-time adaptations during the first 7 days (onboarding period). After that, students got no AI-driven adaptations.

**Files Changed:**
| File | Change |
|------|--------|
| `server/src/routes/adaptive-learning.routes.ts` | Removed `if (session.isOnboardingPeriod)` guard on the session update endpoint — AI adaptation now runs for **every** session update |
| `server/src/routes/adaptive-learning.routes.ts` | Removed `if (session.isOnboardingPeriod)` guard on the session end endpoint — profile updates now happen after **every** session |
| `server/src/routes/adaptive-learning.routes.ts` | `updateAdaptiveProfile()` now fetches all sessions (limit 100) instead of only onboarding sessions |

---

### Gap 3: Persist Biometric Data in MongoDB

**Problem:** The client's `useBiometricTracking` hook sent biometric data directly to the AI service for analysis, but never saved it to MongoDB. No historical biometric data was being stored.

**Files Changed:**
| File | Change |
|------|--------|
| `server/src/routes/biometric.routes.ts` | Added `POST /biometric/persist` — bulk endpoint that creates/updates a `BiometricSession` document with voice, eye, mouse metrics and computed scores |
| `client/src/hooks/useBiometricTracking.ts` | After receiving AI analysis response, now fires a background `POST /biometric/persist` call to save data to MongoDB (non-blocking, silent fail) |

---

### Gap 4: Wire AI Recommender to Frontend

**Problem:** `AIRecommendations.tsx` fetched from `GET /adaptive/recommendations` which was a simple MongoDB query filtering by neurodiverse flags. The AI service's smarter `ContentRecommender` (with compatibility scoring) was never used in the frontend.

**Files Changed:**
| File | Change |
|------|--------|
| `ai-service/main.py` | Added `POST /api/ai/smart-recommend` — uses `ContentRecommender` for compatibility-scored recommendations, enhanced with ML predictions (optimal content type + confidence) when models are available |
| `client/src/components/AIRecommendations.tsx` | Now tries `POST /ai/smart-recommend` first (AI-powered), falls back to simple MongoDB query. Added `ml_optimal_content_type`, `ml_confidence`, `compatibility_score` to the Recommendation interface |

---

### Gap 5: Auto-Generate Content Variants

**Problem:** `content_generator.py` had `adapt_existing_content()` method but it was never exposed as an API endpoint. No way to auto-generate simplified/visual/audio variants of lesson content.

**Files Changed:**
| File | Change |
|------|--------|
| `ai-service/main.py` | Added `POST /api/ai/generate-variants` — takes lesson content + target conditions/styles, produces visual, auditory, kinesthetic, and simplified variants using `content_generator.adapt_existing_content()` |

---

### Gap 6: SSE Push Interventions

**Problem:** Interventions were only delivered when the client polled (every 30s). High-priority interventions (e.g., student in distress) had to wait for the next poll cycle. No server-push mechanism existed.

**Files Changed:**
| File | Change |
|------|--------|
| `ai-service/main.py` | Added SSE client registry (`sse_clients: Dict[str, asyncio.Queue]`) |
| `ai-service/main.py` | Added `GET /api/ai/events/{user_id}` — Server-Sent Events stream with keepalive every 30s and auto-cleanup on disconnect |
| `ai-service/main.py` | Biometric real-time intervention endpoint now pushes high-priority events to the user's SSE queue immediately |
| `ai-service/main.py` | Added `user_id` field to `CombinedBiometricRequest` model |
| `server/src/index.ts` | Added SSE proxy route — streams `GET /api/ai/events/:userId` from AI service to client with proper headers |
| `client/src/hooks/useSSEInterventions.ts` | **New file** — EventSource hook with auto-reconnect (5s backoff), parses intervention events and triggers callbacks |
| `client/src/pages/LessonView.tsx` | Integrated `useSSEInterventions` hook — connects on lesson load, shows push interventions via the existing `AdaptiveInterventionModal` |

---

### Bug Fixes (TypeScript Errors in LessonView.tsx)

| Fix | Detail |
|-----|--------|
| Unused imports | Removed `useCallback`, `metrics`, `startVoiceTracking`, `stopVoiceTracking` |
| Wrong property names | `suggestBreak` → `should_suggest_break`, `adjustDifficulty` → `should_reduce_difficulty`, `suggestedContentFormat` → `suggested_format`, `calmingActivity` → `calming_intervention_needed` |
| Wrong function signatures | `trackQuizAnswer(isCorrect, 'medium')` → `trackQuizAnswer(questionId, isCorrect, timeToAnswer, usedHint)` |
| Missing argument | `trackBreakTaken()` → `trackBreakTaken(true)` |
| Undefined variable | `recommender` → `content_recommender` in `main.py` |
| Wrong endpoint impl | `smart-recommend` called nonexistent `recommender.recommend_courses()` → uses `content_recommender.get_recommendations()` (async) |
| Wrong kwargs | `generate-variants` used `target_condition`/`target_style` → `conditions`/`learning_styles`; content must be `str` not `dict` |
| Wrong ML call args | `predict_optimal_content_type()` received wrong param names → fixed to `(profile, historical_performance)` |
| Wrong model field names | BiometricSession persist route used `attentionLevel`/`engagementLevel`/`focusLevel`/`mouseMetrics` → `attentionScore`/`engagementScore`/`focusQuality`/`mouseTrackingMetrics` |
| Wrong interface fields | Persist route used `averagePitch`/`confidenceScore`/`scrollBehavior` → `pitchLevel`/`speechClarity`/`scrollPatterns` (matching `IBiometricSession` interface) |
| Missing required fields | Persist route didn't supply `courseId` → now extracted from request body |

---

## Test Results (Post-Implementation)

| Service | Tests | Suites | Status |
|---------|-------|--------|--------|
| AI Service (pytest) | 152 | 7 | ✅ All passing |
| Server (jest) | 95 | 6 | ✅ All passing |
| Client (vitest) | 56 | 5 | ✅ All passing |
| **Total** | **303** | **18** | **✅ All passing** |
| TypeScript errors | 0 | — | ✅ Clean |
| Python lint errors | 0 | — | ✅ Clean |

---

## New Files Created

| File | Purpose |
|------|---------|
| `client/src/hooks/useSSEInterventions.ts` | EventSource hook for real-time push interventions || `ai-service/tests/test_new_endpoints.py` | 21 tests — model-status, generate-variants, smart-recommend, SSE, biometric user_id, ML integration |
| `client/src/__tests__/hooks/useSSEInterventions.test.ts` | 8 tests — connect/disconnect, intervention events, reconnect, cleanup |
| `server/src/__tests__/models/BiometricSession.model.test.ts` | 5 tests — create with scores, find by userId+lessonId, update scores, active sessions |
---

## New API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/ai/model-status` | Report ML model availability |
| POST | `/api/ai/retrain` | Trigger model retraining |
| POST | `/api/ai/generate-variants` | Auto-generate content variants |
| POST | `/api/ai/smart-recommend` | AI-powered course recommendations |
| GET | `/api/ai/events/{user_id}` | SSE stream for push interventions |
| POST | `/api/biometric/persist` | Persist biometric snapshot to MongoDB |

---

## Architecture Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| ML Models | Trained but never loaded at runtime | Loaded on startup, used for predictions with heuristic fallback |
| Adaptation | Only during 7-day onboarding | Continuous, every session |
| Biometric Data | Analyzed then discarded | Analyzed AND persisted to MongoDB |
| Recommendations | Simple MongoDB filter | AI compatibility scoring + ML enhancement |
| Content Variants | Manual creation only | Auto-generated via API |
| Interventions | Poll-based (30s delay) | Real-time push via SSE |
| Adaptive Loop | Open (gaps in pipeline) | Closed (collect → analyze → adapt → push → learn) |
