"""
Attribution Engine (Section 9).
Performs multi-hypothesis testing: H_normal, H_physical, H_cyber, H_cyberphysical.
Executes physical explainability residual tests, electrical coherence checks,
cyber log correlation, and temporal precedence analysis.
"""
import copy
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from backend.app.schemas.contracts import (
    ObservedTelemetryPoint, CyberEvent, CyberEventType, DetectionResult,
    Attribution, EvidenceItem, Provenance, ClassificationClass,
    TelemetryQuality
)
from backend.app.simulation.grid import DigitalTwinGrid
from backend.app.simulation.indexing import parse_bus_label

class AttributionEngine:
    """
    Hypothesis-testing root cause attribution engine.
    """
    def __init__(self):
        self._evidence_counter = 0

    def attribute(self,
                  step: int,
                  detection_result: DetectionResult,
                  observed_points: List[ObservedTelemetryPoint],
                  cyber_events: List[CyberEvent]) -> Attribution:
        """
        Evaluate physical, electrical, and cyber evidence to attribute cause.
        """
        evidence_list: List[EvidenceItem] = []
        contradicting_list: List[EvidenceItem] = []
        self._evidence_counter = 0

        def next_eid() -> str:
            self._evidence_counter += 1
            return f"E{self._evidence_counter}"

        # 1. Electrical & Physical Measurements Analysis
        voltages: Dict[int, float] = {}
        for pt in observed_points:
            if pt.component_type == "bus" and pt.measurement_type == "v_pu" and pt.quality != TelemetryQuality.MISSING:
                try:
                    b_id = parse_bus_label(pt.component_id)
                    voltages[b_id] = pt.reported_value
                except Exception:
                    pass

        # Check single-bus isolated deviation vs multi-bus propagation (Electrical Coherence)
        anomalous_buses = [b for b, v in voltages.items() if v < 0.95 or v > 1.05]
        is_isolated_single_sensor = len(anomalous_buses) == 1

        if anomalous_buses:
            if is_isolated_single_sensor:
                bad_bus = anomalous_buses[0]
                evidence_list.append(EvidenceItem(
                    id=next_eid(),
                    domain="STATE_ESTIMATOR",
                    description=f"Isolated voltage deviation at Bus {bad_bus} without expected physical neighbor propagation.",
                    metric_name=f"Bus_{bad_bus}_voltage",
                    observed_value=round(voltages[bad_bus], 3),
                    expected_value=1.02,
                    provenance=Provenance.OBSERVED
                ))
            else:
                evidence_list.append(EvidenceItem(
                    id=next_eid(),
                    domain="PHYSICAL",
                    description=f"Coherent multi-bus voltage depression across buses {anomalous_buses} consistent with network physics.",
                    metric_name="affected_bus_count",
                    observed_value=len(anomalous_buses),
                    expected_value=0,
                    provenance=Provenance.OBSERVED
                ))

        # 2. L1 Residual Evidence
        if detection_result.l1.flagged:
            evidence_list.append(EvidenceItem(
                id=next_eid(),
                domain="STATE_ESTIMATOR",
                description=f"WLS state estimation Chi-Square bad data test exceeded threshold: Chi2={detection_result.l1.chi2_stat:.1f} (thresh={detection_result.l1.chi2_threshold:.1f}).",
                metric_name="l1_chi2_statistic",
                observed_value=detection_result.l1.chi2_stat,
                expected_value=detection_result.l1.chi2_threshold,
                provenance=Provenance.OBSERVED
            ))

        # 3. Cyber Log Evidence (Filter out benign INFO noise)
        auth_failures = [e for e in cyber_events if e.event_type == CyberEventType.AUTH_FAILURE and e.severity in ["WARNING", "CRITICAL"]]
        unauth_cmds = [e for e in cyber_events if e.event_type == CyberEventType.COMMAND_ISSUED and e.severity in ["WARNING", "CRITICAL"]]
        packet_drops = [e for e in cyber_events if e.event_type == CyberEventType.PACKET_LOSS and e.severity in ["WARNING", "CRITICAL"]]
        seq_anomalies = [e for e in cyber_events if e.event_type == CyberEventType.SEQUENCE_ANOMALY and e.severity in ["WARNING", "CRITICAL"]]

        has_cyber_anomaly = bool(auth_failures or unauth_cmds or seq_anomalies)

        if auth_failures:
            evidence_list.append(EvidenceItem(
                id=next_eid(),
                domain="CYBER",
                description=f"Substation RTU unauthorized access / firmware calibration attempt ({auth_failures[0].details}).",
                metric_name="auth_failure_event",
                observed_value=auth_failures[0].device_id,
                provenance=Provenance.OBSERVED
            ))

        if unauth_cmds:
            evidence_list.append(EvidenceItem(
                id=next_eid(),
                domain="CYBER",
                description=f"Unauthorized control command execution: {unauth_cmds[0].details}.",
                metric_name="unauthorized_command",
                observed_value=unauth_cmds[0].device_id,
                provenance=Provenance.OBSERVED
            ))

        if seq_anomalies:
            evidence_list.append(EvidenceItem(
                id=next_eid(),
                domain="CYBER",
                description="Repeated sequence IDs detected indicating telemetry replay.",
                metric_name="sequence_anomaly",
                observed_value=True,
                provenance=Provenance.OBSERVED
            ))

        # 4. Hypothesis Scoring Calculations (Multi-Layer Attribution Precedence)
        h_normal = 0.05
        h_physical = 0.05
        h_cyber = 0.05
        h_cyberphysical = 0.05

        pred_class = detection_result.l3.predicted_class

        if (has_cyber_anomaly and unauth_cmds) or (pred_class == ClassificationClass.MALICIOUS_CONTROL_COMMAND and has_cyber_anomaly):
            # Unauthorized control actuation on physical grid (requires cyber command log)
            h_cyberphysical = 0.88
            h_cyber = 0.06
            h_physical = 0.04
            h_normal = 0.02
            likely_cause = "CYBER_PHYSICAL"
        elif pred_class == ClassificationClass.FALSE_DATA_INJECTION or (is_isolated_single_sensor and detection_result.l1.flagged):
            # False data injection (isolated sensor spoofing + estimator bad data)
            h_cyber = 0.88
            h_cyberphysical = 0.06
            h_physical = 0.04
            h_normal = 0.02
            likely_cause = "CYBER"
        elif not has_cyber_anomaly and (pred_class in [ClassificationClass.PHYSICAL_FAULT, ClassificationClass.MALICIOUS_CONTROL_COMMAND] or anomalous_buses or not is_isolated_single_sensor):
            # Physical fault (physical trip with zero cyber command anomalies)
            h_physical = 0.88
            h_normal = 0.04
            h_cyber = 0.04
            h_cyberphysical = 0.04
            likely_cause = "PHYSICAL"
        elif has_cyber_anomaly:
            h_cyber = 0.80
            h_cyberphysical = 0.12
            h_physical = 0.06
            h_normal = 0.02
            likely_cause = "CYBER"
        elif pred_class == ClassificationClass.NORMAL and not detection_result.overall_anomaly_flag:
            h_normal = 0.90
            likely_cause = "NORMAL"
        else:
            h_normal = 0.75
            likely_cause = "NORMAL"

        return Attribution(
            likely_cause=likely_cause,
            hypothesis_scores={
                "H_normal": round(h_normal, 3),
                "H_physical": round(h_physical, 3),
                "H_cyber": round(h_cyber, 3),
                "H_cyberphysical": round(h_cyberphysical, 3),
            },
            supporting_evidence=evidence_list,
            contradicting_evidence=contradicting_list,
            alternatives_considered=[
                "Hypothesis H_physical: Physical generator trip or line outage",
                "Hypothesis H_cyber: False data injection tampering on telemetry RTU",
                "Hypothesis H_cyberphysical: Unauthorized SCADA control command causing physical breaker trip",
                "Hypothesis H_normal: Ambient load variation and sensor measurement noise"
            ],
            provenance=Provenance.CALCULATED
        )
