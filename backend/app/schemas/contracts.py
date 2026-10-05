from enum import Enum
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field, ConfigDict

# --- Provenance Enum (Invariant I2) ---
class Provenance(str, Enum):
    SIMULATED = "SIMULATED"
    OBSERVED = "OBSERVED"
    ESTIMATED = "ESTIMATED"
    MODEL = "MODEL"
    CALCULATED = "CALCULATED"
    LLM = "LLM"

# --- Telemetry Quality ---
class TelemetryQuality(str, Enum):
    GOOD = "GOOD"
    STALE = "STALE"
    MISSING = "MISSING"
    SUSPECT = "SUSPECT"

# --- Cyber Event Types ---
class CyberEventType(str, Enum):
    AUTH_FAILURE = "AUTH_FAILURE"
    AUTH_SUCCESS = "AUTH_SUCCESS"
    COMMAND_ISSUED = "COMMAND_ISSUED"
    COMMAND_REJECTED = "COMMAND_REJECTED"
    PACKET_LOSS = "PACKET_LOSS"
    LATENCY_SPIKE = "LATENCY_SPIKE"
    SEQUENCE_ANOMALY = "SEQUENCE_ANOMALY"
    CONFIG_CHANGED = "CONFIG_CHANGED"

# --- Attack & Scenario Types ---
class AttackType(str, Enum):
    NONE = "NONE"
    FALSE_DATA_INJECTION = "FALSE_DATA_INJECTION"
    MALICIOUS_CONTROL_COMMAND = "MALICIOUS_CONTROL_COMMAND"
    REPLAY = "REPLAY"
    DENIAL_OF_SERVICE = "DENIAL_OF_SERVICE"
    COORDINATED_CYBER_PHYSICAL = "COORDINATED_CYBER_PHYSICAL"

class ScenarioType(str, Enum):
    NORMAL = "NORMAL"
    LOAD_INCREASE = "LOAD_INCREASE"
    LINE_FAILURE = "LINE_FAILURE"
    GENERATOR_FAILURE = "GENERATOR_FAILURE"
    VOLTAGE_INSTABILITY = "VOLTAGE_INSTABILITY"
    FREQUENCY_DISTURBANCE = "FREQUENCY_DISTURBANCE"

# --- Classification Classes ---
class ClassificationClass(str, Enum):
    NORMAL = "NORMAL"
    PHYSICAL_FAULT = "PHYSICAL_FAULT"
    FALSE_DATA_INJECTION = "FALSE_DATA_INJECTION"
    MALICIOUS_CONTROL_COMMAND = "MALICIOUS_CONTROL_COMMAND"
    REPLAY = "REPLAY"
    DENIAL_OF_SERVICE = "DENIAL_OF_SERVICE"
    COORDINATED_CYBER_PHYSICAL = "COORDINATED_CYBER_PHYSICAL"
    UNKNOWN = "UNKNOWN"

