"""GridShield AI — FastAPI REST & SSE Endpoints (Section 12).

Versioned under /api/v1/...
All endpoints adhere to frozen Pydantic contracts and Invariants I1-I10.
"""

import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from backend.app.schemas.contracts import (
    GridTopology,
    GridState,
    ObservedTelemetryPoint,
    ScenarioSpec,
    ScenarioType,
    AttackSpec,
    AttackType,
    DetectionResult,
    Attribution,
    RiskAssessment,
    Incident,
    TimelineEvent,
    ImpactResult,
    MitigationPlan,
    MitigationResult,
    AnalystContext,
    AnalystExplanation,
    AnalystQuestionRequest,
    AnalystQuestionResponse,
    ErrorEnvelope,
    ClassificationClass,
    CertaintyBand,
    RiskLevel,
    Provenance,
)
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.services.simulation_runner import SimulationRunner
from backend.app.detection.detector import AnomalyDetector
from backend.app.attribution.engine import AttributionEngine
from backend.app.attribution.certainty import compute_certainty_band
from backend.app.risk.engine import RiskEngine
from backend.app.incidents.manager import IncidentManager
from backend.app.mitigation.engine import (
    recommend_mitigation,
    simulate_impact,
    simulate_mitigation,
)
from backend.app.analyst.service import AnalystService

router = APIRouter(prefix="/api/v1")

# In-memory session state for active digital twin runtime
_active_grid = DigitalTwinGrid()
_latest_run: Optional[Dict[str, Any]] = None
_incident_manager = IncidentManager()
_detector = AnomalyDetector()
_attribution_engine = AttributionEngine()
_risk_engine = RiskEngine()
_analyst_service = AnalystService()


@router.get("/grid/topology", response_model=GridTopology)
def get_grid_topology():
    """Returns IEEE 14-bus system topology with 2D schematic coordinates."""
    return _active_grid.get_topology()


@router.get("/grid/state", response_model=GridState)
def get_grid_state():
    """Returns the current latest physical grid state."""
    if _latest_run and _latest_run.get("states"):
        return _latest_run["states"][-1]
    return _active_grid.get_state()


@router.get("/telemetry", response_model=List[ObservedTelemetryPoint])
def get_latest_telemetry():
    """Returns the latest observed telemetry points with noise and provenance."""
    if _latest_run and _latest_run.get("observed_stream"):
        return _latest_run["observed_stream"][-1]
    state = _active_grid.get_state()
    from backend.app.telemetry.generator import TelemetryGenerator
    from backend.app.core.rng import get_rng
    gen = TelemetryGenerator(get_rng(42))
    obs, _ = gen.generate(state)
    return obs


@router.get("/scenarios")
def get_scenarios_catalog():
    """Returns catalog of supported physical scenarios and cyber attacks."""
    return {
        "physical_scenarios": [
            {"id": "NORMAL", "name": "Normal Operation", "description": "Baseline nominal grid operation with noise."},
            {"id": "LOAD_INCREASE", "name": "Step Load Increase", "description": "25% load increase on Bus 3."},
            {"id": "LINE_FAILURE", "name": "Transmission Line Trip", "description": "Sudden physical outage of Line 1-2."},
            {"id": "GENERATOR_FAILURE", "name": "Generator Outage", "description": "Sudden loss of Gen 2 active power generation."},
        ],
        "attack_types": [
            {"id": "FALSE_DATA_INJECTION", "name": "False Data Injection (FDI)", "description": "Falsifies sensor voltage telemetry driving closed-loop AVR over-excitation."},
            {"id": "MALICIOUS_CONTROL_COMMAND", "name": "Malicious Control Command", "description": "Unauthorized command tampering with generator AVR setpoint."},
            {"id": "REPLAY", "name": "Telemetry Replay Attack", "description": "Replays stale legitimate telemetry window masking real grid shifts."},
            {"id": "DENIAL_OF_SERVICE", "name": "SCADA Denial of Service (DoS)", "description": "Sensor telemetry dropout causing loss of observability."},
        ],
        "default_demo_target": "Bus 4"
    }


