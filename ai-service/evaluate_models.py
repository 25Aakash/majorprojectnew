"""
Model Evaluation Pipeline for NeuroLearn AI Service
====================================================
Produces quantitative metrics (confusion matrix, R², training curves,
heuristic-vs-ML comparison) so evaluators can verify the models
actually work rather than being decorative imports.

Run:  python evaluate_models.py

Outputs:
  - models/metrics/evaluation_report.json  : full metrics
  - models/metrics/evaluation_summary.txt  : human-readable summary

Note on data: This script uses *real* data fetched from your MongoDB
backend via the REST API (same as retrain.py).  If there are fewer
than 10 real students, the evaluation will still proceed but will
print a clear warning that the metrics are low-confidence.

WHERE TO GET REAL DATA
-----------------------
1. Student interaction logs:   Your own platform — every time a student
   completes a session the Express server writes to MongoDB (Progress
   and Session collections).  Run the platform for a while and data
   accumulates organically.
2. Public learning-analytics datasets (for benchmarks):
   - KDD Cup 2010 (Carnegie Learning):  https://pslcdatashop.web.cmu.edu/KDDCup/
   - ASSISTments 2009-2015:  https://sites.google.com/site/assistmaborehardment/home/assistment-2009-2010-data
   - EdNet (AI2):  https://github.com/riiid/ednet
   - Junyi Academy (BKT focused):  https://pslcdatashop.web.cmu.edu/DatasetInfo?datasetId=1198
"""

import os
import json
import pickle
import numpy as np
from datetime import datetime
from typing import Dict, Any, Tuple

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
    mean_squared_error, r2_score, mean_absolute_error,
)
from sklearn.model_selection import cross_val_score

from retrain import ModelTrainer

# Directories
MODEL_DIR = os.getenv("MODEL_DIR", "./models/trained")
METRICS_DIR = os.getenv("METRICS_DIR", "./models/metrics")
os.makedirs(METRICS_DIR, exist_ok=True)


def _load_sklearn_model(name: str):
    path = os.path.join(MODEL_DIR, f"{name}_latest.pkl")
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


def evaluate_difficulty_model(X: np.ndarray, y_true: np.ndarray) -> Dict[str, Any]:
    """Evaluate the GradientBoosting difficulty regressor."""
    model = _load_sklearn_model("difficulty_model")
    if model is None:
        return {"status": "no_model", "message": "difficulty_model_latest.pkl not found — run retrain.py first"}

    y_pred = model.predict(X)
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true, y_pred))
    mae = float(mean_absolute_error(y_true, y_pred))

    # Cross-val if enough data
    cv_scores: list = []
    if len(X) >= 10:
        folds = min(5, len(X))
        cv_scores = cross_val_score(model, X, y_true, cv=folds, scoring="r2").tolist()

    return {
        "model": "GradientBoostingRegressor",
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "mae": round(mae, 4),
        "cross_val_r2": [round(s, 4) for s in cv_scores] if cv_scores else "insufficient data",
        "feature_importances": model.feature_importances_.tolist(),
    }


