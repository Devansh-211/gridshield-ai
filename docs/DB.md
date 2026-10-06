# GridShield AI — Database & Supabase Persistence Architecture

## 1. Overview & Invariants

GridShield AI utilizes a dual-engine database persistence layer:
- **Local Development / Testing**: SQLite with WAL mode (`sqlite:///./data/gridshield.db`).
- **Production (Vercel Serverless)**: Supabase PostgreSQL connected via Supavisor transaction pooler.

### Non-Negotiable Invariants
- **Stateless Compute (Invariant I11)**: Zero in-process request dependency. Session checkpoints, supervisory controller state, telemetry arrays, alarms, and incident logs persist in the database.
- **Ground-Truth Firewall (Invariant I3)**: The `ground_truth_telemetry` table is isolated in a firewalled repository and never accessible to detection/classification pipelines.
- **Visitor Isolation (Invariant I12)**: All sessions and state are partitioned by `visitor_id` UUID with Row-Level Security (RLS) enforcement.

---

## 2. Supabase Setup Guide

### Step 1: Create a Supabase Project
1. Create a free project at [supabase.com](https://supabase.com).
2. Choose your nearest AWS region.
3. Save your database password securely.

### Step 2: Retrieve the Transaction Pooler Connection String
1. Go to **Project Settings** → **Database**.
2. Scroll to the **Connection Pooling** section (Supavisor).
3. Select **Mode: Transaction** and copy the URI:
   ```text
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

### Step 3: Run Database Migrations
Run Alembic migrations against your Supabase instance:
```bash
# Set your DATABASE_URL in your terminal environment
$env:DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Apply all Alembic migrations
python scripts/tasks.py db-migrate
```
*(Or directly via Alembic: `alembic -c backend/alembic.ini upgrade head`)*

---

## 3. Schema Structure

| Table Name | Purpose | Partitioning |
|---|---|---|
| `visitors` | Anonymous visitor tracking & rate limit tracking | Visitor UUID |
| `runs` | Simulation runs, scenario configurations, and deterministic seeds | `visitor_id` FK |
| `session_checkpoints` | Serialized supervisory controller and alarm state | `run_id` FK |
| `observed_telemetry` | Packed JSON arrays of 80+ measurements per step | `run_id` FK, `step` |
| `ground_truth_telemetry` | Raw uncorrupted physics truth (*Firewalled*) | `run_id` FK, `step` |
| `cyber_events` | Emitted network packets, trip logs, and security alarms | `run_id` FK, `step` |
| `incidents` | Detected cyber-physical incidents and triage lifecycle | `run_id` FK |
| `alarms` | ISA-18.2 alarm state machine records | `run_id` FK |
| `audit_log` | Append-only immutable log of operator actions & acks | `run_id` FK |