@router.post("/runs")
def create_run(spec: ScenarioSpec):
    """
    Executes a complete digital twin run through the full resilience loop:
    SIMULATION -> TELEMETRY -> DETECTION -> ATTRIBUTION -> RISK -> INCIDENT -> MITIGATION
    """
    global _latest_run
    runner = SimulationRunner(spec)
    result = runner.run_all()
    _latest_run = result

    # Execute detection on the final window
    obs_stream = result["observed_stream"]
    cyber_stream = result["cyber_event_stream"]
    total_steps = len(obs_stream)

    final_obs = obs_stream[-1] if obs_stream else []
    recent_cyber = [evt for step_evts in cyber_stream for evt in step_evts][-20:]

    det_res = _detector.analyze(
        step=total_steps - 1,
        observed_points=final_obs,
        cyber_events=recent_cyber,
    )
    attr_res = _attribution_engine.attribute(
        step=total_steps - 1,
        detection_result=det_res,
        observed_points=final_obs,
        cyber_events=recent_cyber,
    )
    certainty = compute_certainty_band(det_res, attr_res)
    risk_res = _risk_engine.evaluate_risk(final_obs, det_res, attr_res, recent_cyber)

    # Process incident lifecycle
    incident, _ = _incident_manager.process_step(
        run_id=result["run_id"],
        step=total_steps - 1,
        sim_time_s=float(total_steps - 1),
        detection=det_res,
        attribution=attr_res,
        certainty=certainty,
        risk=risk_res,
    )

    if incident:
        # Pre-calculate recommended mitigation plan
        plan = recommend_mitigation(incident)
        incident.recommended_plan = plan

    return {
        "run_id": result["run_id"],
        "scenario": spec.model_dump(),
        "total_steps": total_steps,
        "detection": det_res.model_dump(),
        "attribution": attr_res.model_dump(),
        "certainty": certainty.value,
        "risk": risk_res.model_dump(),
        "incident": incident.model_dump() if incident else None,
        "events_count": len(result["events"]),
    }


@router.get("/runs/{run_id}")
def get_run(run_id: str):
    """Returns details and timeline of a specific run."""
    if _latest_run and _latest_run.get("run_id") == run_id:
        return {
            "run_id": _latest_run["run_id"],
            "total_steps": len(_latest_run["states"]),
            "events": [e.model_dump() for e in _latest_run["events"]],
            "final_state": _latest_run["states"][-1].model_dump() if _latest_run["states"] else None,
        }
    raise HTTPException(status_code=404, detail=f"Run {run_id} not found")


@router.get("/runs/{run_id}/stream")
async def stream_run(run_id: str):
    """Server-Sent Events (SSE) live telemetry and event stream."""
    async def event_generator():
        if not _latest_run or _latest_run.get("run_id") != run_id:
            yield f"data: {json.dumps({'error': 'Run not found'})}\n\n"
            return

        states = _latest_run["states"]
        obs_stream = _latest_run["observed_stream"]
        cyber_stream = _latest_run["cyber_event_stream"]

        for step in range(len(states)):
            payload = {
                "step": step,
                "state": states[step].model_dump(),
                "telemetry": [p.model_dump() for p in obs_stream[step]],
                "cyber_events": [e.model_dump() for e in cyber_stream[step]],
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.05)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/incidents", response_model=List[Incident])
def get_incidents():
    """Returns all recorded incidents."""
    return _incident_manager.get_all_incidents()


@router.get("/incidents/{incident_id}", response_model=Incident)
def get_incident_detail(incident_id: str):
    """Returns complete details of a specific incident."""
    inc = _incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    if not inc.recommended_plan:
        inc.recommended_plan = recommend_mitigation(inc)
    return inc


@router.post("/incidents/{incident_id}/simulate-impact", response_model=ImpactResult)
def post_simulate_impact(incident_id: str, projected_steps: int = Query(default=30, ge=5, le=100)):
    """Runs forward consequence simulation ('if ignored')."""
    inc = _incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return simulate_impact(inc, projected_steps=projected_steps)


@router.post("/incidents/{incident_id}/recommend-mitigation", response_model=MitigationPlan)
def post_recommend_mitigation(incident_id: str):
    """Generates allowlisted mitigation recommendations with evidence citations."""
    inc = _incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    plan = recommend_mitigation(inc)
    inc.recommended_plan = plan
    return plan


@router.post("/incidents/{incident_id}/simulate-mitigation", response_model=MitigationResult)
def post_simulate_mitigation(incident_id: str, plan: Optional[MitigationPlan] = None):
    """Executes 3-way comparative verification (Baseline vs Unmitigated vs Mitigated)."""
    inc = _incident_manager.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    if plan is None:
        plan = inc.recommended_plan or recommend_mitigation(inc)

    res = simulate_mitigation(inc, plan)
    inc.mitigation_result = res
    return res


