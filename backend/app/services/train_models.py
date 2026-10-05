"""
Model Training and Evaluation Service (Section 8 & Section 9).
Trains L2 Isolation Forest and L3 Calibrated HistGradientBoosting Classifier.
Evaluates metrics against held-out seeds and the L1 baseline.
"""
import os
import json
import joblib
import datetime
import numpy as np
from sklearn.ensemble import IsolationForest, HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    f1_score, precision_score, recall_score
)
from backend.app.services.dataset_generator import generate_scenario_runs, DATASET_VERSION
from backend.app.detection.feature_pipeline import FEATURE_VERSION

MODEL_VERSION = "model-v1.0"

def train_and_evaluate():
    print("=" * 60)
    print("GRIDSHIELD AI — MODEL TRAINING & EVALUATION PIPELINE")
    print("=" * 60)

    os.makedirs("models/registry", exist_ok=True)
    os.makedirs("reports", exist_ok=True)

    # 1. Dataset Generation with Grouped Seed Splits (Avoid Leakage)
    train_seeds = [100, 101, 102, 103, 104, 105, 106, 107]
    val_seeds = [108, 109, 110]
    test_seeds = [111, 112, 113, 114]

    print(f"[1/4] Generating Training Data ({len(train_seeds)} seeds)...")
    X_train, y_train, feature_names, _ = generate_scenario_runs(train_seeds, steps_per_run=35)
    print(f"  Training samples: {X_train.shape[0]}, Features: {X_train.shape[1]}")

    print(f"[2/4] Generating Validation/Calibration Data ({len(val_seeds)} seeds)...")
    X_val, y_val, _, _ = generate_scenario_runs(val_seeds, steps_per_run=35)
    print(f"  Validation samples: {X_val.shape[0]}")

    print(f"[3/4] Generating Held-Out Test Data ({len(test_seeds)} seeds)...")
    X_test, y_test, _, _ = generate_scenario_runs(test_seeds, steps_per_run=35)
    print(f"  Test samples: {X_test.shape[0]}")

    # 2. Train L2 Anomaly Detector (Isolation Forest on NORMAL runs only)
    print("\n[4/4] Training Models...")
    normal_mask_train = (y_train == "NORMAL")
    X_train_normal = X_train[normal_mask_train]

    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.03,
        random_state=42
    )
    iso_forest.fit(X_train_normal)
    print("  [OK] L2 Isolation Forest fitted on normal baseline operating envelope.")

    # 3. Train L3 Multi-Class Classifier with 3-Fold Calibration
    classes = sorted(list(set(y_train)))
    base_clf = HistGradientBoostingClassifier(
        random_state=42,
        max_iter=100,
        early_stopping=True
    )

    # Calibrate probabilities using 3-fold cross-validation
    calibrated_clf = CalibratedClassifierCV(
        estimator=base_clf,
        cv=3
    )
    calibrated_clf.fit(X_train, y_train)
    print("  [OK] L3 HistGradientBoostingClassifier trained and calibrated.")

    # 4. Evaluation on Held-Out Test Set
    y_pred = calibrated_clf.predict(X_test)
    y_prob = calibrated_clf.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    cls_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    conf_matrix = confusion_matrix(y_test, y_pred, labels=classes).tolist()

    # Calculate False Positive Rate on Normal test windows
    normal_test_mask = (y_test == "NORMAL")
    normal_total = int(np.sum(normal_test_mask))
    normal_false_positives = int(np.sum(y_pred[normal_test_mask] != "NORMAL"))
    fpr = float(normal_false_positives / max(normal_total, 1))

    # Baseline L1 Comparison: Check Chi-Square feature alone
    chi2_idx = feature_names.index("l1_chi2_stat")
    l1_flags = X_test[:, chi2_idx] > 70.0
    l1_true_anomalies = y_test != "NORMAL"
    l1_tp = int(np.sum(l1_flags & l1_true_anomalies))
    l1_fp = int(np.sum(l1_flags & (~l1_true_anomalies)))
    l1_fn = int(np.sum((~l1_flags) & l1_true_anomalies))
    l1_precision = float(l1_tp / max(l1_tp + l1_fp, 1))
    l1_recall = float(l1_tp / max(l1_tp + l1_fn, 1))
    l1_f1 = float(2 * l1_precision * l1_recall / max(l1_precision + l1_recall, 1e-6))

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS (Held-Out Test Seeds: 111-114)")
    print("=" * 60)
    print(f"Overall Accuracy:       {acc * 100:.2f}%")
    print(f"Macro F1 Score:         {macro_f1:.4f}")
    print(f"Normal False Pos. Rate: {fpr * 100:.2f}% ({normal_false_positives}/{normal_total})")
    print(f"L1 Baseline Only F1:    {l1_f1:.4f} (Precision: {l1_precision:.2f}, Recall: {l1_recall:.2f})")
    print(f"L3 Classifier F1:       {macro_f1:.4f}")

    # 5. Serialize Models & Metadata
    joblib.dump(iso_forest, "models/registry/isolation_forest.joblib")
    joblib.dump(calibrated_clf, "models/registry/calibrated_classifier.joblib")

    with open("models/registry/feature_names.json", "w", encoding="utf-8") as f:
        json.dump(feature_names, f, indent=2)

    metadata = {
        "model_version": MODEL_VERSION,
        "dataset_version": DATASET_VERSION,
        "feature_version": FEATURE_VERSION,
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "classes": classes,
        "metrics": {
            "accuracy": acc,
            "macro_f1": macro_f1,
            "false_positive_rate": fpr,
            "l1_baseline_f1": l1_f1,
            "per_class": cls_report
        },
        "disclaimer": "MODEL TRAINED AND EVALUATED ON SIMULATED IEEE 14-BUS DATA. METRICS ARE OPTIMISTIC (SIMULATED EVALUATION)."
    }

    with open("models/registry/metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open("reports/training_report.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Markdown evaluation report
    report_md = f"""# GridShield AI — Model Evaluation Report

> **DISCLAIMER**: Model trained and evaluated on simulated digital twin telemetry. Metrics reflect simulated evaluation.

## Summary Metrics
- **Model Version**: `{MODEL_VERSION}`
- **Feature Version**: `{FEATURE_VERSION}`
- **Dataset Version**: `{DATASET_VERSION}`
- **Overall Accuracy**: `{acc * 100:.2f}%`
- **Macro F1 Score**: `{macro_f1:.4f}`
- **Normal FPR**: `{fpr * 100:.2f}%`
- **L1 Baseline (Chi-Square) F1**: `{l1_f1:.4f}`

## Confusion Matrix (Classes: {classes})
```json
{json.dumps(conf_matrix, indent=2)}
```

## Per-Class Classification Report
```json
{json.dumps(cls_report, indent=2)}
```
"""
    with open("reports/model_evaluation.md", "w", encoding="utf-8") as f:
        f.write(report_md)

    print("\nSaved artifacts to models/registry/ and reports/")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
