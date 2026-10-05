import os
import pytest
import numpy as np
from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, AttackSpec, AttackType,
    ClassificationClass, TelemetryQuality, Provenance
)
from backend.app.detection.wls_estimator import WLSStateEstimator
from backend.app.detection.feature_pipeline import FeaturePipeline
from backend.app.detection.detector import AnomalyDetector
from backend.app.services.simulation_runner import SimulationRunner

def test_wls_state_estimator_l1():
    """Verify L1 WLS state estimator flags gross voltage error."""
    estimator = WLSStateEstimator(num_buses=14)
    spec = ScenarioSpec(scenario_type=ScenarioType.NORMAL, total_steps=5, seed=42)
    runner = SimulationRunner(spec)
    res = runner.run_all()

    clean_obs = res["observed_stream"][2]
    clean_l1 = estimator.analyze(clean_obs)
    assert clean_l1.flagged is False
    assert clean_l1.chi2_stat < clean_l1.chi2_threshold

    # Corrupt Bus 4 voltage
    corrupt_obs = [p.model_copy() for p in clean_obs]
    for p in corrupt_obs:
        if p.component_id == "Bus 4" and p.measurement_type == "v_pu":
            p.reported_value += 0.20

    bad_l1 = estimator.analyze(corrupt_obs)
    assert bad_l1.flagged is True
    assert len(bad_l1.flagged_measurements) > 0

def test_feature_pipeline_no_nan():
    """Verify FeaturePipeline produces complete numeric vectors with no NaN or Inf."""
    pipeline = FeaturePipeline()
    spec = ScenarioSpec(scenario_type=ScenarioType.NORMAL, total_steps=5, seed=42)
    res = SimulationRunner(spec).run_all()

    for step in range(5):
        obs = res["observed_stream"][step]
        cyb = res["cyber_event_stream"][step]
        vec = pipeline.extract_features(step, obs, cyb)
        assert vec.feature_version == "feat-v1.0"
        for fname, val in vec.features.items():
            assert not np.isnan(val), f"NaN found in feature {fname}"
            assert not np.isinf(val), f"Inf found in feature {fname}"

def test_anomaly_detector_inference_and_classification():
    """Verify AnomalyDetector performs multi-layer L1/L2/L3 inference."""
    detector = AnomalyDetector()
    assert detector.iso_forest is not None
    assert detector.classifier is not None

    # Test clean baseline run -> NORMAL
    spec_clean = ScenarioSpec(scenario_type=ScenarioType.NORMAL, total_steps=10, seed=150)
    res_clean = SimulationRunner(spec_clean).run_all()
    det_clean = detector.analyze(
        step=5,
        observed_points=res_clean["observed_stream"][5],
        cyber_events=res_clean["cyber_event_stream"][5]
    )
    assert det_clean.l3.predicted_class == ClassificationClass.NORMAL

    # Test FDI attack run -> FALSE_DATA_INJECTION
    spec_fdi = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=20,
        seed=150,
        attack=AttackSpec(
            attack_type=AttackType.FALSE_DATA_INJECTION,
            target_components=["Bus 4"],
            magnitude=-0.08,
            start_step=5,
            duration_steps=10,
            seed=150
        )
    )
    res_fdi = SimulationRunner(spec_fdi).run_all()
    det_fdi = detector.analyze(
        step=8,
        observed_points=res_fdi["observed_stream"][8],
        cyber_events=res_fdi["cyber_event_stream"][8]
    )
    assert det_fdi.overall_anomaly_flag is True
    assert det_fdi.l3.predicted_class in [ClassificationClass.FALSE_DATA_INJECTION, ClassificationClass.PHYSICAL_FAULT]
