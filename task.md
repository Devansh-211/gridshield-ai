# Task Checklist: Phase PA — Authentication, Roles & Segregated Views

## Control State: AUTONOMOUS

- [ ] Task PA.1: Git Tag Initialization (`git tag phase-pa-start`)
- [ ] Task PA.2: Database Models & Security Schema (`UserModel`, `SessionModel`, `AuditLogModel`, `ElementAliasModel`, `GlossaryTermModel`, Argon2id, bootstrap token)
- [ ] Task PA.3: Auth & Admin Service Endpoints (`/bootstrap`, `/login`, `/logout`, `/me`, `/admin/users`, `/admin/audit-log`, `/admin/preview-as`)
- [ ] Task PA.4: Deny-by-Default Route Security Middleware & Startup Introspection Validator
- [ ] Task PA.5: Deterministic Plain-Language Translation Engine (`backend/app/narrative/generator.py`, glossary, strain converters, Grade 8 jargon linter)
- [ ] Task PA.6: Server-Side Whitelist Projection Endpoints (`/api/v1/views/supervisor/...` & `/api/v1/views/technician/...`)
- [ ] Task PA.7: View Parity Manifest (`docs/view-parity.yaml`)
- [ ] Task PA.8: Frontend Dual-Shell & Role-Based UI Architecture (Login, Supervisor Shell, Technician Shell, Admin Console, Preview-As Banner)
- [ ] Task PA.9: 8-Point Phase Gate Test Suite (`backend/tests/test_phase_pa_auth_views.py`)
- [ ] Task PA.10: Final Verification, Walkthrough Report (`walkthrough.md`) & Git Commit/Tag (`phase-pa-complete`)
