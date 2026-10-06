# GridShield AI — Codebase Drift & Gap Audit Report (M0)

**Date:** 2026-10-06  
**Auditor:** Lead Engineering Agent  
**Scope:** G1–G17 Gaps, Documentation vs Implementation Alignment, Invariants Verification

---

## 1. Audit of Suspected Gaps (G1–G17)

| Gap ID | Description | Code / Doc Evidence | Status in v5 MVP | Resolution Plan |
|---|---|---|---|---|
| **G1** | No persistence; in-memory incidents | `API.md` mentions in-memory state | OPEN | Implement Supabase Postgres + SQLite dual backend via SQLAlchemy 2.0 (M1-M2) |
| **G2** | Runs are synchronous batch, not monitored live session | `POST /runs` was single-shot batch | OPEN | Implement stepwise stateless `advance` with client-paced loop & polling feed (M3) |
| **G3** | Hand-typed metrics, "Target FPR" vs measured FPR | `MODEL.md` | OPEN | Build `scripts/evaluate.py` to auto-generate `metrics.json` + `REPORT.md` with 95% Wilson CIs (M4) |
| **G4** | Unpinned environment | README mentioned 3.14 without lockfile | FIXED | Created `.python-version` (3.12), `.nvmrc` (20), pinned `backend/requirements.txt` |
| **G5** | Blanket warning suppression in pytest | `pyproject.toml` filterwarnings | OPEN | Clean up `pyproject.toml` to use specific, justified warning filters only (M0) |
| **G6** | LICENSE linked but absent | Root directory | FIXED | Created standard MIT `LICENSE` holding copyright `Devansh-211` |
| **G7** | Doc drift (React 18 / Next / Vite badge vs Vite SPA) | `README.md` badges | FIXED | Reconciled docs to Vite + React SPA topology (no Next.js SSR) |
| **G8** | FDI too easy (Bus 4 forced to gross 0.88 p.u.) | `SIMULATION.md` | OPEN | Add multi-tier FDI dataset generation (0.5σ to 20σ) and evaluate detection curves (M3-M4) |
| **G9** | Incident localization unclear | `MODEL.md` | OPEN | Implement ranked suspect list from normalized residuals & neighbor disagreement (M3) |
| **G10** | `power_balance_residual` ignores transmission losses | `MODEL.md` feature 9 | OPEN | Implement loss-aware power balance feature in `FeaturePipeline` (`v1.1`) (M3) |
| **G11** | Controller limits / anti-windup undocumented | `SIMULATION.md` | OPEN | Add AVR setpoint rate-limits, deadbands, and anti-windup guards (M3) |
| **G12** | No operator workflow (ack, audit, ownership) | Absent | OPEN | Implement ISA-18.2 alarms, ack notes, and append-only `audit_log` (M5) |
| **G13** | No CI or bundle scanning | Absent | OPEN | Implement GitHub Actions workflow, `scripts/check_bundle_size.py`, and `smoke_remote.py` (M9) |
| **G14** | UI reads as generic "AI dashboard" | Frontend theme | OPEN | Full UI redesign to dense "Operations Gray" neutral theme (M6) |
| **G15** | SDG wording overreached | `README.md` | FIXED | Trimmed to "supports research into..." (M0) |
| **G16** | Serverless-incompatible assumptions | In-process state / background worker | OPEN | Replace worker threads with stateless checkpoint hydration & counter-based RNG (M2-M3) |
| **G17** | No plain-language explanation of product | Absent | OPEN | Build dedicated "Explained" tab with 15 sections, glossary, and reading level ≤ 9 (M7) |

---

## 2. Invariants Check
- **I1–I10**: Verified intact in codebase; extending with **I11 (Stateless Compute)** and **I12 (Public-Safe Deployment)**.
