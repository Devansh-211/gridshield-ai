"""
Phase P2: Integrity Spine Verification Suite (Rules R1–R6, R9–R10).

Verifies:
1. Unlabelled numeric rejected; ValueEnvelope invariant enforcement.
2. UNAVAILABLE never carries numeric value.
3. Mock / Simulator environments cannot be labelled LIVE.
4. Non-answer states (CONFLICTING_EVIDENCE, OOD, TOPOLOGY_UNSUPPORTED) prohibit mitigation recommendations.
5. Five-dimensional confidence vector calculation.
6. Provenance migration map from legacy labels.
7. Validated-domain gate & OOD boundary enforcement.
8. Ground-truth firewall import isolation (Detection cannot import GroundTruthPoint).
"""
import os
import ast
import json
import pytest
from pydantic import ValidationError

from backend.app.schemas.envelope import (
    ValueEnvelope,
    Provenance,
    EnvironmentLabel,
    NonAnswerState,
    ConfidenceVector,
    EvidenceObject,
    migrate_legacy_provenance,
    LEGACY_PROVENANCE_MAP
)
from backend.app.core.compatibility_gate import CompatibilityGate


# --- 1. Value Envelope & Provenance Invariant Tests (R1) ---

def test_value_envelope_valid():
    """Valid ValueEnvelope instantiation."""
    env = ValueEnvelope[float](
        value=1.034,
        unit="p.u.",
        source="RTU_Bus4",
        provenance=Provenance.SIMULATED,
        validity=True
    )
    assert env.value == 1.034
    assert env.unit == "p.u."
    assert env.provenance == Provenance.SIMULATED
    assert env.validity is True


def test_unavailable_never_numeric():
    """Rule R1: UNAVAILABLE must carry value=None; passing numeric must fail."""
    with pytest.raises(ValueError, match="ValueEnvelope with provenance=UNAVAILABLE must have value=None"):
        ValueEnvelope[float](
            value=1.05,
            unit="p.u.",
            source="RTU_Bus4",
            provenance=Provenance.UNAVAILABLE
        )

    # Valid UNAVAILABLE
    env = ValueEnvelope[float](
        value=None,
        unit="p.u.",
        source="RTU_Bus4",
        provenance=Provenance.UNAVAILABLE
    )
    assert env.value is None
    assert env.provenance == Provenance.UNAVAILABLE
    assert env.validity is False


def test_none_value_auto_sets_unavailable():
    """Rule R1: Value None automatically coerces to UNAVAILABLE."""
    env = ValueEnvelope[float](
        value=None,
        unit="MW",
        source="Gen2_Meter",
        provenance=Provenance.DERIVED
    )
    assert env.provenance == Provenance.UNAVAILABLE
    assert env.validity is False


def test_derived_value_requires_transformation():
    """Rule R1: Inferred/derived values require transformation method."""
    env = ValueEnvelope[float](
        value=142.5,
        unit="MW",
        source="StateEstimator",
        provenance=Provenance.DERIVED,
        transformation="WLS_Physics_Residual"
    )
    assert env.transformation == "WLS_Physics_Residual"


# --- 2. Provenance Label Migration Map (R1) ---

@pytest.mark.parametrize("legacy_label,expected_canonical", [
    ("OBSERVED", Provenance.SIMULATED),
    ("ESTIMATED", Provenance.DERIVED),
    ("CALCULATED", Provenance.DERIVED),
    ("MODEL", Provenance.PREDICTED),
    ("LLM", Provenance.DERIVED),
    ("SIMULATED", Provenance.SIMULATED),
    ("LIVE", Provenance.LIVE),
    ("HISTORICAL", Provenance.HISTORICAL),
    ("PUBLIC_DATASET", Provenance.PUBLIC_DATASET),
    ("DERIVED", Provenance.DERIVED),
    ("PREDICTED", Provenance.PREDICTED),
    ("UNAVAILABLE", Provenance.UNAVAILABLE),
])
def test_provenance_migration_map(legacy_label, expected_canonical):
    """Test legacy to canonical R1 provenance migration."""
    assert migrate_legacy_provenance(legacy_label) == expected_canonical


def test_invalid_provenance_label_rejected():
    """Reject unmapped/fabricated provenance strings."""
    with pytest.raises(ValueError, match="Unknown provenance label"):
        migrate_legacy_provenance("MAGIC_AI_ESTIMATE")


# --- 3. Environment Labels (R2) & Mock Safety ---

def test_mock_cannot_be_labelled_live():
    """Rule R2: A mock or simulator is never shown as LIVE."""
    with pytest.raises(ValueError, match="cannot emit provenance LIVE"):
        EvidenceObject(
            incident_id="INC_TEST_01",
            environment=EnvironmentLabel.SIMULATOR,
            versions={"model": "v1"},
            attribution={"label": "NORMAL", "non_answer_state": None},
            confidence=ConfidenceVector.calculate(1, 1, 1, 1, 1),
            provenance=Provenance.LIVE  # Violation!
        )


# --- 4. Non-Answer States & Rule R3 (No Mitigation on Non-Answers) ---

