# GridShield AI — UI Architecture & Design System Specification

## 1. Principles & Design Identity: "Operations Console"

GridShield AI is designed as mission-critical operations software for power system engineers, grid operators, and cybersecurity analysts. It rejects consumer AI tropes (floating rounded card soup, dark navy/violet glow palettes, curved chart smoothing, pulsing dots, and marketing filler) in favor of an **authentic, quiet, high-density industrial console**.

### Core Tenets
1. **Quiet by default, loud only when abnormal**: Standard operating conditions use neutral text (`--text`, `--text-2`). Color is strictly reserved for ISA-18.2 alarm priorities, selection highlights, and single primary accents.
2. **Dense, aligned, and scannable**: Docked panes separated by 1px hairline borders replace floating cards. Numeric values are right-aligned, mono-spaced (`font-variant-numeric: tabular-nums`), and paired with clear engineering units in table headers.
3. **Hierarchy through weight, size, and layout**: Visual structure is achieved through typography (IBM Plex Sans 400/500/600, sizes 11px–16px) and spatial positioning rather than nested card boxes.
4. **No fabricated data**: Every number, timestamp, and status traces directly from backend simulation telemetry or is truthfully labelled `DATA UNAVAILABLE`. Empty states are explicit and honest ("No active session").
5. **Multi-sensory status encoding**: Status indicators never rely on color alone. Each state features an explicit text label and a unique geometric shape glyph (Diamond for Critical, Triangle for High, Square for Medium, Circle for Low).

---

## 2. Professional Tool Reference Study (10 Key Observations)

From analyzing industrial EMS/SCADA consoles, historian trend packages, and SOC observability platforms:
1. **Full-Viewport Docking**: Windows utilize 100vw × 100vh with resizable docked split panes rather than centered floating cards with generous whitespace.
2. **Hairline 1px Grid Lines**: Subtle 1px neutral borders delineate functional regions without drop shadows or heavy blur filters.
3. **Monospace Tabular Alignment**: Telemetry streams, voltages, line loadings, and timestamps use fixed-width tabular numbers to prevent jitter on live updates.
4. **High Information Density**: Property grids (2-column label/value pairs) convey 4–5× more information in the same vertical space as stat cards.
5. **Linear Step-After Trends**: Time-series charts display raw discrete sample intervals without Bezier curve smoothing or decorative gradient area fills.
6. **Explicit Limit Overlays**: Critical and high operational thresholds (e.g. 0.95/1.05 p.u. voltage bounds) are drawn as visible dashed limit lines directly on the chart.
7. **Orthogonal Bus Schematics**: Electrical diagrams follow standard single-line conventions (generators/condensers at top-left, orthogonal line routes, bus bars, transformer circles).
8. **Terse Operational Language**: Button copy and table headers use concise sentence-case nouns and verbs ("Acknowledge", "Inject fault", "Simulate impact") without marketing fluff.
9. **Provenance Transparency**: Every data point is tagged with its analytical source (`SIM`, `OBS`, `EST`, `MDL`, `CALC`, `LLM`).
10. **Persistent Status Bar**: A bottom status bar provides continuous visibility into unacknowledged alarms, backend connection health, and database round-trip latency.

---

## 3. Design Tokens ("Operations Gray")

Defined in `frontend/src/design/tokens.css`:

### Light Theme (Default)
- `--bg-app`: `#E6E9ED` (behind panes, subtle workspace canvas)
- `--bg-panel`: `#FFFFFF` (docked pane surfaces)
- `--bg-panel-alt`: `#F3F5F7` (table headers, toolbars, active row highlight)
- `--bg-inset`: `#EDEFF2` (property grid wells, diagram canvas)
- `--border`: `#C9CED6` (1px panel boundaries)
- `--border-strong`: `#AAB1BC` (active controls, focused elements)
- `--text`: `#1B2430` (primary high-contrast text)
- `--text-2`: `#4A5565` (labels, secondary metadata)
- `--text-3`: `#6B7686` (timestamps, subtle units)
- `--accent`: `#2B5C8A` (primary actions, active selection)
- `--accent-hover`: `#244E75`
- `--accent-tint`: `#DCE8F4` (selected row background)
- `--sim-badge-bg`: `#1B2430` / `--sim-badge-fg`: `#E6E9ED`

### ISA-18.2 Alarm & Equipment States
- `--alarm-critical`: `#C62828` (Filled Diamond ◆)
- `--alarm-high`: `#D9650B` (Filled Triangle ▲)
- `--alarm-medium`: `#A87000` (Filled Square ■)
- `--alarm-low`: `#0E7C86` (Filled Circle ●)
- `--advisory`: `#5B6676` (Dash ▬)
- `--ok`: `#2E7D4F` (In service)
- `--compromised`: `#7B3FA0` (Cyber integrity anomaly)
- `--offline`: `#8A93A0` (Dashed gray)

---

## 4. Primitives & Reusable Components (`src/ui/`)

- `Pane`: Docked container with 28px header, action slot, and scrollable content body.
- `Table`: TanStack Table with virtualization, resizable headers, right-aligned numeric columns, and CSV export.
- `Status`: Square-cornered 18px badge with 3px colored left edge, 12% background tint, and unique geometric shape glyph.
- `ProvenanceChip`: 16px outlined mono chip (`SIM`, `OBS`, `EST`, `MDL`, `CALC`, `LLM`) with explanatory glossary tooltip.
- `PropertyGrid`: 2-column label/value table replacing KPI cards.
- `Button`: 28px height, 2px radius, sentence-case text, high-contrast states.
- `Drawer` & `Dialog`: Focus-trapped, keyboard accessible with 1px border and single popover shadow.
