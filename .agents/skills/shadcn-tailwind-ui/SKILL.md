---
name: shadcn-tailwind-ui
description: Build professional, high-density critical-infrastructure SOC and cybersecurity dashboards using Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, and Lucide icons.
---

# UI/UX & Frontend Architecture Skill for GridShield AI

## Core Design Directives
- **Aesthetic**: Critical-Infrastructure SOC (Security Operations Center) & SCADA telemetry cockpit.
- **Palette**: Dark slate/zinc base (`#090D16`, `#0F172A`), Tactical Status Accents (Nominal: Emerald `#10B981`, Warning: Amber `#F59E0B`, Critical/Alarm: Rose `#F43F5E`, Telemetry/Data: Cyan `#06B6D4`, Neutral/Muted: Slate `#64748B`).
- **Typography**: Inter/Geist Sans for primary UI, JetBrains Mono / Roboto Mono for grid metrics (MW, MVAR, kV, p.u. voltage, breaker states).
- **Component System**: shadcn/ui primitives with Radix UI accessibility foundations.

## Best Practices
1. **Component Modularity**:
   - `GridTopologyVisualizer`: Canvas / SVG-based single-line diagram with live node coloring based on voltage (p.u.) and line loading (%).
   - `TelemetryStreamTable`: High-density live telemetry table with search, filter, and anomaly badges.
   - `AlertTriagePanel`: Prioritized list of detected cyber-physical anomalies with XAI confidence metrics.
   - `MitigationCockpit`: Operator action center for tripping breakers, redispatching generation, or isolating compromised substations.
   - `XaiExplanationCard`: Waterfall / Bar visualization showing top contributing telemetry features to the cyber-attack prediction.
2. **Iconography**:
   - Use `lucide-react` for industrial, cyber, and power symbols (`Zap`, `ShieldAlert`, `Activity`, `Cpu`, `Layers`, `Radio`, `Terminal`, `Sliders`).
3. **Accessibility (a11y)**:
   - Full keyboard navigation, proper ARIA labels, contrast ratio >= 4.5:1.