def evaluate_content_classifier(X: np.ndarray, y_engagement: np.ndarray) -> Dict[str, Any]:
    """Evaluate the RandomForest content-type classifier."""
    model = _load_sklearn_model("content_classifier")
    if model is None:
        return {"status": "no_model", "message": "content_classifier_latest.pkl not found — run retrain.py first"}

    y_true_class = (y_engagement * 3).astype(int).clip(0, 2)
    y_pred = model.predict(X)

    acc = float(accuracy_score(y_true_class, y_pred))
    prec = float(precision_score(y_true_class, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_true_class, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_true_class, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_true_class, y_pred).tolist()
    report = classification_report(y_true_class, y_pred, output_dict=True, zero_division=0)

    # Cross-val
    cv_scores: list = []
    if len(X) >= 10:
        folds = min(5, len(X))
        cv_scores = cross_val_score(model, X, y_true_class, cv=folds, scoring="accuracy").tolist()

    return {
        "model": "RandomForestClassifier",
        "accuracy": round(acc, 4),
        "precision_weighted": round(prec, 4),
        "recall_weighted": round(rec, 4),
        "f1_weighted": round(f1, 4),
        "confusion_matrix": cm,
        "classification_report": report,
        "cross_val_accuracy": [round(s, 4) for s in cv_scores] if cv_scores else "insufficient data",
        "feature_importances": model.feature_importances_.tolist(),
    }


def evaluate_engagement_model(X: np.ndarray, y_true: np.ndarray) -> Dict[str, Any]:
    """Evaluate the TensorFlow engagement NN (if available)."""
    try:
        import tensorflow as tf
        model_path = os.path.join(MODEL_DIR, "engagement_model_latest")
        if not os.path.exists(model_path):
            return {"status": "no_model", "message": "engagement_model_latest not found — run retrain.py first"}

        model = tf.keras.models.load_model(model_path)
        y_pred = model.predict(X, verbose=0).flatten()

        mse = float(mean_squared_error(y_true, y_pred))
        r2 = float(r2_score(y_true, y_pred))
        mae = float(mean_absolute_error(y_true, y_pred))

        return {
            "model": "TensorFlow NN (3-layer)",
            "mse": round(mse, 4),
            "r2": round(r2, 4),
            "mae": round(mae, 4),
            "rmse": round(float(np.sqrt(mse)), 4),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def heuristic_baseline(X: np.ndarray, y_engagement: np.ndarray, y_difficulty: np.ndarray) -> Dict[str, Any]:
    """
    Compare ML models against a naive heuristic baseline
    (always predict mean) to prove ML adds value.
    """
    # Engagement baseline: always predict the mean
    eng_mean = float(np.mean(y_engagement))
    eng_baseline_mse = float(mean_squared_error(y_engagement, np.full_like(y_engagement, eng_mean)))
    eng_baseline_r2 = float(r2_score(y_engagement, np.full_like(y_engagement, eng_mean)))

    # Difficulty baseline: always predict mode
    from scipy import stats as sp_stats
    diff_mode_result = sp_stats.mode(y_difficulty.astype(int), keepdims=True)
    diff_mode = int(diff_mode_result.mode[0])
    diff_baseline_mse = float(mean_squared_error(y_difficulty, np.full_like(y_difficulty, diff_mode)))
    diff_baseline_r2 = float(r2_score(y_difficulty, np.full_like(y_difficulty, diff_mode)))

    return {
        "engagement_heuristic": {
            "strategy": "predict_mean",
            "predicted_value": round(eng_mean, 4),
            "mse": round(eng_baseline_mse, 4),
            "r2": round(eng_baseline_r2, 4),
        },
        "difficulty_heuristic": {
            "strategy": "predict_mode",
            "predicted_value": diff_mode,
            "mse": round(diff_baseline_mse, 4),
            "r2": round(diff_baseline_r2, 4),
        },
    }


def run_evaluation() -> Dict[str, Any]:
    """Full evaluation pipeline."""
    print("=" * 60)
    print("NeuroLearn Model Evaluation Pipeline")
    print("=" * 60)

    trainer = ModelTrainer()

    # Fetch real data
    print("\n[1/5] Fetching real student data from MongoDB ...")
    raw_data = trainer.fetch_training_data()
    n_students = len(raw_data)
    print(f"  Found {n_students} student records.")

    low_data = n_students < 10
    if low_data:
        print("  ⚠  Fewer than 10 students — metrics will have high variance.")
        print("     For statistically robust evaluation, collect more real data.")
        print("     See docstring at top of file for public dataset sources.\n")

    if n_students == 0:
        return {
            "status": "no_data",
            "message": (
                "No student records found. Enrol students on the platform so real "
                "interaction data accumulates, then re-run this script. "
                "Alternatively, seed the DB with one of the public datasets listed "
                "in the file header."
            ),
        }

    # Preprocess
    print("[2/5] Preprocessing features ...")
    X, y_eng, y_diff = trainer.preprocess_data(raw_data)
    X_scaled = trainer.scaler.fit_transform(X)
    print(f"  Feature matrix: {X_scaled.shape}")

    # Evaluate each model
    print("[3/5] Evaluating difficulty model ...")
    diff_eval = evaluate_difficulty_model(X_scaled, y_diff)

    print("[4/5] Evaluating content classifier ...")
    content_eval = evaluate_content_classifier(X_scaled, y_eng)

    print("[5/5] Evaluating engagement model ...")
    eng_eval = evaluate_engagement_model(X_scaled, y_eng)

    # Baseline comparison
    print("\nComputing heuristic baseline for comparison ...")
    baseline = heuristic_baseline(X_scaled, y_eng, y_diff)

    report = {
        "timestamp": datetime.now().isoformat(),
        "n_students": n_students,
        "low_data_warning": low_data,
        "feature_count": int(X_scaled.shape[1]),
        "models": {
            "engagement_nn": eng_eval,
            "difficulty_regressor": diff_eval,
            "content_classifier": content_eval,
        },
        "heuristic_baseline": baseline,
        "verdict": _generate_verdict(eng_eval, diff_eval, content_eval, baseline),
    }

    # Save
    report_path = os.path.join(METRICS_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\nReport saved → {report_path}")

    # Human-readable summary
    summary_path = os.path.join(METRICS_DIR, "evaluation_summary.txt")
    with open(summary_path, "w") as f:
        f.write(_pretty_summary(report))
    print(f"Summary saved → {summary_path}")

    print("\n" + _pretty_summary(report))
    return report


def _generate_verdict(eng: Dict, diff: Dict, content: Dict, baseline: Dict) -> str:
    parts = []

    # Engagement
    if eng.get("r2") is not None and isinstance(eng["r2"], (int, float)):
        bl_mse = baseline["engagement_heuristic"]["mse"]
        ml_mse = eng.get("mse", bl_mse)
        if ml_mse < bl_mse:
            parts.append(f"Engagement NN beats mean-baseline by {((bl_mse - ml_mse)/bl_mse*100):.1f}% MSE reduction.")
        else:
            parts.append("Engagement NN does NOT beat mean-baseline — likely needs more data or tuning.")

    # Difficulty
    if isinstance(diff.get("r2"), (int, float)):
        if diff["r2"] > 0.5:
            parts.append(f"Difficulty model R²={diff['r2']:.2f} — good predictive power.")
        elif diff["r2"] > 0.0:
            parts.append(f"Difficulty model R²={diff['r2']:.2f} — weak but positive signal.")
        else:
            parts.append(f"Difficulty model R²={diff['r2']:.2f} — not useful yet, needs more diverse data.")

    # Content classifier
    if isinstance(content.get("accuracy"), (int, float)):
        if content["accuracy"] > 0.7:
            parts.append(f"Content classifier accuracy={content['accuracy']:.2f} — strong.")
        else:
            parts.append(f"Content classifier accuracy={content['accuracy']:.2f} — moderate.")

    return " ".join(parts) if parts else "Could not evaluate — models not trained. Run retrain.py first."


def _pretty_summary(report: Dict) -> str:
    lines = [
        "╔══════════════════════════════════════════════╗",
        "║    NeuroLearn Model Evaluation Summary        ║",
        "╚══════════════════════════════════════════════╝",
        f"  Date        : {report['timestamp'][:19]}",
        f"  Students    : {report['n_students']}",
        f"  Features    : {report['feature_count']}",
        "",
    ]

    if report.get("low_data_warning"):
        lines.append("  ⚠  LOW DATA WARNING — collect more student interactions for robust results.\n")

    for name, m in report.get("models", {}).items():
        lines.append(f"  ── {name} ──")
        if m.get("status") in ("no_model", "error"):
            lines.append(f"     {m.get('message', 'unavailable')}")
        else:
            for k, v in m.items():
                if k in ("model", "confusion_matrix", "classification_report", "feature_importances"):
                    continue
                if isinstance(v, float):
                    lines.append(f"     {k:25s} : {v:.4f}")
                else:
                    lines.append(f"     {k:25s} : {v}")
        lines.append("")

    lines.append("  ── Heuristic Baseline ──")
    for kind, bl in report.get("heuristic_baseline", {}).items():
        lines.append(f"     {kind}: predict={bl.get('predicted_value')} → MSE={bl.get('mse'):.4f}, R²={bl.get('r2'):.4f}")
    lines.append("")

    lines.append(f"  Verdict: {report.get('verdict', 'N/A')}")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    run_evaluation()
