# Implementation Plan: Phase PA — Authentication, Roles & Segregated Views (Supervisor vs Technician)

## Precondition Verification
- **Status in `STATE.md`**: **PASSED**
  - **P2 (Evidence Object, Value Envelopes, 5D Confidence & Non-Answer States)**: Completed and verified in Phase 1, Phase 2, and Phase 4 (`phase-1-complete`, `phase-2-complete`, `phase-4-complete`).
  - **P3 (Interactive Grid View, Multi-Layer Overlays & Element Inspector)**: Completed and verified in Phase 3 and Phase 5 (`phase-3-complete`, `workbench-mvp-complete`).
- **Conclusion**: Preconditions are fully satisfied. Phase PA is **UNBLOCKED** and ready for execution.

---

## 1. Overview & Architectural Principles (Rules R12 & R13)
Phase PA implements local account authentication, role-based access control, and **strict server-side view segregation** into two distinct modes plus administrative governance:
1. **Supervisor View (Plain Language)**: A dedicated, server-side whitelist projection for non-expert grid decision-makers. Translates every fact from the Evidence Object into clear, deterministic, jargon-free explanations (What is happening, How sure we are, What it could lead to, Options worth discussing with a technician). Never reduces facts, never invents numbers, never overstates certainty, and never calls any action "safe".
2. **Technician View (Full Detail)**: The comprehensive engineering/SOC console exposing full R1 Value Envelopes, raw physics quantities with physical units, ML detector outputs (Isolation Forest scores, WLS Chi-square residuals, calibrated classifier probabilities), full 5D confidence vectors, and raw Evidence Object JSON trees.
3. **Admin Console**: User/role management, append-only security audit log, and "Preview as Supervisor/Technician" capability with persistent warning banners and audit logging.

```
                    ┌─────────────────────────────────────────┐
                    │      Source of Truth: EvidenceObject     │
                    │ (Physical Telemetry + ML + Contingency) │
                    └────────────────────┬────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │   Technician View API   │                 │   Supervisor View API   │
      │   (Full Detail Schema)  │                 │    (Whitelist Schema)   │
      │  Raw values, 5D vector, │                 │ Plain language, friendly│
      │   residuals, JSON tree  │                 │  names, plain strain %  │
      └────────────┬────────────┘                 └────────────┬────────────┘
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │  Technician UI Shell    │                 │   Supervisor UI Shell   │
      │  (Operations Gray SOC)  │                 │   (Accessible Plain)    │
      └─────────────────────────┘                 └─────────────────────────┘
```

---

## 2. Permission Matrix (`DECISION 1`)

| Resource / Capability | Anonymous | Supervisor | Technician | Admin |
|---|---|---|---|---|
| **Auth & Session** (`/api/v1/auth/login`, `/me`, `/logout`) | Login only | Yes | Yes | Yes |
| **Supervisor Dashboard & Incidents** (`/api/v1/views/supervisor/...`) | Deny (401) | **Yes** (Whitelist) | **Yes** (Preview/Direct) | **Yes** |
| **Supervisor Plain Grid** (`/api/v1/views/supervisor/grid/...`) | Deny (401) | **Yes** (Plain labels) | **Yes** | **Yes** |
| **Technician Dashboard & Incidents** (`/api/v1/views/technician/...`) | Deny (401) | **Deny (403)** | **Yes** (Full detail) | **Yes** |
| **Technician Grid Telemetry & Inspector** (`/api/v1/elements/...`) | Deny (401) | **Deny (403)** | **Yes** (Raw physics) | **Yes** |
| **Acknowledge Alarm / Incident** | Deny (401) | **Yes** | **Yes** | **Yes** |
| **Exercise Mode Scenario Authoring & Injection** | Deny (401) | **Deny (403)** | **Yes** | **Yes** |
| **Network & Sensor Health Importer / Config** | Deny (401) | **Deny (403)** | **Yes** | **Yes** |
| **Replay Mode & Historical Data Ingestion** | Deny (401) | **Deny (403)** | **Yes** | **Yes** |
| **Mitigation What-If Simulation** | Deny (401) | **Deny (403)** | **Yes** | **Yes** |
| **Reports Generation** | Deny (401) | Plain Report | Technical + Evidence | Both |
| **User & Role Management** (`/api/v1/admin/users`) | Deny (401) | **Deny (403)** | **Deny (403)** | **Yes** |
| **Security Audit Log** (`/api/v1/admin/audit-log`) | Deny (401) | **Deny (403)** | **Deny (403)** | **Yes** |
| **Admin "Preview As" Role Mode** | Deny (401) | **Deny (403)** | **Deny (403)** | **Yes** (Audited) |

*Enforcement Principle*: Deny-by-default. Every API route and SSE stream declares its required role set. A startup introspection check scans all routes and raises an exception if any endpoint lacks an explicit role policy.

