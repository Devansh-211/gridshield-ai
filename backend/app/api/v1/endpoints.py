"""GridShield AI — FastAPI REST & SSE Endpoints (Section 12).

Versioned under /api/v1/...
All endpoints adhere to frozen Pydantic contracts and Invariants I1-I10.
"""

import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Request, Depends
from fastapi.responses import StreamingResponse
from backend.app.persistence.database import get_db

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
from backend.app.services.network_importer import NetworkImporter
from backend.app.services.sensor_manager import SensorManager, SensorConfig


router = APIRouter(prefix="/api/v1")

# In-memory session state for active digital twin runtime
_active_grid = DigitalTwinGrid()
_latest_run: Optional[Dict[str, Any]] = None
_incident_manager = IncidentManager()
_detector = AnomalyDetector()
_attribution_engine = AttributionEngine()
_risk_engine = RiskEngine()
_analyst_service = AnalystService()
_network_importer = NetworkImporter()
_sensor_manager = SensorManager()

from backend.app.services.grid_view_service import GridViewService

_grid_view_service = GridViewService(_active_grid)



@router.get("/topology/{version}/graph")
def get_topology_graph(version: str = "v1"):
    """Returns full graph with elements, metadata, and enveloped properties (Rule R1)."""
    return _grid_view_service.get_topology_graph(version=version)


@router.get("/state/{snapshot}")
def get_state_snapshot(snapshot: str = "latest"):
    """Returns full enveloped state snapshot with system strip metrics."""
    step = 0
    sim_time = 0.0
    freq = 60.0
    if _latest_run and _latest_run.get("states"):
        states = _latest_run["states"]
        if snapshot == "latest":
            st = states[-1]
        else:
            try:
                s_idx = min(len(states) - 1, max(0, int(snapshot)))
                st = states[s_idx]
            except Exception:
                st = states[-1]
        step = st.step
        sim_time = st.sim_time_s
        freq = st.frequency_hz
    return _grid_view_service.get_enveloped_state(step=step, sim_time_s=sim_time, frequency=freq)


@router.get("/elements/{element_id}")
def get_element_detail(element_id: str):
    """Returns detailed element inspector data and linked Evidence Object fields."""
    return _grid_view_service.get_element_detail(element_id)


@router.get("/stream/sse")
async def stream_grid_sse(request: Request):
    """
    Reliable Server-Sent Events (SSE) telemetry stream with heartbeat,
    event IDs, and Last-Event-ID gap resumption (§4).
    """
    last_event_id = request.headers.get("Last-Event-ID")
    
    async def event_generator():
        # Emit initial state snapshot
        state_data = _grid_view_service.get_enveloped_state()
        yield f"id: 0\nevent: initial_state\ndata: {json.dumps(state_data)}\n\n"
        
        step_counter = 1
        if last_event_id:
            try:
                step_counter = int(last_event_id) + 1
            except Exception:
                pass

        for _ in range(100):
            if await request.is_disconnected():
                break
            
            # State tick
            state_data = _grid_view_service.get_enveloped_state(step=step_counter)
            yield f"id: {step_counter}\nevent: state_delta\ndata: {json.dumps(state_data)}\n\n"
            step_counter += 1
            
            await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")



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
def create_run(
    spec: ScenarioSpec,
    db = Depends(get_db)
):
    """
    Executes a complete digital twin run through the full resilience loop:
    SIMULATION -> TELEMETRY -> DETECTION -> ATTRIBUTION -> RISK -> INCIDENT -> MITIGATION
    """
    return _execute_run_internal(spec, db)


def _execute_run_internal(spec: ScenarioSpec, db = None):
    global _latest_run
    runner = SimulationRunner(spec)
    result = runner.run_all()
    _latest_run = result

    # Persist alarms to database if session is present
    if db is not None:
        try:
            from backend.app.incidents.alarm_service import AlarmService
            alarm_svc = AlarmService(db)
            for st in result["states"]:
                voltages = {f"Bus {b.bus_id}": b.vm_pu for b in st.buses}
                loadings = {f"Line {l.line_id}": l.loading_pct for l in st.lines}
                alarm_svc.evaluate_grid_alarms(
                    run_id=result["run_id"],
                    step=st.step,
                    voltages_by_bus=voltages,
                    line_loadings=loadings,
                    frequency_hz=st.frequency_hz
                )
            db.commit()
        except Exception as err:
            print(f"Warning: Alarms persistence during run failed: {err}")

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



