# GridShield AI — Vercel Serverless Deployment Guide

This guide details how to deploy **GridShield AI** (`Devansh-211/gridshield-ai`) to Vercel with a connected Supabase Postgres database.

---

## 1. Architecture Overview

- **Frontend**: Vite + React 18 SPA built to static assets (`frontend/dist/`), served directly by Vercel CDN edge nodes.
- **Backend API**: FastAPI ASGI application executed serverlessly via Python runtime (`api/index.py` → `backend/app/main.py`).
- **Database Persistence**: Supabase PostgreSQL connected through the **Supavisor Transaction-Mode Pooler** (Port `6543`) with `NullPool` to support instant cold starts and prevent connection pool exhaustion.

---

## 2. Step-by-Step Vercel Deployment

### Step 1: Push Repository to GitHub
Ensure the latest code is pushed to your GitHub repository (`Devansh-211/gridshield-ai`):
```bash
git push origin main --tags
```

### Step 2: Import Project into Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Select your repository `Devansh-211/gridshield-ai` and click **Import**.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `cd frontend && npm install && npm run build` (configured automatically via `vercel.json`)
   - **Output Directory**: `frontend/dist`

### Step 3: Configure Environment Variables in Vercel
In the Vercel project settings, add the following environment variables under **Settings → Environment Variables**:

| Variable Name | Required | Example / Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://postgres.xxx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` |
| `SESSION_SECRET` | **Yes** | 32+ character random hex string for cookie signing (e.g. `openssl rand -hex 32`) |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for contextual LLM incident articulation |
| `CRON_SECRET` | Optional | Random token protecting `/api/v1/system/keepalive` retention prune calls |
| `LLM_DAILY_CALL_CAP` | Optional | Default `100` (daily quota limit) |

> [!IMPORTANT]
> Always use Supabase's **Transaction-Mode Pooler URL (Port 6543)** in serverless environments, NOT the direct session connection (Port 5432).

### Step 4: Deploy & Verify
1. Click **Deploy**.
2. Once the deployment finishes, verify your deployment:
   - Browse to `https://<your-vercel-app>.vercel.app` (Operations Console loads).
   - Test the `/warmup` endpoint: `https://<your-vercel-app>.vercel.app/api/v1/warmup` (returns `{"status": "warm", "version": "1.0.0"}`).
   - Run the stepwise simulation demo to verify real-time state persistence and detection.

---

## 3. Remote Smoke Testing

Run the automated smoke test suite against your live Vercel deployment:
```bash
python scripts/smoke_remote.py --url https://<your-vercel-app>.vercel.app
```
