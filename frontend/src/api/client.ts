/**
 * GridShield AI — Type-Safe API Client.
 * All types adhere to frozen contracts in generated types/api.ts.
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

export async function triggerGoldenDemo(): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/run`, {
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
