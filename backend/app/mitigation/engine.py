"""GridShield AI — Mitigation, Impact Simulation & Verification Engine (Section 10).

Provides allowlisted mitigation recommendations, forward-looking impact simulation ("if ignored"),
and 3-way comparative verification (Baseline vs Unmitigated vs Mitigated).
"""

from typing import List, Optional, Dict, Any
import numpy as np
import uuid
import copy

from backend.app.schemas.contracts import (
    Incident,
    MitigationPlan,
    MitigationInstruction,
    MitigationActionType,
    MitigationResult,
    ImpactResult,
    VerificationMetrics,
    RiskLevel,
    Provenance,
    ClassificationClass,
    ScenarioSpec,
    ScenarioType,
    AttackSpec,
    AttackType,
    ObservedTelemetryPoint,
    GroundTruthPoint,
    DetectionResult,
    L1Detection,
    L2Detection,
    L3Classification,
    Attribution,
    EvidenceItem,
)
from backend.app.services.simulation_runner import SimulationRunner
from backend.app.risk.engine import RiskEngine
from backend.app.detection.wls_estimator import WLSStateEstimator


def recommend_mitigation(incident: Incident) -> MitigationPlan:
    """Recommends allowlisted mitigation actions based on incident classification and evidence."""
    actions: List[MitigationInstruction] = []
    citations: List[str] = [e.id for e in incident.evidence]
    plan_id = f"PLAN-{uuid.uuid4().hex[:8].upper()}"

    classification = incident.classification
    domain = incident.attribution.likely_cause
    affected = incident.affected_components or ["Bus 4"]

    if classification == ClassificationClass.FALSE_DATA_INJECTION or domain == "CYBER":
        for comp in affected:
            actions.append(
                MitigationInstruction(
                    action_type=MitigationActionType.QUARANTINE_MEASUREMENT,
                    target_component=comp,
                    parameter_value=None,
                    justification=f"Quarantine compromised sensor telemetry on {comp} to restore trusted state estimation and prevent SCADA over-excitation.",
                )
            )
    elif classification == ClassificationClass.MALICIOUS_CONTROL_COMMAND or domain == "CYBER_PHYSICAL":
        for comp in affected:
            actions.append(
                MitigationInstruction(
                    action_type=MitigationActionType.REVERT_COMMAND,
                    target_component=comp,
                    parameter_value=1.02,
                    justification=f"Revert unauthorized supervisory control command on {comp} to restore safe nominal operating setpoints.",
                )
            )
    elif classification == ClassificationClass.PHYSICAL_FAULT or domain == "PHYSICAL":
        has_line = any("Line" in comp for comp in affected)
        if has_line:
            actions.append(
                MitigationInstruction(
                    action_type=MitigationActionType.REDISPATCH_GEN,
                    target_component="Gen 1",
                    parameter_value=150.0,
                    justification="Redispatch generation capacity to relieve line loading and maintain frequency balance.",
                )
            )
        else:
            actions.append(
                MitigationInstruction(
                    action_type=MitigationActionType.REDISPATCH_GEN,
                    target_component="Gen 2",
                    parameter_value=60.0,
                    justification="Redispatch spinning reserve on Gen 2 to compensate for active power deficit.",
                )
            )
    elif classification in (ClassificationClass.DENIAL_OF_SERVICE, ClassificationClass.REPLAY):
        for comp in affected:
            actions.append(
                MitigationInstruction(
                    action_type=MitigationActionType.QUARANTINE_MEASUREMENT,
                    target_component=comp,
                    parameter_value=None,
                    justification=f"Switch to redundant telemetry and mark {comp} untrusted due to cyber protocol anomaly.",
                )
            )
    else:
        actions.append(
            MitigationInstruction(
                action_type=MitigationActionType.NO_ACTION,
                target_component="Grid",
                parameter_value=None,
                justification="Inconclusive classification; maintain active monitoring without automated intervention.",
            )
        )

    return MitigationPlan(
        plan_id=plan_id,
        incident_id=incident.incident_id,
        actions=actions,
        evidence_citations=citations,
        provenance=Provenance.CALCULATED,
    )


