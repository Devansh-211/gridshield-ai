"""
SQLAlchemy 2.0 Async ORM Models for GridShield AI Persistence.
"""
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class SimulationRunModel(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    scenario_type: Mapped[str] = mapped_column(String(32), default="NORMAL")
    attack_type: Mapped[str] = mapped_column(String(32), default="NONE")
    seed: Mapped[int] = mapped_column(Integer, default=42)
    total_steps: Mapped[int] = mapped_column(Integer, default=200)
    status: Mapped[str] = mapped_column(String(32), default="COMPLETED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    snapshots: Mapped[list["TelemetrySnapshotModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    incidents: Mapped[list["IncidentRecordModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    events: Mapped[list["EventRecordModel"]] = relationship(back_populates="run", cascade="all, delete-orphan")

class TelemetrySnapshotModel(Base):
    __tablename__ = "telemetry_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("simulation_runs.id"), index=True)
    step: Mapped[int] = mapped_column(Integer, index=True)
    sim_time: Mapped[float] = mapped_column(Float)
    telemetry_json: Mapped[dict] = mapped_column(JSON)
    ground_truth_json: Mapped[dict] = mapped_column(JSON)

    run: Mapped["SimulationRunModel"] = relationship(back_populates="snapshots")

class IncidentRecordModel(Base):
    __tablename__ = "incident_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("simulation_runs.id"), index=True)
    classification: Mapped[str] = mapped_column(String(64))
    likely_cause: Mapped[str] = mapped_column(String(64))
    risk_level: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="DETECTED")
    incident_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    run: Mapped["SimulationRunModel"] = relationship(back_populates="incidents")

class EventRecordModel(Base):
    __tablename__ = "event_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(String(64), ForeignKey("simulation_runs.id"), index=True)
    incident_id: Mapped[str] = mapped_column(String(32), nullable=True)
    sim_time: Mapped[float] = mapped_column(Float)
    wall_time: Mapped[str] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(Text)
    payload_json: Mapped[dict] = mapped_column(JSON)

    run: Mapped["SimulationRunModel"] = relationship(back_populates="events")
