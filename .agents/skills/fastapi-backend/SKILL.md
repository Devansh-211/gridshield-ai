---
name: fastapi-backend
description: Design, implement, and test robust FastAPI REST and WebSocket backends for cyber-physical power system simulation, telemetry streaming, and ML inference.
---

# FastAPI Backend Architecture Skill for GridShield AI

## Core Responsibilities
- **Framework**: FastAPI with Python 3.12+ / 3.14.
- **Data Validation**: Pydantic v2 schemas for all API payloads and WebSocket messages.
- **Async Execution**: Non-blocking simulation steps, background task dispatching for long-running contingency analyses.
- **Real-Time Telemetry**: WebSocket broadcasting of grid state, bus voltages, line flows, and anomaly alerts.

## Architecture Guidelines
1. **Directory Structure**:
   ```text
   backend/
   ├── app/
   │   ├── main.py             # FastAPI entrypoint, middleware, router mount
   │   ├── api/v1/             # Endpoints grouped by domain (grid, attacks, ml, mitigation)
   │   ├── core/               # App configuration, security, logger
   │   ├── models/             # SQLAlchemy database models
   │   ├── schemas/            # Pydantic v2 request/response schemas
   │   ├── services/           # Power simulation, ML inference, XAI, database services
   │   └── db/                 # Database session and init
   └── tests/                  # Pytest test suite
   ```
2. **Key API Endpoints**:
   - `GET /api/v1/grid/topology`: Returns buses, lines, generators, loads for the active IEEE test system.
   - `POST /api/v1/grid/simulate`: Runs power flow step with specified dispatch and topology.
   - `POST /api/v1/attacks/inject`: Injects cyber or physical attack (FDI, line trip, breaker switch, DoS).
   - `POST /api/v1/ml/detect`: Runs ML state estimation anomaly detector + SHAP explainer on current telemetry.
   - `POST /api/v1/mitigation/execute`: Executes operator countermeasure and returns updated resilience metrics.
   - `WS /ws/telemetry`: Real-time telemetry feed for frontend dashboard.
