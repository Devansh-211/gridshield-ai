You are working in the `gridshield-ai` repo. Read `AGENTS.md` and `STATE.md` first, then load the skill `gridshield-auth-views`.

**Task (phase PA).** Add authentication and split the software into two role-based views:
- **Supervisor mode:** for people with no power-grid knowledge. It shows everything, described the way you would explain it to a layperson: what is happening, how sure the system is, what it could lead to, and options worth discussing with a technician.
- **Technician mode:** shows every detail the system has, including raw values, units, detector outputs, evidence, and versions.
- **Admin:** manages users and roles, reads the audit log, and can preview either view.

**Non-negotiables.** The split is enforced by the server, not just hidden in the UI. The supervisor view is a faithful translation of the same Evidence Object, never a reduction: it must keep the environment label (simulation vs real), where each number comes from, "we can't tell yet" states, and uncertainty, and it must never overstate certainty or call an action "safe". All text and numbers are generated deterministically from evidence; the LLM may not invent or change numbers. Segregation applies to the interactive grid view too (plain labels, plain legend, plain tooltips for supervisors).

**Precondition.** Confirm in `STATE.md` that P2 (Evidence Object) and P3 (interactive grid) have PASSED. If not, report `BLOCKED` and recommend finishing them first, with your reasoning.

**How to work.** Follow the standard protocol: write `implementation_plan.md` and stop for my approval. The plan must include the permission matrix, the planned API contract for the two views, the list of `DECISION` items, and what, if anything, parallel agents will do. Then `task.md`, implement in small commits, verify with `/verify-ui`, close with `/phase-gate` against the skill's gate, and write `walkthrough.md` with evidence. Do not rewrite working code without an audit reason, and do not continue past a failed gate.

**First deliverable.** The implementation plan only.
