/**
 * GridShield AI — Build-Time & Runtime Capability Map.
 *
 * Grounded in FastAPI OpenAPI schema (/api/v1/...).
 * Enforces Rule 4: No dead controls. Features whose endpoints do not exist
 * or fail with 404/501 are automatically disabled or hidden.
 */

export interface EndpointCapability {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  featureName: string;
  available: boolean;
  notes?: string;
}

export const BACKEND_CAPABILITIES: Record<string, EndpointCapability> = {
  // Grid Physical Topology & State
  'grid.topology': {
    path: '/api/v1/grid/topology',
    method: 'GET',
    featureName: 'IEEE 14-bus Topology Retrieval',
    available: true,
  },
  'grid.state': {
    path: '/api/v1/grid/state',
    method: 'GET',
    featureName: 'Latest Physical Grid State',
    available: true,
  },
  'grid.telemetry': {
    path: '/api/v1/telemetry',
    method: 'GET',
    featureName: 'Observed Telemetry Stream',
    available: true,
  },

  // Scenarios & Runs
  'scenarios.catalog': {
    path: '/api/v1/scenarios',
    method: 'GET',
    featureName: 'Physical & Cyber Attack Catalog',
    available: true,
  },
  'runs.create': {
    path: '/api/v1/runs',
    method: 'POST',
    featureName: 'Full End-to-End Batch Run Execution',
    available: true,
  },
  'runs.session': {
    path: '/api/v1/runs/session',
    method: 'POST',
    featureName: 'Persistent Live Session Creation',
    available: true,
  },
  'runs.advance': {
    path: '/api/v1/runs/{run_id}/advance',
    method: 'POST',
    featureName: 'Stepwise Live Simulation Advance',
    available: true,
  },
  'runs.feed': {
    path: '/api/v1/runs/{run_id}/feed',
    method: 'GET',
    featureName: 'Live Event, Alarm & Telemetry Polling Feed',
    available: true,
  },

  // Alarms
  'alarms.list': {
    path: '/api/v1/alarms',
    method: 'GET',
    featureName: 'ISA-18.2 Alarms Retrieval',
    available: true,
  },
  'alarms.acknowledge': {
    path: '/api/v1/alarms/{alarm_id}/acknowledge',
    method: 'POST',
    featureName: 'Alarm Acknowledgment with Note',
    available: true,
  },

  // Incidents & Mitigation
  'incidents.list': {
    path: '/api/v1/incidents',
    method: 'GET',
    featureName: 'Incident History & Active Incidents',
    available: true,
  },
  'incidents.detail': {
    path: '/api/v1/incidents/{incident_id}',
    method: 'GET',
    featureName: 'Incident Full Detail & Evidence',
    available: true,
  },
  'incidents.simulate_impact': {
    path: '/api/v1/incidents/{incident_id}/simulate-impact',
    method: 'POST',
    featureName: 'Forward Consequence Projection',
    available: true,
  },
  'incidents.recommend_mitigation': {
    path: '/api/v1/incidents/{incident_id}/recommend-mitigation',
    method: 'POST',
    featureName: 'Allowlisted Mitigation Recommendations',
    available: true,
  },
  'incidents.simulate_mitigation': {
    path: '/api/v1/incidents/{incident_id}/simulate-mitigation',
    method: 'POST',
    featureName: '3-Way Comparative Verification Simulation',
    available: true,
  },

  // Models, Metrics & System
  'models.status': {
    path: '/api/v1/models/status',
    method: 'GET',
    featureName: 'Model Registry & System Limitations',
    available: true,
  },
  'models.metrics': {
    path: '/api/v1/metrics',
    method: 'GET',
    featureName: 'Offline Test Set Evaluation Metrics',
    available: true,
  },
  'analyst.explain': {
    path: '/api/v1/analyst/explain',
    method: 'POST',
    featureName: 'Structured Explainability Synthesis',
    available: true,
  },
  'analyst.ask': {
    path: '/api/v1/analyst/ask',
    method: 'POST',
    featureName: 'Operator Q&A with Verification',
    available: true,
  },
  'demo.run': {
    path: '/api/v1/demo/run',
    method: 'POST',
    featureName: 'Stepwise Golden Demo Execution',
    available: true,
  },
  'demo.next': {
    path: '/api/v1/demo/{run_id}/next',
    method: 'POST',
    featureName: 'Server-Side Stepwise Demo Advance',
    available: true,
  },
  'system.reset': {
    path: '/api/v1/system/reset',
    method: 'POST',
    featureName: 'Digital Twin State Reset',
    available: true,
  },
  'system.health': {
    path: '/api/v1/health',
    method: 'GET',
    featureName: 'System Health & DB Latency',
    available: true,
  },

  // Unsupported / Hidden Features (Logged to docs/UI_BACKLOG.md)
  'hardware.scada_control': {
    path: '/api/v1/scada/hardware-control',
    method: 'POST',
    featureName: 'Physical Hardware Control Interlock',
    available: false,
    notes: 'Out of scope. GridShield is a research digital twin only (Invariant I10).',
  },
  'auth.multi_tenant_teams': {
    path: '/api/v1/teams/manage',
    method: 'POST',
    featureName: 'Multi-Tenant RBAC Team Management',
    available: false,
    notes: 'Visitor-cookie isolation is used instead of user accounts for public safety (Invariant I12).',
  },
};

/**
 * Checks if a named feature capability is available before rendering interactive elements.
 */
export function isCapabilityAvailable(featureKey: keyof typeof BACKEND_CAPABILITIES): boolean {
  return BACKEND_CAPABILITIES[featureKey]?.available ?? false;
}
