---
name: gridshield-auth-views
description: Spec and acceptance tests for authentication, roles (supervisor, technician, admin), and the two segregated views (plain-language vs full-detail). Load for the PA phase or any change to auth, roles, narrative text, or view shells.
---
# Access and views (phase PA)
Rules R1-R11 and A1-A9 in AGENTS.md apply, plus R12-R13 (addendum). Precondition: P2 (Evidence Object, envelope, non-answers) and P3 (grid view) are PASSED in STATE.md; otherwise `BLOCKED` and propose finishing them first. This phase replaces the auth bullet in P8.

## Roles and default permission matrix (confirm as a `DECISION` in the plan)
| Capability | Supervisor | Technician | Admin |
|---|---|---|---|
| Dashboard, incidents, grid view | plain language | full detail | full detail |
| Acknowledge incident | yes | yes | yes |
| Import networks, sensors, author/run scenarios, replay data, mitigation preview | no | yes | yes |
| Reports | plain-language report | technical report + evidence bundle | both |
| Users, roles, audit log, "preview as" | no | no | yes |
Strict segregation: a user sees only their role's view; no toggle. Admin "preview as supervisor/technician" shows a persistent banner and is audit-logged.

## Authentication (local accounts; OIDC/SSO stays deferred)
- Password hashing with argon2id (bcrypt only if justified); min length 12; login rate limiting plus per-account backoff/lockout; generic error messages (no user enumeration).
- Sessions: httpOnly, Secure, SameSite cookies; server-side session store or short-lived access + rotating refresh; idle and absolute timeouts; logout invalidates server-side; CSRF protection on state-changing requests. No tokens in URLs or logs. SSE uses the same cookie auth.
- No default credentials. First-run bootstrap creates the first admin via a one-time token printed to the console (or a CLI command), then closes. Admin-issued temporary passwords force a change at first login. TOTP MFA is SHOULD.
- Role changes and account disabling take effect immediately (invalidate sessions or re-check role on every request).
- Append-only audit log: login success/failure, logout, user/role changes, preview-as, exports, scenario runs, acknowledgments. Hash-chaining is SHOULD.
- Deny by default: every route and SSE stream declares its allowed roles; a startup check fails if any route lacks a declared policy.

## Segregation is server-side (R12)
One source of truth: the Evidence Object and state. Two projections built from it, with separate response schemas:
- `TechnicianView`: everything available: full R1 envelopes, raw values and units, detector outputs, residuals, probabilities, all five confidence dimensions, versions, provenance, topology ids, Evidence Object JSON.
- `SupervisorView`: a **whitelist schema** (never a redaction of the technician one) of plain-language fields. It carries every fact the technician view carries, translated, not removed. Facts that exist only as raw artifacts (e.g., raw JSON) are listed in `docs/view-parity.yaml` as "technician-only by design".
The frontend renders pre-built view models; it contains no jargon-translation or severity logic. Frontend route guards are convenience only; the server enforces.

## Plain-language layer (R13)
Written for someone with no power-grid knowledge.
- **Deterministic by default:** templates + a versioned glossary + unit/quantity converters (e.g., 0.94 per-unit becomes "6% below its normal level"; 112% loading becomes "carrying 12% more than the equipment is rated for"). Record `narrative_version` in responses and exports; same evidence + same version = identical text. Plain text is generated from evidence at read time, never stored as truth.
- **Structure for each incident:** What is happening / How sure we are / What it could lead to / Options worth discussing with a technician (hidden with a plain reason when suppressed).
- **Fidelity (never simplify into inaccuracy):** preserve the environment label ("This is a practice simulation, not the real grid"), provenance in plain words (measured / estimated / predicted / not available), non-answers ("The system cannot tell yet what is causing this because the evidence conflicts"), and uncertainty. Confidence stays multi-part in plain words (e.g., "Moderately sure. Based on 61% of the data we would normally want; some sensor readings look unreliable"), never one reassuring number. Severity wording comes from a single backend-owned table (Normal / Worth watching / Needs attention / Urgent) mapped from the backend severity field. No alarmism, no false reassurance, never call an action "safe".
- **Names and layers:** every element gets a friendly name (auto-generated, e.g., "Substation 9", "Power line between Substation 4 and 5"; editable by technician/admin; stored per topology version). Supervisor grid layers and legend use plain labels ("Power levels", "Equipment strain", "Unusual activity", "Likely cause", "Sensor reliability"). Raw ids appear only in technician view.
- **Analogies** (roads, water pipes) come only from a curated list in the glossary, each marked `UNVALIDATED` until a human reviews it.
- **Glossary:** a "What does this mean?" page and first-use tooltips; any technical term the layer might emit must have an entry or the build fails.
- **LLM (COULD, off by default):** may rephrase deterministic text only under R7: all numbers, labels, and non-answers must survive unchanged, else reject and use the template.

