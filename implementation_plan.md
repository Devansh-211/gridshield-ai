# Implementation Plan: GridShield AI — Always-On Workbench & Usability Floor

## Overview
This implementation plan upgrades GridShield AI into a genuinely usable cyber-physical grid exercise, analysis, and decision-support workbench meeting all **Always-On Rules (A1–A9)**, **Integrity Rules (R1–R11)**, and the **Usability Floor**.

Work is conducted on the dedicated git branch `workbench-mvp` (never directly on `main`).

---

## Control State
`DECISION` — Implementation plan drafted; awaiting user approval before initializing `task.md`, git tagging, and beginning execution.

---

## Phase Structure

### Phase 1: Core Integrity Architecture & Rules Engine (R1, R2, R4, R5, R6, R9, R11)
- **R1 Value Envelope & Migration**:
  - Implement/audit strictly formatted `ValueEnvelope[T]` types across all endpoints and services.
  - Supported provenances: `LIVE`, `HISTORICAL`, `PUBLIC_DATASET`, `SIMULATED`, `DERIVED`, `PREDICTED`, `UNAVAILABLE`.
  - Include backward-compatibility converter mapping legacy `OBSERVED`/`ESTIMATED`/`CALCULATED`/`MODEL`/`LLM` labels.
- **R2 Environment Label**:
  - Display clear header/export badges: `SIMULATOR`, `REPLAY(dataset_id)`, `MOCK`, `FIXTURE`, `UNAVAILABLE`, `LIVE`.
- **R4 & R5 Evidence Object & 5D Confidence**:
  - Standardize `EvidenceObject` with full versioning (topology, state_estimate, model, schema, code_commit) and 5 distinct confidence scores (detection, attribution, model uncertainty, evidence completeness, data quality).
- **R6 Validated-Domain Gate**:
  - Create/verify `models/registry/compatibility.json` and enforce feature-space OOD checks. Return `TOPOLOGY_UNSUPPORTED` / `MODEL_OUT_OF_DISTRIBUTION` when unvalidated.
- **R11 Ground-Truth Firewall**:
  - Maintain strict type boundary ensuring detection/attribution/LLM modules accept only observed telemetry.

### Phase 2: Usability Floor — Custom Network Ingestion & Sensor Config
- **Flexible Network Import**:
  - Support MATPOWER `.m` files and pandapower `.json` imports via backend `NetworkImporter` service.
  - Generate automatic network validation report (bus count, voltage levels, islanding check, bus coordinates fallback).
- **Sensor Configuration**:
  - Allow operators to define sensor placement, noise parameters, and sensor health flags (`H_data_quality`).

### Phase 3: Exercise Mode — UI Scenario Authoring & Execution
- **UI Scenario Authoring**:
  - Visual authoring of physical disturbances (load ramps, line trips, generator drops) and cyber attacks (FDI, DoS, command injection).
- **Simulation Execution & Real-Time Telemetry**:
  - Run scenarios deterministically via counter-based RNG (`core/rng.py`).
- **R3 Non-Answer Handling & Hypothesis Engine**:
  - Explicitly handle `CONFLICTING_EVIDENCE`, `TOPOLOGY_UNSUPPORTED`, `MODEL_OUT_OF_DISTRIBUTION`, `INSUFFICIENT_DATA`.
  - Display sensor degradation hypothesis `H_data_quality`.

### Phase 4: Analysis (Replay) Mode & Evidence Reporting
- **Dataset Replay Engine**:
  - Ingest public/partner datasets (CSV/Parquet) and run replay analysis against imported network.
- **R7 LLM Evidence Explanation & Delimiter Isolation**:
  - Strict grounding: LLM only re-articulates structured `EvidenceObject` fields; fallback to deterministic template if text contains external numbers.
- **After-Action Report & Export**:
  - Export comprehensive PDF/JSON evidence reports with after-action scoring and full environment/provenance metadata.

### Phase 5: Mitigation What-If & Project Persistence (R8 & Usability Floor)
- **R8 Immutable What-If Engine**:
  - Run what-if simulations exclusively on immutable state copies, returning `PREDICTED` recommendations.
- **Project Save & Reopen**:
  - Persist complete exercise/analysis state to database checkpoints (SQLite/Supabase), enabling project save and reload.
- **Product Boundary & Usability Verification**:
  - Add explicit product disclaimers across UI, README, exports, and recommendation panels.
  - End-to-end usability verification.

---

## Verification Plan
1. **Automated Backend Test Suite**: Run `python -m pytest backend/tests` to verify 100% pass rate.
2. **Frontend Type Check & Build**: Run `cmd /c npm run build` in `frontend/` to confirm 0 TypeScript errors.
3. **Determinism Verification**: Confirm replay hash consistency across identical seed streams.
4. **Git Branching**: Ensure all commits land on `workbench-mvp` branch.

---

## User Decision Required
Do you approve this implementation plan to proceed with **Phase 1** execution on branch `workbench-mvp`?
