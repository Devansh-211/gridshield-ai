"""
GridShield AI — Value Envelope, Provenance, and Evidence Object Architecture (Rules R1–R6, R9–R10).

This module provides:
1. Canonical Provenance Enum (R1).
2. Environment Labels (R2).
3. First-Class Non-Answer States & Hypotheses (R3).
4. Five-Dimensional Confidence Vector (R5).
5. ValueEnvelope[T] with strict invariants and serialization (R1).
6. EvidenceObject schema (R4).
7. Legacy Provenance Migration Map.
"""
from enum import Enum
from typing import Generic, TypeVar, Optional, List, Dict, Any, Union
from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator, ConfigDict

T = TypeVar("T")

# --- Rule R1: Canonical Provenance ---
class Provenance(str, Enum):
    LIVE = "LIVE"
    HISTORICAL = "HISTORICAL"
    PUBLIC_DATASET = "PUBLIC_DATASET"
    SIMULATED = "SIMULATED"
    DERIVED = "DERIVED"
    PREDICTED = "PREDICTED"
    UNAVAILABLE = "UNAVAILABLE"


# --- Rule R1: Migration Map from Legacy Labels ---
LEGACY_PROVENANCE_MAP: Dict[str, Provenance] = {
    "OBSERVED": Provenance.SIMULATED,  # In twin context, raw observed stream is derived from simulation
    "ESTIMATED": Provenance.DERIVED,
    "CALCULATED": Provenance.DERIVED,
    "MODEL": Provenance.PREDICTED,
    "LLM": Provenance.DERIVED,
    "SIMULATED": Provenance.SIMULATED,
    "LIVE": Provenance.LIVE,
    "HISTORICAL": Provenance.HISTORICAL,
    "PUBLIC_DATASET": Provenance.PUBLIC_DATASET,
    "DERIVED": Provenance.DERIVED,
    "PREDICTED": Provenance.PREDICTED,
    "UNAVAILABLE": Provenance.UNAVAILABLE,
}

def migrate_legacy_provenance(label: Union[str, Provenance]) -> Provenance:
    """Migrate legacy provenance tag to canonical R1 Provenance enum."""
    if isinstance(label, Provenance):
        return label
    key = str(label).upper().strip()
    if key in LEGACY_PROVENANCE_MAP:
        return LEGACY_PROVENANCE_MAP[key]
    raise ValueError(f"Unknown provenance label: '{label}'. Must be one of {list(LEGACY_PROVENANCE_MAP.keys())}")


# --- Rule R2: Environment Label ---
class EnvironmentLabel(str, Enum):
    LIVE = "LIVE"
    MOCK = "MOCK"
    FIXTURE = "FIXTURE"
    SIMULATOR = "SIMULATOR"
    REPLAY = "REPLAY"
    UNAVAILABLE = "UNAVAILABLE"


# --- Rule R3: Non-Answer States ---
class NonAnswerState(str, Enum):
    UNKNOWN = "UNKNOWN"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    CONFLICTING_EVIDENCE = "CONFLICTING_EVIDENCE"
    MODEL_OUT_OF_DISTRIBUTION = "MODEL_OUT_OF_DISTRIBUTION"
    TOPOLOGY_UNSUPPORTED = "TOPOLOGY_UNSUPPORTED"


# --- Attribution Hypotheses (including H_data_quality per R3) ---
class AttributionHypothesis(str, Enum):
    NORMAL = "NORMAL"
    PHYSICAL_FAULT = "PHYSICAL_FAULT"
    FALSE_DATA_INJECTION = "FALSE_DATA_INJECTION"
    MALICIOUS_CONTROL_COMMAND = "MALICIOUS_CONTROL_COMMAND"
    REPLAY = "REPLAY"
    DENIAL_OF_SERVICE = "DENIAL_OF_SERVICE"
    COORDINATED_CYBER_PHYSICAL = "COORDINATED_CYBER_PHYSICAL"
    H_DATA_QUALITY = "H_data_quality"  # Stuck, noisy, missing, or skewed sensors


