/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        panel: 'var(--bg-panel)',
        'panel-alt': 'var(--bg-panel-alt)',
        inset: 'var(--bg-inset)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'text-main': 'var(--text)',
        'text-muted': 'var(--text-2)',
        'text-subtle': 'var(--text-3)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          tint: 'var(--accent-tint)',
        },
        alarm: {
          critical: 'var(--alarm-critical)',
          high: 'var(--alarm-high)',
          medium: 'var(--alarm-medium)',
          low: 'var(--alarm-low)',
          advisory: 'var(--advisory)',
          ok: 'var(--ok)',
          compromised: 'var(--compromised)',
          offline: 'var(--offline)',
        },
        sim: {
          bg: 'var(--sim-badge-bg)',
          fg: 'var(--sim-badge-fg)',
        }
      },
      fontFamily: {
        ui: ['var(--font-ui)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        popover: 'var(--shadow-popover)',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '2px',
        md: '4px',
      }
    },
  },
  plugins: [],
}
