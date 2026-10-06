# GridShield AI — Development Invariants & Repo Conventions

## Invariants (Non-Negotiable)
- **I1. No fabricated data.** Every number traces `simulation → telemetry → features → detection → risk → API → UI`. Unavailable = `DATA UNAVAILABLE`.
- **I2. Labelled provenance.** Values carry `SIMULATED`, `OBSERVED`, `ESTIMATED`, `MODEL`, `CALCULATED`, or `LLM`.
- **I3. Ground-truth firewall.** Detection/classification/attribution code receives ONLY `OBSERVED` telemetry and cyber logs, never ground truth. Enforced by types, repositories & import tests.
- **I4. Determinism.** All randomness flows through counter-based RNG (`np.random.default_rng([seed, t, s])`). Same tuple `(seed, scenario, code_sha, model_version)` reproduces within 1e-6 relative tolerance in O(1) step time.
- **I5. Backend is source of truth.** Frontend never calculates severity, risk, confidence, classification, or physics results.
- **I6. Real AI, no scripted AI.** Trained ML + defined statistical tests. LLM only re-articulates structured, verified context.
- **I7. No dead UI.** Buttons work end-to-end; unfinished features are hidden, not stubbed.
- **I8. Honest failure.** Missing model / LLM key / failed simulation shows explicit error / degraded state; other components continue.
- **I9. Isolation.** Attack engine manipulates in-process objects only. No sockets, no HTTP clients, no real packet crafting. Tested against forbidden imports.
- **I10. Honest claims.** Educational/research twin only. No claims of real-world critical infrastructure protection.
- **I11. Stateless compute.** No request depends on in-process memory surviving across requests. All session checkpoints persist in the database; zero long-lived background worker threads.
- **I12. Public-safe deployment.** Client credentials/secrets never reach browser bundles; visitors are partitioned and isolated by visitor UUID; rate-limiting and LLM cost caps strictly enforced.

## Core Loop
`DETECT → ATTRIBUTE → EXPLAIN → SIMULATE → MITIGATE → VERIFY`

## Conventions
- **Frontend**: Vite SPA, React 18, TypeScript, Tailwind CSS ("Operations Gray" design system), shadcn/ui primitives (custom styled), Lucide React.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Supabase Postgres in Prod / SQLite for Local Dev), pandapower, scikit-learn.
- **Indexing**: IEEE 1-based labels for UI/docs ("Bus 7"); 0-based engine mapped explicitly in `simulation/indexing.py`.
- **State**: Keep `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/ASSUMPTIONS.md` updated at every milestone.
