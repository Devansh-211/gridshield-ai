# Task Checklist: Phase 1 — Core Integrity Architecture & Rules Engine

## Control State: AUTONOMOUS

- [x] Task 1.1: Git Tag Initialization (`git tag phase-1-start`)
- [x] Task 1.2: R1 Value Envelope & Migration Engine (`ValueEnvelope[T]` with provenances `LIVE | HISTORICAL | PUBLIC_DATASET | SIMULATED | DERIVED | PREDICTED | UNAVAILABLE` and legacy label conversion map)
- [x] Task 1.3: R2 Environment Labeling (Backend context & frontend TopBar/export badges: `SIMULATOR`, `REPLAY(dataset_id)`, `MOCK`, `FIXTURE`, `UNAVAILABLE`, `LIVE`)
- [x] Task 1.4: R4 & R5 Evidence Object & 5D Confidence Vector (Versioned `EvidenceObject` and 5D confidence: detection, attribution, model uncertainty, evidence completeness, data quality)
- [x] Task 1.5: R6 Validated-Domain Gate & OOD Check (`models/registry/compatibility.json` and feature-space OOD checks emitting `TOPOLOGY_UNSUPPORTED` / `MODEL_OUT_OF_DISTRIBUTION`)
- [x] Task 1.6: R11 Ground-Truth Firewall Type Enforcer (Type boundary preventing raw ground-truth leaking to detection/attribution/LLM)
- [x] Task 1.7: Phase 1 Verification (25/25 integrity tests PASS + 96/96 suite PASS + Vite build PASS)
- [x] Task 1.8: Git Commit & Tag (`phase-1-complete`)
