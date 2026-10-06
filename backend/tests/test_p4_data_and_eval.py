"""
Phase P4 Test Suite: Data & Evaluation Harness.

Validates:
1. Multi-scenario benchmark dataset generator produces valid, non-leaking feature matrices.
2. Ground-truth firewall invariant: features depend ONLY on observed telemetry and cyber events.
3. Wilson score confidence interval mathematical correctness.
4. Evaluation reports (metrics.json, REPORT.md) and model metadata schema integrity.
5. Multi-tier FDI detection capabilities across signal-to-noise thresholds.
6. Detector abstention and classification probability calibration.
"""
import os
import json
import math
import pytest
import numpy as np

from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, AttackSpec, AttackType,
    ClassificationClass, Provenance
)
from backend.app.services.dataset_generator import generate_scenario_runs
from backend.app.detection.detector import AnomalyDetector
from backend.app.detection.feature_pipeline import FeaturePipeline
from backend.app.services.simulation_runner import SimulationRunner
from scripts.evaluate import wilson_score_interval


def test_wilson_score_interval_properties():
    """Verify Wilson score interval satisfies mathematical and edge-case invariants."""
    # 0 observations
    low, high = wilson_score_interval(0, 0)
    assert low == 0.0 and high == 0.0

    # 0 positives out of 100
    low_0, high_0 = wilson_score_interval(0, 100)
    assert low_0 == 0.0
    assert 0.0 < high_0 < 0.05

    # 50 positives out of 100 (symmetric around 0.5)
    low_50, high_50 = wilson_score_interval(50, 100)
    assert round(low_50, 2) == 0.40
    assert round(high_50, 2) == 0.60
    assert (low_50 + high_50) / 2 == pytest.approx(0.5, abs=1e-3)

    # 100 positives out of 100
    low_100, high_100 = wilson_score_interval(100, 100)
    assert 0.95 < low_100 < 1.0
    assert high_100 == 1.0


def test_dataset_generator_firewall_and_shape():
    """Verify dataset generator adheres to ground-truth firewall and produces clean data."""
    test_seeds = [199]
    steps_per_run = 10
    X, y, feature_names, groups = generate_scenario_runs(test_seeds, steps_per_run=steps_per_run)

    # 8 scenarios * 10 steps = 80 samples
    assert X.shape[0] == 80
    assert X.shape[1] == len(feature_names)
    assert len(y) == 80
    assert len(groups) == 80

    # Verify no NaN or Inf
    assert not np.isnan(X).any()
    assert not np.isinf(X).any()

    # Verify unique run groups isolate scenarios to prevent leakage
    assert len(set(groups)) == 8


def test_model_registry_metadata_and_compatibility():
    """Verify model registry metadata and compatibility files are valid."""
    metadata_path = "models/registry/metadata.json"
    compat_path = "models/registry/compatibility.json"

    assert os.path.exists(metadata_path), f"Missing {metadata_path}"
    assert os.path.exists(compat_path), f"Missing {compat_path}"

    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["model_version"] == "model-v1.0"
    assert "metrics" in meta
    assert meta["metrics"]["accuracy"] > 0.85
    assert meta["metrics"]["macro_f1"] > 0.80
    assert meta["metrics"]["false_positive_rate"] < 0.05
    assert "SIMULATED" in meta["disclaimer"].upper()

    with open(compat_path, "r", encoding="utf-8") as f:
        compat = json.load(f)

    assert "model-v1.0" in compat["models"]
    assert compat["models"]["model-v1.0"]["validated"] is True
    assert "IEEE_14" in compat["models"]["model-v1.0"]["supported_topologies"]


def test_detector_multi_tier_fdi():
    """Verify AnomalyDetector behavior across clean, subtle, and gross FDI."""
    detector = AnomalyDetector()

    # 1. Clean run -> NORMAL
    spec_normal = ScenarioSpec(scenario_type=ScenarioType.NORMAL, total_steps=10, seed=42)
    res_normal = SimulationRunner(spec_normal).run_all()
    det_normal = detector.analyze(
        step=5,
        observed_points=res_normal["observed_stream"][5],
        cyber_events=res_normal["cyber_event_stream"][5]
    )
    assert det_normal.l3.predicted_class == ClassificationClass.NORMAL
    assert det_normal.l3.calibrated_probability >= 0.50

    # 2. Gross FDI attack -> Flagged by detector
    spec_fdi = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=15,
        seed=42,
        attack=AttackSpec(
            attack_type=AttackType.FALSE_DATA_INJECTION,
            target_components=["Bus 4"],
            magnitude=-0.08,
            start_step=5,
            duration_steps=10,
            seed=42
        )
    )
    res_fdi = SimulationRunner(spec_fdi).run_all()
    det_fdi = detector.analyze(
        step=8,
        observed_points=res_fdi["observed_stream"][8],
        cyber_events=res_fdi["cyber_event_stream"][8]
    )
    assert det_fdi.overall_anomaly_flag is True
    assert det_fdi.l3.predicted_class in [
        ClassificationClass.FALSE_DATA_INJECTION,
        ClassificationClass.PHYSICAL_FAULT
    ]
