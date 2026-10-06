# GridShield AI — UI Overhaul Diagnosis Report (Milestone U0)

**Date:** 2026-10-06  
**Auditor:** Front-End Architecture & Design Team  
**Scope:** `Devansh-211/gridshield-ai` React SPA  

---

## 1. Executive Summary

An exhaustive audit of the existing user interface identified pervasive "AI-generated / prototype" visual and structural patterns that undermine its credibility as serious utility operations software. These include floating rounded cards on gap-separated grids ("card soup"), dark navy/slate-950 themes with cyan/violet glowing accents, hardcoded fake chart data in components, Inter font defaults without tabular number alignment, and lack of docked pane architecture.

This document details every specific tell found in the codebase with file paths and line numbers, serving as the definitive checklist of elements to eliminate in the rebuild.

---

## 2. Itemized Diagnosis of AI Tells

### A. Visual Tells (Color, Layout, & Styling)
1. **Dark Navy / Slate-950 Palette with Neon Cyan/Violet/Rose Accents**:
   - `frontend/tailwind.config.js` (lines 11–24): Backgrounds defined as `#090D16`, `#0F172A`, `#131E36`, with primary `#06B6D4` (cyan), warning `#F59E0B`, critical `#F43F5E`, cyber `#8B5CF6`.
   - `frontend/src/index.css` (lines 12–14): Hardcoded `background-color: #0b0f17; color: #e2e8f0;`.
   - `frontend/src/theme/tokens.ts` (lines 9–38): Uses `surface0: #0f141c`, `accent: #38bdf8` (steel blue), `compromised: #a855f7` (violet) without a proper high-contrast light theme "Operations Gray" token system.

2. **Floating Rounded Cards on Gap-Separated Grid ("Card Soup")**:
   - `frontend/src/components/KPIRibbon.tsx` (lines 42, 44, 72, 100, 128, 158): Row of 5 floating `rounded-lg p-3` cards with `bg-surface/80 border border-border` and colored progress bars (`bg-slate-800 h-1 rounded-sm mt-2`).
   - `frontend/src/views/DashboardView.tsx` (lines 117–129): `grid grid-cols-1 lg:grid-cols-3 gap-4` with floating cards rather than 1px docked panes.
   - `frontend/src/views/ModelSystemView.tsx` (lines 40–67, 83–105): Floating 4-column metric cards (`grid grid-cols-2 md:grid-cols-4 gap-3`) with rounded corners and oversized numbers.

3. **Glows, Colored Shadows, & Floating Badges**:
   - `frontend/src/views/DashboardView.tsx` (lines 75–106): Floating alert banner with `bg-rose-950/60 border border-rose-600/80 shadow-sm`.
   - `frontend/src/views/IncidentDetailModal.tsx` (lines 103, 115, 328, 414): Modal with `shadow-2xl`, glowing borders `border-rose-500/30`, and pill badges with colored borders.
   - `frontend/src/components/Navbar.tsx` (lines 108–110, 118–121, 183): Shadow buttons (`shadow transition-colors`), glowing `[ SIMULATION ]` badge with amber background.

4. **Icons Beside Every Navigation & Control Item**:
   - `frontend/src/components/Navbar.tsx` (lines 80–100, 128–151): Every navigation link has an icon (`Activity`, `Network`, `Bell`, `AlertTriangle`, `TrendingUp`, `Sliders`, `Bot`, `Cpu`, `BookOpen`).
   - `frontend/src/views/ModelSystemView.tsx` (lines 42–50): Icon beside every system component card.

5. **Curved Chart Lines & Non-Standard Trend Visuals**:
   - `frontend/src/views/TrendsView.tsx` (lines 110–137): Recharts `LineChart` using `type="monotone"` (smoothed curves), thick lines (`strokeWidth={2}`), floating tooltip bubble.
   - `frontend/src/components/TelemetryChart.tsx` (lines 80–110): Smoothed curves and generic chart padding.

6. **Generic Typography & Alignment**:
   - `frontend/src/index.css` (line 14): Inter font default; lack of self-hosted IBM Plex Sans / IBM Plex Mono.
   - Numeric columns in tables and cards lack universal `font-variant-numeric: tabular-nums` and right-alignment.

---

### B. Copy & Truth Tells
1. **Hardcoded Fake / Sample Data**:
   - `frontend/src/views/DashboardView.tsx` (lines 38–44): Hardcoded `chartData` array (`[{ step: 0, reported: 1.02, ... }, { step: 5, ... }]`) directly violates Invariant I1 ("No fabricated data").
2. **Generic Marketing / AI Subtitles**:
   - `frontend/src/views/ModelSystemView.tsx` (lines 32–34): Subtitle under title: `"Transparent machine learning evaluation metrics, model version provenance, and system limitations."`
   - `frontend/src/views/IncidentDetailModal.tsx` (line 144): AI chat-like phrasing `"In Plain Words:"` and `"AI Explanation (Why?)"`.

---

## 3. Elimination Strategy & Architectural Redesign

| AI Tell in Current UI | Replacement in Operations Console Architecture |
|---|---|
| Floating rounded cards (`rounded-lg`, `gap-4`) | 1px docked panes (`Pane` component, 0px radius, 1px neutral borders, resizable split handles) |
| Dark navy/cyber palette (`#090D16`, cyan/violet glows) | "Operations Gray" light theme default (`--bg-app: #E6E9ED`, `--bg-panel: #FFFFFF`, `--border: #C9CED6`, `--text: #1B2430`, `--accent: #2B5C8A`) with neutral dark toggle |
| Row of 5 floating KPI stat cards | Compact 2-column Property Grid with hairline row separators, tabular mono numbers, and provenance chips |
| Icons on every nav button & header | Clean typographic navigation (IBM Plex Sans 600, 13px, active 2px accent bar, restrained functional icons only) |
| Recharts with curved lines & floating tooltips | uPlot time-series engine with 1.25px linear/step-after traces, limit lines, and fixed cursor readout panel |
| Fabricated sample data in charts | 100% truthful data driven strictly by `/api/v1` endpoints or honest empty states ("No active session") |
| Floating modal dialogs with drop-shadow soup | Docked right-side drawers and 1px bordered dialogs with strict keyboard trapping |
| Unstructured AI chat elements | Structured explainability panels with evidence citations (`[E1]`, `[E2]`) and verified template fallbacks |

---

## 4. Conclusion

The audit is complete. We now proceed to generate the capability map (`src/lib/capabilities.ts`), write `docs/UI.md` and `docs/UI_BACKLOG.md`, and implement Milestone U1 (tokens, fonts, primitives, and application shell).
