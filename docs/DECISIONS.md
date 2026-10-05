# GridShield AI — Technical Decisions Log

## D001: Architecture & Technology Stack
- **Decision**: Monorepo with Python FastAPI backend + Next.js (TypeScript, Tailwind CSS, Lucide icons, Recharts) frontend.
- **Rationale**: Clean separation of concerns, native typing, standard REST/SSE communication contracts, rapid development for 3-day MVP.

## D002: Machine Learning Architecture
- **Decision**: Use scikit-learn (`IsolationForest` for L2 anomaly detection, `HistGradientBoostingClassifier` for L3 multi-class attack classification) with calibration via `CalibratedClassifierCV`.
- **Rationale**: Fast training and deterministic inference with zero external GPU/heavy C++ compiler dependencies, excellent tabular performance on state estimation residuals.

## D003: Database Persistence
- **Decision**: SQLite via `aiosqlite` and SQLAlchemy 2.0 async ORM.
- **Rationale**: Local zero-friction execution, file-based persistence for test runs and incidents, seamlessly swappable to PostgreSQL if required.

## D004: Phase-0 Feasibility Spikes Validation
- **Decision**: Pinned Python stack validated against pandapower 3.5.5, NumPy 2.4.6, SciPy 1.18.1, scikit-learn 1.9.1, FastAPI 0.142.2, and Pydantic 2.13.5.
- **Outcomes**:
  - Spike 1 (pandapower case14 power flow): PASSED (AC Newton-Raphson converged, voltages [1.01, 1.09] p.u.).
  - Spike 2 (WLS State Estimation + Chi-Square Bad Data Detection): PASSED (7 iterations, bad data detected on corrupted voltage injection).
  - Spike 3 (Observability): PASSED (72 measurements across 27 states, redundancy ratio 2.67 > 1.2).
  - Spike 4 (FastAPI & Pydantic OpenAPI generation): PASSED.
