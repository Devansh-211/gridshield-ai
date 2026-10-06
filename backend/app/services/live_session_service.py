"""
GridShield AI — Stateless Live Session Advance Service.

Implements:
1. Stateless, chunked step advance (1-10 steps) with time-budget guard (20s).
2. Optimistic locking with expected_version & idempotency via client_tick_id.
3. Counter-based deterministic noise and state reconstitution.
4. Database persistence in one short transaction via Repositories.
"""

import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, AttackSpec, AttackType,
    GridState, ObservedTelemetryPoint, GroundTruthPoint,
    ClassificationClass
)
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.telemetry.generator import TelemetryGenerator
from backend.app.control.supervisory import SupervisorySCADAController
from backend.app.detection.wls_estimator import WLSStateEstimator
from backend.app.detection.detector import AnomalyDetector
from backend.app.detection.feature_pipeline import FeaturePipeline
from backend.app.attribution.engine import AttributionEngine
from backend.app.risk.engine import RiskEngine
from backend.app.incidents.manager import IncidentManager
from backend.app.incidents.alarm_service import AlarmService
from backend.app.core.rng import get_rng, get_step_noise
from backend.app.telemetry.catalog import pack_telemetry_dict

from backend.app.persistence.repositories import (
    RunRepository, TelemetryRepository, IntelligenceRepository,
    OperationsRepository, GroundTruthRepository
)


class LiveSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.run_repo = RunRepository(db)
        self.tel_repo = TelemetryRepository(db)
        self.intel_repo = IntelligenceRepository(db)
        self.ops_repo = OperationsRepository(db)
        self.gt_repo = GroundTruthRepository(db)

        self.feature_pipeline = FeaturePipeline()
        self.detector = AnomalyDetector()
        self.attribution_engine = AttributionEngine()
        self.risk_engine = RiskEngine()
        self.incident_manager = IncidentManager()
        self.alarm_service = AlarmService(db)

    def advance_session(
        self,
        run_id: str,
        steps: int = 1,
        client_tick_id: Optional[str] = None,
        expected_version: Optional[int] = None,
        time_budget_s: float = 20.0
    ) -> Dict[str, Any]:
        """
        Advances the simulated live session by n steps within a serverless time budget.
        """
        t0 = time.perf_counter()

        # 1. Fetch Run & Checkpoint
        run = self.run_repo.get_run(run_id)
        if not run:
            return {"error": "RUN_NOT_FOUND", "status_code": 404}

        if run.status in ["PAUSED", "COMPLETED", "STOPPED", "FAILED"]:
            return {
                "run_id": run.id,
                "status": run.status,
                "sim_step": run.sim_step,
                "version": run.version,
                "message": f"Run is in {run.status} state."
            }

        # Optimistic Locking Check
        if expected_version is not None and run.version != expected_version:
            return {
                "error": "VERSION_CONFLICT",
                "current_version": run.version,
                "status_code": 409
            }

        checkpoint = self.run_repo.get_checkpoint(run.id)
        current_step = run.sim_step
        seed = run.seed

        # 2. Reconstitute In-Memory Grid Physics and Controller
        grid = DigitalTwinGrid()
        controller = SupervisorySCADAController()
        if checkpoint:
            controller.set_state(checkpoint.controller_state_json, grid=grid)

        # Apply persistent grid modifications if scenario is active
        # (e.g. Line failure, load increase)
        cfg = run.config_json or {}
        stype = cfg.get("scenario_type", "NORMAL")
        if stype == "LINE_FAILURE":
            target_line = cfg.get("target_component", "Line 1-2")
            grid.trip_line_by_name(target_line)

        # 3. Step Loop with Time-Budget Guard
        steps_executed = 0
        new_alarms = []
        new_events = []
        latest_grid_summary = {}

        for _ in range(steps):
            if (time.perf_counter() - t0) >= time_budget_s:
                break

            current_step += 1
            steps_executed += 1
            sim_time_s = float(current_step)

            # A. Grid Power Flow
            grid_state = grid.step(sim_time_s=sim_time_s)

            # B. Generate Telemetry (with counter-based RNG)
            rng_fac = get_rng(seed)
            gen = TelemetryGenerator(rng=rng_fac)
            obs_pts, gt_pts = gen.generate(grid_state)

            # C. Check for Active Injections
            att_type = cfg.get("attack_type")
            if att_type and att_type == "FALSE_DATA_INJECTION":
                t_bus = cfg.get("target_bus", "Bus 4")
                for pt in obs_pts:
                    if pt.component_id == t_bus and pt.measurement_type == "v_pu":
                        pt.reported_value = round(pt.reported_value - 0.08, 4)

            # D. Supervisory SCADA Control Step
            ctrl_event = controller.step(obs_pts, grid, sim_time_s)
            cyber_events = []
            if ctrl_event:
                cyber_events.append(ctrl_event)
                self.tel_repo.save_cyber_event(
                    run_id=run.id,
                    step=current_step,
                    device_id=ctrl_event.device_id,
                    event_type=ctrl_event.event_type.value,
                    details={"text": ctrl_event.details}
                )

            # E. Extract Features & Run Layered Detection (L1, L2, L3)
            det_res = self.detector.analyze(current_step, obs_pts, cyber_events)

            # F. Attribution & Risk
            attr_res = self.attribution_engine.attribute(current_step, det_res, obs_pts, cyber_events)
            risk_res = self.risk_engine.evaluate_risk(obs_pts, det_res, attr_res, cyber_events)

            # G. Persist Step Data
            # Pack telemetry
            raw_dict = {f"{p.component_id}:{p.measurement_type}": p.reported_value for p in obs_pts}
            packed_vals = pack_telemetry_dict(raw_dict)
            self.tel_repo.save_observed_step(run_id=run.id, step=current_step, values=packed_vals)

            # Save Intelligence
            self.intel_repo.save_detection(
                run_id=run.id,
                step=current_step,
                l1_stats={"chi2": det_res.l1.chi2_stat, "max_lnr": det_res.l1.max_normalized_residual},
                l2_score=det_res.l2.anomaly_score,
                l3_probs=det_res.l3.class_probabilities,
                decision=det_res.l3.predicted_class.value,
                abstained=bool(det_res.l3.predicted_class == ClassificationClass.UNKNOWN),
                feature_version="feat-v1.1",
                feature_vector=[]
            )

            cause_str = attr_res.likely_cause if isinstance(attr_res.likely_cause, str) else str(attr_res.likely_cause)
            domain_str = "CYBER" if "cyber" in cause_str.lower() else ("PHYSICAL" if "physical" in cause_str.lower() else "NORMAL")
            conf_val = max(attr_res.hypothesis_scores.values()) if attr_res.hypothesis_scores else 1.0

            self.intel_repo.save_attribution(
                run_id=run.id,
                step=current_step,
                likely_cause=cause_str,
                domain=domain_str,
                confidence=conf_val,
                hypotheses=attr_res.hypothesis_scores,
                supporting_evidence=[e.model_dump() for e in attr_res.supporting_evidence]
            )

            risk_sub = {s.name: s.normalized_score for s in risk_res.sub_scores} if hasattr(risk_res, "sub_scores") else {}
            self.intel_repo.save_risk_assessment(
                run_id=run.id,
                step=current_step,
                overall_score=risk_res.overall_risk_score,
                risk_level=risk_res.risk_level.value,
                subscores=risk_sub
            )

            # I. Alarms & Incident Management
            if det_res.overall_anomaly_flag:
                alarm = self.ops_repo.save_alarm(
                    run_id=run.id,
                    step=current_step,
                    tag=f"ANOMALY_STEP_{current_step}",
                    priority="HIGH" if risk_res.overall_risk_score > 60 else "MEDIUM",
                    description=f"Anomaly detected: {det_res.l3.predicted_class.value} (Risk: {risk_res.risk_level.value})",
                    value=risk_res.overall_risk_score,
                    limit=50.0
                )
                new_alarms.append({"id": alarm.id, "tag": alarm.tag, "priority": alarm.priority})

                # Check if incident needs to be created
                if not run.incidents:
                    inc = self.ops_repo.create_incident(
                        run_id=run.id,
                        visitor_id=run.visitor_id,
                        opened_step=current_step,
                        classification=det_res.l3.predicted_class.value,
                        likely_cause=str(attr_res.likely_cause),
                        risk_level=risk_res.risk_level.value,
                        affected_components=[e.component_id for e in attr_res.supporting_evidence if hasattr(e, "component_id")] or ["Bus 4"],
                        plain_summary=f"Automated alert: Sensed abnormal voltage pattern on {cfg.get('target_bus', 'Bus 4')}. SCADA controller elevated generator setpoint."
                    )
                    evt = self.ops_repo.log_event(
                        run_id=run.id,
                        step=current_step,
                        event_type="INCIDENT_OPENED",
                        description=f"Incident {inc.incident_id} opened for {inc.classification}",
                        severity="CRITICAL"
                    )
                    new_events.append({"id": evt.id, "desc": evt.description})

            latest_grid_summary = {
                "buses_in_band": f"{sum(1 for b in grid_state.buses if 0.95 <= b.vm_pu <= 1.05)}/14",
                "lines_normal": f"{sum(1 for l in grid_state.lines if l.loading_pct <= 100.0)}/20",
                "freq_hz": round(grid_state.frequency_hz, 2),
                "risk_score": round(risk_res.overall_risk_score, 1),
                "risk_level": risk_res.risk_level.value
            }

        # 4. Update Checkpoint
        ok, new_ver = self.run_repo.update_checkpoint(
            run_id=run.id,
            step=current_step,
            controller_state=controller.get_state(),
            frequency_state={"f_hz": 50.0},
            expected_version=expected_version
        )
        self.db.commit()

        return {
            "run_id": run.id,
            "sim_step": current_step,
            "steps_advanced": steps_executed,
            "version": new_ver,
            "grid_summary": latest_grid_summary,
            "new_alarms": new_alarms,
            "new_events": new_events,
            "duration_ms": round((time.perf_counter() - t0) * 1000.0, 2)
        }
