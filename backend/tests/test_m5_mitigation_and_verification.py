"""GridShield AI — Test Suite for M5: Mitigation, Impact Simulation & Verification.

Tests:
1. Mitigation plan recommendation generation with allowlisted actions and evidence citations.
2. Forward impact simulation ("if ignored") computing unmitigated degradation.
3. 3-way comparative verification (Baseline vs Unmitigated vs Mitigated).
4. Honest reporting of non-effective / no-action mitigation plans.
"""

import pytest
from backend.app.schemas.contracts import (
    Incident,
    IncidentStatus,
    ClassificationClass,
    CertaintyBand,
    RiskAssessment,
    RiskFactor,
    RiskLevel,
    EvidenceItem,
    Attribution,
    MitigationActionType,
    MitigationPlan,
    MitigationInstruction,
    Provenance,
)
from backend.app.mitigation.engine import (
    recommend_mitigation,
    simulate_impact,
    simulate_mitigation,
)


def _create_mock_incident(
    attack_type: ClassificationClass,
    domain: str,
    target_comp: str = "Bus 4",
) -> Incident:
    evidence = [
        EvidenceItem(
            id="E1",
            domain="STATE_ESTIMATOR",
            description=f"Persistent measurement residual on {target_comp}",
            metric_name="normalized_residual",
            observed_value=4.5,
            expected_value=1.0,
            provenance=Provenance.OBSERVED,
        ),
        EvidenceItem(
            id="E2",
            domain="CYBER",
            description="Anomalous sequence number detected",
            metric_name="sequence_anomaly_count",
            observed_value=1.0,
            expected_value=0.0,
            provenance=Provenance.OBSERVED,
        ),
    ]

    return Incident(
        incident_id="GS-TEST-001",
        run_id="run-test",
        scenario_ref="test_scenario",
        created_at_step=15,
        created_at_wall="2026-10-05T00:00:00Z",
        status=IncidentStatus.DETECTED,
        affected_components=[target_comp],
        classification=attack_type,
        attribution=Attribution(
            likely_cause=domain,
            hypothesis_scores={f"H_{domain.lower()}": 0.88},
            supporting_evidence=evidence,
            contradicting_evidence=[],
            alternatives_considered=["H_physical"],
            provenance=Provenance.CALCULATED,
        ),
        certainty=CertaintyBand.HIGH,
        risk=RiskAssessment(
            overall_risk_score=72.5,
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
        model_version="test-v1",
        recommended_plan=None,
        mitigation_result=None,
    )


def test_fdi_mitigation_recommendation():
    incident = _create_mock_incident(ClassificationClass.FALSE_DATA_INJECTION, "CYBER", "Bus 4")
    plan = recommend_mitigation(incident)

    assert plan.incident_id == "GS-TEST-001"
    assert len(plan.actions) >= 1
    action = plan.actions[0]
    assert action.action_type == MitigationActionType.QUARANTINE_MEASUREMENT
    assert action.target_component == "Bus 4"
    assert "E1" in plan.evidence_citations
    assert "E2" in plan.evidence_citations


def test_malicious_command_mitigation_recommendation():
    incident = _create_mock_incident(
        ClassificationClass.MALICIOUS_CONTROL_COMMAND, "CYBER_PHYSICAL", "Gen 2"
    )
    plan = recommend_mitigation(incident)

    assert len(plan.actions) >= 1
    action = plan.actions[0]
    assert action.action_type == MitigationActionType.REVERT_COMMAND
    assert action.target_component == "Gen 2"


def test_impact_simulation_forward_projection():
    incident = _create_mock_incident(ClassificationClass.FALSE_DATA_INJECTION, "CYBER", "Bus 4")
    impact = simulate_impact(incident, grid_seed=42, projected_steps=10)

    assert impact.incident_id == "GS-TEST-001"
    assert impact.projected_steps == 10
    assert impact.unmitigated_metrics is not None
    assert impact.unmitigated_metrics.operational_risk_score >= 0.0
    assert "unmitigated" in impact.summary.lower()


def test_three_way_verification_success():
    incident = _create_mock_incident(ClassificationClass.FALSE_DATA_INJECTION, "CYBER", "Bus 4")
    plan = recommend_mitigation(incident)

    result = simulate_mitigation(incident, plan, grid_seed=42, simulation_steps=10)

    assert result.plan_id == plan.plan_id
    assert result.incident_id == incident.incident_id
    assert result.baseline_metrics is not None
    assert result.unmitigated_impact_metrics is not None
    assert result.mitigated_metrics is not None

    # Mitigation successfully reduced risk / violations relative to unmitigated
    assert result.success is True
    assert result.mitigated_metrics.operational_risk_score <= result.unmitigated_impact_metrics.operational_risk_score


def test_honest_reporting_of_non_effective_mitigation():
    incident = _create_mock_incident(ClassificationClass.FALSE_DATA_INJECTION, "CYBER", "Bus 4")

    ineffective_plan = MitigationPlan(
        plan_id="PLAN-INEFFECTIVE",
        incident_id=incident.incident_id,
        actions=[
            MitigationInstruction(
                action_type=MitigationActionType.NO_ACTION,
                target_component="Grid",
                parameter_value=None,
                justification="Take no action",
            )
        ],
        evidence_citations=[],
        provenance=Provenance.CALCULATED,
    )

    result = simulate_mitigation(incident, ineffective_plan, grid_seed=42, simulation_steps=10)

    assert result.success is False
    assert "insufficient" in result.summary.lower() or "non-effective" in result.summary.lower()
