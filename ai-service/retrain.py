"""
Retrain the adaptive learning model using latest student data.
This script should be scheduled to run weekly.

Features:
- Proper ML training with scikit-learn and TensorFlow
- Model versioning with timestamps
- Training metrics storage
- Validation/test split for evaluation
"""

import os
import json
import pickle
import httpx
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from keras import Model as KerasModel

# ML Libraries
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score

# TensorFlow is optional - use if available
try:
    import tensorflow as tf
    from tensorflow import keras
    from keras import layers  # type: ignore
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    tf = None
    keras = None
    layers = None

from models.learning_model import AdaptiveLearningModel

# Configuration
MODEL_DIR = os.getenv("MODEL_DIR", "./models/trained")
METRICS_DIR = os.getenv("METRICS_DIR", "./models/metrics")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")

# Ensure directories exist
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(METRICS_DIR, exist_ok=True)


class ModelTrainer:
    """
    Production-grade model trainer with versioning and metrics
    """
    
    def __init__(self):
        self.version = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.metrics = {}
        
    def fetch_training_data(self) -> List[Dict[str, Any]]:
        """
        Fetch all student progress data from the backend API for training
        """
        try:
            with httpx.Client(timeout=30.0) as client:
                # Fetch all users who are students
                users_response = client.get(f"{BACKEND_API_URL}/api/auth/students")
                if users_response.status_code != 200:
                    print("Could not fetch students, using empty dataset")
                    return []
                
                students = users_response.json()
                training_data = []
                
                for student in students:
                    student_id = str(student.get("_id", student.get("id", "")))
                    
                    # Fetch progress for each student
                    progress_response = client.get(f"{BACKEND_API_URL}/api/progress/{student_id}")
                    sessions_response = client.get(f"{BACKEND_API_URL}/api/progress/{student_id}/sessions")
                    
                    progress = progress_response.json() if progress_response.status_code == 200 else {}
                    sessions = sessions_response.json() if sessions_response.status_code == 200 else []
                    
                    neuro_profile = student.get("neurodiverseProfile", {})
                    
                    training_data.append({
                        "student_id": student_id,
                        "conditions": neuro_profile.get("conditions", []),
                        "learning_style": neuro_profile.get("learningStyle", "visual"),
                        "sensory_preferences": neuro_profile.get("sensoryPreferences", {}),
                        "focus_settings": neuro_profile.get("focusSettings", {}),
                        "progress": progress,
                        "sessions": sessions,
                        "rewards": student.get("rewards", {})
                    })
                
                return training_data
        except Exception as e:
            print(f"Error fetching training data: {e}")
            return []

    def preprocess_data(self, raw_data: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Preprocess raw data into features and labels for ML training
        Returns: (features, engagement_labels, difficulty_labels)
        """
        features = []
        engagement_labels = []
        difficulty_labels = []
        
        # Condition encoding
        all_conditions = ['adhd', 'autism', 'dyslexia', 'dyscalculia', 'dyspraxia']
        
        for student in raw_data:
            # Extract features
            conditions = [c.lower() for c in student.get("conditions", [])]
            sessions = student.get("sessions", [])
            progress = student.get("progress", {})
            rewards = student.get("rewards", {})
            
            # Condition one-hot encoding
            condition_features = [1 if c in conditions else 0 for c in all_conditions]
            
            # Learning style encoding
            style_map = {"visual": 0, "auditory": 1, "kinesthetic": 2, "reading": 3}
            learning_style = style_map.get(student.get("learning_style", "visual"), 0)
            
            # Session-based features
            total_sessions = len(sessions)
            if total_sessions > 0:
                avg_duration = np.mean([s.get("duration", 0) for s in sessions]) / 60  # minutes
                avg_interactions = np.mean([s.get("interactions", 0) for s in sessions])
                completion_rate = np.mean([s.get("completion_rate", 0.5) for s in sessions])
            else:
                avg_duration = 0
                avg_interactions = 0
                completion_rate = 0.5
            
            # Progress features
            overall_progress = progress.get("overallProgress", 0) / 100
            lessons_completed = progress.get("lessonsCompleted", 0)
            quizzes_passed = progress.get("quizzesPassed", 0)
            
            # Reward features
            points = rewards.get("points", 0)
            streak_days = rewards.get("streakDays", 0)
            badges_count = len(rewards.get("badges", []))
            
            # Combine all features
            feature_vector = (
                condition_features +  # 5 features
                [learning_style] +    # 1 feature
                [avg_duration, avg_interactions, completion_rate] +  # 3 features
                [overall_progress, lessons_completed, quizzes_passed] +  # 3 features
                [points / 1000, streak_days / 30, badges_count / 10]  # 3 normalized features
            )
            
            features.append(feature_vector)
            
            # Calculate engagement score (0-1) based on activity
            engagement = min(1.0, (
                (completion_rate * 0.3) +
                (min(avg_duration, 30) / 30 * 0.2) +
                (min(avg_interactions, 100) / 100 * 0.2) +
                (min(streak_days, 30) / 30 * 0.3)
            ))
            engagement_labels.append(engagement)
            
            # Recommended difficulty level (1-10)
            difficulty = min(10, max(1, int(
                3 +  # base difficulty
                (overall_progress * 4) +  # higher progress = higher difficulty
                (completion_rate * 2) +  # good completion = can handle more
                (-1 if 'adhd' in conditions else 0) +  # ADHD students need lower starting
                (-1 if 'dyslexia' in conditions else 0)  # dyslexia students need lower starting
            )))
            difficulty_labels.append(difficulty)
        
        return np.array(features), np.array(engagement_labels), np.array(difficulty_labels)

    def train_engagement_model(self, X_train: np.ndarray, y_train: np.ndarray, 
                                X_val: np.ndarray, y_val: np.ndarray) -> Any:
        """
        Train a neural network to predict student engagement
        """
        if not TF_AVAILABLE:
            raise RuntimeError("TensorFlow not available. Install with: pip install tensorflow")
        
        # Build TensorFlow model
        model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
            layers.BatchNormalization(),
            layers.Dropout(0.3),
            layers.Dense(32, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        # Early stopping
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        # Train
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=100,
            batch_size=32,
            callbacks=[early_stop],
            verbose=1
        )
        
        # Store metrics
        y_pred = model.predict(X_val).flatten()
        self.metrics['engagement_model'] = {
            'mse': float(mean_squared_error(y_val, y_pred)),
            'r2': float(r2_score(y_val, y_pred)),
            'mae': float(np.mean(np.abs(y_val - y_pred))),
            'epochs_trained': len(history.history['loss'])
        }
        
        return model

    def train_difficulty_model(self, X_train: np.ndarray, y_train: np.ndarray,
                                X_val: np.ndarray, y_val: np.ndarray) -> GradientBoostingRegressor:
        """
        Train a Gradient Boosting model to predict optimal difficulty
        """
        model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_val)
        self.metrics['difficulty_model'] = {
            'mse': float(mean_squared_error(y_val, y_pred)),
            'r2': float(r2_score(y_val, y_pred)),
            'rmse': float(np.sqrt(mean_squared_error(y_val, y_pred)))
        }
        
        return model

    def train_content_classifier(self, X_train: np.ndarray, y_train: np.ndarray,
                                  X_val: np.ndarray, y_val: np.ndarray) -> RandomForestClassifier:
        """
        Train a Random Forest to classify best content type
        """
        # Convert continuous engagement to classes
        y_train_class = (y_train * 3).astype(int).clip(0, 2)  # 0=low, 1=medium, 2=high
        y_val_class = (y_val * 3).astype(int).clip(0, 2)
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        model.fit(X_train, y_train_class)
        
        # Evaluate
        y_pred = model.predict(X_val)
        self.metrics['content_classifier'] = {
            'accuracy': float(accuracy_score(y_val_class, y_pred)),
            'precision': float(precision_score(y_val_class, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_val_class, y_pred, average='weighted', zero_division=0)),
            'f1': float(f1_score(y_val_class, y_pred, average='weighted', zero_division=0)),
            'feature_importances': model.feature_importances_.tolist()
        }
        
        return model

    def save_models(self, engagement_model: Any, 
                   difficulty_model: GradientBoostingRegressor,
                   content_classifier: RandomForestClassifier,
                   adaptive_model: AdaptiveLearningModel):
        """
        Save all models with versioning
        """
        version = self.version
        
        # Save TensorFlow model
        engagement_path = os.path.join(MODEL_DIR, f"engagement_model_{version}")
        engagement_model.save(engagement_path)
        
        # Save sklearn models
        difficulty_path = os.path.join(MODEL_DIR, f"difficulty_model_{version}.pkl")
        with open(difficulty_path, 'wb') as f:
            pickle.dump(difficulty_model, f)
        
        content_path = os.path.join(MODEL_DIR, f"content_classifier_{version}.pkl")
        with open(content_path, 'wb') as f:
            pickle.dump(content_classifier, f)
        
        # Save adaptive model
        adaptive_path = os.path.join(MODEL_DIR, f"adaptive_model_{version}.pkl")
        with open(adaptive_path, 'wb') as f:
            pickle.dump(adaptive_model, f)
        
        # Save scaler
        scaler_path = os.path.join(MODEL_DIR, f"scaler_{version}.pkl")
        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        
        # Create symlinks to latest models
        latest_links = {
            'engagement_model_latest': engagement_path,
            'difficulty_model_latest.pkl': difficulty_path,
            'content_classifier_latest.pkl': content_path,
            'adaptive_model_latest.pkl': adaptive_path,
            'scaler_latest.pkl': scaler_path
        }
        
        for link_name, target in latest_links.items():
            link_path = os.path.join(MODEL_DIR, link_name)
            # Remove existing link/file
            if os.path.exists(link_path):
                if os.path.isdir(link_path):
                    import shutil
                    shutil.rmtree(link_path)
                else:
                    os.remove(link_path)
            # Copy for Windows compatibility (symlinks require admin)
            if os.path.isdir(target):
                import shutil
                shutil.copytree(target, link_path)
            else:
                import shutil
                shutil.copy2(target, link_path)
        
        print(f"Models saved with version: {version}")

    def save_metrics(self):
        """
        Save training metrics for monitoring
        """
        metrics_file = os.path.join(METRICS_DIR, f"metrics_{self.version}.json")
        
        full_metrics = {
            'version': self.version,
            'timestamp': datetime.now().isoformat(),
            'models': self.metrics
        }
        
        with open(metrics_file, 'w') as f:
            json.dump(full_metrics, f, indent=2)
        
        # Also save to latest
        latest_metrics = os.path.join(METRICS_DIR, "metrics_latest.json")
        with open(latest_metrics, 'w') as f:
            json.dump(full_metrics, f, indent=2)
        
        print(f"Metrics saved: {metrics_file}")
        return full_metrics

    def update_adaptive_model(self, raw_data: List[Dict[str, Any]], 
                              adaptive_model: AdaptiveLearningModel) -> AdaptiveLearningModel:
        """
        Update the adaptive learning model based on aggregate student data
        """
        # Analyze patterns across all students
        condition_stats = {}
        
        for student in raw_data:
            conditions = [c.lower() for c in student.get("conditions", [])]
            sessions = student.get("sessions", [])
            progress = student.get("progress", {})
            rewards = student.get("rewards", {})
            
            for condition in conditions:
                if condition not in condition_stats:
                    condition_stats[condition] = {
                        'count': 0,
                        'avg_session_duration': [],
                        'avg_completion': [],
                        'avg_engagement': [],
                        'preferred_gamification': []
                    }
                
                stats = condition_stats[condition]
                stats['count'] += 1
                
                if sessions:
                    stats['avg_session_duration'].append(
                        np.mean([s.get('duration', 0) / 60 for s in sessions])
                    )
                    stats['avg_completion'].append(
                        np.mean([s.get('completion_rate', 0.5) for s in sessions])
                    )
                
                # Determine gamification preference based on engagement
                points = rewards.get('points', 0)
                badges = len(rewards.get('badges', []))
                if points > 500 or badges > 5:
                    stats['preferred_gamification'].append('high')
                elif points > 100 or badges > 2:
                    stats['preferred_gamification'].append('medium')
                else:
                    stats['preferred_gamification'].append('low')
        
        # Update adaptive model based on learned patterns
        for condition, stats in condition_stats.items():
            if condition in adaptive_model.condition_adaptations:
                adaptations = adaptive_model.condition_adaptations[condition]
                
                # Update chunk size based on session duration
                if stats['avg_session_duration']:
                    avg_duration = np.mean(stats['avg_session_duration'])
                    if avg_duration < 15:
                        adaptations['chunk_size'] = 'small'
                    elif avg_duration < 30:
                        adaptations['chunk_size'] = 'medium'
                    else:
                        adaptations['chunk_size'] = 'large'
                
                # Update gamification based on engagement patterns
                if stats['preferred_gamification']:
                    from collections import Counter
                    most_common = Counter(stats['preferred_gamification']).most_common(1)[0][0]
                    adaptations['gamification'] = most_common
        
        return adaptive_model

    def run(self) -> Dict[str, Any]:
        """
        Run the complete training pipeline
        """
        print("=" * 60)
        print(f"Starting Model Training Pipeline - Version {self.version}")
        print("=" * 60)
        
        # Step 1: Fetch data
        print("\n[1/6] Fetching training data from database...")
        raw_data = self.fetch_training_data()
        print(f"Fetched data for {len(raw_data)} students")
        
        if len(raw_data) < 5:
            print("⚠  WARNING: Insufficient real data for proper training (found < 5 students).")
            print("   The models WILL NOT be trained with synthetic/fake data.")
            print("")
            print("   WHERE TO GET REAL DATA:")
            print("   1. Use the platform — every student session writes to MongoDB automatically.")
            print("      Enrol at least 15-20 students and let them complete a few lessons each.")
            print("   2. Seed your DB with a public learning-analytics dataset:")
            print("      • ASSISTments 2009-2015: https://sites.google.com/site/assistmentsdata/datasets")
            print("      • EdNet (AI2/Riiid):     https://github.com/riiid/ednet")
            print("      • Junyi Academy (BKT):    https://pslcdatashop.web.cmu.edu/DatasetInfo?datasetId=1198")
            print("      • KDD Cup 2010:           https://pslcdatashop.web.cmu.edu/KDDCup/")
            print("")
            print("   After seeding, re-run: python retrain.py")
            return {"status": "insufficient_data", "students_found": len(raw_data),
                    "message": "Need at least 5 students with session data. See console for data sources."}
        
        # Step 2: Preprocess
        print("\n[2/6] Preprocessing data...")
        X, y_engagement, y_difficulty = self.preprocess_data(raw_data)
        print(f"Feature matrix shape: {X.shape}")
        
        # Normalize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Step 3: Train/validation split
        print("\n[3/6] Splitting data (80% train, 20% validation)...")
        X_train, X_val, y_eng_train, y_eng_val, y_diff_train, y_diff_val = train_test_split(
            X_scaled, y_engagement, y_difficulty,
            test_size=0.2, random_state=42
        )
        print(f"Training samples: {len(X_train)}, Validation samples: {len(X_val)}")
        
        # Step 4: Train models
        print("\n[4/6] Training models...")
        
        print("  - Training engagement prediction model (TensorFlow)...")
        engagement_model = self.train_engagement_model(X_train, y_eng_train, X_val, y_eng_val)
        
        print("  - Training difficulty prediction model (Gradient Boosting)...")
        difficulty_model = self.train_difficulty_model(X_train, y_diff_train, X_val, y_diff_val)
        
        print("  - Training content classifier (Random Forest)...")
        content_classifier = self.train_content_classifier(X_train, y_eng_train, X_val, y_eng_val)
        
        # Step 5: Update adaptive model
        print("\n[5/6] Updating adaptive learning model...")
        adaptive_model = AdaptiveLearningModel()
        adaptive_model = self.update_adaptive_model(raw_data, adaptive_model)
        
        # Step 6: Save everything
        print("\n[6/6] Saving models and metrics...")
        self.save_models(engagement_model, difficulty_model, content_classifier, adaptive_model)
        metrics = self.save_metrics()
        
        print("\n" + "=" * 60)
        print("Training Complete!")
        print("=" * 60)
        print(f"\nMetrics Summary:")
        for model_name, model_metrics in self.metrics.items():
            print(f"\n  {model_name}:")
            for metric_name, value in model_metrics.items():
                if isinstance(value, float):
                    print(f"    - {metric_name}: {value:.4f}")
                elif isinstance(value, list) and len(value) > 5:
                    print(f"    - {metric_name}: [array of {len(value)} values]")
                else:
                    print(f"    - {metric_name}: {value}")
        
        return metrics

    # _augment_data removed — the project does NOT use synthetic data.
    # For real training data, see evaluate_models.py header for public dataset links.


def retrain_model():
    """
    Main entry point for model retraining
    """
    trainer = ModelTrainer()
    return trainer.run()


if __name__ == "__main__":
    retrain_model()