# --- Rule R5: Five-Dimensional Confidence Vector ---
class ConfidenceVector(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detection: float = Field(..., ge=0.0, le=1.0, description="Confidence in anomaly detection (0-1)")
    attribution: float = Field(..., ge=0.0, le=1.0, description="Confidence in root-cause classification (0-1)")
    model_uncertainty: float = Field(..., ge=0.0, le=1.0, description="Calibrated model certainty (1 - entropy/uncertainty)")
    evidence_completeness: float = Field(..., ge=0.0, le=1.0, description="Ratio of expected sensors reporting valid telemetry")
    data_quality: float = Field(..., ge=0.0, le=1.0, description="Assessment of sensor signal-to-noise and freshness (0-1)")
    composite: float = Field(..., ge=0.0, le=1.0, description="Deterministic composite score")

    @classmethod
    def calculate(
        cls,
        detection: float,
        attribution: float,
        model_uncertainty: float,
        evidence_completeness: float,
        data_quality: float
    ) -> "ConfidenceVector":
        # Deterministic weighted harmonic-like composite
        composite = round(
            0.25 * detection +
            0.25 * attribution +
            0.20 * model_uncertainty +
            0.15 * evidence_completeness +
            0.15 * data_quality,
            4
        )
        return cls(
            detection=round(detection, 4),
            attribution=round(attribution, 4),
            model_uncertainty=round(model_uncertainty, 4),
            evidence_completeness=round(evidence_completeness, 4),
            data_quality=round(data_quality, 4),
            composite=composite
        )


# --- Rule R1: Value Envelope ---
class ValueEnvelope(BaseModel, Generic[T]):
    model_config = ConfigDict(extra="forbid")

    value: Optional[T] = Field(None, description="The measured, calculated, or estimated value")
    unit: str = Field(..., description="Engineering unit (p.u., MW, MVAr, Hz, %, s, deg)")
    source: str = Field(..., description="Originating device, sensor, or algorithm")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp with timezone"
    )
    provenance: Provenance = Field(..., description="Provenance label (R1)")
    dataset_id: Optional[str] = Field(None, description="Identifier of dataset or replay source")
    transformation: Optional[str] = Field(None, description="Applied math method if DERIVED (e.g. StateEstimation_WLS)")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Item-level confidence score")
    validity: bool = Field(True, description="Validity flag based on range and checksum")

    @model_validator(mode="after")
    def validate_envelope_invariants(self) -> "ValueEnvelope[T]":
        # Invariant 1: UNAVAILABLE must carry value=None
        if self.provenance == Provenance.UNAVAILABLE:
            if self.value is not None:
                raise ValueError("ValueEnvelope with provenance=UNAVAILABLE must have value=None")
            self.validity = False

        # Invariant 2: Missing value must have provenance=UNAVAILABLE
        if self.value is None and self.provenance != Provenance.UNAVAILABLE:
            self.provenance = Provenance.UNAVAILABLE
            self.validity = False

        # Invariant 3: If DERIVED, transformation method must be named
        if self.provenance == Provenance.DERIVED and not self.transformation:
            self.transformation = "CALCULATED"

        return self


# --- Rule R4: Evidence Object ---
class EvidenceObject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    incident_id: str = Field(..., description="Unique incident identifier")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp with timezone"
    )
    environment: EnvironmentLabel = Field(default=EnvironmentLabel.SIMULATOR)
    versions: Dict[str, str] = Field(
        ...,
        description="Version registry {topology, state_estimate, model, data_schema, code_commit}"
    )
    data_sources: List[str] = Field(default_factory=list, description="List of source telemetry devices")
    measurements: List[ValueEnvelope[Any]] = Field(default_factory=list, description="Enveloped measurements supporting incident")
    detector_outputs: Dict[str, Any] = Field(default_factory=dict, description="Detailed detector outputs")
    attribution: Dict[str, Any] = Field(
        ...,
        description="{label, hypothesis_probabilities, non_answer_state}"
    )
    confidence: ConfidenceVector = Field(..., description="5-dimensional confidence vector")
    uncertainty: float = Field(0.0, ge=0.0, le=1.0)
    affected_elements: List[str] = Field(default_factory=list)
    mitigation_simulations: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="What-if simulation results. Empty if non-answer state."
    )
    provenance: Provenance = Field(default=Provenance.DERIVED)
    limitations: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_evidence_rules(self) -> "EvidenceObject":
        # Rule R2: Mock / Simulator cannot be labelled LIVE
        if self.environment in (EnvironmentLabel.SIMULATOR, EnvironmentLabel.MOCK, EnvironmentLabel.FIXTURE):
            if self.provenance == Provenance.LIVE:
                raise ValueError(f"Environment {self.environment} cannot emit provenance LIVE")

        # Rule R3: Under non-answer state, no mitigation recommendations permitted
        non_answer = self.attribution.get("non_answer_state")
        if non_answer and non_answer != "NONE" and non_answer != None:
            if len(self.mitigation_simulations) > 0:
                raise ValueError(f"Rule R3 Violation: Mitigation recommendations are prohibited under non-answer state '{non_answer}'")

        return self