# --- Risk & Certainty Enums ---
class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class CertaintyBand(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ComponentIntegrity(str, Enum):
    TRUSTED = "TRUSTED"
    SUSPECT = "SUSPECT"
    COMPROMISED = "COMPROMISED"

# --- Mitigation Actions Allowlist ---
class MitigationActionType(str, Enum):
    ISOLATE_BUS = "ISOLATE_BUS"
    TRIP_LINE = "TRIP_LINE"
    RESTORE_LINE = "RESTORE_LINE"
    QUARANTINE_MEASUREMENT = "QUARANTINE_MEASUREMENT"
    REDISPATCH_GEN = "REDISPATCH_GEN"
    SHED_LOAD = "SHED_LOAD"
    REVERT_COMMAND = "REVERT_COMMAND"
    NO_ACTION = "NO_ACTION"

# --- Incident Lifecycle Status ---
class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    MITIGATION_PROPOSED = "MITIGATION_PROPOSED"
    SIMULATION_RUNNING = "SIMULATION_RUNNING"
    MITIGATION_VERIFIED = "MITIGATION_VERIFIED"
    RESOLVED = "RESOLVED"

# --- Telemetry & Ground Truth Models (Firewall Enforced per I3) ---
class ObservedTelemetryPoint(BaseModel):
    timestamp: float = Field(..., description="Simulation step time (seconds)")
    wall_time: str = Field(..., description="ISO 8601 wall-clock timestamp")
    component_id: str = Field(..., description="Element identifier, e.g. Bus 4, Line 1-2")
    component_type: str = Field(..., description="bus, line, gen, load")
    measurement_type: str = Field(..., description="v_pu, p_mw, q_mvar, f_hz, loading_pct")
    reported_value: float = Field(..., description="Value reported by sensor")
    unit: str = Field(..., description="p.u., MW, MVAr, Hz, %")
    quality: TelemetryQuality = Field(default=TelemetryQuality.GOOD)
    sequence: int = Field(default=0)
    source_device_id: str = Field(default="RTU_01")
    provenance: Provenance = Field(default=Provenance.OBSERVED)

class GroundTruthPoint(BaseModel):
    timestamp: float
    component_id: str
    component_type: str
    measurement_type: str
    true_value: float
    unit: str
    provenance: Provenance = Field(default=Provenance.SIMULATED)

class CyberEvent(BaseModel):
    id: str
    timestamp: float
    wall_time: str
    device_id: str
    event_type: CyberEventType
    details: str
    severity: str = "INFO"
    provenance: Provenance = Field(default=Provenance.OBSERVED)

# --- Grid Topology & State ---
class BusTopology(BaseModel):
    id: int = Field(..., description="1-based IEEE bus number")
    name: str
    vn_kv: float
    x: float = Field(..., description="Schematic X coordinate")
    y: float = Field(..., description="Schematic Y coordinate")
    bus_type: str = Field(..., description="PQ, PV, SLACK")

class LineTopology(BaseModel):
    id: int
    name: str
    from_bus: int
    to_bus: int
    length_km: float
    max_i_ka: float
    in_service: bool = True

class GeneratorTopology(BaseModel):
    id: int
    name: str
    bus: int
    p_mw: float
    vm_pu: float
    sn_mva: float
    in_service: bool = True

class LoadTopology(BaseModel):
    id: int
    name: str
    bus: int
    p_mw: float
    q_mvar: float
    in_service: bool = True

class GridTopology(BaseModel):
    system_name: str = "IEEE 14-bus Digital Twin"
    buses: List[BusTopology]
    lines: List[LineTopology]
    generators: List[GeneratorTopology]
    loads: List[LoadTopology]
    provenance: Provenance = Field(default=Provenance.SIMULATED)

class BusState(BaseModel):
    bus_id: int
    vm_pu: float
    va_degree: float
    p_mw: float
    q_mvar: float
    status: str = "NORMAL"

class LineState(BaseModel):
    line_id: int
    loading_pct: float
    p_from_mw: float
    q_from_mvar: float
    p_to_mw: float
    q_to_mvar: float
    in_service: bool = True

class GridState(BaseModel):
    step: int
    sim_time_s: float
    converged: bool
    buses: List[BusState]
    lines: List[LineState]
    frequency_hz: float = 60.0
    frequency_provenance: Provenance = Field(default=Provenance.SIMULATED)
    provenance: Provenance = Field(default=Provenance.SIMULATED)

# --- Attack & Scenario Specs ---
class AttackSpec(BaseModel):
    attack_type: AttackType = AttackType.NONE
    target_components: List[str] = Field(default_factory=list, description="Target buses or lines (e.g. ['Bus 4'])")
    target_measurements: List[str] = Field(default_factory=list, description="Target measurement types (e.g. ['v_pu'])")
    magnitude: float = Field(default=0.0, description="Bias or delta modifier")
    start_step: int = Field(default=10, description="Step to initiate attack")
    duration_steps: int = Field(default=50, description="Duration in steps")
    seed: int = Field(default=42)

class ScenarioSpec(BaseModel):
    scenario_type: ScenarioType = ScenarioType.NORMAL
    target_component: Optional[str] = None
    parameter_value: float = 0.0
    start_step: int = 10
    duration_steps: int = 100
    total_steps: int = 200
    seed: int = 42
    attack: Optional[AttackSpec] = None

# --- Feature Vector & Detection Result ---
class FeatureVector(BaseModel):
    step: int
    feature_version: str = "v1.0"
    features: Dict[str, float] = Field(..., description="Engineered features from observed telemetry only")
    provenance: Provenance = Field(default=Provenance.CALCULATED)

class L1Detection(BaseModel):
    flagged: bool
    chi2_stat: float
    chi2_threshold: float
    max_normalized_residual: float
    flagged_measurements: List[str] = Field(default_factory=list)
    provenance: Provenance = Field(default=Provenance.ESTIMATED)

class L2Detection(BaseModel):
    flagged: bool
    anomaly_score: float
    threshold: float
    provenance: Provenance = Field(default=Provenance.MODEL)

class L3Classification(BaseModel):
    predicted_class: ClassificationClass
    calibrated_probability: float
    class_probabilities: Dict[str, float]
    model_version: str
    provenance: Provenance = Field(default=Provenance.MODEL)

class DetectionResult(BaseModel):
    step: int
    l1: L1Detection
    l2: L2Detection
    l3: L3Classification
    overall_anomaly_flag: bool
    provenance: Provenance = Field(default=Provenance.CALCULATED)

# --- Evidence & Attribution ---
class EvidenceItem(BaseModel):
    id: str = Field(..., description="e.g. E1, E2")
    domain: str = Field(..., description="PHYSICAL, CYBER, or STATE_ESTIMATOR")
    description: str
    metric_name: str
    observed_value: Union[float, str, int, bool]
    expected_value: Optional[Union[float, str, int, bool]] = None
    provenance: Provenance = Field(default=Provenance.OBSERVED)

class Attribution(BaseModel):
    likely_cause: str = Field(..., description="PHYSICAL, CYBER, CYBER_PHYSICAL, or NORMAL")
    hypothesis_scores: Dict[str, float] = Field(..., description="H_normal, H_physical, H_cyber, H_cyberphysical")
    supporting_evidence: List[EvidenceItem]
    contradicting_evidence: List[EvidenceItem] = Field(default_factory=list)
    alternatives_considered: List[str] = Field(default_factory=list)
    provenance: Provenance = Field(default=Provenance.CALCULATED)

# --- Risk Assessment ---
class RiskFactor(BaseModel):
    name: str
    raw_value: float
    normalized_score: float = Field(..., ge=0.0, le=100.0)
    weight: float
    description: str

class RiskAssessment(BaseModel):
    overall_risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: RiskLevel
    sub_scores: List[RiskFactor]
    cyber_integrity_map: Dict[str, ComponentIntegrity] = Field(default_factory=dict)
    provenance: Provenance = Field(default=Provenance.CALCULATED)

# --- Mitigation & Verification ---
class MitigationInstruction(BaseModel):
    action_type: MitigationActionType
    target_component: str
    parameter_value: Optional[float] = None
    justification: str

class MitigationPlan(BaseModel):
    plan_id: str
    incident_id: str
    actions: List[MitigationInstruction]
    evidence_citations: List[str] = Field(default_factory=list)
    provenance: Provenance = Field(default=Provenance.CALCULATED)

class VerificationMetrics(BaseModel):
    max_voltage_deviation_pu: float
    voltage_violations_count: int
    overloaded_lines_count: int
    max_line_loading_pct: float
    total_load_served_mw: float
    load_shed_mw: float
    frequency_hz: float
    operational_risk_score: float
    risk_level: RiskLevel
    state_estimation_error_rmse: Optional[float] = None
    provenance: Provenance = Field(default=Provenance.CALCULATED)

class MitigationResult(BaseModel):
    plan_id: str
    incident_id: str
    success: bool
    summary: str
    baseline_metrics: VerificationMetrics
    unmitigated_impact_metrics: VerificationMetrics
    mitigated_metrics: VerificationMetrics
    provenance: Provenance = Field(default=Provenance.CALCULATED)

class ImpactResult(BaseModel):
    incident_id: str
    projected_steps: int
    unmitigated_metrics: VerificationMetrics
    summary: str
    provenance: Provenance = Field(default=Provenance.CALCULATED)

# --- Incidents & Events ---
class Incident(BaseModel):
    incident_id: str = Field(..., description="e.g. GS-0001")
    run_id: str
    scenario_ref: str
    created_at_step: int
    created_at_wall: str
    status: IncidentStatus
    affected_components: List[str]
    classification: ClassificationClass
    attribution: Attribution
    certainty: CertaintyBand
    risk: RiskAssessment
    evidence: List[EvidenceItem]
    model_version: str
    recommended_plan: Optional[MitigationPlan] = None
    mitigation_result: Optional[MitigationResult] = None
    provenance: Provenance = Field(default=Provenance.CALCULATED)

class TimelineEvent(BaseModel):
    id: str
    run_id: str
    incident_id: Optional[str] = None
    sim_time: float
    wall_time: str
    event_type: str
    title: str
    description: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    provenance: Provenance = Field(default=Provenance.OBSERVED)

# --- Analyst Q&A & Context ---
class AnalystContext(BaseModel):
    incident_id: str
    run_id: str
    classification: ClassificationClass
    likely_cause: str
    certainty: CertaintyBand
    risk_level: RiskLevel
    evidence: List[EvidenceItem]
    affected_components: List[str]
    recommended_actions: List[str]
    model_version: str

class AnalystExplanation(BaseModel):
    incident_id: str
    title: str
    what_happened: str
    where: str
    why: str
    evidence_analysis: str
    cyber_vs_physical: str
    model_assessment: str
    recommended_actions: str
    is_template_fallback: bool = False
    cited_evidence_ids: List[str]
    provenance: Provenance = Field(default=Provenance.LLM)

class AnalystQuestionRequest(BaseModel):
    incident_id: str
    question: str

class AnalystQuestionResponse(BaseModel):
    incident_id: str
    question: str
    answer: str
    proposed_action: Optional[MitigationInstruction] = None
    simulation_verified: bool = False
    is_template_fallback: bool = False
    provenance: Provenance = Field(default=Provenance.LLM)

# --- Error Envelope ---
class ErrorEnvelope(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None
