/**
 * GridShield AI — Type-Safe API Client.
 * Connects the Vite React frontend to the FastAPI serverless backend.
 */

import {
  GridTopology,
  GridState,
  ObservedTelemetryPoint,
  ScenarioSpec,
  Incident,
  ImpactResult,
  MitigationPlan,
  MitigationResult,
  AnalystContext,
  AnalystExplanation,
  AnalystQuestionRequest,
  AnalystQuestionResponse,
  AlarmRecord,
  DemoStepResult,
  LiveSessionState,
} from '../../types/api';

const API_BASE = '/api/v1';

export async function fetchGridTopology(): Promise<GridTopology> {
  const res = await fetch(`${API_BASE}/grid/topology`);
  if (!res.ok) throw new Error(`Topology fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchGridState(): Promise<GridState> {
  const res = await fetch(`${API_BASE}/grid/state`);
  if (!res.ok) throw new Error(`Grid state fetch failed: ${res.statusText}`);
  return res.json();
}

export async function stepGrid(steps: number = 1): Promise<GridState> {
  const res = await fetch(`${API_BASE}/grid/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  if (!res.ok) throw new Error(`Grid step failed: ${res.statusText}`);
  return res.json();
}

export async function fetchLatestTelemetry(): Promise<ObservedTelemetryPoint[]> {
  const res = await fetch(`${API_BASE}/telemetry`);
  if (!res.ok) throw new Error(`Telemetry fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchScenariosCatalog(): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error(`Scenarios fetch failed: ${res.statusText}`);
  return res.json();
}

export async function createRun(spec: ScenarioSpec): Promise<any> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  if (!res.ok) throw new Error(`Create run failed: ${res.statusText}`);
  return res.json();
}

export async function createLiveSession(config?: Record<string, any>): Promise<LiveSessionState> {
  const res = await fetch(`${API_BASE}/runs/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config || {}),
  });
  if (!res.ok) throw new Error(`Live session creation failed: ${res.statusText}`);
  return res.json();
}

export async function advanceLiveSession(runId: string, steps: number = 1): Promise<LiveSessionState> {
  const res = await fetch(`${API_BASE}/runs/${runId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  if (!res.ok) throw new Error(`Advance session failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSessionFeed(runId: string, tStart: number = 0, tEnd: number = 100): Promise<any> {
  const res = await fetch(`${API_BASE}/runs/${runId}/feed?t_start=${tStart}&t_end=${tEnd}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Session feed fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAlarms(params?: { run_id?: string; state?: string; priority?: string }): Promise<AlarmRecord[]> {
  const query = new URLSearchParams();
  if (params?.run_id) query.append('run_id', params.run_id);
  if (params?.state) query.append('state', params.state);
  if (params?.priority) query.append('priority', params.priority);
  
  const url = `${API_BASE}/alarms${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alarms fetch failed: ${res.statusText}`);
  return res.json();
}

export async function acknowledgeAlarm(alarmId: string, operatorId: string = 'OPERATOR_1', note: string = 'Acknowledged in console'): Promise<AlarmRecord> {
  const res = await fetch(`${API_BASE}/alarms/${alarmId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor: operatorId, note }),
  });
  if (!res.ok) throw new Error(`Alarm ack failed: ${res.statusText}`);
  return res.json();
}

export async function shelveAlarm(alarmId: string, durationMinutes: number = 60): Promise<AlarmRecord> {
  const res = await fetch(`${API_BASE}/alarms/${alarmId}/shelve?duration_minutes=${durationMinutes}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Alarm shelve failed: ${res.statusText}`);
  return res.json();
}

export async function advanceDemoStep(runId: string): Promise<DemoStepResult> {
  const res = await fetch(`${API_BASE}/demo/${runId}/next`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Demo advance failed: ${res.statusText}`);
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error(`Incidents fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchIncidentDetail(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error(`Incident ${id} fetch failed: ${res.statusText}`);
  return res.json();
}

export async function simulateImpact(incidentId: string, steps: number = 30): Promise<ImpactResult> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/simulate-impact?projected_steps=${steps}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Impact simulation failed: ${res.statusText}`);
  return res.json();
}

export async function recommendMitigation(incidentId: string): Promise<MitigationPlan> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/recommend-mitigation`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Mitigation recommendation failed: ${res.statusText}`);
  return res.json();
}

export async function simulateMitigation(incidentId: string, plan?: MitigationPlan): Promise<MitigationResult> {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/simulate-mitigation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: plan ? JSON.stringify(plan) : undefined,
  });
  if (!res.ok) throw new Error(`Mitigation simulation failed: ${res.statusText}`);
  return res.json();
}

export async function fetchModelsStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/models/status`);
  if (!res.ok) throw new Error(`Models status fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchModelMetrics(): Promise<any> {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`Metrics fetch failed: ${res.statusText}`);
  return res.json();
}

export async function explainIncident(context: AnalystContext): Promise<AnalystExplanation> {
  const res = await fetch(`${API_BASE}/analyst/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error(`Explanation fetch failed: ${res.statusText}`);
  return res.json();
}

export async function askAnalyst(request: AnalystQuestionRequest): Promise<AnalystQuestionResponse> {
  const res = await fetch(`${API_BASE}/analyst/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Analyst question failed: ${res.statusText}`);
  return res.json();
}

export async function triggerGoldenDemo(demoType: string = 'primary'): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/run?demo_type=${demoType}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Demo trigger failed: ${res.statusText}`);
  return res.json();
}

export async function resetSystem(): Promise<any> {
  const res = await fetch(`${API_BASE}/system/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Reset failed: ${res.statusText}`);
  return res.json();
}

// ----------------------------------------------------------------------------
// Phase PA: Authentication & Admin Endpoints
// ----------------------------------------------------------------------------

export async function fetchBootstrapStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/bootstrap-status`);
  if (!res.ok) throw new Error(`Bootstrap status failed: ${res.statusText}`);
  return res.json();
}