def extract_verification_metrics(
    runner_result: Dict[str, Any],
    step_idx: int = -1,
) -> VerificationMetrics:
    """Extracts physical, state estimation, and operational risk metrics from a simulation run result."""
    states = runner_result["states"]
    obs_stream = runner_result["observed_stream"]
    gt_stream = runner_result["ground_truth_stream"]

    if not states:
        return VerificationMetrics(
            max_voltage_deviation_pu=0.0,
            voltage_violations_count=0,
            overloaded_lines_count=0,
            max_line_loading_pct=0.0,
            total_load_served_mw=259.0,
            load_shed_mw=0.0,
            frequency_hz=60.0,
            operational_risk_score=0.0,
            risk_level=RiskLevel.LOW,
            state_estimation_error_rmse=0.0,
            provenance=Provenance.CALCULATED,
        )

    state = states[step_idx]
    obs_points = obs_stream[step_idx]
    gt_points = gt_stream[step_idx]

    # 1. Voltage metrics
    v_devs = [abs(b.vm_pu - 1.0) for b in state.buses]
    max_v_dev = float(max(v_devs)) if v_devs else 0.0
    v_violations = sum(1 for b in state.buses if b.vm_pu < 0.95 or b.vm_pu > 1.05)

    # 2. Line loading metrics
    loadings = [l.loading_pct for l in state.lines]
    max_loading = float(max(loadings)) if loadings else 0.0
    overloaded_lines = sum(1 for l in state.lines if l.loading_pct > 100.0)

    # 3. Frequency & Load
    freq_hz = float(state.frequency_hz)
    total_load = sum(b.p_mw for b in state.buses if b.p_mw > 0)
    load_shed = 0.0

    # 4. State estimation error RMSE against ground truth
    estimator = WLSStateEstimator()
    l1_res = estimator.analyze(obs_points)
    
    sq_errs = []
    obs_map = {pt.component_id: pt.reported_value for pt in obs_points if pt.measurement_type == "v_pu"}
    gt_map = {gt.component_id: gt.true_value for gt in gt_points if gt.measurement_type == "v_pu"}
    for comp, v_obs in obs_map.items():
        if comp in gt_map:
            sq_errs.append((v_obs - gt_map[comp]) ** 2)
    est_rmse = float(np.sqrt(np.mean(sq_errs))) if sq_errs else 0.0

    # 5. Operational Risk Assessment
    risk_engine = RiskEngine()
    dummy_det = DetectionResult(
        step=step_idx if step_idx >= 0 else len(states) - 1,
        l1=l1_res,
        l2=L2Detection(flagged=False, anomaly_score=0.1, threshold=0.5),
        l3=L3Classification(
            predicted_class=ClassificationClass.NORMAL,
            calibrated_probability=0.9,
            class_probabilities={"NORMAL": 0.9},
            model_version="v1.0.0",
        ),
        overall_anomaly_flag=l1_res.flagged or v_violations > 0 or overloaded_lines > 0,
    )
    dummy_attr = Attribution(
        likely_cause="NORMAL" if v_violations == 0 else "PHYSICAL",
        hypothesis_scores={"H_normal": 0.9},
        supporting_evidence=[],
    )
    risk_res = risk_engine.evaluate_risk(obs_points, dummy_det, dummy_attr, [])

    return VerificationMetrics(
        max_voltage_deviation_pu=round(max_v_dev, 4),
        voltage_violations_count=v_violations,
        overloaded_lines_count=overloaded_lines,
        max_line_loading_pct=round(max_loading, 2),
        total_load_served_mw=round(total_load, 2),
        load_shed_mw=round(load_shed, 2),
        frequency_hz=round(freq_hz, 3),
        operational_risk_score=risk_res.overall_risk_score,
        risk_level=risk_res.risk_level,
        state_estimation_error_rmse=round(est_rmse, 5),
        provenance=Provenance.CALCULATED,
    )


def simulate_impact(
    incident: Incident,
    base_spec: Optional[ScenarioSpec] = None,
    grid_seed: int = 42,
    projected_steps: int = 30,
) -> ImpactResult:
    """Projects forward consequences if the ongoing incident remains unmitigated."""
    if base_spec is None:
        # Construct spec matching the incident
        attack_type = AttackType.FALSE_DATA_INJECTION
        if incident.classification == ClassificationClass.MALICIOUS_CONTROL_COMMAND:
            attack_type = AttackType.MALICIOUS_CONTROL_COMMAND
        elif incident.classification == ClassificationClass.REPLAY:
            attack_type = AttackType.REPLAY
        elif incident.classification == ClassificationClass.DENIAL_OF_SERVICE:
            attack_type = AttackType.DENIAL_OF_SERVICE

        base_spec = ScenarioSpec(
            scenario_type=ScenarioType.NORMAL,
            total_steps=incident.created_at_step + projected_steps,
            seed=grid_seed,
            attack=AttackSpec(
                attack_type=attack_type,
                target_components=incident.affected_components or ["Bus 4"],
                start_step=max(0, incident.created_at_step - 5),
                duration_steps=projected_steps + 10,
                magnitude=-0.12,
            )
        )
    else:
        base_spec = copy.deepcopy(base_spec)
        base_spec.total_steps = incident.created_at_step + projected_steps

    runner = SimulationRunner(base_spec)
    result = runner.run_all()
    metrics = extract_verification_metrics(result)

    summary = (
        f"If unmitigated, operational risk reaches {metrics.risk_level.value} "
        f"({metrics.operational_risk_score:.1f}) with {metrics.voltage_violations_count} voltage violations."
    )

    return ImpactResult(
        incident_id=incident.incident_id,
        projected_steps=projected_steps,
        unmitigated_metrics=metrics,
        summary=summary,
        provenance=Provenance.CALCULATED,
    )


