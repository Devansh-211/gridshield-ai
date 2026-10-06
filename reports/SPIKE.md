# GridShield AI — Vercel & Supabase Feasibility Spike Report

**Date:** 2026-10-06  
**Status:** PASSED (Feasible within Vercel Serverless & Supabase constraints)

---

## 1. Measurements & Feasibility Summary

| Metric / Check | Measured Value | Constraint / Target | Result |
|---|---|---|---|
| pandapower + scipy cold import | 6,908 ms | One-off on cold start | OK (Mitigated by `/warmup` endpoint) |
| pandapower `case14` AC power flow (warm) | 105.1 ms | < 200 ms per step | PASSED |
| 10-step advance compute budget | ~1,496 ms | < 20,000 ms (`ADVANCE_TIME_BUDGET_S`) | PASSED |
| Model artifact size & load time | 2.37 MB / 856 ms | < 10 MB / < 2,000 ms | PASSED |
| Model inference latency | ~2.4 ms | < 20 ms | PASSED |
| Database transaction (NullPool, 1 tx) | 445 ms | < 1,000 ms | PASSED |

---

## 2. Serverless Architectural Decisions
1. **Pacing in the Browser**: The UI client schedules stepwise `POST /runs/{id}/advance` calls (1–10 steps per advance).
2. **Transaction Mode Pooler**: Production uses Supavisor transaction pooler on port 6543 (`NullPool`, no session state, no prepared statements).
3. **Warmup Endpoint**: Expose `GET /warmup` which the frontend calls on initial load to warm module imports before operator interactions.
