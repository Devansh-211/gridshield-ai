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
    InjectionModel, GroundTruthStepModel, IncidentSequenceModel,
    UserModel, SessionModel, ElementAliasModel, GlossaryTermModel
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
        visitor_id: str = "system",
        action: str = "ACTION",
        target_type: str = "SYSTEM",
        target_id: str = "",
        details: Optional[Dict[str, Any]] = None,
        actor_id: Optional[str] = "anonymous",
        actor_role: Optional[str] = "ANONYMOUS",
        ip_address: Optional[str] = "127.0.0.1"
    ) -> AuditLogModel:
        audit = AuditLogModel(
            visitor_id=visitor_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            details_json=details or {},
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(audit)
        return audit


# =============================================================================
# Authentication & Security Repositories (Phase PA)
# =============================================================================

class AuthRepository:
    """Manages user accounts, credentials, and active session tokens."""
    def __init__(self, db: Session):
        self.db = db

    def get_user_count(self) -> int:
        stmt = select(func.count(UserModel.id))
        return self.db.execute(stmt).scalar() or 0

    def create_user(
        self,
        username: str,
        password_hash: str,
        role: str = "SUPERVISOR",
        display_name: str = "",
        must_change_password: bool = False
    ) -> UserModel:
        user = UserModel(
            id=f"usr-{uuid.uuid4().hex[:10]}",
            username=username.strip().lower(),
            password_hash=password_hash,
            role=role.upper(),
            display_name=display_name or username,
            must_change_password=must_change_password,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        self.db.add(user)
        self.db.flush()
        return user

    def get_user_by_id(self, user_id: str) -> Optional[UserModel]:
        stmt = select(UserModel).where(UserModel.id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_user_by_username(self, username: str) -> Optional[UserModel]:
        stmt = select(UserModel).where(UserModel.username == username.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def list_users(self) -> List[UserModel]:
        stmt = select(UserModel).order_by(UserModel.created_at)
        return list(self.db.execute(stmt).scalars().all())

    def update_user(self, user_id: str, **kwargs) -> Optional[UserModel]:
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        for k, v in kwargs.items():
            if hasattr(user, k) and v is not None:
                setattr(user, k, v)
        user.updated_at = datetime.now(timezone.utc)
        self.db.flush()
        return user

    def delete_user(self, user_id: str) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        self.db.delete(user)
        self.db.flush()
        return True

    def create_session(
        self,
        user_id: str,
        token_hash: str,
        ip_address: str = "127.0.0.1",
        user_agent: str = "",
        expires_at: Optional[datetime] = None
    ) -> SessionModel:
        now = datetime.now(timezone.utc)
        if not expires_at:
            expires_at = now + timedelta(hours=12)
        sess = SessionModel(
            id=token_hash,
            user_id=user_id,
            preview_role=None,
            ip_address=ip_address,
            user_agent=user_agent[:255] if user_agent else "",
            expires_at=expires_at,
            created_at=now,
            last_activity_at=now
        )
        self.db.add(sess)
        self.db.flush()
        return sess

    def get_session(self, token_hash: str) -> Optional[SessionModel]:
        stmt = select(SessionModel).where(SessionModel.id == token_hash)
        sess = self.db.execute(stmt).scalar_one_or_none()
        expires = sess.expires_at
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires and expires < datetime.now(timezone.utc):
            self.db.delete(sess)
            self.db.flush()
            return None
        return sess

    def update_preview_role(self, token_hash: str, preview_role: Optional[str]) -> Optional[SessionModel]:
        sess = self.get_session(token_hash)
        if not sess:
            return None
        sess.preview_role = preview_role.upper() if preview_role else None
        sess.last_activity_at = datetime.now(timezone.utc)
        self.db.flush()
        return sess

    def touch_session(self, token_hash: str) -> None:
        stmt = update(SessionModel).where(SessionModel.id == token_hash).values(
            last_activity_at=datetime.now(timezone.utc)
        )
        self.db.execute(stmt)
        self.db.flush()

    def delete_session(self, token_hash: str) -> bool:
        sess = self.get_session(token_hash)
        if not sess:
            return False
        self.db.delete(sess)
        self.db.flush()
        return True

    def delete_all_user_sessions(self, user_id: str) -> int:
        stmt = delete(SessionModel).where(SessionModel.user_id == user_id)
        res = self.db.execute(stmt)
        self.db.flush()
        return res.rowcount or 0


class AuditLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action: str,
        target_type: str,
        target_id: str,
        actor_id: Optional[str] = "anonymous",
        actor_role: Optional[str] = "ANONYMOUS",
        visitor_id: str = "system",
        ip_address: str = "127.0.0.1",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLogModel:
        audit = AuditLogModel(
            visitor_id=visitor_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            ip_address=ip_address,
            details_json=details or {},
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(audit)
        self.db.flush()
        return audit

    def list_logs(self, limit: int = 100, offset: int = 0) -> List[AuditLogModel]:
        stmt = select(AuditLogModel).order_by(desc(AuditLogModel.created_at)).offset(offset).limit(limit)
        return list(self.db.execute(stmt).scalars().all())


class ElementAliasRepository:
    """Manages friendly layperson substation and corridor names for IEEE 14 bus network."""
    def __init__(self, db: Session):
        self.db = db

    def get_all_aliases(self) -> List[ElementAliasModel]:
        stmt = select(ElementAliasModel).order_by(ElementAliasModel.element_type, ElementAliasModel.element_id)
        return list(self.db.execute(stmt).scalars().all())

    def get_alias(self, element_type: str, element_id: int) -> Optional[ElementAliasModel]:
        stmt = select(ElementAliasModel).where(
            ElementAliasModel.element_type == element_type.upper(),
            ElementAliasModel.element_id == element_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def seed_default_aliases(self) -> None:
        if self.db.execute(select(func.count(ElementAliasModel.id))).scalar() > 0:
            return

        defaults = [
            # Substations (Buses 1-14)
            ("BUS", 1, "Substation 1 (Central Hydro Feeder)", "Primary Power Source", "Main high-voltage intake from the regional hydroelectric plant"),
            ("BUS", 2, "Substation 2 (Industrial Gateway)", "Heavy Industry Hub", "Serves manufacturing district and industrial motors"),
            ("BUS", 3, "Substation 3 (Westside Step-Down)", "Regional Transmission Junction", "Transfers bulk high-voltage electricity into regional rings"),
            ("BUS", 4, "Substation 4 (Uptown Metro)", "Urban Distribution Center", "Supplies central commercial district and downtown transit"),
            ("BUS", 5, "Substation 5 (Harbor Substation)", "Maritime & Logistics Center", "Supplies cargo port facilities and waterfront warehouses"),
            ("BUS", 6, "Substation 6 (North Valley Hub)", "Synchronous Voltage Regulator", "Regulates voltage stability for residential northern districts"),
            ("BUS", 7, "Substation 7 (Research Park)", "High-Tech Campus Feeder", "Feeds university laboratories and medical research facilities"),
            ("BUS", 8, "Substation 8 (Eastside Reserve)", "Fast-Response Backup Hub", "Houses auxiliary battery and dynamic voltage stabilizer"),
            ("BUS", 9, "Substation 9 (Airport Feeder)", "Critical Infrastructure Node", "Provides dual-feed power to regional airport and control towers"),
            ("BUS", 10, "Substation 10 (Highland District)", "High-Density Residential Hub", "Supplies suburban residential towers and schools"),
            ("BUS", 11, "Substation 11 (South Suburbs)", "Suburban Residential Grid", "Feeds retail shopping centers and neighborhood circuits"),
            ("BUS", 12, "Substation 12 (Tech Corridor)", "Data Center District", "Supplies enterprise cloud data centers requiring clean power"),
            ("BUS", 13, "Substation 13 (Green Energy Park)", "Renewable Infeed Hub", "Interconnects rooftop solar and community wind arrays"),
            ("BUS", 14, "Substation 14 (East Suburbs)", "East Residential Perimeter", "Serves outer residential developments and water treatment plant"),
        ]

        for el_type, el_id, friendly, role, desc_txt in defaults:
            alias = ElementAliasModel(
                element_type=el_type,
                element_id=el_id,
                friendly_name=friendly,
                substation_role=role,
                plain_description=desc_txt,
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(alias)
        self.db.flush()


class GlossaryRepository:
    """Manages layperson translations for power engineering and cyber concepts."""
    def __init__(self, db: Session):
        self.db = db

    def get_all_terms(self) -> List[GlossaryTermModel]:
        stmt = select(GlossaryTermModel).order_by(GlossaryTermModel.technical_term)
        return list(self.db.execute(stmt).scalars().all())

    def get_term(self, technical_term: str) -> Optional[GlossaryTermModel]:
        stmt = select(GlossaryTermModel).where(GlossaryTermModel.technical_term == technical_term.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def seed_default_glossary(self) -> None:
        if self.db.execute(select(func.count(GlossaryTermModel.id))).scalar() > 0:
            return

        glossary = [
            ("voltage sag", "Temporary dip in electrical pressure below normal operating range", "Like water pressure dropping when multiple hoses open at once"),
            ("voltage swell", "Temporary surge in electrical pressure above safe equipment rating", "Like a sudden spike in water pipe pressure"),
            ("frequency excursion", "Deviation of the electrical grid's heartbeat rhythm away from standard 50 Hz", "Like a heartbeat speeding up or slowing down under unexpected stress"),
            ("rocof", "Rate of Change of Frequency — how quickly the grid's rhythm is shifting", "How suddenly a car accelerates or decelerates"),
            ("fdi", "False Data Injection — deceptive sensor manipulation intended to trick grid controllers", "Like someone secretly changing the thermostat reading to fool the heater"),
            ("wls chi-square", "Statistical cross-check comparing multiple sensor reports against the laws of physics", "Like double-checking a bank ledger to see if deposits and withdrawals match"),
            ("n-1 contingency", "Simulating whether the grid can stay stable if any single major line fails", "Like checking if a bridge can handle traffic if one lane is blocked"),
            ("reactive power", "Electrical energy that sustains electromagnetic fields inside transformers and motors", "The foam on top of a soda — doesn't quench thirst directly, but necessary to pour it"),
            ("line loading", "How close a transmission line is to its maximum safe electricity carrying limit", "Traffic congestion on a highway compared to its total lane capacity"),
            ("covert attack", "A stealthy cyber attack that manipulates grid state while concealing itself from detectors", "A subtle manipulation crafted to blend in with normal background noise"),
            ("isolation forest", "AI anomaly detector that spots unfamiliar grid operating conditions", "A security guard trained to spot unusual behavior in a crowd"),
            ("generator tripping", "Automatic safety shutdown of a generator to prevent permanent mechanical destruction", "An emergency circuit breaker cutting power when a motor overheats")
        ]

        for tech, plain, analogy in glossary:
            term = GlossaryTermModel(
                technical_term=tech.lower(),
                plain_translation=plain,
                plain_analogy=analogy,
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(term)
        self.db.flush()



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
