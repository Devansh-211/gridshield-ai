/**
 * GridShield AI — Design Tokens (Section 10.4).
 * "Operations Gray" Industrial SOC Design System.
 */

export const tokens = {
  colors: {
    // Neutral Surfaces
    surface0: '#0f141c', // Deep base slate
    surface1: '#18202c', // Data card background
    surface2: '#222d3d', // Interactive surface / header
    surface3: '#2d3a4d', // Elevated borders & active tabs

    // Borders
    border: '#2c394b',
    borderLight: '#3d4f68',

    // Text hierarchy
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textDisabled: '#475569',

    // Semantic Industrial Accents
    accent: '#38bdf8', // Precision Steel Blue

    // ISA-18.2 Alarm Colors
    alarmCritical: '#ef4444', // Red
    alarmHigh: '#f97316',     // Orange
    alarmMedium: '#eab308',   // Amber
    alarmLow: '#06b6d4',      // Cyan/Teal
    advisory: '#64748b',      // Gray

    // Equipment & Quality States
    ok: '#10b981',           // Muted Green
    compromised: '#a855f7',  // Violet
    offline: '#475569',      // Dashed Gray
    suspect: '#f59e0b',      // Suspect telemetry
  },
  fonts: {
    ui: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  spacing: {
    rowHeight: '28px',
    rowHeightComfortable: '36px',
    panePadding: '10px',
  },
} as const;

export type ThemeTokens = typeof tokens;