export async function bootstrapSystem(data: {
  bootstrap_token: string;
  admin_username: string;
  admin_password: string;
  display_name?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Bootstrap failed: ${res.statusText}`);
  }
  return res.json();
}

export async function loginUser(data: { username: string; password: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Login failed: ${res.statusText}`);
  }
  return res.json();
}

export async function logoutUser(): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Logout failed: ${res.statusText}`);
  return res.json();
}

export async function fetchCurrentUser(): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/me`);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return null;
    throw new Error(`Profile fetch failed: ${res.statusText}`);
  }
  return res.json();
}

export async function listAdminUsers(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/users`);
  if (!res.ok) throw new Error(`List users failed: ${res.statusText}`);
  return res.json();
}

export async function createAdminUser(data: {
  username: string;
  password: string;
  role: string;
  display_name?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Create user failed: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteAdminUser(userId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Delete user failed: ${res.statusText}`);
  }
  return res.json();
}

export async function setAdminPreviewRole(targetRole: string | null): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/preview-as`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_role: targetRole }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Preview role failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSecurityAuditLogs(limit: number = 100, offset: number = 0): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/audit-log?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Audit log fetch failed: ${res.statusText}`);
  return res.json();
}

// ----------------------------------------------------------------------------
// Phase PA: Segregated Supervisor View Endpoints
// ----------------------------------------------------------------------------

export async function fetchSupervisorDashboard(): Promise<any> {
  const res = await fetch(`${API_BASE}/views/supervisor/dashboard`);
  if (!res.ok) throw new Error(`Supervisor dashboard failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSupervisorIncidents(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/views/supervisor/incidents`);
  if (!res.ok) throw new Error(`Supervisor incidents failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSupervisorIncidentDetail(incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/views/supervisor/incidents/${incidentId}`);
  if (!res.ok) throw new Error(`Supervisor incident ${incidentId} failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSupervisorTopology(): Promise<any> {
  const res = await fetch(`${API_BASE}/views/supervisor/grid/topology`);
  if (!res.ok) throw new Error(`Supervisor topology failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSupervisorGridState(): Promise<any> {
  const res = await fetch(`${API_BASE}/views/supervisor/grid/state`);
  if (!res.ok) throw new Error(`Supervisor grid state failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSupervisorGlossary(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/views/supervisor/glossary`);
  if (!res.ok) throw new Error(`Supervisor glossary failed: ${res.statusText}`);
  return res.json();
}

// ----------------------------------------------------------------------------
// Phase PA: Segregated Technician View Endpoints
// ----------------------------------------------------------------------------

export async function fetchTechnicianDashboard(): Promise<any> {
  const res = await fetch(`${API_BASE}/views/technician/dashboard`);
  if (!res.ok) throw new Error(`Technician dashboard failed: ${res.statusText}`);
  return res.json();
}

export async function fetchTechnicianIncidentDetail(incidentId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/views/technician/incidents/${incidentId}`);
  if (!res.ok) throw new Error(`Technician incident detail failed: ${res.statusText}`);
  return res.json();
}

export async function fetchTechnicianGridState(): Promise<any> {
  const res = await fetch(`${API_BASE}/views/technician/grid/state`);
  if (!res.ok) throw new Error(`Technician grid state failed: ${res.statusText}`);
  return res.json();
}