---

## 3. Planned API Contracts & Data Schemas

### 3.1 Authentication & Admin API
- `POST /api/v1/auth/bootstrap`
  - Body: `{ token: string, admin_username: string, password: string }`
  - Action: Initial one-time admin account creation if DB has 0 users. Token invalidated immediately after use.
- `POST /api/v1/auth/login`
  - Body: `{ username: string, password: string }`
  - Sets secure `gridshield_session` HttpOnly cookie. Returns user metadata `{ user_id, username, role, must_change_password }`.
- `POST /api/v1/auth/logout`
  - Invalidates server session record and clears cookie.
- `GET /api/v1/auth/me`
  - Returns authenticated user session profile, active role, and preview state.
- `GET /api/v1/admin/users` & `POST /api/v1/admin/users`
  - User CRUD with role assignment (`SUPERVISOR`, `TECHNICIAN`, `ADMIN`).
- `GET /api/v1/admin/audit-log`
  - Returns append-only security log (actor, action, target, timestamp, IP, details).
- `POST /api/v1/admin/preview-as`
  - Body: `{ target_role: "SUPERVISOR" | "TECHNICIAN" | null }`
  - Sets admin session preview role, logs audit event, and injects preview warning banner into responses.

---

### 3.2 Supervisor Whitelist Projection API (Rule R12 & R13)
The Supervisor API delivers a strict **whitelist schema** containing zero engineering jargon, raw matrices, or detector residuals:

```typescript
// Response Schema for GET /api/v1/views/supervisor/incidents/{incident_id}
export interface SupervisorIncidentProjection {
  incident_id: string;
  environment_label: "PRACTICE_SIMULATION" | "HISTORICAL_REPLAY" | "LIVE_SYSTEM";
  environment_badge_text: string; // "This is a practice simulation, not the real power grid"
  status_summary: string;
  severity_level: "NORMAL" | "WORTH_WATCHING" | "NEEDS_ATTENTION" | "URGENT";
  what_is_happening: string; // e.g. "Substation 4 sensor reports voltage 12% below normal, misleading Generator 2 regulators."
  how_sure_we_are: {
    plain_confidence_summary: string; // "High certainty (92%). Based on 100% of sensor feeds; physics cross-check confirms conflict."
    completeness_text: string;
    conflicting_evidence_present: boolean;
    sensor_degradation_suspected: boolean;
  };
  what_it_could_lead_to: string; // e.g. "Over-heating of equipment on power lines connected to Substation 4."
  options_to_discuss: Array<{
    option_id: string;
    action_summary: string;
    potential_benefit: string;
    uncertainty_note: string;
    caution: string; // Mandatory: Never call an action "safe"
  }>;
  affected_locations: Array<{
    friendly_name: string; // "Substation 4" (never raw bus id)
    condition: string; // "Sensor reading suspect"
  }>;
  non_answer_explanation?: string | null; // e.g. "The system cannot determine the cause because evidence is conflicting."
  narrative_version: string; // "narrative-v1.0.0"
  provenance: "DERIVED_FROM_VERIFIED_EVIDENCE";
}
```

```typescript
// Response Schema for GET /api/v1/views/supervisor/grid/topology
export interface SupervisorGridTopologyProjection {
  topology_name: string;
  substations: Array<{
    id: string;
    friendly_name: string; // "Substation 1 (North Station)"
    role_description: "Main Power Plant" | "Regional Generator" | "Consumer Distribution Center";
    x: number;
    y: number;
  }>;
  connections: Array<{
    id: string;
    friendly_name: string; // "Power Corridor between Substation 1 and Substation 2"
    source_name: string;
    target_name: string;
  }>;
  plain_layers: Array<{
    id: "power_flow" | "equipment_strain" | "unusual_activity" | "sensor_reliability";
    label: string;
    description: string;
  }>;
}
```

```typescript
// Response Schema for GET /api/v1/views/supervisor/grid/state
export interface SupervisorGridStateProjection {
  step: number;
  system_health_status: "NORMAL" | "UNDER_OBSERVATION" | "ATTENTION_REQUIRED" | "CRITICAL";
  plain_frequency_summary: string; // "50.00 Hz — Grid rhythm is stable and balanced"
  equipment_strain_summary: string; // "19 of 20 power lines running well within safe limits"
  substation_readings: Array<{
    friendly_name: string;
    status: "NORMAL" | "ELEVATED" | "SUSPECT_SENSOR" | "DEVIATION";
    plain_reading: string; // "Voltage is 6% below normal level"
    provenance_text: "Direct Measurement" | "Cross-Checked Estimate" | "Data Unavailable";
  }>;
}
```

---

