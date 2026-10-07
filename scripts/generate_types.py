import json
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.schemas import contracts

def generate():
    os.makedirs("docs", exist_ok=True)
    os.makedirs("frontend/types", exist_ok=True)
    
    # 1. Export OpenAPI JSON
    openapi_data = app.openapi()
    openapi_path = os.path.join("docs", "openapi.json")
    with open(openapi_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2)
    print(f"Exported OpenAPI schema to {openapi_path}")

    # 2. Generate TypeScript type declarations
    ts_types = """/**
 * GridShield AI — Auto-generated TypeScript Contracts from OpenAPI & Pydantic
 * (Do not edit manually. Re-run `python scripts/generate_types.py` on contract changes)
 */

export type Provenance = 'SIMULATED' | 'OBSERVED' | 'ESTIMATED' | 'MODEL' | 'CALCULATED' | 'LLM';
export type TelemetryQuality = 'GOOD' | 'STALE' | 'MISSING' | 'SUSPECT';
export type CyberEventType = 'AUTH_FAILURE' | 'AUTH_SUCCESS' | 'COMMAND_ISSUED' | 'COMMAND_REJECTED' | 'PACKET_LOSS' | 'LATENCY_SPIKE' | 'SEQUENCE_ANOMALY' | 'CONFIG_CHANGED';
export type AttackType = 'NONE' | 'FALSE_DATA_INJECTION' | 'MALICIOUS_CONTROL_COMMAND' | 'REPLAY' | 'DENIAL_OF_SERVICE' | 'COORDINATED_CYBER_PHYSICAL';
export type ScenarioType = 'NORMAL' | 'LOAD_INCREASE' | 'LINE_FAILURE' | 'GENERATOR_FAILURE' | 'VOLTAGE_INSTABILITY' | 'FREQUENCY_DISTURBANCE';
export type ClassificationClass = 'NORMAL' | 'PHYSICAL_FAULT' | 'FALSE_DATA_INJECTION' | 'MALICIOUS_CONTROL_COMMAND' | 'REPLAY' | 'DENIAL_OF_SERVICE' | 'COORDINATED_CYBER_PHYSICAL' | 'UNKNOWN';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CertaintyBand = 'HIGH' | 'MEDIUM' | 'LOW';
export type ComponentIntegrity = 'TRUSTED' | 'SUSPECT' | 'COMPROMISED';
export type MitigationActionType = 'ISOLATE_BUS' | 'TRIP_LINE' | 'RESTORE_LINE' | 'QUARANTINE_MEASUREMENT' | 'REDISPATCH_GEN' | 'SHED_LOAD' | 'REVERT_COMMAND' | 'NO_ACTION';
export type IncidentStatus = 'DETECTED' | 'INVESTIGATING' | 'MITIGATION_PROPOSED' | 'SIMULATION_RUNNING' | 'MITIGATION_VERIFIED' | 'RESOLVED';

export interface ObservedTelemetryPoint {
  timestamp: number;
  wall_time: string;
  component_id: string;
  component_type: string;
  measurement_type: string;
  reported_value: number;
  unit: string;
  quality: TelemetryQuality;
  sequence: number;
  source_device_id: string;
  provenance: Provenance;
}

export interface GroundTruthPoint {
  timestamp: number;
  component_id: string;
  component_type: string;
  measurement_type: string;
  true_value: number;
  unit: string;
  provenance: Provenance;
}

export interface CyberEvent {
  id: string;
  timestamp: number;
  wall_time: string;
  device_id: string;
  event_type: CyberEventType;
  details: string;
  severity: string;
  provenance: Provenance;
}

export interface BusTopology {
  id: number;
  name: string;
  vn_kv: number;
  x: number;
  y: number;
  bus_type: string;
}

export interface LineTopology {
  id: number;
  name: string;
  from_bus: number;
  to_bus: number;
  length_km: number;
  max_i_ka: number;
  in_service: boolean;
}

export interface GeneratorTopology {
  id: number;
  name: string;
  bus: number;
  p_mw: number;
  vm_pu: number;
  sn_mva: number;
  in_service: boolean;
}

export interface LoadTopology {
  id: number;
  name: string;
  bus: number;
  p_mw: number;
  q_mvar: number;
  in_service: boolean;
}

export interface GridTopology {
  system_name: string;
  buses: BusTopology[];
  lines: LineTopology[];
  generators: GeneratorTopology[];
  loads: LoadTopology[];
  provenance: Provenance;
}

export interface BusState {
  bus_id: number;
  vm_pu: number;
  va_degree: number;
  p_mw: number;
  q_mvar: number;
  status: string;
}

export interface LineState {
  line_id: number;
  loading_pct: number;
  p_from_mw: number;
  q_from_mvar: number;
  p_to_mw: number;
  q_to_mvar: number;
  in_service: boolean;
}

export interface GridState {
  step: number;
  sim_time_s: number;
  converged: boolean;
  buses: BusState[];
  lines: LineState[];
  frequency_hz: number;
  frequency_provenance: Provenance;
  provenance: Provenance;
}

export interface AttackSpec {
  attack_type: AttackType;
  target_components: string[];
  target_measurements: string[];
  magnitude: number;
  start_step: number;
  duration_steps: number;
  seed: number;
}

export interface ScenarioSpec {
  scenario_type: ScenarioType;
  target_component?: string | null;
  parameter_value: number;
  start_step: number;
  duration_steps: number;
  total_steps: number;
  seed: number;
  attack?: AttackSpec | null;
}

export interface EvidenceItem {
  id: string;
  domain: string;
  description: string;
  metric_name: string;
  observed_value: number | string | boolean;
  expected_value?: number | string | boolean | null;
  provenance: Provenance;
}

export interface Attribution {
  likely_cause: string;
  hypothesis_scores: Record<string, number>;
  supporting_evidence: EvidenceItem[];
  contradicting_evidence: EvidenceItem[];
  alternatives_considered: string[];
  provenance: Provenance;
}

export interface RiskFactor {
  name: string;
  raw_value: number;
  normalized_score: number;
  weight: number;
  description: string;
}

export interface RiskAssessment {
  overall_risk_score: number;
  risk_level: RiskLevel;
  sub_scores: RiskFactor[];
  cyber_integrity_map: Record<string, ComponentIntegrity>;
  provenance: Provenance;
}

export interface MitigationInstruction {
  action_type: MitigationActionType;
  target_component: string;
  parameter_value?: number | null;
  justification: string;
}

export interface MitigationPlan {
  plan_id: string;
  incident_id: string;
  actions: MitigationInstruction[];
  evidence_citations: string[];
  provenance: Provenance;
}

export interface VerificationMetrics {
  max_voltage_deviation_pu: number;
  voltage_violations_count: number;
  overloaded_lines_count: number;
  max_line_loading_pct: number;
  total_load_served_mw: number;
  load_shed_mw: number;
  frequency_hz: number;
  operational_risk_score: number;
  risk_level: RiskLevel;
  state_estimation_error_rmse?: number | null;
  provenance: Provenance;
}

export interface MitigationResult {
  plan_id: string;
  incident_id: string;
  success: boolean;
  summary: string;
  baseline_metrics: VerificationMetrics;
  unmitigated_impact_metrics: VerificationMetrics;
  mitigated_metrics: VerificationMetrics;
  provenance: Provenance;
}

export interface ImpactResult {
  incident_id: string;
  projected_steps: number;
  unmitigated_metrics: VerificationMetrics;
  summary: string;
  provenance: Provenance;
}

export interface Incident {
  incident_id: string;
  run_id: string;
  scenario_ref: string;
  created_at_step: number;
  created_at_wall: string;
  status: IncidentStatus;
  affected_components: string[];
  classification: ClassificationClass;
  attribution: Attribution;
  certainty: CertaintyBand;
  risk: RiskAssessment;
  evidence: EvidenceItem[];
  model_version: string;
  recommended_plan?: MitigationPlan | null;
  mitigation_result?: MitigationResult | null;
  provenance: Provenance;
}

export interface TimelineEvent {
  id: string;
  run_id: string;
  incident_id?: string | null;
  sim_time: number;
  wall_time: string;
  event_type: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  provenance: Provenance;
}

export interface AnalystContext {
  incident_id: string;
  run_id: string;
  classification: ClassificationClass;
  likely_cause: string;
  certainty: CertaintyBand;
  risk_level: RiskLevel;
  evidence: EvidenceItem[];
  affected_components: string[];
  recommended_actions: string[];
  model_version: string;
}

export interface AnalystExplanation {
  incident_id: string;
  title: string;
  what_happened: string;
  where: string;
  why: string;
  evidence_analysis: string;
  cyber_vs_physical: string;
  model_assessment: string;
  recommended_actions: string;
  is_template_fallback: boolean;
  cited_evidence_ids: string[];
  provenance: Provenance;
}

export interface AnalystQuestionRequest {
  incident_id: string;
  question: string;
}

export interface AnalystQuestionResponse {
  incident_id: string;
  question: string;
  answer: string;
  proposed_action?: MitigationInstruction | null;
  simulation_verified: boolean;
  is_template_fallback: boolean;
  provenance: Provenance;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: Record<string, any> | null;
  request_id?: string | null;
}

// --- Phase PA: Auth, Role-Based Views, and Narrative Projections ---
export type UserRole = 'SUPERVISOR' | 'TECHNICIAN' | 'ADMIN';

export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  real_role: UserRole;
  effective_role: UserRole;
  is_preview: boolean;
  preview_role?: UserRole | null;
  must_change_password: boolean;
}

export interface UserSummary {
  user_id: string;
  username: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface SecurityAuditLog {
  id: number;
  actor_id?: string | null;
  actor_role?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  ip_address?: string | null;
  details: Record<string, any>;
  created_at: string;
}

export interface PlainConfidenceSummary {
  plain_confidence_summary: string;
  completeness_text: string;
  agreement_text: string;
  stability_text: string;
  sensor_evidence_count: number;
}

export interface PlainDiscussionOption {
  option_id: string;
  option_title: string;
  plain_action_summary: string;
  expected_outcome: string;
  why_discuss_first: string;
  not_guaranteed_safe_notice?: string;
}

export interface AffectedSubstationPlain {
  substation_id: number;
  friendly_name: string;
  role: string;
  plain_status: string;
}

export interface SupervisorIncidentProjection {
  incident_id: string;
  environment_label: 'PRACTICE_SIMULATION' | 'HISTORICAL_REPLAY' | 'LIVE_SYSTEM';
  environment_badge_text: string;
  status_summary: string;
  severity_level: 'NORMAL' | 'WORTH_WATCHING' | 'NEEDS_ATTENTION' | 'URGENT';
  what_is_happening: string;
  how_sure_we_are: PlainConfidenceSummary;
  what_it_could_lead_to: string;
  options_to_discuss_with_technician: PlainDiscussionOption[];
  affected_substations: AffectedSubstationPlain[];
  provenance_summary: string;
  narrative_version: string;
}

export interface SubstationTopologyPlain {
  substation_id: number;
  friendly_name: string;
  substation_role: string;
  plain_description: string;
  coordinates: [number, number];
  connected_corridor_ids: number[];
}

export interface CorridorTopologyPlain {
  corridor_id: number;
  from_substation_name: string;
  to_substation_name: string;
  capacity_tier: string;
}

export interface SupervisorGridTopologyProjection {
  environment_label: string;
  environment_badge_text: string;
  substations: SubstationTopologyPlain[];
  corridors: CorridorTopologyPlain[];
  plain_legend: Record<string, any>;
}

export interface SubstationReadingPlain {
  substation_id: number;
  friendly_name: string;
  status: 'NORMAL' | 'ELEVATED_STRAIN' | 'SUSPECT_SENSOR' | 'DEVIATION';
  strain_level: 'LOW' | 'MEDIUM' | 'HIGH';
  plain_reading: string;
  provenance_text: 'Direct Measurement' | 'Cross-Checked Estimate' | 'Data Unavailable';
}

export interface SupervisorGridStateProjection {
  step: number;
  environment_label: string;
  environment_badge_text: string;
  system_health_status: 'NORMAL' | 'UNDER_OBSERVATION' | 'ATTENTION_REQUIRED' | 'CRITICAL';
  plain_frequency_summary: string;
  equipment_strain_summary: string;
  active_incident_count: number;
  substation_readings: SubstationReadingPlain[];
}

export interface SupervisorDashboardData {
  environment_label: string;
  environment_badge_text: string;
  system_health: string;
  grid_frequency_status: string;
  corridor_strain_status: string;
  active_incidents_count: number;
  recent_briefings: SupervisorIncidentProjection[];
  recommendations_summary: string;
}

export interface GlossaryItem {
  term: string;
  plain_translation: string;
  plain_analogy: string;
}

// --- Workbench & Live Session ---
export interface AlarmRecord {
  id: string;
  run_id?: string;
  tag: string;
  description: string;
  priority: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  state: 'UNACK' | 'ACK' | 'CLEARED' | 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'RTN_UNACK' | 'RTN_ACK' | 'SHELVED' | string;
  source_component: string;
  current_value?: number;
  limit_value?: number;
  created_at_step?: number;
  created_at_wall?: string;
  acknowledged_by?: string;
  provenance?: Provenance;
}

export interface LiveSessionState {
  run_id?: string;
  visitor_id?: string;
  kind?: string;
  seed?: number;
  scenario_type?: string;
  status?: string;
  sim_step?: number;
  step?: number;
  speed?: number;
  is_running?: boolean;
  active_scenario?: string;
  grid_state?: GridState;
  version?: number;
  created_at?: string;
}

export interface DemoStepResult {
  step: number;
  grid_state: GridState;
  incidents: Incident[];
  new_alarms?: AlarmRecord[];
}
"""
    ts_path = os.path.join("frontend", "types", "api.ts")
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts_types)
    print(f"Generated TypeScript types in {ts_path}")

if __name__ == "__main__":
    generate()

