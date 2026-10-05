# GridShield AI — Security & Threat Modeling

## 1. Scope & Isolation Model (Invariant I9)
- GridShield AI is a local research digital twin.
- **Strict In-Process Isolation**: The attack simulation framework operates purely on Python objects in memory. No network socket binding, no real packet generation, and no communication with external hardware or SCADA networks.
- **Automated AST Tests**: AST linters in `test_m2_attacks_and_isolation.py` prohibit imports of `socket`, `requests`, `httpx`, `urllib`, `scapy`, and `pcap`.

---

## 2. LLM Safety & Prompt Injection Defense (Section 11)
- **Data Encapsulation**: Untrusted user strings, telemetry names, and event payloads are enclosed within strict XML/JSON data boundaries (`<data>` / `</data>`).
- **System Instructions**: The LLM prompt explicitly commands the model to disregard instructions embedded within telemetry data fields.
- **Output Validation**: Grounding validation checks that all cited numbers, evidence IDs, and component names correspond to verified facts in `AnalystContext`. Any validation anomaly immediately falls back to the deterministic template explainer.
- **Simulation-First Action Gate**: Operator questions proposing actions (`ISOLATE_BUS`, `TRIP_LINE`, `REDISPATCH_GEN`) are validated against an allowlist and executed inside the pandapower simulator before being returned to the user.

---

## 3. Dependency & Environment Security
- Binds to `127.0.0.1` by default.
- Pydantic v2 input validation on all API requests.
- Sensitive environment variables (`LLM_API_KEY`) loaded via `.env` (git-ignored, with `.env.example` committed).
