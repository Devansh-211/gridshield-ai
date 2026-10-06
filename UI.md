# GridShield AI — Operations Gray UI Design System (`UI.md`)

## 1. Design Philosophy
GridShield AI follows an authentic **industrial SCADA / Energy Management System (EMS)** aesthetic termed **"Operations Gray"**:
- Flat neutral surfaces (`#0b0f17`, `#18202c`, `#222d3d`) instead of saturated AI neon gradients or glowing box-shadows.
- High-density typography using monospace alignment (`ui-monospace`) for numerical telemetry and standard sans (`Inter`) for text.
- Standardized corner radii (2–4px `rounded-sm`/`rounded`) instead of bubbly rounded cards (`rounded-xl`/`2xl`/`3xl`).
- Semantic alarm colors strictly following ISA-18.2 standards:
  - **CRITICAL**: Rose/Red (`#f43f5e` / `#ef4444`)
  - **HIGH / WARNING**: Orange/Amber (`#f97316` / `#eab308`)
  - **MEDIUM / CAUTION**: Yellow (`#eab308`)
  - **LOW / ADVISORY**: Cyan/Slate (`#06b6d4` / `#64748b`)
  - **NOMINAL / TRUSTED**: Emerald (`#10b981`)

## 2. Token Registry (`frontend/src/theme/tokens.ts`)
All color and spacing tokens are centralized in `frontend/src/theme/tokens.ts`. Hardcoded hex values outside this file are disallowed and checked by `scripts/ui_lint.py`.

## 3. Console Views (8 Navigation Tabs)
1. **Overview (Dashboard)**: High-level single-line diagram summary, KPI ribbon with explicit provenance chips, active alarm banner, and append-only event timeline.
2. **Grid Topology**: Full-screen interactive IEEE 14-bus diagram with deep inspector tables for 14 buses, 20 branches, and 5 generators.
3. **Alarms**: ISA-18.2 compliant console with Priority and State filters, one-click acknowledgment with operator notes, and shelving.
4. **Incidents**: Episode case management with 3-Way verification table, Plain vs Technical analyst note toggle, and "In Plain Words" summary box.
5. **Trends**: Historian multi-pen trend strip charts for comparing voltage, frequency, line loading, and generator outputs.
6. **Scenario Lab**: 8-stage interactive guided walkthrough for False Data Injection & Line Trips, plus custom physical/cyber injection sliders.
7. **Models & System**: Offline model performance metrics (`metrics.json`), Wilson score confidence intervals, and honest research limitations (Invariant I10).
8. **Explained**: 15 plain-language markdown sections passing Flesch-Kincaid grade ≤ 8.5 with a searchable 26-term glossary and reading metrics.

## 4. Anti-Pattern Linter
Run `python scripts/ui_lint.py` to ensure complete compliance:
- Gradients (`bg-gradient`, `from-*`, `to-*`) -> **FORBIDDEN**
- Backdrop blur / glassmorphism (`backdrop-blur`) -> **FORBIDDEN**
- Decorative animations (`animate-pulse`, `animate-bounce`) -> **FORBIDDEN**
- Large border radii (`rounded-xl`, `2xl`, `3xl`, `full`) -> **FORBIDDEN**
- Emojis in source code -> **FORBIDDEN**
