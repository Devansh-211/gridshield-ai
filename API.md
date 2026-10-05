# GridShield AI — API Documentation (/api/v1)

All endpoints follow structured JSON error handling using `ErrorEnvelope` (`code`, `message`, `details`, `request_id`) and propagate `X-Request-ID` and `X-Response-Time-Ms` headers.

---

## Endpoints Summary

### System & Health
- `GET /health` — Returns backend health status and uptime.
- `POST /api/v1/system/reset` — Resets digital twin and in-memory incident history.
- `GET /api/v1/models/status` — Returns status of simulator, state estimator, ML detector/classifier, risk engine, and LLM configuration.

### Grid & Telemetry
- `GET /api/v1/grid/topology` — Returns IEEE 14-bus topology with hand-tuned SVG layout coordinates for all buses, generators, loads, lines, and transformers.
- `GET /api/v1/grid/state` — Returns current physical state (voltage, power flows, line loading percentages).
- `GET /api/v1/telemetry` — Returns recent observed telemetry buffer.

### Scenarios & Runs
- `GET /api/v1/scenarios` — Returns catalog of physical scenarios and attack templates.
- `POST /api/v1/runs` — Executes a complete simulated scenario/attack run with specified seed and returns detection, attribution, risk, and incident results.
- `GET /api/v1/runs/{run_id}` — Retrieves historical run summary.
- `GET /api/v1/runs/{run_id}/stream` — Server-Sent Events (SSE) live telemetry and anomaly stream.

### Incidents & Mitigation
- `GET /api/v1/incidents` — Lists all open and historical incidents with pagination.
- `GET /api/v1/incidents/{incident_id}` — Returns full incident detail (evidence items, timeline, attribution scores, risk factors).
- `POST /api/v1/incidents/{incident_id}/simulate-impact` — Simulates forward consequences if incident is ignored.
- `POST /api/v1/incidents/{incident_id}/recommend-mitigation` — Generates allowlisted mitigation plan.
- `POST /api/v1/incidents/{incident_id}/simulate-mitigation` — Simulates recommended mitigation plan and computes 3-way verification.

### AI Analyst
- `POST /api/v1/analyst/explain` — Generates explainable root-cause narrative with evidence citations. Uses Gemini LLM when configured, or deterministic template fallback.
- `POST /api/v1/analyst/ask` — Answers operator queries with simulation-first verification of proposed action schemas (`ISOLATE_BUS`, `TRIP_LINE`, `RESTORE_LINE`, `QUARANTINE_MEASUREMENT`, `REDISPATCH_GEN`, `SHED_LOAD`, `NO_ACTION`).

### Demo Automation
- `POST /api/v1/demo/run?demo_type=primary|secondary` — Executes the automated golden demo run through the real digital twin.
