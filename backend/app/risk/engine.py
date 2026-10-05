"""
Operational Risk and Cyber Integrity Engine (Section 9).
Calculates deterministic multi-factor operational risk scores (0-100),
risk levels (LOW/MEDIUM/HIGH/CRITICAL), and component cyber integrity status.
"""
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, CyberEvent, CyberEventType,
    DetectionResult, Attribution, RiskAssessment, RiskFactor,
    RiskLevel, ComponentIntegrity, Provenance, TelemetryQuality
)

# Configurable policy weights (documented in MODEL.md)
WEIGHT_VOLTAGE = 0.25
WEIGHT_LINE_OVERLOAD = 0.25
WEIGHT_FREQUENCY = 0.20
WEIGHT_ESTIMATION_RESIDUAL = 0.15
WEIGHT_CYBER_THREAT = 0.15

class RiskEngine:
    """
    Deterministic operational risk calculator.
    """
    def evaluate_risk(self,
                      observed_points: List[ObservedTelemetryPoint],
                      detection_result: DetectionResult,
                      attribution: Attribution,
                      cyber_events: List[CyberEvent]) -> RiskAssessment:
        sub_scores: List[RiskFactor] = []

        # 1. Voltage Violation Factor
        voltages = [
            pt.reported_value for pt in observed_points
            if pt.measurement_type == "v_pu" and pt.quality != TelemetryQuality.MISSING
        ]
        max_v_dev = float(max([abs(v - 1.0) for v in voltages])) if voltages else 0.0
        # 0.05 pu dev = 50%, 0.10 pu dev = 100%
        v_score = min(100.0, (max_v_dev / 0.10) * 100.0)
        sub_scores.append(RiskFactor(
            name="Voltage Deviation",
            raw_value=round(max_v_dev, 4),
            normalized_score=round(v_score, 1),
            weight=WEIGHT_VOLTAGE,
            description=f"Maximum voltage deviation of {max_v_dev:.3f} p.u. from nominal"
        ))

        # 2. Line Overload Factor
        loadings = [
            pt.reported_value for pt in observed_points
            if pt.measurement_type == "loading_pct" and pt.quality != TelemetryQuality.MISSING
        ]
        max_load = float(max(loadings)) if loadings else 0.0
        # > 100% is overloaded
        l_score = min(100.0, max(0.0, (max_load - 80.0) / 40.0 * 100.0))
        sub_scores.append(RiskFactor(
            name="Thermal Line Loading",
            raw_value=round(max_load, 1),
            normalized_score=round(l_score, 1),
            weight=WEIGHT_LINE_OVERLOAD,
            description=f"Peak line loading at {max_load:.1f}% of continuous thermal rating"
        ))

        # 3. Frequency Deviation Factor
        freq_pts = [pt.reported_value for pt in observed_points if pt.measurement_type == "f_hz"]
        f_dev = float(abs(freq_pts[0] - 60.0)) if freq_pts else 0.0
        # 0.5 Hz dev = 100%
        f_score = min(100.0, (f_dev / 0.50) * 100.0)
        sub_scores.append(RiskFactor(
            name="Grid Frequency Stability",
            raw_value=round(f_dev, 3),
            normalized_score=round(f_score, 1),
            weight=WEIGHT_FREQUENCY,
            description=f"Frequency deviation of {f_dev:.3f} Hz from 60.0 Hz nominal"
        ))

        # 4. State Estimation Residual Factor
        chi2 = detection_result.l1.chi2_stat
        chi2_thresh = detection_result.l1.chi2_threshold
        r_score = min(100.0, (chi2 / chi2_thresh) * 50.0) if chi2 > 0 else 0.0
        sub_scores.append(RiskFactor(
            name="State Estimation Inconsistency",
            raw_value=round(chi2, 1),
            normalized_score=round(r_score, 1),
            weight=WEIGHT_ESTIMATION_RESIDUAL,
            description=f"L1 WLS Chi-Square residual stat at {chi2:.1f} (thresh={chi2_thresh:.1f})"
        ))

        # 5. Cyber Threat Factor
        unauth_cmds = sum(1 for e in cyber_events if e.event_type == CyberEventType.COMMAND_ISSUED and e.severity == "CRITICAL")
        auth_fails = sum(1 for e in cyber_events if e.event_type == CyberEventType.AUTH_FAILURE)
        cyber_score = min(100.0, unauth_cmds * 60.0 + auth_fails * 30.0)
        sub_scores.append(RiskFactor(
            name="Cyber Integrity Alerts",
            raw_value=float(unauth_cmds + auth_fails),
            normalized_score=round(cyber_score, 1),
            weight=WEIGHT_CYBER_THREAT,
            description=f"{unauth_cmds} unauthorized commands and {auth_fails} auth anomalies detected"
        ))

        # Overall composite risk
        overall_score = sum(factor.normalized_score * factor.weight for factor in sub_scores)
        overall_score = max(0.0, min(100.0, overall_score))

        if overall_score >= 70.0:
            risk_lvl = RiskLevel.CRITICAL
        elif overall_score >= 45.0:
            risk_lvl = RiskLevel.HIGH
        elif overall_score >= 20.0:
            risk_lvl = RiskLevel.MEDIUM
        else:
            risk_lvl = RiskLevel.LOW

        # Cyber Integrity Map per component
        integrity_map: Dict[str, ComponentIntegrity] = {}
        for b_id in range(1, 15):
            comp_id = f"Bus {b_id}"
            integrity_map[comp_id] = ComponentIntegrity.TRUSTED

        # Flag components cited in evidence or anomalies
        for ev in attribution.supporting_evidence:
            for b_id in range(1, 15):
                comp_id = f"Bus {b_id}"
                if comp_id in ev.description or comp_id in ev.metric_name:
                    if attribution.likely_cause in ["CYBER", "CYBER_PHYSICAL"]:
                        integrity_map[comp_id] = ComponentIntegrity.COMPROMISED
                    else:
                        integrity_map[comp_id] = ComponentIntegrity.SUSPECT

        return RiskAssessment(
            overall_risk_score=round(overall_score, 1),
            risk_level=risk_lvl,
            sub_scores=sub_scores,
            cyber_integrity_map=integrity_map,
            provenance=Provenance.CALCULATED
        )
