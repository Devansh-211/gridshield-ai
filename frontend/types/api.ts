/**
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

export type AlarmState = 'UNACK' | 'ACK' | 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'RTN_UNACK' | 'SHELVED' | 'CLEARED';
export type AlarmPriority = 'CRITICAL' | 'WARNING' | 'CAUTION' | 'DIAGNOSTIC';

export interface AlarmRecord {
  id: string;
  run_id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
  state: AlarmState;
  source_substation?: string | null;
  source_component?: string | null;
  setpoint_violated?: string | null;
  current_value?: number | null;
  limit_value?: number | null;
  units?: string | null;
  created_at_step: number;
  created_at_wall?: string | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  shelved_until?: string | null;
  return_to_normal_at?: string | null;
  provenance: Provenance;
}

export interface DemoStepResult {
  step_index: number;
  total_steps: number;
  title: string;
  stage_name: string;
  summary_plain: string;
  summary_technical: string;
  sim_step: number;
  alarms_raised: AlarmRecord[];
  incidents_raised: string[];
  actions_applied: string[];
  next_step_index: number | null;
  is_complete: boolean;
  provenance: Provenance;
}

export interface LiveSessionState {
  run_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  active_alarms_count: number;
  open_incidents_count: number;
  grid_state: GridState;
  provenance: Provenance;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: Record<string, any> | null;
  request_id?: string | null;
}