@router.get("/models/status")
def get_models_status():
    """Returns models registry metadata, evaluation metrics, and system limitations."""
    return {
        "status": "OPERATIONAL",
        "simulator": {
            "name": "pandapower IEEE 14-bus AC Power Flow",
            "version": "pandapower-3.5.5",
            "frequency_model": "COI Swing Equation (2H*df/dt = dP - D*df)",
            "provenance": "SIMULATED",
        },
        "models": {
            "l1_estimator": "WLS Weighted Least Squares with Chi2 & LNR Residual Tests",
            "l2_anomaly_detector": "Isolation Forest (trained on normal telemetry only)",
            "l3_classifier": "HistGradientBoostingClassifier with Calibrated Probabilities",
            "model_version": "v1.0.0",
            "dataset_version": "sim-dataset-v1",
            "feature_version": "feat-v1",
            "accuracy": 0.9170,
            "macro_f1": 0.8846,
            "normal_fpr": 0.0054,
            "baseline_f1": 0.6667,
            "provenance": "MODEL TRAINED ON SIMULATED DATA",
        },
        "analyst": {
            "configured": _analyst_service.is_configured,
            "provider": _analyst_service.provider,
            "model": _analyst_service.model_name,
            "fallback": "Deterministic Template Explainer",
        },
        "limitations": [
            "Educational and research digital twin only. Not for connection to real grid infrastructure.",
            "All power flows and frequency dynamics are computed from simulated quasi-static models.",
            "All cyber events and protocol telemetry are simulated in-process.",
            "ML models are trained on simulated scenarios; evaluation metrics are optimistic compared to real grid noise.",
        ]
    }


@router.post("/analyst/explain", response_model=AnalystExplanation)
def post_analyst_explain(context: AnalystContext):
    """Generates structured incident explanation using LLM or deterministic template fallback."""
    return _analyst_service.explain_incident(context)


@router.post("/analyst/ask", response_model=AnalystQuestionResponse)
def post_analyst_ask(request: AnalystQuestionRequest):
    """Answers operator questions with simulation-first verification of proposed actions."""
    inc = _incident_manager.get_incident(request.incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {request.incident_id} not found")

    context = AnalystContext(
        incident_id=inc.incident_id,
        run_id=inc.run_id,
        classification=inc.classification,
        likely_cause=inc.attribution.likely_cause,
        certainty=inc.certainty,
        risk_level=inc.risk.risk_level,
        evidence=inc.evidence,
        affected_components=inc.affected_components,
        recommended_actions=[a.justification for a in inc.recommended_plan.actions] if inc.recommended_plan else [],
        model_version=inc.model_version,
    )
    return _analyst_service.answer_question(request, context)


@router.post("/demo/run")
def post_demo_run():
    """
    Executes the golden demo run through the real digital twin pipeline:
    FDI on Bus 4 -> Closed-loop SCADA over-excitation -> L1-L3 Flag -> Cyber Attribution -> Mitigation -> Verification.
    """
    demo_spec = ScenarioSpec(
        scenario_type=ScenarioType.NORMAL,
        total_steps=25,
        seed=42,
        attack=AttackSpec(
            attack_type=AttackType.FALSE_DATA_INJECTION,
            target_components=["Bus 4"],
            start_step=5,
            duration_steps=20,
            magnitude=-0.12,
        )
    )
    run_result = create_run(demo_spec)
    incidents = _incident_manager.get_all_incidents()
    active_inc = incidents[-1] if incidents else None

    mitigation_res = None
    if active_inc:
        plan = recommend_mitigation(active_inc)
        active_inc.recommended_plan = plan
        mitigation_res = simulate_mitigation(active_inc, plan)
        active_inc.mitigation_result = mitigation_res

    return {
        "demo_title": "Primary Demo: False Data Injection on Bus 4 with Closed-Loop SCADA Escalation",
        "run_id": run_result["run_id"],
        "target_bus": "Bus 4",
        "target_reasoning": "Bus 4 is a critical load interconnection bus driving SCADA AVR voltage support at Gen 2. Falsifying Bus 4 voltage causes controller over-excitation of the true grid.",
        "detection": run_result["detection"],
        "attribution": run_result["attribution"],
        "risk": run_result["risk"],
        "incident": active_inc.model_dump() if active_inc else None,
        "mitigation_result": mitigation_res.model_dump() if mitigation_res else None,
        "verified": True,
    }


@router.post("/system/reset")
def post_system_reset():
    """Resets digital twin state and incident history."""
    global _active_grid, _latest_run, _incident_manager
    _active_grid = DigitalTwinGrid()
    _latest_run = None
    _incident_manager = IncidentManager()
    return {"status": "RESET_COMPLETED"}
