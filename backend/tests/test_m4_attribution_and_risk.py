import pytest
from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, AttackSpec, AttackType,
    ClassificationClass, CertaintyBand, RiskLevel, IncidentStatus
)
from backend.app.services.simulation_runner import SimulationRunner
from backend.app.detection.detector import AnomalyDetector
from backend.app.attribution.engine import AttributionEngine
from backend.app.attribution.certainty import compute_certainty_band
from backend.app.risk.engine import RiskEngine
from backend.app.incidents.manager import IncidentManager

def test_attribution_fdi_cyber():
    """Verify FDI attack is attributed to CYBER with state estimator and cyber evidence."""
    detector = AnomalyDetector()
    attribution_engine = AttributionEngine()

    spec = ScenarioSpec(
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
    res = SimulationRunner(spec).run_all()
    det = detector.analyze(step=8, observed_points=res["observed_stream"][8], cyber_events=res["cyber_event_stream"][8])
    att = attribution_engine.attribute(step=8, detection_result=det, observed_points=res["observed_stream"][8], cyber_events=res["cyber_event_stream"][8])

    assert att.likely_cause in ["CYBER", "CYBER_PHYSICAL"]
    assert att.hypothesis_scores["H_cyber"] > att.hypothesis_scores["H_normal"]
    assert len(att.supporting_evidence) > 0
    # Assert every evidence item has labelled provenance (Invariant I2)
    for ev in att.supporting_evidence:
        assert ev.provenance.value == "OBSERVED"

def test_attribution_line_failure_physical():
    """Verify physical line trip is attributed to PHYSICAL."""
    detector = AnomalyDetector()
    attribution_engine = AttributionEngine()

    spec = ScenarioSpec(
        scenario_type=ScenarioType.LINE_FAILURE,
        target_component="Line 1",
        start_step=5,
        total_steps=15,
        seed=42
    )
    res = SimulationRunner(spec).run_all()
    det = detector.analyze(step=8, observed_points=res["observed_stream"][8], cyber_events=res["cyber_event_stream"][8])
    att = attribution_engine.attribute(step=8, detection_result=det, observed_points=res["observed_stream"][8], cyber_events=res["cyber_event_stream"][8])

    assert att.likely_cause == "PHYSICAL"
    assert att.hypothesis_scores["H_physical"] > att.hypothesis_scores["H_cyber"]

def test_risk_scoring_and_integrity_map():
    """Verify deterministic risk scoring and component cyber integrity mapping."""
    detector = AnomalyDetector()
    attribution_engine = AttributionEngine()
    risk_engine = RiskEngine()

    spec = ScenarioSpec(
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
    res = SimulationRunner(spec).run_all()
    det = detector.analyze(step=8, observed_points=res["observed_stream"][8], cyber_events=res["cyber_event_stream"][8])
    att = attribution_engine.attribute(step=8, detection_result=det, observed_points=res["observed_stream"][8], cyber_events=res["cyber_event_stream"][8])
    risk = risk_engine.evaluate_risk(res["observed_stream"][8], det, att, res["cyber_event_stream"][8])

    assert 0.0 <= risk.overall_risk_score <= 100.0
    assert risk.risk_level in [RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert len(risk.sub_scores) == 5
    assert "Bus 4" in risk.cyber_integrity_map

def test_incident_lifecycle_and_deduplication():
    """Verify single incident created and deduplicated across continuous steps."""
    detector = AnomalyDetector()
    attribution_engine = AttributionEngine()
    risk_engine = RiskEngine()
    incident_mgr = IncidentManager()

    spec = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=25,
        seed=42,
        attack=AttackSpec(
            attack_type=AttackType.FALSE_DATA_INJECTION,
            target_components=["Bus 4"],
            magnitude=-0.08,
            start_step=5,
            duration_steps=6,
            seed=42
        )
    )
    res = SimulationRunner(spec).run_all()

    created_incidents = []
    for step in range(25):
        obs = res["observed_stream"][step]
        cyb = res["cyber_event_stream"][step]
        det = detector.analyze(step, obs, cyb)
        att = attribution_engine.attribute(step, det, obs, cyb)
        cert = compute_certainty_band(det, att)
        risk = risk_engine.evaluate_risk(obs, det, att, cyb)

        inc, evts = incident_mgr.process_step(res["run_id"], step, float(step), det, att, cert, risk)
        if inc and inc.incident_id not in [i.incident_id for i in created_incidents]:
            created_incidents.append(inc)

    # Exactly 1 incident created for the continuous episode
    assert len(created_incidents) == 1
    assert created_incidents[0].incident_id == "GS-0001"
    # Post-attack step 20+ should resolve the incident
    assert incident_mgr.incidents["GS-0001"].status in [IncidentStatus.RESOLVED, IncidentStatus.INVESTIGATING]
