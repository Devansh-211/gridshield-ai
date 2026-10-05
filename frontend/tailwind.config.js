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
        background: "#090D16",
        surface: "#0F172A",
        card: "#131E36",
        border: "#1E293B",
        primary: {
          DEFAULT: "#06B6D4", // Cyan
          hover: "#0891B2",
        },
        normal: "#10B981",    // Emerald
        warning: "#F59E0B",   // Amber
        critical: "#F43F5E",  // Rose
        cyber: "#8B5CF6",     // Violet
        offline: "#64748B",   // Slate
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
