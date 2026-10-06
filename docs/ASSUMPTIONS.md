# GridShield AI — Assumptions Log

## Working Assumptions

1. **Target Grid Benchmark**: IEEE 14-bus test feeder (`pandapower.networks.case14`) provides sufficient cyber-physical complexity (14 buses, 20 branches, 5 generators, 11 loads) while executing within ~100 ms per step to fit Vercel invocation limits.
2. **Postgres Driver**: `psycopg` (v3 binary) is chosen for PostgreSQL connectivity with SQLAlchemy 2.0 to maintain a lightweight bundle size under 400 MB.
3. **Database Guard Limits**: Supabase Free Tier provides 500 MB database capacity. The app enforces `DB_SIZE_GUARD_MB=350` (70% threshold) and visitor TTL pruning (24 hours) to prevent exhaustion.
4. **License & Ownership**: MIT License under copyright holder `Devansh-211`.
5. **LLM Provider**: Google Gemini (`gemini-2.5-flash` or `gemini-1.5-flash`) via `google-genai` with deterministic template fallback when API keys are absent or caps are exceeded.
