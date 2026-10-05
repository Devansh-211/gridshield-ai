# GridShield AI — Cyber-Physical Power Grid Resilience Twin

[![Python 3.14](https://img.shields.io/badge/python-3.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18 / Next / Vite](https://img.shields.io/badge/Frontend-React_18_|_Vite-61DAFB.svg)](https://vitejs.dev/)
[![pandapower](https://img.shields.io/badge/Simulation-pandapower_3.5.5-orange.svg)](https://www.pandapower.org/)
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

## Invariants & Principles

- **I1. No fabricated data.** Every number traces `simulation → telemetry → features → detection → risk → API → UI`.
- **I2. Labelled provenance.** Every value is stamped: `SIMULATED`, `OBSERVED`, `ESTIMATED`, `MODEL`, `CALCULATED`, or `LLM`.
- **I3. Ground-truth firewall.** Detection/classification code receives only `OBSERVED` telemetry, never `GroundTruthPoint` or scenario labels.
- **I4. Determinism.** All randomness flows through seeded RNG (`core/rng.py`). Same seed + config = identical results.
- **I5. Backend is source of truth.** Frontend never calculates severity, risk, or physics.
- **I6. Real AI, no scripted AI.** Trained ML + statistical hypothesis testing.
- **I7. No dead UI.** All UI buttons execute end-to-end.
- **I8. Honest failure.** Clear degraded states when services or models are unconfigured.
- **I9. In-process isolation.** Attacks manipulate in-process simulated objects only. No real packet crafting or socket exploitation.
- **I10. Educational twin.** Educational & research scope only; no claims of real-world critical infrastructure protection.

---

## Quick Start & Installation

### Prerequisites
- Python 3.12+ (tested on Python 3.14)
- Node.js 18+ & npm
- Git

### 1. Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Train models deterministically (reproducible from synthetic simulator data)
python -m backend.app.services.train_models

# Run tests
python -m pytest backend/tests/ -v
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
```

### 3. Run Headless Demo Verification
```bash
python scripts/run_demo_test.py
```

---

## Architecture

```
Frontend (Vite / React 18 / Tailwind / Lucide / Recharts)
  │  REST API & Server-Sent Events (SSE)
FastAPI Backend (/api/v1)
  ├── Simulation: pandapower IEEE 14-bus AC power flow + SCADA closed loop
  ├── Telemetry: Observable sensor set + seeded Gaussian noise
  ├── Attacks: In-process False Data Injection, Malicious Commands, DoS, Replay
  ├── Detection: L1 WLS Bad Data + L2 Isolation Forest + L3 Calibrated Classifier
  ├── Attribution: Physical explainability + Electrical coherence + Cyber evidence
  ├── Risk: Multi-factor operational risk scoring
  ├── Incidents: Lifecycle state machine (GS-0001...)
  ├── Mitigation: Allowlisted actions + 3-way verification
  └── Analyst: Delimiter-defended Gemini LLM + Verified Template Explainer
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
