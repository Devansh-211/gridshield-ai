# GridShield AI — Architectural Decisions Log

## Architectural Decisions

### AD-01: Framework & Rendering Architecture
- **Decision**: Keep the lightweight, high-performance Vite + React 18 SPA instead of migrating to Next.js SSR.
- **Rationale**: GridShield AI is a dense operational SCADA/EMS console without public SEO indexing requirements on internal views. Vite SPA builds to pure static HTML/JS/CSS on Vercel CDN while FastAPI handles serverless Python API requests on the same origin (`/api/*`), eliminating cross-origin CORS overhead.

### AD-02: Database & Serverless Connection Topology
- **Decision**: Dual-database support via SQLAlchemy 2.0. SQLite with WAL mode for local dev/testing (`sqlite:///./data/gridshield.db`), and Supabase Postgres in production.
- **Rationale**: In production on Vercel serverless, database access connects via Supavisor **transaction-mode pooler** (port 6543) using `NullPool`. This prevents connection exhaustion, supports instant cold starts, and ensures sessionless operation.

### AD-03: Stateless Live Session & Client-Paced Execution
- **Decision**: Replace in-process daemon worker threads and primary SSE streams with stateless `POST /runs/{id}/advance` stepwise progression and cursor-based polling (`GET /runs/{id}/feed`).
- **Rationale**: Vercel serverless execution freezes or terminates instances between requests. Storing session checkpoints in the database and executing bounded step advances (1–10 steps with a 20s time-budget guard) guarantees reliable execution within serverless limits.

### AD-04: Counter-Based Randomness for Determinism (I4)
- **Decision**: Compute step noise using seeded counter RNG `np.random.default_rng([seed, step, stream_id])`.
- **Rationale**: Allows any simulation step $t$ to be recomputed in $O(1)$ without requiring serial simulation replay of all preceding steps.

### AD-05: Dense "Operations Gray" UI Philosophy
- **Decision**: Restyle the frontend completely away from generic AI dark-neon tropes to a flat, dense, high-information "Operations Gray" neutral palette with semantic alarm colors and mono data alignment.
- **Rationale**: Matches authentic utility control room EMS/SCADA human-machine interfaces.

### AD-06: Complete UI Overhaul & Component System
- **Decision**: Rebuild the UI visual layer from the ground up: 1px docked panes (`Pane`), 2-column Property Grids, ISA-18.2 status badges with distinct geometric glyphs (◆, ▲, ■, ●), self-hosted IBM Plex Sans/Mono fonts, and TanStack Table virtualization.
- **Rationale**: Completely eliminates consumer AI design tells (floating card soup, glow palettes, curved chart smoothing, sample data mocks).

### AD-07: uPlot Time-Series Engine Replacement for Recharts
- **Decision**: Replace Recharts in historian views with uPlot.
- **Rationale**: uPlot provides superior high-density rendering of thousands of sample points with zero spline smoothing, explicit threshold limit lines, shared crosshairs, and fixed cursor readout panels without layout shifts.

### AD-08: Pre-Refactor Golden Fixtures & Regression Tolerances (P1)
- **Decision**: Lock 6 canonical scenarios (normal, generator trip, line outage, sensor fault, FDI, cyber-physical) into `tests/golden/*.json` with relative tolerance `1e-4` and absolute tolerance `1e-5` for voltages and `1e-4 Hz` for frequency.
- **Rationale**: Guarantees zero physics drift or mathematical regression across future refactors (P2 through P6).

### AD-09: Target Python Environment & Toolchain Pinning (P1)
- **Decision**: Standardize on Python 3.12 for production serverless deployment and CI while maintaining forward compatibility with Python 3.14 for local development.
- **Rationale**: Pandapower and SciPy pre-built binary wheels are fully mature on Python 3.12 across all OS platforms and cloud serverless runtimes.

### AD-10: Value Envelope & Provenance Migration Map (R1, R2)
- **Decision**: Wrap all telemetry and analytical outputs in `ValueEnvelope[T]` carrying explicit units, source device IDs, ISO timestamps, validity flags, and canonical R1 Provenance enums (`LIVE`, `HISTORICAL`, `PUBLIC_DATASET`, `SIMULATED`, `DERIVED`, `PREDICTED`, `UNAVAILABLE`). Provide bi-directional migration for legacy labels (`OBSERVED`, `ESTIMATED`, `CALCULATED`, `MODEL`, `LLM`).
- **Rationale**: Completely enforces Invariants I1 and I2, guarantees unlabelled values are rejected at validation, and ensures `UNAVAILABLE` values cannot contain numeric payloads.

### AD-11: Five-Dimensional Confidence & Non-Answer Integrity Spine (R3, R4, R5, R6)
- **Decision**: Replace scalar confidence with a 5-dimension vector (`detection`, `attribution`, `model_uncertainty`, `evidence_completeness`, `data_quality`). Treat non-answers (`UNKNOWN`, `INSUFFICIENT_DATA`, `CONFLICTING_EVIDENCE`, `MODEL_OUT_OF_DISTRIBUTION`, `TOPOLOGY_UNSUPPORTED`) as first-class states where all mitigation recommendations are strictly prohibited.
- **Rationale**: Prevents dangerous hallucinated mitigation actions during sensor drift, detector disagreement, or unvalidated grid topologies.

### AD-12: Interactive Grid View Architecture & Frontend Zero-Computation Invariant (P3)
- **Decision**: Build the Grid View Vertical Slice as a layered, state-driven inspection console powered by `/api/v1/topology/{version}/graph`, `/api/v1/state/{snapshot}`, `/api/v1/elements/{element_id}`, and `/api/v1/stream/sse`.
- **Rationale**: Ensures the frontend functions purely as a rendering and user-interaction layer with zero client-side calculation of loading percentages, voltage violations, severity, or risk (Invariant I5). Multi-layer toggles (Voltage, Loading, Anomaly, Attribution, Data Quality) and element inspector panels render authoritative backend Value Envelopes and Evidence Objects with full provenance tracing.

### AD-13: Data & Evaluation Architecture & Benchmark Protocol (P4)
- **Decision**: Multi-tier benchmark dataset generation with strict run-group splits (`dataset_generator.py`), held-out seed isolation, and Wilson 95% confidence intervals on binomial proportions (accuracy, normal False Positive Rate). All evaluation outputs persist as machine-readable JSON (`reports/eval/model-v1.0/metrics.json`) and human-readable Markdown (`REPORT.md`).
- **Rationale**: Enforces Invariants I1, I2, I3 (Ground-Truth Firewall), I6 (Real ML), and I10 (Honest Claims). Feature extraction receives exclusively observed telemetry points and cyber events, never ground-truth states. Wilson 95% confidence intervals and multi-tier FDI sensitivity curves provide transparent, verifiable performance bounds on digital twin evaluations.