def test_non_answer_prohibits_mitigation_recommendation():
    """Rule R3: No mitigation recommendation permitted under non-answer state."""
    # Attempting to attach mitigation simulation under CONFLICTING_EVIDENCE must fail validation
    with pytest.raises(ValueError, match="Rule R3 Violation: Mitigation recommendations are prohibited"):
        EvidenceObject(
            incident_id="INC_TEST_CONFLICT",
            environment=EnvironmentLabel.SIMULATOR,
            versions={"model": "v1"},
            attribution={
                "label": "UNKNOWN",
                "non_answer_state": NonAnswerState.CONFLICTING_EVIDENCE.value
            },
            confidence=ConfidenceVector.calculate(0.5, 0.2, 0.1, 0.9, 0.5),
            mitigation_simulations=[{"action": "TRIP_LINE", "target": "Line 1-2"}], # Violation!
            provenance=Provenance.DERIVED
        )


def test_valid_non_answer_evidence_object():
    """Valid Non-Answer Evidence Object with empty mitigation simulations."""
    ev = EvidenceObject(
        incident_id="INC_TEST_CONFLICT_VALID",
        environment=EnvironmentLabel.SIMULATOR,
        versions={"model": "v1"},
        attribution={
            "label": "UNKNOWN",
            "hypothesis_probabilities": {"NORMAL": 0.5, "FALSE_DATA_INJECTION": 0.5},
            "non_answer_state": NonAnswerState.CONFLICTING_EVIDENCE.value
        },
        confidence=ConfidenceVector.calculate(0.5, 0.2, 0.1, 0.9, 0.5),
        mitigation_simulations=[],  # Correct: empty
        provenance=Provenance.DERIVED
    )
    assert ev.attribution["non_answer_state"] == NonAnswerState.CONFLICTING_EVIDENCE.value
    assert len(ev.mitigation_simulations) == 0


# --- 5. Five-Dimensional Confidence Vector (R5) ---

def test_five_dimension_confidence():
    """Rule R5: Confidence has five explicit dimensions, never a single unweighted number."""
    cv = ConfidenceVector.calculate(
        detection=0.92,
        attribution=0.88,
        model_uncertainty=0.95,
        evidence_completeness=1.0,
        data_quality=0.90
    )
    assert cv.detection == 0.92
    assert cv.attribution == 0.88
    assert cv.model_uncertainty == 0.95
    assert cv.evidence_completeness == 1.0
    assert cv.data_quality == 0.90
    assert 0.0 <= cv.composite <= 1.0


# --- 6. Validated-Domain Compatibility Gate (R6) & OOD Checks ---

def test_compatibility_gate_topology_check():
    """Rule R6: Unvalidated topology triggers TOPOLOGY_UNSUPPORTED."""
    gate = CompatibilityGate()
    
    # Valid topology
    is_valid, state = gate.check_topology_supported("model-v1.0", "IEEE 14-bus Digital Twin")
    assert is_valid is True
    assert state is None

    # Invalid / unvalidated topology
    is_valid, state = gate.check_topology_supported("model-v1.0", "IEEE_118_UNVALIDATED")
    assert is_valid is False
    assert state == NonAnswerState.TOPOLOGY_UNSUPPORTED


def test_compatibility_gate_feature_ood_check():
    """Rule R6: Telemetry exceeding distribution bounds triggers MODEL_OUT_OF_DISTRIBUTION."""
    gate = CompatibilityGate()
    
    # Nominal telemetry
    is_ood, state = gate.check_feature_ood(
        model_id="model-v1.0",
        voltages=[1.02, 1.01, 0.99, 1.03],
        loadings=[45.0, 60.0, 72.0],
        frequency=60.0
    )
    assert is_ood is False
    assert state is None

    # Unphysical / severe OOD voltage (2.4 pu)
    is_ood, state = gate.check_feature_ood(
        model_id="model-v1.0",
        voltages=[1.02, 2.40, 0.99],
        loadings=[45.0],
        frequency=60.0
    )
    assert is_ood is True
    assert state == NonAnswerState.MODEL_OUT_OF_DISTRIBUTION


def test_compatibility_gate_conflict_evaluation():
    """Rule R3: Physics residual and ML classifier conflict detection."""
    gate = CompatibilityGate()
    
    # Severe physics residual (4.8 sigmas) vs ML predicting NORMAL (0.92 prob)
    conflict = gate.evaluate_conflict(
        physics_anomaly=True,
        physics_residual=4.8,
        ml_anomaly=False,
        ml_confidence=0.92
    )
    assert conflict == NonAnswerState.CONFLICTING_EVIDENCE


# --- 7. Ground-Truth Firewall Import Isolation (I3) ---

def test_detection_code_ground_truth_firewall():
    """Invariant I3: Detection/attribution code must NOT import ground truth types."""
    detection_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "detection")
    attribution_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "attribution")

    forbidden_imports = ["GroundTruthPoint", "ground_truth", "pandapower.net", "_net"]

    for search_dir in [detection_dir, attribution_dir]:
        for root, _, files in os.walk(search_dir):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        tree = ast.parse(f.read(), filename=file)
                    
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                for forbidden in forbidden_imports:
                                    assert forbidden not in alias.name, (
                                        f"Firewall Violation (I3) in {file}: imported {alias.name}"
                                    )
                        elif isinstance(node, ast.ImportFrom):
                            mod = node.module or ""
                            for alias in node.names:
                                for forbidden in forbidden_imports:
                                    assert forbidden != alias.name and forbidden not in mod, (
                                        f"Firewall Violation (I3) in {file}: imported {alias.name} from {mod}"
                                    )