### 3.3 Technician Full Detail API (Rule R1)
Preserves all engineering primitives:
- `GET /api/v1/views/technician/dashboard`: Enveloped buses, line loading %, frequency Hz, ROCoF, WLS $\chi^2$ residuals, Isolation Forest anomaly score, L3 classifier probabilities.
- `GET /api/v1/views/technician/incidents/{id}`: Full `EvidenceObject`, 5D confidence scores, raw detector outputs, hypothesis scores, evidence citations, raw mitigation instructions, and JSON tree viewer.
- `GET /api/v1/views/technician/grid/state`: Full IEEE 14 bus/line electrical parameters, MW, MVAr, tap positions, and sensor noise variances.

---

## 4. Deterministic Plain-Language Translation Engine (`DECISION 4`)

To guarantee Rule R13 and zero hallucination:
1. **Deterministic Template Engine (`backend/app/narrative/generator.py`)**:
   - Compiles evidence objects into structured prose at read time.
   - Unit converter rules:
     - Voltage $V < 0.95$: `"Voltage is {round((1.0 - V)*100)}% below normal level"`
     - Voltage $V > 1.05$: `"Voltage is {round((V - 1.0)*100)}% above normal level"`
     - Line loading $L > 100\%$: `"Carrying {round(L - 100)}% more power than the equipment is rated for"`
     - Frequency $f \neq 50.0$: `"Grid frequency drifted by {round(abs(50.0 - f), 3)} Hz"`
2. **Standardized Severity Mapping**:
   - `LOW` $\rightarrow$ `"Normal / Minor Variance"`
   - `MEDIUM` $\rightarrow$ `"Worth Watching"`
   - `HIGH` $\rightarrow$ `"Needs Attention"`
   - `CRITICAL` $\rightarrow$ `"Urgent Action Needed"`
3. **5D Confidence Translation**:
   - Overall certainty score mapped to plain qualifiers (`"Very high confidence"`, `"Moderate certainty"`, `"Low certainty"`).
   - Multi-part explanation preserving evidence completeness % and sensor reliability flags.
4. **Jargon Denylist & Reading Level Guardrail**:
   - Automated test suite runs a denylist against all supervisor strings (`per-unit`, `p.u.`, `WLS`, `chi-square`, `residual`, `FDI`, `SCADA`, `bus`, `PMU`, `Jacobian`, `AVR`, `droop`, `eigenvalue`).
   - Grade 8 Flesch-Kincaid reading score verification proxy.
   - All analogies (water pipes, highway lanes) tagged with `UNVALIDATED` badge until verified by human domain review.

---

## 5. Database Schema & Security Architecture (`DECISION 2` & `DECISION 5`)

### 5.1 New Database Models (`backend/app/persistence/models.py`)
- **`UserModel` (`users`)**:
  - `id` (UUID), `username`, `password_hash` (Argon2id/bcrypt), `role` (`SUPERVISOR`, `TECHNICIAN`, `ADMIN`), `is_active` (bool), `must_change_password` (bool), `created_at`, `updated_at`.
- **`SessionModel` (`sessions`)**:
  - `id` (UUID), `user_id` (FK), `session_token_hash`, `preview_role` (optional), `expires_at`, `created_at`, `last_activity_at`.
- **`AuditLogModel` (`audit_log`)**:
  - `id` (Auto-inc), `timestamp`, `actor_username`, `actor_role`, `action_type` (`LOGIN`, `LOGOUT`, `USER_CREATE`, `ROLE_CHANGE`, `PREVIEW_AS`, `ALARM_ACK`, `SCENARIO_RUN`, `REPORT_EXPORT`), `target_resource`, `details_json`, `ip_address`, `status` (`SUCCESS`, `DENIED`, `FAILURE`).
- **`ElementAliasModel` (`element_aliases`)**:
  - `id`, `network_id`, `element_type` (`BUS`, `LINE`, `GEN`), `element_id`, `friendly_name`, `role_description`.
- **`GlossaryTermModel` (`glossary_terms`)**:
  - `term`, `plain_definition`, `analogy`, `status` (`VALIDATED` / `UNVALIDATED`).

### 5.2 Security Invariants
- Passwords hashed using Argon2id with salt.
- Login rate-limiting (5 attempts / min) with per-account exponential lockout.
- Server-side sessions with HttpOnly, Secure, SameSite=Lax cookies.
- CSRF header verification on state-changing requests.
- First-run bootstrap: If zero users exist, server logs a one-time setup token to stdout (`GRIDSHIELD_BOOTSTRAP_TOKEN`). The token expires upon first admin registration.

---

## 6. Frontend Architecture & Dual-Shell Design

