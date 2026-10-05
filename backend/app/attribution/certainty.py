"""
Certainty & Confidence Band Derivation (Section 9).
Mechanically maps calibrated model probability, margin, and cross-domain evidence count
to deterministic certainty bands (HIGH / MEDIUM / LOW).
No invented percentages (Invariant I6).
"""
from backend.app.schemas.contracts import (
    DetectionResult, Attribution, CertaintyBand, ClassificationClass
)

def compute_certainty_band(detection_result: DetectionResult, attribution: Attribution) -> CertaintyBand:
    """
    Computes deterministic CertaintyBand based on:
    1. Calibrated classifier probability P
    2. Probability margin over second-best class
    3. Cross-domain supporting evidence count
    """
    if detection_result.l3.predicted_class == ClassificationClass.UNKNOWN:
        return CertaintyBand.LOW

    p_cal = detection_result.l3.calibrated_probability
    evidence_count = len(attribution.supporting_evidence)

    # Class probabilities margin
    probs = list(detection_result.l3.class_probabilities.values())
    sorted_probs = sorted(probs, reverse=True)
    margin = sorted_probs[0] - (sorted_probs[1] if len(sorted_probs) > 1 else 0.0)

    if p_cal >= 0.80 and margin >= 0.25 and evidence_count >= 2:
        return CertaintyBand.HIGH
    elif p_cal >= 0.55 and margin >= 0.10:
        return CertaintyBand.MEDIUM
    else:
        return CertaintyBand.LOW
