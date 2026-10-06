"""
GridShield AI — SQLAlchemy 2.0 ORM Models for Dual SQLite & Supabase Postgres.

Implements:
1. Visitor-isolated runs, packed telemetry (80+ measurements per step), and checkpoints.
2. Ground-truth firewall separation (injections and ground_truth_steps in distinct tables).
3. Intelligence, operations (incidents, alarms, events, mitigations, analyst notes), and audit logs.
4. Schema-portable types (JSON with JSONB support on Postgres).
"""

import os
from datetime import datetime, timezone
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, JSON, DateTime, ForeignKey,
    Index, UniqueConstraint
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

DB_SCHEMA = os.environ.get("DB_SCHEMA", "gridshield")

class Base(DeclarativeBase):
    pass

# =============================================================================
# Visitor & Run Session Models
# =============================================================================

class VisitorModel(Base):
    __tablename__ = "visitors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    quota_counters_json: Mapped[dict] = mapped_column(JSON, default=dict)

    runs: Mapped[list["RunModel"]] = relationship(back_populates="visitor", cascade="all, delete-orphan")


class RunModel(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    visitor_id: Mapped[str] = mapped_column(String(64), ForeignKey("visitors.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32), default="LIVE_SESSION")  # LIVE_SESSION, SCENARIO, DEMO
    seed: Mapped[int] = mapped_column(Integer, default=42)
    scenario_type: Mapped[str] = mapped_column(String(32), default="NORMAL")
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="CREATED")  # CREATED, RUNNING, PAUSED, COMPLETED, STOPPED, FAILED, EXPIRED
    sim_step: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)  # Optimistic locking
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    git_sha: Mapped[str] = mapped_column(String(64), default="local")
    model_version: Mapped[str] = mapped_column(String(32), default="model-v1.0")
    error_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    visitor: Mapped["VisitorModel"] = relationship(back_populates="runs")
    checkpoint: Mapped["SessionCheckpointModel"] = relationship(back_populates="run", uselist=False, cascade="all, delete-orphan")
    observed_steps: Mapped[list["ObservedStepModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    cyber_events: Mapped[list["CyberEventModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    grid_steps: Mapped[list["GridStepModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    detections: Mapped[list["DetectionModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    attributions: Mapped[list["AttributionModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    risk_assessments: Mapped[list["RiskAssessmentModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    incidents: Mapped[list["IncidentModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    events: Mapped[list["EventModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    alarms: Mapped[list["AlarmModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    mitigations: Mapped[list["MitigationResultModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class SessionCheckpointModel(Base):
    __tablename__ = "session_checkpoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), unique=True, index=True)
    step: Mapped[int] = mapped_column(Integer, default=0)
    controller_state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    frequency_state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    estimator_state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    alarm_state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    incident_state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    run: Mapped["RunModel"] = relationship(back_populates="checkpoint")


# =============================================================================
# Ground Truth Models (Firewalled — Only Accessed by GroundTruthRepository)
# =============================================================================

class InjectionModel(Base):
    """Ground truth injection specifications."""
    __tablename__ = "injections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step_start: Mapped[int] = mapped_column(Integer)
    step_end: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(64))
    params_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class GroundTruthStepModel(Base):
    """Ground truth electrical values (never visible to detectors or public APIs)."""
    __tablename__ = "ground_truth_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    values_json: Mapped[list] = mapped_column(JSON)  # Packed array aligned with measurement catalog

    __table_args__ = (
        UniqueConstraint("run_id", "step", name="uq_ground_truth_run_step"),
    )


# =============================================================================
# Telemetry & Cyber Events (Observed by SCADA & Detectors)
# =============================================================================

class ObservedStepModel(Base):
    """Packed observed sensor measurements (80+ values packed per step)."""
    __tablename__ = "observed_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    values_json: Mapped[list] = mapped_column(JSON)   # Packed values array
    quality_json: Mapped[list] = mapped_column(JSON)  # Quality flags array
    sequence: Mapped[int] = mapped_column(Integer, default=0)

    run: Mapped["RunModel"] = relationship(back_populates="observed_steps")

    __table_args__ = (
        UniqueConstraint("run_id", "step", name="uq_observed_run_step"),
    )


class CyberEventModel(Base):
    __tablename__ = "cyber_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    device_id: Mapped[str] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(64))
    details_json: Mapped[dict] = mapped_column(JSON, default=dict)

    run: Mapped["RunModel"] = relationship(back_populates="cyber_events")


class GridStepModel(Base):
    """Summary metrics per step (frequency, voltage violations, power balance)."""
    __tablename__ = "grid_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    summary_metrics_json: Mapped[dict] = mapped_column(JSON, default=dict)

    run: Mapped["RunModel"] = relationship(back_populates="grid_steps")


# =============================================================================
# Intelligence & Analytics Models
# =============================================================================

class DetectionModel(Base):
    __tablename__ = "detections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    l1_stats_json: Mapped[dict] = mapped_column(JSON, default=dict)
    l2_score: Mapped[float] = mapped_column(Float, default=0.0)
    l3_probs_json: Mapped[dict] = mapped_column(JSON, default=dict)
    decision: Mapped[str] = mapped_column(String(64), default="NORMAL")
    abstained: Mapped[bool] = mapped_column(Boolean, default=False)
    suspect_ranking_json: Mapped[list] = mapped_column(JSON, default=list)
    feature_version: Mapped[str] = mapped_column(String(32), default="v1.0")
    feature_vector_json: Mapped[list] = mapped_column(JSON, default=list)
    model_version: Mapped[str] = mapped_column(String(32), default="model-v1.0")

    run: Mapped["RunModel"] = relationship(back_populates="detections")


class AttributionModel(Base):
    __tablename__ = "attributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    likely_cause: Mapped[str] = mapped_column(String(64))
    domain: Mapped[str] = mapped_column(String(32))  # CYBER, PHYSICAL, CYBER_PHYSICAL, NORMAL
    confidence: Mapped[float] = mapped_column(Float)
    hypotheses_json: Mapped[dict] = mapped_column(JSON, default=dict)
    supporting_evidence_json: Mapped[list] = mapped_column(JSON, default=list)

    run: Mapped["RunModel"] = relationship(back_populates="attributions")


class RiskAssessmentModel(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    overall_score: Mapped[float] = mapped_column(Float)
    risk_level: Mapped[str] = mapped_column(String(32))
    subscores_json: Mapped[dict] = mapped_column(JSON, default=dict)
    formula_version: Mapped[str] = mapped_column(String(32), default="v1.0")

    run: Mapped["RunModel"] = relationship(back_populates="risk_assessments")


# =============================================================================
# Operations & Incident Lifecycle Models
# =============================================================================

class IncidentSequenceModel(Base):
    """Monotonically increasing incident ID counter across the deployment."""
    __tablename__ = "incident_sequences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    last_val: Mapped[int] = mapped_column(Integer, default=0)


class IncidentModel(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # GS-0001
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    visitor_id: Mapped[str] = mapped_column(String(64), ForeignKey("visitors.id", ondelete="CASCADE"), index=True)
    opened_step: Mapped[int] = mapped_column(Integer)
    closed_step: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="DETECTED")  # DETECTED, ANALYZING, MITIGATING, VERIFIED, CLOSED
    classification: Mapped[str] = mapped_column(String(64))
    likely_cause: Mapped[str] = mapped_column(String(64))
    risk_level: Mapped[str] = mapped_column(String(32))
    affected_components_json: Mapped[list] = mapped_column(JSON, default=list)
    plain_summary: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    run: Mapped["RunModel"] = relationship(back_populates="incidents")
    evidence: Mapped[list["IncidentEvidenceModel"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
    mitigations: Mapped[list["MitigationResultModel"]] = relationship(back_populates="incident", cascade="all, delete-orphan")
    analyst_notes: Mapped[list["AnalystOutputModel"]] = relationship(back_populates="incident", cascade="all, delete-orphan")


class IncidentEvidenceModel(Base):
    __tablename__ = "incident_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(String(32), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True)
    evidence_tag: Mapped[str] = mapped_column(String(16))  # E1, E2...
    domain: Mapped[str] = mapped_column(String(32))        # ELECTRICAL, CYBER
    description: Mapped[str] = mapped_column(Text)
    measured_value: Mapped[float] = mapped_column(Float, nullable=True)
    expected_value: Mapped[float] = mapped_column(Float, nullable=True)
    deviation: Mapped[float] = mapped_column(Float, nullable=True)
    provenance: Mapped[str] = mapped_column(String(32), default="OBSERVED")

    incident: Mapped["IncidentModel"] = relationship(back_populates="evidence")


class EventModel(Base):
    """Append-only chronological audit log of operational and simulation events."""
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    event_type: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(32), default="INFO")
    description: Mapped[str] = mapped_column(Text)
    details_json: Mapped[dict] = mapped_column(JSON, default=dict)

    run: Mapped["RunModel"] = relationship(back_populates="events")


class AlarmModel(Base):
    """ISA-18.2 compliant alarms table."""
    __tablename__ = "alarms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    tag: Mapped[str] = mapped_column(String(64), index=True)
    priority: Mapped[str] = mapped_column(String(32))  # CRITICAL, HIGH, MEDIUM, LOW, ADVISORY
    state: Mapped[str] = mapped_column(String(32), default="ACTIVE_UNACK")  # ACTIVE_UNACK, ACTIVE_ACK, RTN_UNACK, CLEARED
    description: Mapped[str] = mapped_column(Text)
    value: Mapped[float] = mapped_column(Float, nullable=True)
    limit: Mapped[float] = mapped_column(Float, nullable=True)
    ack_by: Mapped[str] = mapped_column(String(64), nullable=True)
    ack_note: Mapped[str] = mapped_column(Text, nullable=True)
    ack_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    run: Mapped["RunModel"] = relationship(back_populates="alarms")


class MitigationResultModel(Base):
    __tablename__ = "mitigation_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(String(32), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    actions_json: Mapped[list] = mapped_column(JSON)
    baseline_metrics_json: Mapped[dict] = mapped_column(JSON)
    unmitigated_impact_json: Mapped[dict] = mapped_column(JSON)
    mitigated_metrics_json: Mapped[dict] = mapped_column(JSON)
    delta_json: Mapped[dict] = mapped_column(JSON)
    improved: Mapped[bool] = mapped_column(Boolean, default=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    incident: Mapped["IncidentModel"] = relationship(back_populates="mitigations")
    run: Mapped["RunModel"] = relationship(back_populates="mitigations")


class AnalystOutputModel(Base):
    __tablename__ = "analyst_outputs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(String(32), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    mode: Mapped[str] = mapped_column(String(32))  # LLM, TEMPLATE
    reading_level: Mapped[str] = mapped_column(String(32), default="PLAIN")  # PLAIN, TECHNICAL
    context_hash: Mapped[str] = mapped_column(String(64))
    text: Mapped[str] = mapped_column(Text)
    cited_ids_json: Mapped[list] = mapped_column(JSON, default=list)
    validated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    incident: Mapped["IncidentModel"] = relationship(back_populates="analyst_notes")


# =============================================================================
# System, Governance & Audit Models
# =============================================================================

class AuditLogModel(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    visitor_id: Mapped[str] = mapped_column(String(64), index=True)
    action: Mapped[str] = mapped_column(String(64))
    target_type: Mapped[str] = mapped_column(String(64))
    target_id: Mapped[str] = mapped_column(String(64))
    details_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ModelRegistryModel(Base):
    __tablename__ = "model_registry"

    version: Mapped[str] = mapped_column(String(32), primary_key=True)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    dataset_version: Mapped[str] = mapped_column(String(32))
    feature_version: Mapped[str] = mapped_column(String(32))
    seed: Mapped[int] = mapped_column(Integer)
    metrics_json: Mapped[dict] = mapped_column(JSON)
    artifact_path: Mapped[str] = mapped_column(String(256))
    checksum: Mapped[str] = mapped_column(String(64))
    library_versions_json: Mapped[dict] = mapped_column(JSON)


class AppSettingModel(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value_json: Mapped[dict] = mapped_column(JSON)
