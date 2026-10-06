# GridShield AI — Vercel & Supabase Deployment Runbook (`DEPLOY.md`)

## 1. Prerequisites
1. **GitHub Repository**: Pushed code to `Devansh-211/gridshield-ai`.
2. **Supabase Project**: Free-tier PostgreSQL database.
3. **Vercel Account**: Linked to the GitHub repository.

## 2. Supabase Configuration
1. In your Supabase dashboard, navigate to **Project Settings -> Database -> Connection Pooling**.
2. Copy the **Transaction Mode connection string** (Port `6543`).
   ```text
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
3. Run migrations:
   ```bash
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require" alembic upgrade head
   ```

## 3. Vercel Project Setup
1. Import the `Devansh-211/gridshield-ai` repository into Vercel.
2. Set the Framework Preset to **Vite**.
3. Configure Environment Variables:
   - `DATABASE_URL`: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`
   - `GEMINI_API_KEY`: *(Optional)* Your Google AI Studio API key for live LLM synthesis.
   - `GRIDSHIELD_ENV`: `production`
4. Deploy the project.

## 4. Verification & Smoke Testing
After deployment completes, run the remote smoke suite against the production URL:
```bash
python scripts/smoke_remote.py https://gridshield-ai.vercel.app
```
Verifies `/health`, `/warmup`, `/grid/topology`, `/alarms`, live session creation, and stepwise demo progression.
