# GridShield AI — Database & Persistence Architecture (`DB.md`)

## 1. Overview
GridShield AI features a dual-engine relational persistence architecture built with **SQLAlchemy 2.0** and **Alembic**:
- **Local Dev / Testing**: SQLite with WAL mode (`sqlite:///./data/gridshield.db`).
- **Production (Vercel Serverless)**: Supabase PostgreSQL connected via Supavisor **Transaction Mode Pooler** (Port 6543) using `NullPool`.

## 2. Serverless Connection Best Practices
In serverless execution on Vercel:
1. Long-lived connection pools exhaust database connections. GridShield uses `NullPool` so connections close immediately upon request exit.
2. Connection pooling is offloaded to Supavisor (port 6543, transaction mode).
3. Prepared statements and session-level advisory locks are avoided.
4. Telemetry is packed as typed arrays / JSON payloads to maintain compact row storage.

## 3. Schema & Models

| Table | Description | Key Columns |
| :--- | :--- | :--- |
| `visitors` | Anonymous visitor partitions | `id` (UUID), `created_at`, `last_active_at`, `ip_hash` |
| `runs` | Simulation sessions & checkpoints | `id`, `visitor_id`, `scenario_type`, `status`, `current_step`, `config_json`, `state_checkpoint_json`, `version_id` |
| `telemetry_frames` | Packed step telemetry | `id`, `run_id`, `sim_step`, `frequency_hz`, `bus_voltages_json`, `line_loadings_json`, `provenance` |
| `incidents` | Detected cyber-physical episodes | `id`, `run_id`, `status`, `classification`, `attribution_json`, `risk_json`, `evidence_json`, `provenance` |
| `alarms` | ISA-18.2 compliant alarm records | `id`, `run_id`, `tag`, `priority`, `state`, `description`, `current_value`, `limit_value`, `acknowledged_by` |
| `mitigations` | Allowlisted mitigation actions | `id`, `incident_id`, `actions_json`, `verification_result_json`, `status` |
| `audit_logs` | Tamper-evident operational events | `id`, `run_id`, `event_type`, `actor_id`, `details_json`, `created_at` |

## 4. Migrations & Maintenance
- Migrations managed via Alembic: `alembic upgrade head`
- Database guard: Automatic visitor pruning of records older than 24 hours to stay well within Supabase free-tier limits (< 350 MB).