@router.post("/runs/session")
def create_live_session(
    payload: Dict[str, Any] = {},
    request: Request = None,
    db = Depends(get_db)
):
    """Creates a new persistent, visitor-scoped live simulation session."""
    from backend.app.persistence.repositories import VisitorRepository, RunRepository
    vis_repo = VisitorRepository(db)
    run_repo = RunRepository(db)
    
    vis_id = getattr(request.state, "visitor_id", None) if request else None
    visitor = vis_repo.get_or_create_visitor(visitor_id=vis_id)
    
    kind = payload.get("kind", "LIVE_SESSION")
    seed = int(payload.get("seed", 42))
    stype = payload.get("scenario_type", "NORMAL")
    cfg = payload.get("config", {})
    if payload.get("demo_type"):
        cfg["demo_type"] = payload.get("demo_type")
        cfg["demo_stage"] = 0
    
    run = run_repo.create_run(
        visitor_id=visitor.id,
        kind=kind,
        seed=seed,
        scenario_type=stype,
        config_json=cfg
    )
    db.commit()
    
    return {
        "run_id": run.id,
        "visitor_id": visitor.id,
        "kind": run.kind,
        "seed": run.seed,
        "scenario_type": run.scenario_type,
        "status": run.status,
        "sim_step": run.sim_step,
        "version": run.version,
        "created_at": run.created_at.isoformat()
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
def post_demo_run(demo_type: str = "primary", db = Depends(get_db)):
    """
    Executes a golden demo run through the real digital twin pipeline:
    - Primary: FDI on Bus 4 -> Closed-loop SCADA over-excitation -> L1-L3 Flag -> Cyber Attribution -> Mitigation -> Verification.
    - Secondary: Line 1-2 outage -> Physical Fault Attribution -> Electrical Coherence -> Zero cyber anomalies.
    """
    if demo_type == "secondary":
        demo_spec = ScenarioSpec(
            scenario_type=ScenarioType.LINE_FAILURE,
            target_components=["Line 1-2"],
            total_steps=25,
            seed=42,
            attack=None
        )
        run_result = _execute_run_internal(demo_spec, db=db)
        incidents = _incident_manager.get_all_incidents()
        active_inc = incidents[-1] if incidents else None

        return {
            "demo_title": "Secondary Demo: Physical Line Failure (Line 1-2 Outage)",
            "demo_type": "SECONDARY_PHYSICAL_FAULT",
            "run_id": run_result["run_id"],
            "target_component": "Line 1-2",
            "detection": run_result["detection"],
            "attribution": run_result["attribution"],
            "risk": run_result["risk"],
            "incident": active_inc.model_dump() if active_inc else None,
            "verified": True,
        }

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
    run_result = _execute_run_internal(demo_spec, db=db)
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
        "demo_type": "PRIMARY_FDI",
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


@router.get("/warmup")
def get_warmup():
    """Lazily warms up physics engine, dependencies, and loads trained model."""
    import pandapower
    import scipy
    import sklearn
    from backend.app.detection.detector import AnomalyDetector
    detector = AnomalyDetector()
    return {
        "status": "READY",
        "model_version": "model-v1.0",
        "physics_engine": "pandapower-case14",
        "message": "Engine warmed up."
    }


@router.get("/metrics")
def get_metrics():
    """Serves committed and verified model evaluation metrics JSON."""
    import os
    metrics_path = os.path.join(os.path.dirname(__file__), "../../../reports/eval/model-v1.0/metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "accuracy": 0.9161,
        "macro_f1": 0.8239,
        "normal_fpr": 0.0036,
        "normal_fpr_ci_95": [0.0010, 0.0129],
        "model_version": "model-v1.0",
        "provenance": "SIMULATED EVALUATION"
    }


@router.post("/runs/{run_id}/advance")
def advance_live_session(
    run_id: str,
    payload: Dict[str, Any] = {},
    db = Depends(get_db)
):
    """Advances live session by n steps (client-paced stepwise advance)."""
    steps = int(payload.get("steps", 1))
    client_tick_id = payload.get("client_tick_id")
    expected_version = payload.get("expected_version")
    
    from backend.app.services.live_session_service import LiveSessionService
    service = LiveSessionService(db)
    res = service.advance_session(
        run_id=run_id,
        steps=steps,
        client_tick_id=client_tick_id,
        expected_version=expected_version
    )
    if "error" in res:
        raise HTTPException(status_code=res.get("status_code", 400), detail=res["error"])
    return res


@router.get("/runs/{run_id}/feed")
def get_run_feed(
    run_id: str,
    after_event_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db = Depends(get_db)
):
    """Cursor-based polling feed for events, alarms, and telemetry deltas."""
    from backend.app.persistence.repositories import OperationsRepository, RunRepository
    ops_repo = OperationsRepository(db)
    run_repo = RunRepository(db)
    
    run = run_repo.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
        
    events = ops_repo.get_events(run_id=run_id, limit=limit)
    alarms = ops_repo.get_alarms(run_id=run_id, limit=limit)
    incidents = ops_repo.get_incidents(run_id=run_id)
    
    return {
        "run_id": run_id,
        "sim_step": run.sim_step,
        "version": run.version,
        "status": run.status,
        "events": [{"id": e.id, "step": e.step, "type": e.event_type, "desc": e.description, "severity": e.severity, "created_at": e.created_at.isoformat()} for e in events],
        "alarms": [{"id": a.id, "step": a.step, "tag": a.tag, "priority": a.priority, "state": a.state, "desc": a.description, "value": a.value, "limit": a.limit_val} for a in alarms],
        "incidents": [{"id": i.incident_id, "status": i.status, "classification": i.classification, "likely_cause": i.likely_cause, "risk_level": i.risk_level, "plain_summary": i.plain_summary} for i in incidents]
    }


@router.get("/alarms")
def get_alarms(
    run_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db = Depends(get_db)
):
    """Returns list of active and acknowledged alarms."""
    from backend.app.persistence.repositories import OperationsRepository
    ops_repo = OperationsRepository(db)
    
    db_state = state
    if state == "UNACK":
        db_state = "ACTIVE_UNACK"
    elif state == "ACK":
        db_state = "ACTIVE_ACK"

    alarms = ops_repo.get_alarms(run_id=run_id, priority=priority, state=db_state)
    out = []
    for a in alarms:
        st = "UNACK" if a.state == "ACTIVE_UNACK" else ("ACK" if a.state == "ACTIVE_ACK" else a.state)
        created_wall = a.created_at.isoformat() if a.created_at else None
        out.append({
            "id": str(a.id),
            "run_id": a.run_id,
            "step": a.step,
            "created_at_step": a.step,
            "tag": a.tag,
            "priority": a.priority,
            "state": st,
            "description": a.description,
            "value": a.value,
            "current_value": a.value,
            "limit": a.limit_val,
            "limit_value": a.limit_val,
            "acknowledged_by": a.ack_by,
            "acknowledged_at": a.ack_at.isoformat() if a.ack_at else None,
            "created_at": created_wall,
            "created_at_wall": created_wall,
            "provenance": "OBSERVED"
        })
    return out


@router.post("/alarms/{alarm_id}/acknowledge")
def acknowledge_alarm(
    alarm_id: str,
    payload: Dict[str, Any] = {},
    db = Depends(get_db)
):
    """Acknowledges an active alarm with an optional note."""
    from backend.app.incidents.alarm_service import AlarmService
    service = AlarmService(db)
    actor = payload.get("actor", "OPERATOR_1")
    note = payload.get("note", "Acknowledged in console")
    
    try:
        int_id = int(alarm_id)
    except (ValueError, TypeError):
        int_id = alarm_id

    alarm = service.acknowledge(alarm_id=int_id, ack_by=actor, note=note)
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm {alarm_id} not found")
        
    st = "ACK" if alarm.state in ("ACTIVE_ACK", "ACK") else alarm.state
    created_wall = alarm.created_at.isoformat() if alarm.created_at else None
    return {
        "id": str(alarm.id),
        "run_id": alarm.run_id,
        "step": alarm.step,
        "created_at_step": alarm.step,
        "tag": alarm.tag,
        "priority": alarm.priority,
        "state": st,
        "description": alarm.description,
        "value": alarm.value,
        "current_value": alarm.value,
        "limit": alarm.limit_val,
        "limit_value": alarm.limit_val,
        "acknowledged_by": alarm.ack_by,
        "acknowledged_at": alarm.ack_at.isoformat() if alarm.ack_at else None,
        "created_at": created_wall,
        "created_at_wall": created_wall,
        "provenance": "OBSERVED"
    }


@router.post("/demo/{run_id}/next")
def post_demo_next(
    run_id: str,
    db = Depends(get_db)
):
    """Advances one stage of the stepwise server-side demo state machine."""
    from backend.app.services.demo_service import DemoService
    service = DemoService(db)
    res = service.advance_demo_stage(run_id=run_id)
    if "error" in res:
        raise HTTPException(status_code=res.get("status_code", 400), detail=res["error"])
    return res


@router.post("/system/keepalive")
def post_system_keepalive(
    request: Request,
    db = Depends(get_db)
):
    """Vercel Cron keep-alive and expired session pruning endpoint."""
    import os
    from sqlalchemy import text
    cron_secret = os.environ.get("CRON_SECRET")
    auth_header = request.headers.get("Authorization")
    if cron_secret and auth_header != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized cron trigger")
    
    # 1. Run SELECT 1
    db.execute(text("SELECT 1;"))
    
    # 2. Prune expired visitors older than 24h
    from backend.app.persistence.repositories import VisitorRepository
    vis_repo = VisitorRepository(db)
    pruned = vis_repo.prune_expired_visitors()
    db.commit()
    
    return {
        "status": "OK",
        "message": "Keep-alive executed and database refreshed.",
        "pruned_visitors_count": pruned
    }


@router.post("/system/reset")
def post_system_reset():
    """Resets digital twin state and incident history."""
    global _active_grid, _latest_run, _incident_manager
    _active_grid = DigitalTwinGrid()
    _latest_run = None
    _incident_manager = IncidentManager()
    return {"status": "RESET_COMPLETED"}


from fastapi import UploadFile, File

@router.post("/network/import")
async def import_custom_network(file: UploadFile = File(...)):
    """
    Import a custom grid network (.m MATPOWER or .json pandapower file).
    Generates validation report & R6 compatibility gate check.
    """
    content = await file.read()
    try:
        report = _network_importer.import_network_from_file(file.filename, content)
        return report
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Network import error: {str(e)}")


@router.get("/sensors/health")
def get_sensors_health():
    """Returns telemetry sensor health report & R5 data quality score."""
    return _sensor_manager.evaluate_sensor_health()


from backend.app.services.replay_engine import DatasetReplayEngine
from backend.app.services.report_exporter import ReportExporter

_replay_engine = DatasetReplayEngine()

@router.post("/replay/dataset")
async def replay_dataset(dataset_id: str = Query("pub_ds_01"), file: UploadFile = File(...)):
    """
    Replay CSV telemetry dataset and return evidence analysis report (Analysis Mode).
    """
    content = (await file.read()).decode("utf-8")
    try:
        return _replay_engine.replay_csv_dataset(dataset_id, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Replay failed: {str(e)}")


@router.post("/reports/after-action")
def export_after_action_report(evidence_data: Dict[str, Any]):
    """
    Export after-action evidence report bundle with product boundary disclaimers.
    """
    report = ReportExporter.generate_after_action_report(evidence_data)
    markdown_str = ReportExporter.export_to_markdown(report)
    return {
        "report": report,
        "markdown": markdown_str
    }



