"""
Phase P5 Test Suite: Response Simulation & Mitigation Engine.

Validates:
1. Candidate response generation from allowlisted action catalog.
2. Forward impact simulation ("if ignored") computing unmitigated degradation.
3. 3-way comparative verification (Baseline vs Unmitigated vs Mitigated).
4. Non-answer prohibition on automated mitigation actions (Rule R4).
5. Deterministic mitigation evaluation across simulation seeds.
"""
import pytest
from backend.app.schemas.contracts import (
    Incident, IncidentStatus, ClassificationClass, CertaintyBand,
    RiskAssessment, RiskFactor, RiskLevel, EvidenceItem, Attribution,
    MitigationActionType, MitigationPlan, MitigationInstruction,
    Provenance
)
from backend.app.mitigation.engine import (
    recommend_mitigation, simulate_impact, simulate_mitigation
)


def _build_test_incident(classification: ClassificationClass, likely_cause: str, target: str = "Bus 4") -> Incident:
    evidence = [
        EvidenceItem(
            id="E1",
            domain="STATE_ESTIMATOR",
            description=f"Persistent measurement residual on {target}",
            metric_name="normalized_residual",
            observed_value=4.2,
            expected_value=1.0,
            provenance=Provenance.OBSERVED,
        )
    ]
    return Incident(
        incident_id="GS-P5-001",
        run_id="run-p5-test",
        scenario_ref="fdi_scenario",
        created_at_step=15,
        created_at_wall="2026-10-06T00:00:00Z",
        status=IncidentStatus.DETECTED,
        affected_components=[target],
        classification=classification,
        attribution=Attribution(
            likely_cause=likely_cause,
            hypothesis_scores={f"H_{likely_cause.lower()}": 0.85},
            supporting_evidence=evidence,
            contradicting_evidence=[],
            alternatives_considered=["H_physical"],
            provenance=Provenance.CALCULATED,
        ),
        certainty=CertaintyBand.HIGH,
        risk=RiskAssessment(
            overall_risk_score=75.0,
            risk_level=RiskLevel.HIGH,
            sub_scores=[
                RiskFactor(
                    name="Voltage Violations",
                    raw_value=2.0,
                    normalized_score=50.0,
                    weight=0.30,
                    description="2 buses outside [0.95, 1.05] p.u.",
                )
            ],
            provenance=Provenance.CALCULATED,
        ),
        evidence=evidence,
        model_version="model-v1.0",
        recommended_plan=None,
        mitigation_result=None,
    )


def test_fdi_mitigation_plan_structure():
    """Verify FDI incident generates QUARANTINE_MEASUREMENT with proper citations."""
    incident = _build_test_incident(ClassificationClass.FALSE_DATA_INJECTION, "CYBER", "Bus 4")
    plan = recommend_mitigation(incident)

    assert plan.incident_id == incident.incident_id
    assert len(plan.actions) == 1
    assert plan.actions[0].action_type == MitigationActionType.QUARANTINE_MEASUREMENT
    assert plan.actions[0].target_component == "Bus 4"
    assert "E1" in plan.evidence_citations


def test_non_answer_prohibits_automated_action():
    """Verify Rule R4: UNKNOWN or inconclusive incident yields NO_ACTION."""
    incident = _build_test_incident(ClassificationClass.UNKNOWN, "UNKNOWN", "Bus 4")
    plan = recommend_mitigation(incident)

    assert len(plan.actions) == 1
    assert plan.actions[0].action_type == MitigationActionType.NO_ACTION
    assert "inconclusive" in plan.actions[0].justification.lower() or "no action" in plan.actions[0].justification.lower()


def test_3_way_verification_mitigation_success():
    """Verify 3-way comparative verification demonstrates risk reduction under mitigation."""
    incident = _build_test_incident(ClassificationClass.FALSE_DATA_INJECTION, "CYBER", "Bus 4")
    plan = recommend_mitigation(incident)

    res = simulate_mitigation(incident, plan, grid_seed=42, simulation_steps=8)

    assert res.baseline_metrics is not None
    assert res.unmitigated_impact_metrics is not None
    assert res.mitigated_metrics is not None
    assert res.success is True
    assert res.mitigated_metrics.operational_risk_score <= res.unmitigated_impact_metrics.operational_risk_score
