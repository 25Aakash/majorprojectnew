"""
Quick script to retrain ML models with current scikit-learn version
This resolves the '__pyx_unpickle_CyHalfSquaredError' compatibility issue
"""

import os
import pickle
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler

print("Retraining ML models with current scikit-learn version...")

MODEL_DIR = os.path.join('.', 'models', 'trained')
os.makedirs(MODEL_DIR, exist_ok=True)

# Generate synthetic training data
np.random.seed(42)
n_samples = 1000

# Features: [focus_score, completion_rate, error_rate, session_duration, breaks_taken]
X = np.random.rand(n_samples, 5)
X[:, 0] = np.random.beta(5, 2, n_samples)  # focus_score skewed high
X[:, 1] = np.random.beta(6, 3, n_samples)  # completion_rate skewed high
X[:, 2] = np.random.beta(2, 5, n_samples)  # error_rate skewed low
X[:, 3] = np.random.normal(0.5, 0.2, n_samples).clip(0, 1)  # session_duration
X[:, 4] = np.random.poisson(2, n_samples) / 10  # breaks_taken

# Train difficulty adjuster (regression)
print("\n1. Training difficulty adjuster...")
y_difficulty = (X[:, 0] * 0.4 + X[:, 1] * 0.3 - X[:, 2] * 0.3).clip(0, 1)
difficulty_model = GradientBoostingRegressor(n_estimators=50, max_depth=4, random_state=42)
difficulty_model.fit(X, y_difficulty)
difficulty_path = os.path.join(MODEL_DIR, 'difficulty_model_latest.pkl')
with open(difficulty_path, 'wb') as f:
    pickle.dump(difficulty_model, f)
print(f"   Saved to: {difficulty_path}")

# Train content classifier (classification)
print("\n2. Training content classifier...")
# Classes: 0=video, 1=interactive, 2=text, 3=audio
y_content = np.argmax([
    X[:, 0] * 0.6,  # video benefits from high focus
    X[:, 1] * 0.5 + X[:, 4] * 0.3,  # interactive benefits from engagement
    (1 - X[:, 2]) * 0.4,  # text for low error rate
    (1 - X[:, 0]) * 0.5  # audio when focus is low
], axis=0)
content_classifier = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
content_classifier.fit(X, y_content)
classifier_path = os.path.join(MODEL_DIR, 'content_classifier_latest.pkl')
with open(classifier_path, 'wb') as f:
    pickle.dump(content_classifier, f)
print(f"   Saved to: {classifier_path}")

# Train scaler
print("\n3. Training feature scaler...")
scaler = StandardScaler()
scaler.fit(X)
scaler_path = os.path.join(MODEL_DIR, 'scaler_latest.pkl')
with open(scaler_path, 'wb') as f:
    pickle.dump(scaler, f)
print(f"   Saved to: {scaler_path}")

print("\n✅ All models retrained successfully!")
print(f"\nModel Directory: {os.path.abspath(MODEL_DIR)}")
print("\nRestart the AI service to load the new models.")