## Technician view
The existing full-detail UI, plus: raw numbers with units, detector outputs, evidence JSON viewer, topology/model/schema versions, everything the backend knows. Missing data is shown as `UNAVAILABLE` (R1), never hidden.

## Frontend shells
Role-based post-login redirect and route guards; a persistent mode badge ("Supervisor view: plain language" / "Technician view: full detail"); deep links opened by the wrong role redirect to the allowed equivalent without leaking content; both shells reuse the interactive grid components (see `gridshield-grid-ui`) fed by role-specific view models; both pass axe; supervisor text is screen-reader friendly and sized for readability.

## Data model
`users`, `sessions`, `roles` (or role column), `audit_log`, `element_aliases` (per topology version), `glossary`, migrations for all of it. No plaintext secrets anywhere.

## Suggested order
1. Plan + permission-matrix `DECISION` (stop for approval). 2. Auth core + audit log. 3. Route/SSE policy inventory. 4. Projection schemas + glossary + narrative layer. 5. Frontend shells and plain-language grid mode (backend and frontend may run in parallel only after the API contract is approved). 6. Role-specific reports. 7. Tests and gate.

## Gate (all pass/fail)
1. **Route matrix:** a generated test hits every route and SSE stream as anonymous, supervisor, technician, admin; expected 401/403/200 per the matrix; a route without a declared policy fails startup.
2. **Whitelist test:** for every golden and non-answer fixture, every supervisor response validates against the whitelist schema; no technician-only keys appear; direct access to technician routes by a supervisor token returns 403.
3. **Jargon lint:** every supervisor-facing string (templates, labels, tooltips, errors, legends, reports) passes a denylist (e.g., per-unit/pu, WLS, chi-square, residual, FDI, SCADA, bus, PMU, topology, Jacobian, droop, AVR) unless defined in the glossary, and meets a reading-level heuristic of about grade 8 or lower. Record the scores; this is a proxy, not proof of understandability.
4. **Fidelity tests:** for every golden scenario and non-answer fixture, supervisor text preserves environment label, provenance, non-answer state, uncertainty, and severity rank; every number in the text is derivable from the Evidence Object within rounding; `CONFLICTING_EVIDENCE` is never worded as a definite cause; no recommendation wording when suppressed; the product-boundary statement is present.
5. **Parity manifest:** every fact shown in the technician view for an incident has a supervisor counterpart or a `view-parity.yaml` exception.
6. **Auth security tests:** hashing, lockout/backoff, rate limit, session expiry, CSRF, cookie flags, no tokens in URLs/logs, SSE auth and role-specific payloads, immediate effect of role change/disable, no default credentials, one-time bootstrap closes, dependency scan clean, audit entries present for each listed action.
7. **E2E (Playwright):** each role logs in and lands in the correct shell; a supervisor cannot reach technician routes via UI, direct URL, or API; the technician sees raw values; admin preview-as shows the banner and writes an audit entry; the same golden incident is captured in both views (screenshots); axe has zero serious/critical violations in both.
8. **Determinism:** identical evidence + `narrative_version` yields identical text.

## Human-only (never mark done)
Validation of the wording with real non-expert supervisors, analogy review, true reading comprehension testing, external security review/pen test. Mark wording `UNVALIDATED` until then.