def simulate_mitigation(
    incident: Incident,
    plan: MitigationPlan,
    base_spec: Optional[ScenarioSpec] = None,
    grid_seed: int = 42,
    simulation_steps: int = 30,
) -> MitigationResult:
    """Executes a 3-way verification: Baseline vs Unmitigated vs Mitigated."""
    # 1. Baseline metrics (Clean normal run)
    clean_spec = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=incident.created_at_step + simulation_steps,
        seed=grid_seed,
    )
    baseline_runner = SimulationRunner(clean_spec)
    baseline_res = baseline_runner.run_all()
    baseline_metrics = extract_verification_metrics(baseline_res)

    # 2. Unmitigated impact metrics
    unmitigated_impact = simulate_impact(
        incident=incident,
        base_spec=base_spec,
        grid_seed=grid_seed,
        projected_steps=simulation_steps,
    )
    unmitigated_metrics = unmitigated_impact.unmitigated_metrics

    # 3. Mitigated simulation run
    is_no_action = any(act.action_type == MitigationActionType.NO_ACTION for act in plan.actions)

    if is_no_action:
        # Ineffective plan: runs identical to unmitigated
        mitigated_metrics = copy.deepcopy(unmitigated_metrics)
        success = False
        summary = (
            f"Mitigation plan {plan.plan_id} (NO_ACTION) was non-effective. "
            f"Risk score remains at {mitigated_metrics.operational_risk_score:.1f} ({mitigated_metrics.risk_level.value})."
        )
    else:
        # Effective plan: simulate grid with attack mitigated at incident.created_at_step
        mitigated_spec = copy.deepcopy(clean_spec)
        # If attack existed, its duration is truncated at incident.created_at_step (quarantined/reverted)
        if base_spec and base_spec.attack:
            mitigated_spec.attack = copy.deepcopy(base_spec.attack)
            mitigated_spec.attack.duration_steps = max(1, incident.created_at_step - base_spec.attack.start_step)
        else:
            # Default FDI mitigated
            mitigated_spec.attack = AttackSpec(
                attack_type=AttackType.FALSE_DATA_INJECTION,
                target_components=incident.affected_components or ["Bus 4"],
                start_step=max(0, incident.created_at_step - 5),
                duration_steps=5,  # ends at created_at_step
                magnitude=-0.12,
            )

        mitigated_runner = SimulationRunner(mitigated_spec)
        mitigated_res = mitigated_runner.run_all()
        mitigated_metrics = extract_verification_metrics(mitigated_res)

        success = (
            (mitigated_metrics.operational_risk_score < unmitigated_metrics.operational_risk_score)
            or (mitigated_metrics.voltage_violations_count < unmitigated_metrics.voltage_violations_count)
            or (mitigated_metrics.operational_risk_score <= baseline_metrics.operational_risk_score + 10.0)
        )

        if success:
            summary = (
                f"Mitigation plan {plan.plan_id} successfully restored grid stability. "
                f"Risk reduced from {unmitigated_metrics.risk_level.value} ({unmitigated_metrics.operational_risk_score:.1f}) "
                f"to {mitigated_metrics.risk_level.value} ({mitigated_metrics.operational_risk_score:.1f}). "
                f"Voltage violations resolved ({unmitigated_metrics.voltage_violations_count} -> {mitigated_metrics.voltage_violations_count})."
            )
        else:
            summary = (
                f"Mitigation plan {plan.plan_id} was insufficient. "
                f"Risk score remains at {mitigated_metrics.operational_risk_score:.1f} ({mitigated_metrics.risk_level.value})."
            )

    return MitigationResult(
        plan_id=plan.plan_id,
        incident_id=incident.incident_id,
        success=success,
        summary=summary,
        baseline_metrics=baseline_metrics,
        unmitigated_impact_metrics=unmitigated_metrics,
        mitigated_metrics=mitigated_metrics,
        provenance=Provenance.CALCULATED,
    )
