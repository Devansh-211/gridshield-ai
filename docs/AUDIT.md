# GridShield AI — System & Codebase Audit (P0 Baseline)

**Date**: 2026-10-06 | **Status**: BASELINE LOCKED | **Evaluation Target**: Operator Decision Support MVP

---

## 1. Architecture & Data Flow Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FRONTEND: React 18 + Vite + TypeScript SPA (Operations Gray Console)      │
│  - Shell: TopBar (36px, SIMULATION badge), LeftNav (168px), StatusBar    │
│  - Views: Overview, Grid Topology, Alarms, Incidents, Trends, Lab, etc.   │
│  - Primitives: Pane (0px radius, 1px border), TanStack Table, uPlot      │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ REST /api/v1/* & SSE deltas
┌────────────────────────────────────▼─────────────────────────────────────┐
│ BACKEND: FastAPI (Python 3.12/3.14) Core Application Pipeline             │
│                                                                          │
│  [1. Simulation Core]                                                    │
│    └─ DigitalTwinGrid (pandapower IEEE 14-bus) + FrequencyCOIModel       │
│    └─ ScenarioManager (Load/Line/Gen steps) + AttackEngine (FDI/Trip/DoS)│
│                                                                          │
│  [2. Telemetry Generation & Firewall]                                    │
│    └─ TelemetryGenerator: true states → noise/bias → ObservedTelemetry   │
│    └─ Invariant I3 Firewall: Detectors receive ONLY ObservedTelemetry    │
│                                                                          │
│  [3. Anomaly Detection & State Estimation]                               │
│    └─ Layer 1: Statistical Residuals + Thresholds (v_pu, loading, f_hz)  │
│    └─ Layer 2: Isolation Forest Anomaly Scoring                          │
│                                                                          │
│  [4. Attribution, Risk & Incident Management]                             │
│    └─ AttributionEngine: Calibrated Classifier (6 Classes) + Rules       │
│    └─ Certainty Estimation (Wilson Score & Entropy) + Risk Engine       │
│    └─ IncidentManager: Lifecycle tracking (DETECTED → RESOLVED)          │
│                                                                          │
│  [5. What-If Mitigation Simulation & XAI Analyst]                        │
│    └─ MitigationEngine: Immutable snapshot copy → pandapower verify      │
│    └─ AnalystService: Deterministic template + Gemini grounding          │
│                                                                          │
│  [6. Persistence Layer]                                                  │
│    └─ Dual-Engine SQLAlchemy 2.0 (SQLite Local / Supabase Postgres Prod) │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariant Compliance Audit (I1–I10)

| Invariant | Requirement | Current Status & Audit Findings |
|---|---|---|
| **I1. No Fabricated Data** | All numbers trace from physics/telemetry | **COMPLIANT**: API yields `DATA UNAVAILABLE` when uncomputed; no sample dummy rows in UI. |
| **I2. Labelled Provenance** | Provenance chips on every point | **COMPLIANT**: `SIMULATED`, `OBSERVED`, `ESTIMATED`, `MODEL`, `CALCULATED`, `LLM` tagged throughout. |
| **I3. Ground-Truth Firewall**| Detectors receive only observed data | **COMPLIANT**: Enforced by schema separation (`GroundTruthPoint` vs `ObservedTelemetryPoint`). |
| **I4. Determinism** | Counter-based RNG reproduces within 1e-6 | **COMPLIANT**: `core/rng.py` generates deterministic seed streams. Replay hash locked. |
| **I5. Backend Source of Truth**| Frontend computes no physics/risk | **COMPLIANT**: Frontend acts solely as formatter and visualizer. |
| **I6. Real AI, No Scripted AI**| Trained ML + defined statistical tests | **COMPLIANT**: `calibrated_classifier.joblib` (HistGradientBoosting) + `isolation_forest.joblib`. |
| **I7. No Dead UI** | Controls work end-to-end; rest hidden | **COMPLIANT**: `capabilities.ts` gates features to valid backend endpoints. |
| **I8. Honest Failure** | Missing keys/models degrade gracefully | **COMPLIANT**: Fallback template explanations when LLM is unconfigured; explicit errors reported. |
| **I9. Attack Isolation** | In-process simulation only; no sockets | **COMPLIANT**: Attack engine manipulates pandapower dataframes in memory; no forbidden imports. |
| **I10. Honest Claims** | Research/educational digital twin only | **COMPLIANT**: Prominent disclaimers on TopBar, README, and Models & System tab. |

---

## 3. Hard-Coded IEEE 14-Bus Assumptions

The current codebase is tightly coupled to the IEEE 14-bus test feeder:
1. **Topology Definition**: `backend/app/simulation/grid.py` directly calls `pandapower.networks.case14()`.
2. **Schematic Coordinates**: `backend/app/simulation/grid.py` and `frontend/src/features/grid/layout.ipc14.ts` hard-code 14 bus coordinate pairs `(x, y)` and fixed branch indices.
3. **ML Feature Vector**: `models/registry/feature_names.json` expects fixed 14 voltage features (`v_bus_1` ... `v_bus_14`), line loadings (`line_1_2` ...), and generator power outputs.
4. **Target Pickers**: Scenario lab and attack injection menus contain hardcoded defaults for Bus 4 and Line 1-2.

*Resolution Plan (P2/P3/P4)*: Abstract bus references behind a topology compatibility registry (`models/registry/compatibility.json`). Reject unvalidated topologies with `TOPOLOGY_UNSUPPORTED` rather than failing silently.

---

## 4. README Claim Verification

| README Claim | Code Confirmation | Audit Verdict |
|---|---|---|
| "Dual-Engine Persistence (Supabase + SQLite)" | `backend/app/persistence/database.py` with SQLAlchemy 2.0 | **CONFIRMED** |
| "Layered Anomaly Classifier (Isolation Forest + HistGB)" | `backend/app/detection/` and `models/registry/` | **CONFIRMED** |
| "ISA-18.2 Dynamic Alarm Management" | `backend/app/services/alarm_service.py` & `/alarms` endpoints | **CONFIRMED** |
| "8-Stage Golden Demo State Machine" | `backend/app/api/v1/endpoints.py` (`/demo/{id}/next`) | **CONFIRMED** |
| "Deterministic Replay Engine" | `backend/app/core/rng.py` | **CONFIRMED** |

---

## 5. Location and Data Flow of Existing Grid View

### Location
- **Frontend Container**: `frontend/src/views/GridTopologyView.tsx` (accessible via LeftNav "Grid" tab) and embedded in `frontend/src/views/DashboardView.tsx`.
- **Diagram Renderer**: `frontend/src/features/grid/OneLineDiagram.tsx` (SVG-based single-line layout).
- **Coordinate Geometry**: `frontend/src/features/grid/layout.ipc14.ts` (hand-tuned orthogonal IEEE 14-bus Manhattan coordinates).
- **Backend Source**: `backend/app/simulation/grid.py` (`DigitalTwinGrid.get_topology()`) exposed at `GET /api/v1/grid/topology`.

### Data Flow
```
1. Initial Mount:
   Frontend requests GET /api/v1/grid/topology → receives { buses, lines, generators, loads }
   Layout engine (layout.ipc14.ts) maps elements onto 1440x900 SVG canvas with orthogonal routing.

2. Telemetry & State Updates:
   Session step advance (POST /api/v1/runs/{id}/advance) or live stream (GET /api/v1/runs/{id}/feed)
   → delivers GridState { buses: [ { bus_id, vm_pu, va_degree } ], lines: [ { line_id, loading_pct } ] }

3. Visual Rendering:
   - Normal bus voltages (0.95–1.05 pu) render in neutral gray stroke.
   - Out-of-band voltages trigger alarm-color stroke + shape glyph (◆/▲).
   - Cyber-quarantined measurements render in dashed violet stroke.
   - Right inspector pane (320px) displays measurement residuals and firewalled ground truth.
```

---

## 6. One-Paragraph Wedge Recommendation

**Target Wedge: Industrial Microgrid & Renewable Aggregator Control Centers (Behind-the-Meter & Campus Microgrids)**

*Rationale*: Large transmission (TSO) and regional distribution (DSO) utilities operate under strict, multi-year NERC CIP / IEC 62443 compliance cycles and proprietary EMS/SCADA vendor locks (GE, Siemens, Hitachi) with high procurement friction. In contrast, industrial microgrids, private university campuses, and battery energy storage system (BESS) aggregators face increasing inverter-level cyber-physical vulnerabilities (FDI on voltage regulators, unauthenticated Modbus/DNP3 commands, sensor drift) without dedicated 24/7 SOC staffing. GridShield AI’s lightweight, explainable operator-assist decision support twin provides immediate ROI by triaging ambiguous cyber-physical alarms, quarantining tampered inverter telemetry, and simulating mitigation what-if impacts before physical operator intervention.

---

## 7. P3 Interactive Grid View Plan (One Paragraph)

In **Phase P3**, we will transform the existing single-line diagram into a production-grade, streaming interactive network console driven strictly by Phase P2's integrity-enveloped telemetry and Evidence Objects. We will implement bi-directional SSE streaming with `Last-Event-ID` gap recovery and heartbeat resilience, add multi-layer toggles (voltage, loading %, anomaly scores, cyber attribution, and OOD hatched zones), support interactive click/keyboard inspection with deep-linking (`?incident=&element=&t=`), provide colorblind-safe shape glyphs for every electrical and cyber condition, and guarantee sub-100ms click latency with zero client-side severity computations.