```
                     ┌─────────────────────────────┐
                     │         App Router          │
                     │  (Session & Role Check)     │
                     └──────────────┬──────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│   Supervisor Shell   │ │   Technician Shell   │ │     Admin Shell      │
│  - Plain Dashboard   │ │  - Full SOC Overview │ │  - User Management   │
│  - Plain Incidents   │ │  - Telemetry Stream  │ │  - Audit Log Viewer  │
│  - Plain Grid View   │ │  - Contingency Lab   │ │  - Preview Banner    │
│  - Glossary Drawer   │ │  - Evidence Tree     │ │  - System Config     │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

1. **Top Bar Mode Badge**:
   - Supervisor: `[ 🛡️ Supervisor Mode — Plain Language ]`
   - Technician: `[ ⚡ Technician Mode — Engineering Console ]`
   - Admin Preview: `[ ⚠️ ADMIN PREVIEWING AS SUPERVISOR — AUDIT LOGGED ]` (with Exit Preview button).
2. **Deep-Link Redirection**:
   - If a Supervisor opens `/scenarios` or `/models`, auto-redirects to `/dashboard` with an informative notice ("Scenario authoring is restricted to technician role").
3. **Accessibility (a11y)**:
   - Full WCAG 2.1 AA compliance across both shells with 0 critical axe violations.
   - High contrast text hierarchy and screen-reader accessible ARIA live regions.

---

## 7. Parallel Execution Plan

To execute cleanly and swiftly without conflicts:
1. **Agent 1 (Backend Core & Security)**:
   - Database models & migrations (`users`, `sessions`, `audit_log`, `element_aliases`, `glossary`).
   - Auth service, Argon2id hashing, session cookies, rate-limiting, and bootstrap token generator.
   - Deny-by-default role authorization middleware.
2. **Agent 2 (Narrative & Projection Engine)**:
   - `backend/app/narrative/generator.py`: Deterministic evidence compiler, glossary, quantity converters, and severity mappers.
   - Supervisor & Technician API routers (`/api/v1/views/supervisor/...` and `/api/v1/views/technician/...`).
   - `docs/view-parity.yaml` manifest and jargon lint unit tests.
3. **Agent 3 (Frontend Shells & UI Segregation)**:
   - Auth state context, login view, and role-based shell routing.
   - `SupervisorDashboardView`, `SupervisorIncidentModal`, and `SupervisorGridDiagram` (friendly labels and plain strain layers).
   - `AdminUsersView` and `AdminAuditLogView` with persistent preview banner.
4. **Agent 4 (Quality Assurance & Phase Gate)**:
   - Automated 8-point phase gate test suite (`backend/tests/test_phase_pa_auth_views.py` and frontend test specs).

---

## 8. Explicit `DECISION` Items for Approval

1. **`DECISION 1` (Permission Matrix)**: Approve the 4-role capability matrix (Supervisor, Technician, Admin, Anonymous) with deny-by-default route enforcement.
2. **`DECISION 2` (Session & Cookie Strategy)**: Approve HttpOnly/Secure/SameSite session cookies backed by server-side DB session records and immediate revocation on role update.
3. **`DECISION 3` (Server-Side Whitelist Projections)**: Approve separate dedicated `/api/v1/views/supervisor/...` whitelist schema endpoints guaranteeing that engineering keys never reach supervisor clients.
4. **`DECISION 4` (Plain-Language Rule R13 & Jargon Denylist)**: Approve deterministic read-time narrative generation with Grade 8 reading level ceiling, jargon linting, and `UNVALIDATED` analogy tags.
5. **`DECISION 5` (First-Run Admin Bootstrap Token)**: Approve one-time console bootstrap token for initial deployment rather than hardcoded credentials.

---

## 9. Phase Gate Acceptance Criteria (8 Pass/Fail Tests)

1. **Route Matrix Test**: Automated test hits every route as anonymous, supervisor, technician, admin, verifying expected 401/403/200 codes and zero un-annotated endpoints.
2. **Whitelist Schema Test**: Validates all supervisor responses against `SupervisorView` schema; direct access to technician endpoints by supervisor token returns 403.
3. **Jargon Lint Test**: Automated linter scans all supervisor strings against denylist and validates $\le \text{Grade } 8$ readability score.
4. **Fidelity Test**: Verifies preservation of environment label, provenance labels, non-answer states (`CONFLICTING_EVIDENCE`, `INSUFFICIENT_DATA`), uncertainty, and no "safe" claims.
5. **View Parity Manifest Test**: Asserts all incident facts in technician view have corresponding supervisor entries or are declared in `docs/view-parity.yaml`.
6. **Auth Security Test Suite**: Verifies Argon2id password hashing, exponential lockout, session expiry, CSRF protection, and audit log entries for all sensitive actions.
7. **E2E UI & Accessibility Verification**: Verifies role login landing, deep-link containment, admin preview banner, and 0 axe violations.
8. **Narrative Determinism Test**: Verifies identical evidence input and `narrative_version` outputs identical plain-language text.
