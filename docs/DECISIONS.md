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
