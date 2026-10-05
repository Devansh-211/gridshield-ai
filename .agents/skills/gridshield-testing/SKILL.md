---
name: gridshield-testing
description: Comprehensive testing procedures for GridShield AI, including pytest unit/integration tests for power simulations and FastAPI endpoints, frontend unit tests, and Antigravity browser_subagent UI verification.
---

# Testing & Quality Assurance Skill for GridShield AI

## Test Levels & Tools
1. **Power System Physics Tests (`pytest`)**:
   - Verify power flow convergence on IEEE test networks.
   - Assert physical conservation laws (Kirchhoff's Current/Voltage Law within numerical tolerance).
   - Test attack injection modifications (FDI, line tripping) create expected physical deviations.
2. **API & Service Integration Tests (`pytest`, `httpx`, `pytest-asyncio`)**:
   - Test all FastAPI endpoints (`/grid/simulate`, `/attacks/inject`, `/ml/detect`, `/mitigation/execute`).
   - Validate Pydantic schema validation and error responses.
   - Verify WebSocket telemetry broadcasting and message contract.
3. **Machine Learning Model Validation**:
   - Test ML inference speed (<50ms per state estimation vector).
   - Assert deterministic SHAP explanation generation.
   - Evaluate F1-score and confusion matrix on synthetic cyber-attack test split.
4. **Browser-Based UI Testing (`browser_subagent`)**:
   - Use Antigravity's native `browser_subagent` to render the running Next.js application.
   - Validate single-line diagram canvas rendering, interactive node clicks, attack injection button triggers, alert panel updates, and mitigation confirmation dialogs.
