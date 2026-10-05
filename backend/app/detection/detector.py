"""
Runtime Cyber-Physical Anomaly Detector & Classifier (Section 8 & Section 9).
Integrates L1 (WLS Bad Data), L2 (Isolation Forest Anomaly Score), and L3 (Calibrated Classifier).
Applies abstention threshold (UNKNOWN) for low certainty or conflicting cross-domain signals.
"""
import os
import json
import joblib
import numpy as np
from typing import Dict, Any, List, Optional
from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, CyberEvent, DetectionResult,
    L1Detection, L2Detection, L3Classification, ClassificationClass,
    Provenance
)
from backend.app.detection.wls_estimator import WLSStateEstimator
from backend.app.detection.feature_pipeline import FeaturePipeline

ABSTENTION_PROB_THRESHOLD = 0.45
ABSTENTION_MARGIN_THRESHOLD = 0.10

class AnomalyDetector:
    def __init__(self, models_dir: str = "models/registry"):
        self.models_dir = models_dir
        self.wls_estimator = WLSStateEstimator(num_buses=14)
        self.feature_pipeline = FeaturePipeline()
        self.iso_forest = None
        self.classifier = None
        self.feature_names: List[str] = []
        self.model_version = "model-v1.0"
        self._load_models()

    def _load_models(self):
        iso_path = os.path.join(self.models_dir, "isolation_forest.joblib")
        clf_path = os.path.join(self.models_dir, "calibrated_classifier.joblib")
        fn_path = os.path.join(self.models_dir, "feature_names.json")

        if os.path.exists(iso_path) and os.path.exists(clf_path) and os.path.exists(fn_path):
            self.iso_forest = joblib.load(iso_path)
            self.classifier = joblib.load(clf_path)
            with open(fn_path, "r", encoding="utf-8") as f:
                self.feature_names = json.load(f)

    def analyze(self,
                step: int,
                observed_points: List[ObservedTelemetryPoint],
                cyber_events: List[CyberEvent]) -> DetectionResult:
        """
        Execute full L1, L2, L3 multi-layer detection pipeline on observed telemetry.
        """
        # 1. L1 Classical Bad-Data Detection
        l1_res = self.wls_estimator.analyze(observed_points)

        # 2. Extract Features
        feat_vec = self.feature_pipeline.extract_features(step, observed_points, cyber_events)

        # 3. L2 Anomaly Detection (Isolation Forest)
        l2_flag = False
        anomaly_score = 0.0
        if self.iso_forest and self.feature_names:
            x_row = np.array([[feat_vec.features.get(k, 0.0) for k in self.feature_names]])
            # IsolationForest score_samples: lower = more anomalous
            raw_score = float(self.iso_forest.score_samples(x_row)[0])
            # Normalize to 0 (normal) to 1 (highly anomalous)
            anomaly_score = max(0.0, min(1.0, float(-raw_score)))
            l2_flag = bool(self.iso_forest.predict(x_row)[0] == -1)

        l2_res = L2Detection(
            flagged=l2_flag,
            anomaly_score=round(anomaly_score, 3),
            threshold=0.50,
            provenance=Provenance.MODEL
        )

        # 4. L3 Multi-Class Classification with Calibration & Abstention
        predicted_class = ClassificationClass.NORMAL
        calibrated_prob = 1.0
        class_probs: Dict[str, float] = {"NORMAL": 1.0}

        if self.classifier and self.feature_names:
            x_row = np.array([[feat_vec.features.get(k, 0.0) for k in self.feature_names]])
            probs = self.classifier.predict_proba(x_row)[0]
            classes = self.classifier.classes_
            class_probs = {str(c): round(float(p), 4) for c, p in zip(classes, probs)}

            # Sorted probabilities
            sorted_indices = np.argsort(probs)[::-1]
            top_idx = sorted_indices[0]
            second_idx = sorted_indices[1] if len(sorted_indices) > 1 else top_idx

            top_prob = float(probs[top_idx])
            second_prob = float(probs[second_idx]) if top_idx != second_idx else 0.0
            margin = top_prob - second_prob
            top_class_str = str(classes[top_idx])

            # Abstention rule (Section 9): If probability is below threshold or margin is too narrow
            if top_prob < ABSTENTION_PROB_THRESHOLD or (margin < ABSTENTION_MARGIN_THRESHOLD and top_class_str != "NORMAL"):
                predicted_class = ClassificationClass.UNKNOWN
                calibrated_prob = round(top_prob, 3)
            else:
                try:
                    predicted_class = ClassificationClass(top_class_str)
                except ValueError:
                    predicted_class = ClassificationClass.UNKNOWN
                calibrated_prob = round(top_prob, 3)

        l3_res = L3Classification(
            predicted_class=predicted_class,
            calibrated_probability=calibrated_prob,
            class_probabilities=class_probs,
            model_version=self.model_version,
            provenance=Provenance.MODEL
        )

        overall_flag = bool(l1_res.flagged or l2_res.flagged or (predicted_class not in [ClassificationClass.NORMAL, ClassificationClass.UNKNOWN]))

        return DetectionResult(
            step=step,
            l1=l1_res,
            l2=l2_res,
            l3=l3_res,
            overall_anomaly_flag=overall_flag,
            provenance=Provenance.CALCULATED
        )
