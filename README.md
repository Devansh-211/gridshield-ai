# GridShield AI — Cyber-Physical Power Grid Resilience Twin

[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18 / Vite](https://img.shields.io/badge/Frontend-React_18_|_Vite-61DAFB.svg)](https://vitejs.dev/)
[![pandapower](https://img.shields.io/badge/Simulation-pandapower_3.5.5-orange.svg)](https://www.pandapower.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel_Serverless-black.svg)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **GridShield AI** is an explainable cyber-physical resilience platform and educational/research digital twin for electrical power grids. It detects anomalies in a simulated IEEE 14-bus grid, attributes them to physical or cyber causes via cross-domain evidence, explains evidence with an AI Analyst, simulates downstream impact under SCADA closed-loop dynamics, tests allowlisted mitigations, and verifies state recovery.

---

## Core Closed Loop

```
DETECT ──► ATTRIBUTE ──► EXPLAIN ──► SIMULATE ──► MITIGATE ──► VERIFY
```

1. **DETECT**: Layered L1 (WLS Chi-Square & Normalized Residuals), L2 (Isolation Forest unsupervised baseline), and L3 (Calibrated HistGradientBoosting classifier).
2. **ATTRIBUTE**: Hypothesis testing (`H_normal`, `H_physical`, `H_cyber`, `H_cyberphysical`) checking physical explainability against grid power flow, electrical coherence across bus neighbors, and cyber telemetry indicators.
3. **EXPLAIN**: LLM Analyst with delimiter-isolated structured context, grounded numeric assertions, and deterministic template fallback (`TEMPLATE EXPLANATION (no LLM)`).
4. **SIMULATE**: Dynamic quasi-static time series with closed-loop SCADA Automatic Voltage Regulation (AVR) and droop frequency response (`2H df/dt = ΔP_gen - ΔP_load - D·Δf`).
5. **MITIGATE**: Allowlisted actionable control plans (sensor quarantine, state re-estimation, generator redispatch, breaker operations).
6. **VERIFY**: Deterministic 3-way metric comparison (**Baseline vs Unmitigated vs Mitigated**) verifying voltage recovery, overload relief, and state estimation error reduction.

---

## Non-Negotiable Development Invariants

- **I1. No fabricated data.** Every number traces `simulation → telemetry → features → detection → risk → API → UI`.
- **I2. Labelled provenance.** Every value carries `SIMULATED`, `OBSERVED`, `ESTIMATED`, `MODEL`, `CALCULATED`, or `LLM`.
- **I3. Ground-truth firewall.** Detection/classification code receives only `OBSERVED` telemetry and cyber logs, never `GroundTruthPoint` or scenario labels.
- **I4. Determinism.** Counter-based RNG (`np.random.default_rng([seed, t, s])`). Same tuple `(seed, scenario, code_sha, model_version)` reproduces within 1e-6 relative tolerance in $O(1)$ step time.
- **I5. Backend is source of truth.** Frontend never calculates severity, risk, confidence, or physics.
- **I6. Real AI, no scripted AI.** Trained ML models + statistical hypothesis testing.
- **I7. No dead UI.** All buttons execute end-to-end; unconfigured capabilities show explicit degraded states.
- **I8. Honest failure.** Missing API keys or failed simulations produce explicit errors; remaining components continue operating.
- **I9. In-process isolation.** Attacks manipulate in-process simulated objects only. No real sockets, packet crafting, or network exploits.
- **I10. Educational twin.** Educational & research digital twin; no claims of protecting real-world critical infrastructure.
- **I11. Stateless compute.** No request depends on in-process memory surviving across serverless invocations. All state checkpoints persist in PostgreSQL/SQLite.
- **I12. Public-safe deployment.** Visitors are isolated by visitor UUID; client bundles contain zero credentials; rate-limiting and LLM cost caps strictly enforced.

---

## Console Navigation (8 Views)

1. **Overview (SOC Dashboard)**: Single-line diagram summary, KPI ribbon with explicit provenance chips, active alarms banner, and append-only event timeline.
2. **Grid Topology**: Full-screen interactive IEEE 14-bus diagram with deep inspector tables for 14 buses, 20 branches, and 5 generators.
3. **Alarms**: ISA-18.2 compliant industrial console with Priority and State filters, one-click acknowledgment with operator notes, and shelving.
4. **Incidents**: Episode case management with 3-Way verification table, Plain vs Technical analyst note toggle, and "In Plain Words" summary box.
5. **Trends**: Historian multi-pen trend strip charts for comparing voltage, frequency, line loading, and generator outputs.
6. **Scenario Lab**: 8-stage interactive guided walkthrough for False Data Injection & Line Trips, plus custom physical/cyber injection sliders.
7. **Models & System**: Offline model performance metrics (`metrics.json`), Wilson score confidence intervals, and honest research limitations.
8. **Explained**: 15 plain-language markdown sections passing Flesch-Kincaid reading grade ≤ 8.5 with a searchable 26-term glossary.

---

## Quick Start & Installation

### Prerequisites
- Python 3.12+
- Node.js 20+ & npm
- Git

### 1. Backend Setup & Tests
```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies in editable mode
pip install -e .
pip install pytest httpx

# Run complete pytest test suite (50/50 passing)
pytest -v backend/tests/
```

### 2. Verification Scripts
```bash
# Check UI anti-patterns
python scripts/ui_lint.py

# Check Explained reading level (Flesch-Kincaid <= 8.5)
python scripts/readability_check.py

# Check serverless bundle size (< 400 MB)
python scripts/check_bundle_size.py
```

### 3. Frontend Local Development & Build
```bash
cd frontend
npm install
npm run build
npm run dev
```

---

## Architecture & Serverless Topology

```
Vercel Edge / CDN (Static SPA: React 18 + Vite + Tailwind)
  │
  ├──► /api/* ──► Vercel Serverless Python Runtime (FastAPI ASGI: api/index.py)
  │                 ├── Simulation Service (pandapower 3.5.5 IEEE 14-Bus)
  │                 ├── State Estimation & Layered ML Anomaly Classifier
  │                 ├── ISA-18.2 Dynamic Alarm Management Engine
  │                 ├── Stepwise 8-Stage Golden Demo State Machine
  │                 └── Explainable AI Analyst (Gemini + Grounded Template)
  │
  └──► Database Persistence (SQLAlchemy 2.0 + Alembic)
        ├── Production: Supabase PostgreSQL via Supavisor Transaction Pooler (Port 6543, NullPool)
        └── Local Dev: SQLite with WAL mode (./data/gridshield.db)
```

---

## SDG Alignment
- **SDG 7 (Affordable and Clean Energy)**: Enhancing power grid reliability, renewable integration resilience, and power quality visibility.
- **SDG 9 (Industry, Innovation, and Infrastructure)**: Cyber-physical digital twin research for resilient electrical grid infrastructure.
- **SDG 11 (Sustainable Cities and Communities)**: Mitigating cascade power blackout risks in urban distribution networks.
- **SDG 13 (Climate Action)**: Reducing outage duration and improving energy efficiency under physical disturbances.

---

## Limitations & Disclaimer

> [!WARNING]
> **Educational and Research Digital Twin Only.**
> 1. GridShield AI operates on a simulated IEEE 14-bus benchmark network.
> 2. Cyber-physical attacks and measurements are generated in-process without connection to real power infrastructure.
> 3. Machine learning models are trained on simulated data; real-world grid dynamics will exhibit higher noise and non-linearities.
> 4. Do not use for real-world grid operations or control.
