# GridShield AI — UI Backlog & Capability Gap Log

This backlog tracks UI features and views that require backend endpoints or capabilities not currently supported by the API. Per Rule 0.4 and Rule 9, these controls are hidden in the UI rather than rendered as dead buttons or fake mocks.

---

## 1. Out-of-Scope / Intentionally Excluded Features

| Feature ID | Feature Name | Reason for Exclusion | Target Milestone / Resolution |
|---|---|---|---|
| `GAP-001` | Real Physical SCADA Breaker Control | GridShield is strictly an educational/research digital twin (Invariant I10). No real socket or hardware control is permitted. | Intentionally never supported. |
| `GAP-002` | User Account & Multi-Tenant RBAC Management | Public safety and privacy (Invariant I12). Stateless visitor-cookie isolation is used instead of user credential databases. | Future enterprise edition (out of current MVP scope). |
| `GAP-003` | Real-Time Hardware-in-the-Loop (HIL) Streaming | High-speed kHz analog streaming requires RTDS or OPAL-RT hardware integration. | Documented in `docs/ASSUMPTIONS.md`. |
| `GAP-004` | Multi-Area 500-Bus Regional Interconnection | Current research simulation model focuses on IEEE 14-bus transmission benchmark. | Scalability research backlog. |

---

## 2. Capability Map Synchronization

When a backend endpoint is added or modified in `/api/v1/...`, update `frontend/src/lib/capabilities.ts` and remove the corresponding entry from this backlog.
