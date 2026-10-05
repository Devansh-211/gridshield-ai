---
name: gridshield-database
description: Relational data modeling, SQLite / PostgreSQL schema design, SQLAlchemy ORM mappings, and database operations for grid telemetry, incident logging, and mitigation audit trails.
---

# Database Architecture Skill for GridShield AI

## Strategy
- **Local Dev / Sprint**: High-performance SQLite via `aiosqlite` / standard SQLite for instant setup with zero external server dependencies.
- **Production / Scaled**: PostgreSQL via `asyncpg` with identical SQLAlchemy declarative models.
- **Data Entities**:
  1. `SimulationScenario`: Predefined and custom grid scenarios (IEEE 14, 30, base dispatch, load profiles).
  2. `GridTelemetrySnapshot`: Time-indexed power flow measurements (bus voltages, angles, active/reactive flows).
  3. `SecurityIncident`: Detected attacks, anomaly scores, classifications, confidence, and timestamp.
  4. `XaiExplanation`: Serialized SHAP contributions, top feature attributions, and operator summaries.
  5. `MitigationAction`: Operator actions taken (breaker trips, generation redispatch, sensor recalibration) and post-action resilience verification.

## SQLAlchemy Model Conventions
- Use SQLAlchemy 2.0 style `Mapped` and `mapped_column` type annotations.
- Include ISO 8601 UTC timestamps on all telemetry and security logs.
- Provide JSON/JSONB column fields for flexible power system topology metrics.
