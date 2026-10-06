"""
GridShield AI — Persistence Repository Layer.

Enforces:
1. Strict separation of concerns across visitors, runs, telemetry, intelligence, and operations.
2. Ground-truth firewall: GroundTruthRepository is isolated and never accessed by detection or analyst layers.
3. Packed arrays storage for 80+ measurements per step with fast component slicing.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, desc, func

from backend.app.persistence.models import (
    VisitorModel, RunModel, SessionCheckpointModel,
    ObservedStepModel, CyberEventModel, GridStepModel,
    DetectionModel, AttributionModel, RiskAssessmentModel,
    IncidentModel, IncidentEvidenceModel, EventModel,
    AlarmModel, MitigationResultModel, AnalystOutputModel,
    AuditLogModel, ModelRegistryModel, AppSettingModel,
    InjectionModel, GroundTruthStepModel, IncidentSequenceModel
)


class VisitorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_visitor(self, visitor_id: Optional[str] = None, ttl_hours: int = 24) -> VisitorModel:
        now = datetime.now(timezone.utc)
        if visitor_id:
            visitor = self.db.execute(select(VisitorModel).where(VisitorModel.id == visitor_id)).scalar_one_or_none()
            if visitor:
                visitor.last_seen_at = now
                self.db.flush()
                return visitor

        # Create new visitor
        new_id = f"vis-{uuid.uuid4().hex[:12]}"
        visitor = VisitorModel(
            id=new_id,
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(hours=ttl_hours),
            quota_counters_json={"runs_created": 0, "llm_calls_today": 0, "advances_count": 0}
        )
        self.db.add(visitor)
        self.db.flush()
        return visitor


class RunRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_run(
        self,
        visitor_id: str,
        kind: str = "LIVE_SESSION",
        seed: int = 42,
        scenario_type: str = "NORMAL",
        config_json: Optional[Dict[str, Any]] = None,
        model_version: str = "model-v1.0"
    ) -> RunModel:
        now = datetime.now(timezone.utc)
        run_id = f"run-{uuid.uuid4().hex[:10]}"
        run = RunModel(
            id=run_id,
            visitor_id=visitor_id,
            kind=kind,
            seed=seed,
            scenario_type=scenario_type,
            config_json=config_json or {},
            status="RUNNING" if kind == "LIVE_SESSION" else "CREATED",
            sim_step=0,
            version=1,
            created_at=now,
            updated_at=now,
            model_version=model_version
        )
        self.db.add(run)
        self.db.flush()

        # Initialize checkpoint
        checkpoint = SessionCheckpointModel(
            run_id=run_id,
            step=0,
            controller_state_json={"v_target": 1.02, "delta_v": 0.0, "step_count": 0},
            frequency_state_json={"f_hz": 50.0, "omega": 1.0, "rocof": 0.0},
            estimator_state_json={},
            alarm_state_json={},
            incident_state_json={},
            updated_at=now
        )
        self.db.add(checkpoint)
        self.db.flush()
        return run

    def get_run(self, run_id: str, visitor_id: Optional[str] = None) -> Optional[RunModel]:
        stmt = select(RunModel).where(RunModel.id == run_id)
        if visitor_id:
            stmt = stmt.where(RunModel.visitor_id == visitor_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_checkpoint(self, run_id: str) -> Optional[SessionCheckpointModel]:
        stmt = select(SessionCheckpointModel).where(SessionCheckpointModel.run_id == run_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def update_checkpoint(
        self,
        run_id: str,
        step: int,
        controller_state: Dict[str, Any],
        frequency_state: Dict[str, Any],
        alarm_state: Optional[Dict[str, Any]] = None,
        incident_state: Optional[Dict[str, Any]] = None,
        expected_version: Optional[int] = None
    ) -> Tuple[bool, int]:
        """Updates session checkpoint with optimistic locking."""
        run = self.get_run(run_id)
        if not run:
            return False, 0

        if expected_version is not None and run.version != expected_version:
            return False, run.version

        now = datetime.now(timezone.utc)
        run.sim_step = step
        run.version += 1
        run.updated_at = now

        cp = self.get_checkpoint(run_id)
        if cp:
            cp.step = step
            cp.controller_state_json = controller_state
            cp.frequency_state_json = frequency_state
            if alarm_state is not None:
                cp.alarm_state_json = alarm_state
            if incident_state is not None:
                cp.incident_state_json = incident_state
            cp.updated_at = now

        self.db.flush()
        return True, run.version

    def list_visitor_runs(self, visitor_id: str, limit: int = 10) -> List[RunModel]:
        stmt = select(RunModel).where(RunModel.visitor_id == visitor_id).order_by(desc(RunModel.created_at)).limit(limit)
        return list(self.db.execute(stmt).scalars().all())


class TelemetryRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_observed_step(
        self,
        run_id: str,
        step: int,
        values: List[float],
        qualities: Optional[List[str]] = None,
        sequence: int = 0
    ) -> ObservedStepModel:
        stmt = select(ObservedStepModel).where(
            ObservedStepModel.run_id == run_id,
            ObservedStepModel.step == step
        )
        existing = self.db.execute(stmt).scalar_one_or_none()
        if existing:
            existing.values_json = values
            existing.quality_json = qualities or ["GOOD"] * len(values)
            existing.sequence = sequence
            return existing

        obs = ObservedStepModel(
            run_id=run_id,
            step=step,
            values_json=values,
            quality_json=qualities or ["GOOD"] * len(values),
            sequence=sequence
        )
        self.db.add(obs)
        return obs

    def save_cyber_event(
        self,
        run_id: str,
        step: int,
        device_id: str,
        event_type: str,
        details: Optional[Dict[str, Any]] = None
    ) -> CyberEventModel:
        evt = CyberEventModel(
            run_id=run_id,
            step=step,
            device_id=device_id,
            event_type=event_type,
            details_json=details or {}
        )
        self.db.add(evt)
        return evt

    def get_observed_range(self, run_id: str, start_step: int, end_step: int) -> List[ObservedStepModel]:
        stmt = (
            select(ObservedStepModel)
            .where(ObservedStepModel.run_id == run_id)
            .where(ObservedStepModel.step >= start_step)
            .where(ObservedStepModel.step <= end_step)
            .order_by(ObservedStepModel.step)
        )
        return list(self.db.execute(stmt).scalars().all())


class IntelligenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_detection(
        self,
        run_id: str,
        step: int,
        l1_stats: Dict[str, Any],
        l2_score: float,
        l3_probs: Dict[str, float],
        decision: str,
        abstained: bool = False,
        suspect_ranking: Optional[List[Dict[str, Any]]] = None,
        feature_version: str = "v1.0",
        feature_vector: Optional[List[float]] = None,
        model_version: str = "model-v1.0"
    ) -> DetectionModel:
        det = DetectionModel(
            run_id=run_id,
            step=step,
            l1_stats_json=l1_stats,
            l2_score=l2_score,
            l3_probs_json=l3_probs,
            decision=decision,
            abstained=abstained,
            suspect_ranking_json=suspect_ranking or [],
            feature_version=feature_version,
            feature_vector_json=feature_vector or [],
            model_version=model_version
        )
        self.db.add(det)
        return det

    def save_attribution(
        self,
        run_id: str,
        step: int,
        likely_cause: str,
        domain: str,
        confidence: float,
        hypotheses: Dict[str, Any],
        supporting_evidence: List[Dict[str, Any]]
    ) -> AttributionModel:
        attr = AttributionModel(
            run_id=run_id,
            step=step,
            likely_cause=likely_cause,
            domain=domain,
            confidence=confidence,
            hypotheses_json=hypotheses,
            supporting_evidence_json=supporting_evidence
        )
        self.db.add(attr)
        return attr

    def save_risk_assessment(
        self,
        run_id: str,
        step: int,
        overall_score: float,
        risk_level: str,
        subscores: Dict[str, float],
        formula_version: str = "v1.0"
    ) -> RiskAssessmentModel:
        risk = RiskAssessmentModel(
            run_id=run_id,
            step=step,
            overall_score=overall_score,
            risk_level=risk_level,
            subscores_json=subscores,
            formula_version=formula_version
        )
        self.db.add(risk)
        return risk


class OperationsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_next_incident_id(self) -> str:
        """Atomically increments and returns the next incident ID (e.g. GS-0001)."""
        seq = self.db.execute(select(IncidentSequenceModel)).scalar_one_or_none()
        if not seq:
            seq = IncidentSequenceModel(last_val=1)
            self.db.add(seq)
            self.db.flush()
            val = 1
        else:
            seq.last_val += 1
            self.db.flush()
            val = seq.last_val
        return f"GS-{val:04d}"

    def create_incident(
        self,
        run_id: str,
        visitor_id: str,
        opened_step: int,
        classification: str,
        likely_cause: str,
        risk_level: str,
        affected_components: Optional[List[str]] = None,
        plain_summary: Optional[str] = None
    ) -> IncidentModel:
        inc_id = self.get_next_incident_id()
        now = datetime.now(timezone.utc)
        incident = IncidentModel(
            incident_id=inc_id,
            run_id=run_id,
            visitor_id=visitor_id,
            opened_step=opened_step,
            status="DETECTED",
            classification=classification,
            likely_cause=likely_cause,
            risk_level=risk_level,
            affected_components_json=affected_components or [],
            plain_summary=plain_summary,
            created_at=now
        )
        self.db.add(incident)
        self.db.flush()
        return incident

    def add_evidence(
        self,
        incident_id: str,
        evidence_tag: str,
        domain: str,
        description: str,
        measured_value: Optional[float] = None,
        expected_value: Optional[float] = None,
        deviation: Optional[float] = None,
        provenance: str = "OBSERVED"
    ) -> IncidentEvidenceModel:
        ev = IncidentEvidenceModel(
            incident_id=incident_id,
            evidence_tag=evidence_tag,
            domain=domain,
            description=description,
            measured_value=measured_value,
            expected_value=expected_value,
            deviation=deviation,
            provenance=provenance
        )
        self.db.add(ev)
        return ev

    def save_alarm(
        self,
        run_id: str,
        step: int,
        tag: str,
        priority: str,
        description: str,
        value: Optional[float] = None,
        limit: Optional[float] = None
    ) -> AlarmModel:
        now = datetime.now(timezone.utc)
        alarm = AlarmModel(
            run_id=run_id,
            step=step,
            tag=tag,
            priority=priority,
            state="ACTIVE_UNACK",
            description=description,
            value=value,
            limit=limit,
            created_at=now,
            updated_at=now
        )
        self.db.add(alarm)
        return alarm

    def acknowledge_alarm(self, alarm_id: int, ack_by: str, ack_note: Optional[str] = None) -> Optional[AlarmModel]:
        alarm = self.db.execute(select(AlarmModel).where(AlarmModel.id == alarm_id)).scalar_one_or_none()
        if alarm:
            alarm.state = "ACTIVE_ACK" if alarm.state == "ACTIVE_UNACK" else alarm.state
            alarm.ack_by = ack_by
            alarm.ack_note = ack_note
            alarm.ack_at = datetime.now(timezone.utc)
            alarm.updated_at = datetime.now(timezone.utc)
            self.db.flush()
        return alarm

    def log_event(
        self,
        run_id: str,
        step: int,
        event_type: str,
        description: str,
        severity: str = "INFO",
        details: Optional[Dict[str, Any]] = None
    ) -> EventModel:
        evt_id = f"evt-{uuid.uuid4().hex[:10]}"
        evt = EventModel(
            id=evt_id,
            run_id=run_id,
            step=step,
            timestamp=datetime.now(timezone.utc),
            event_type=event_type,
            severity=severity,
            description=description,
            details_json=details or {}
        )
        self.db.add(evt)
        return evt

    def get_alarms(
        self,
        run_id: Optional[str] = None,
        priority: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 100
    ) -> List[AlarmModel]:
        stmt = select(AlarmModel)
        if run_id:
            stmt = stmt.where(AlarmModel.run_id == run_id)
        if priority:
            stmt = stmt.where(AlarmModel.priority == priority)
        if state:
            stmt = stmt.where(AlarmModel.state == state)
        stmt = stmt.order_by(desc(AlarmModel.id)).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def get_incidents(self, run_id: Optional[str] = None, limit: int = 50) -> List[IncidentModel]:
        stmt = select(IncidentModel)
        if run_id:
            stmt = stmt.where(IncidentModel.run_id == run_id)
        stmt = stmt.order_by(desc(IncidentModel.created_at)).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def get_events(self, run_id: Optional[str] = None, limit: int = 100) -> List[EventModel]:
        stmt = select(EventModel)
        if run_id:
            stmt = stmt.where(EventModel.run_id == run_id)
        stmt = stmt.order_by(desc(EventModel.timestamp)).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def log_audit(
        self,
        visitor_id: str,
        action: str,
        target_type: str,
        target_id: str,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLogModel:
        audit = AuditLogModel(
            visitor_id=visitor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details_json=details or {},
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(audit)
        return audit


# =============================================================================
# Firewalled Ground Truth Repository (Isolated & Tested by Import Firewall)
# =============================================================================

class GroundTruthRepository:
    """Provides access to ground truth injections and values.
    
    CRITICAL: Never import or call from detection, attribution, risk, or analyst services!
    """
    def __init__(self, db: Session):
        self.db = db

    def save_injection(
        self,
        run_id: str,
        step_start: int,
        step_end: int,
        attack_type: str,
        params: Optional[Dict[str, Any]] = None
    ) -> InjectionModel:
        inj = InjectionModel(
            run_id=run_id,
            step_start=step_start,
            step_end=step_end,
            type=attack_type,
            params_json=params or {},
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(inj)
        return inj

    def save_ground_truth_step(self, run_id: str, step: int, values: List[float]) -> GroundTruthStepModel:
        stmt = select(GroundTruthStepModel).where(
            GroundTruthStepModel.run_id == run_id,
            GroundTruthStepModel.step == step
        )
        existing = self.db.execute(stmt).scalar_one_or_none()
        if existing:
            existing.values_json = values
            return existing

        gt = GroundTruthStepModel(
            run_id=run_id,
            step=step,
            values_json=values
        )
        self.db.add(gt)
        return gt

    def get_ground_truth_step(self, run_id: str, step: int) -> Optional[GroundTruthStepModel]:
        stmt = (
            select(GroundTruthStepModel)
            .where(GroundTruthStepModel.run_id == run_id)
            .where(GroundTruthStepModel.step == step)
        )
        return self.db.execute(stmt).scalar_one_or_none()
