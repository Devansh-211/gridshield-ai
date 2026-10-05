---
name: agent-orchestration-roles
description: Specialized agent roles, handoff protocols, and parallel execution guidelines for GridShield AI subagents (Power Systems, Cybersecurity, ML, Backend, Frontend/UI, QA, Integration).
---

# Agent Orchestration & Specialized Roles for GridShield AI

## Subagent Roster & Responsibilities

| Subagent Role | Primary Domain | Core Responsibilities |
| :--- | :--- | :--- |
| **Power Systems Agent** | Electrical Grid Physics | `pandapower` model setup, IEEE 14/30 bus configs, power flow solver, physical contingencies. |
| **Cybersecurity Agent** | Threat Modeling & Attacks | FDI algorithms, SCADA protocol tamper simulation, breaker denial-of-service, mitigation protocols. |
| **ML & XAI Agent** | Intelligent Diagnostics | Anomaly detection, XGBoost classifier training/inference, SHAP attribution, feature pipeline. |
| **Backend Agent** | API & Orchestration | FastAPI routes, WebSockets, Pydantic schemas, background simulation workers, database models. |
| **Frontend/UI Agent** | Critical-Infrastructure SOC | Next.js, shadcn/ui, Tailwind CSS, Lucide icons, single-line SVG/Canvas visualizer, telemetry charts. |
| **QA & Testing Agent** | Verification & Validation | `pytest` test suites, API contract testing, physics conservation checks, `browser_subagent` UI tests. |
| **Integration Agent** | End-to-End System Delivery | Service wiring, environment configuration, cross-layer latency optimization, end-to-end demo flow. |

## Inter-Agent Communication Protocol
1. **Contract-First Development**: Backend agent and Frontend agent align on Pydantic / TypeScript interface schemas before writing implementation code.
2. **Deterministic Physics Handshake**: Power Systems agent validates that simulation output matches pandapower standard results before ML agent ingests the feature vector.
3. **Continuous Verification**: QA agent runs automated test suite after any critical component change.
