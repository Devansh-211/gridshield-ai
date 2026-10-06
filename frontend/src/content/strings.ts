/**
 * GridShield AI — Centralized UI Copy & Terminology Dictionary (Section 8).
 *
 * Operational copy rules:
 * - Sentence case everywhere
 * - Terse, factual language
 * - Zero marketing buzzwords (seamless, robust, AI-powered, magic, insights, etc.)
 * - Explicit engineering terms from glossary
 */

export const UI_STRINGS = {
  app: {
    title: 'GridShield AI',
    simulationBadge: 'SIMULATION',
    simulationTooltip: 'Educational and research digital twin. Simulates IEEE 14-bus electrical grid under cyber-physical stress.',
    desktopWarning: 'Desktop display (≥ 1024px) recommended for operations console.',
  },
  nav: {
    overview: 'Overview',
    grid: 'Grid',
    alarms: 'Alarms',
    incidents: 'Incidents',
    trends: 'Trends',
    scenarios: 'Scenarios',
    models: 'Models & System',
    explained: 'Explained',
    kitchen: 'Kitchen Sink',
  },
  statusBar: {
    newestUnack: 'Newest unack',
    noActiveAlarms: 'No active alarms',
    dbConnected: 'DB connected',
    dbLatency: 'Latency',
    version: 'v1.0.0',
    simulating: 'SIMULATING',
    idle: 'IDLE',
  },
  provenance: {
    SIM: { code: 'SIM', label: 'Simulated', desc: 'Ground truth physics from pandapower AC power flow. Hidden from detectors.' },
    OBS: { code: 'OBS', label: 'Observed', desc: 'Telemetry with realistic Gaussian sensor noise and potential cyber manipulation.' },
    EST: { code: 'EST', label: 'Estimated', desc: 'WLS state estimation filtered output.' },
    MDL: { code: 'MDL', label: 'Model', desc: 'Trained ML classifier output.' },
    CALC: { code: 'CALC', label: 'Calculated', desc: 'Deterministic mathematical calculation.' },
    LLM: { code: 'LLM', label: 'LLM', desc: 'Structured LLM synthesis strictly grounded in verified evidence.' },
  },
  actions: {
    startSession: 'Start baseline session',
    advanceStep: 'Step +1',
    advanceTen: 'Step +10',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset system',
    acknowledge: 'Acknowledge',
    acknowledgeSelected: 'Acknowledge selected',
    injectFault: 'Inject into live session',
    runSeparate: 'Run as separate run',
    runDemo: 'Run demo',
    simulateImpact: 'Simulate consequence',
    recommendMitigation: 'Recommend mitigation',
    simulateMitigation: 'Execute mitigation & verify',
    exportCsv: 'Export CSV',
    viewTable: 'Table view',
    viewDiagram: 'Diagram view',
    copyDetails: 'Copy details',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  empty: {
    noSession: 'No active session. Click "Start baseline session" to initialize the digital twin.',
    noAlarms: 'No active alarms matching current filter criteria.',
    noIncidents: 'No incidents recorded in the current session.',
    noEvents: 'No timeline events recorded.',
    noCyberEvents: 'No cyber anomalies detected in the current window.',
  },
  errors: {
    backendUnavailable: 'Backend service unreachable. Check API server status.',
    dbUnavailable: 'Database connection failed. Persisted session checkpoints are degraded.',
    modelUnavailable: 'Machine learning model artifact unavailable.',
  },
  statusVocabulary: {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    ADVISORY: 'ADVISORY',
    OK: 'OK',
    OFFLINE: 'OFFLINE',
    SUSPECT: 'SUSPECT',
    COMPROMISED: 'COMPROMISED',
  }
} as const;
